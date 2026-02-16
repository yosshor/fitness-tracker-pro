
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { getExerciseHistory, saveWorkout, saveExerciseHistory } from '../services/firestoreService';
import { generatePersonalizedExercises } from '../services/aiService';
import { EXERCISES as FALLBACK_EXERCISES } from '../constants';
import { Card, Button, Input, Slider, Modal, Badge, Skeleton } from './UI';
import {
  Plus, Trash2, Save, X, Search, ChevronRight, PlayCircle,
  Sparkles, RefreshCw, Zap, Info, Minus
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ExerciseDefinition, LoggedExercise, ExerciseSet,
  MuscleGroup, ExerciseHistoryEntry
} from '../types';

export const WorkoutLogger: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { refreshWorkouts, settings } = useApp();
  const { t, language } = useLanguage();
  const { addNotification } = useNotification();

  const [exercises, setExercises] = useState<LoggedExercise[]>([]);
  const [library, setLibrary] = useState<ExerciseDefinition[]>([]);
  const [exerciseHistoryMap, setExerciseHistoryMap] = useState<Record<string, ExerciseHistoryEntry>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [rpe, setRpe] = useState(7);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedInfo, setExpandedInfo] = useState<number | null>(null);

  // Load static and local exercises
  useEffect(() => {
    const saved = localStorage.getItem('custom_exercises');
    const custom: ExerciseDefinition[] = saved ? JSON.parse(saved) : [];
    setLibrary([...FALLBACK_EXERCISES, ...custom]);
  }, []);

  // Accept pre-populated exercises from navigation state (from WorkoutGenerator or WorkoutHistory repeat)
  useEffect(() => {
    const state = location.state as {
      preloadedExercises?: ExerciseDefinition[];
      repeatExercises?: LoggedExercise[];
    } | null;

    if (state?.repeatExercises && state.repeatExercises.length > 0) {
      // From WorkoutHistory "Repeat Workout" — exercises already have sets with previous values
      setExercises(state.repeatExercises);
      window.history.replaceState({}, document.title);
    } else if (state?.preloadedExercises && state.preloadedExercises.length > 0) {
      // From WorkoutGenerator — create empty sets from exercise definitions
      const preloaded: LoggedExercise[] = state.preloadedExercises.map((def) => {
        const setCount = def.suggestedSets || 3;
        const initialSets: ExerciseSet[] = [];
        for (let i = 0; i < setCount; i++) {
          initialSets.push({ weight: 0, reps: 0 });
        }
        return {
          exerciseId: def.id,
          name: def.name,
          muscleGroup: def.muscleGroup,
          description: def.description,
          tutorialUrl: def.tutorialUrl,
          suggestedReps: def.suggestedReps,
          suggestedWeightRange: def.suggestedWeightRange,
          sets: initialSets,
        };
      });
      setExercises(preloaded);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Load exercise history for hints
  useEffect(() => {
    const loadHistory = async () => {
      if (!user) return;
      try {
        const history = await getExerciseHistory(user.id);
        const map: Record<string, ExerciseHistoryEntry> = {};
        for (const entry of history) {
          // Keep only the most recent entry per exercise name
          if (!map[entry.exerciseName]) {
            map[entry.exerciseName] = entry;
          }
        }
        setExerciseHistoryMap(map);
      } catch (err) {
        console.error('Failed to load exercise history:', err);
      }
    };
    loadHistory();
  }, [user]);

  const filteredExercises = library.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.muscleGroup.toLowerCase().includes(search.toLowerCase())
  );

  const syncNeuralDatabase = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      // Determine target muscle group
      const targetGroup =
        search && Object.values(MuscleGroup).includes(search as MuscleGroup)
          ? (search as MuscleGroup)
          : Object.values(MuscleGroup)[Math.floor(Math.random() * Object.values(MuscleGroup).length)];

      // Get exercise history from Firestore for this muscle group
      const history = await getExerciseHistory(user.id, targetGroup);

      // Get recent exercise names from current library
      const recentExerciseNames = library
        .filter((ex) => ex.muscleGroup === targetGroup)
        .map((ex) => ex.name);

      // Call AI with API key from settings
      const newExs = await generatePersonalizedExercises(
        targetGroup,
        user.volumePerMuscle,
        history,
        recentExerciseNames,
        settings.geminiApiKey,
        language
      );

      if (newExs.length > 0) {
        const updatedLibrary = [...library, ...newExs];
        const uniqueLibrary = updatedLibrary.filter(
          (v, i, a) => a.findIndex((item) => item.name === v.name) === i
        );
        setLibrary(uniqueLibrary);

        const customOnly = uniqueLibrary.filter((ex) => ex.id.startsWith('ai-'));
        localStorage.setItem('custom_exercises', JSON.stringify(customOnly));
        addNotification('success', t('logSyncAi'));
      }
    } catch (err) {
      console.error('AI exercise generation failed:', err);
      addNotification('error', t('error'));
    }
    setIsSyncing(false);
  };

  const addExercise = (def: ExerciseDefinition) => {
    const setQuantity = def.suggestedSets || 3;
    const initialSets: ExerciseSet[] = [];
    for (let i = 0; i < setQuantity; i++) {
      initialSets.push({ weight: 0, reps: 0 });
    }

    setExercises([
      ...exercises,
      {
        exerciseId: def.id,
        name: def.name,
        muscleGroup: def.muscleGroup,
        description: def.description,
        tutorialUrl: def.tutorialUrl,
        suggestedReps: def.suggestedReps,
        suggestedWeightRange: def.suggestedWeightRange,
        sets: initialSets,
      },
    ]);
    setShowAddModal(false);
    setSearch('');
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
    if (expandedInfo === index) setExpandedInfo(null);
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: keyof ExerciseSet, value: number) => {
    const newExs = [...exercises];
    newExs[exerciseIndex].sets[setIndex][field] = value;
    setExercises(newExs);
  };

  const adjustValue = (exerciseIndex: number, setIndex: number, field: keyof ExerciseSet, delta: number) => {
    const newExs = [...exercises];
    const current = newExs[exerciseIndex].sets[setIndex][field];
    const step = field === 'weight' ? 2.5 : 1;
    const newVal = Math.max(0, current + delta * step);
    newExs[exerciseIndex].sets[setIndex][field] = newVal;
    setExercises(newExs);
  };

  const addSet = (exerciseIndex: number) => {
    const newExs = [...exercises];
    const lastSet = newExs[exerciseIndex].sets[newExs[exerciseIndex].sets.length - 1];
    newExs[exerciseIndex].sets.push({ ...lastSet });
    setExercises(newExs);
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const newExs = [...exercises];
    newExs[exerciseIndex].sets = newExs[exerciseIndex].sets.filter((_, i) => i !== setIndex);
    if (newExs[exerciseIndex].sets.length === 0) {
      newExs.splice(exerciseIndex, 1);
    }
    setExercises(newExs);
  };

  const handleSaveWorkout = async () => {
    if (!user) return;
    if (exercises.length === 0) {
      addNotification('warning', t('logNoExercises'));
      return;
    }

    setIsSaving(true);
    try {
      // Save the workout to Firestore
      await saveWorkout(user.id, {
        date: new Date().toISOString(),
        rpe,
        notes,
        exercises,
      });

      // Save individual exercise history entries
      for (const exercise of exercises) {
        const weights = exercise.sets.map((s) => s.weight).filter((w) => w > 0);
        const reps = exercise.sets.map((s) => s.reps).filter((r) => r > 0);

        if (weights.length === 0 && reps.length === 0) continue;

        const bestWeight = weights.length > 0 ? Math.max(...weights) : 0;
        const bestReps = reps.length > 0 ? Math.max(...reps) : 0;
        const totalVolume = exercise.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);

        await saveExerciseHistory(user.id, {
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.name,
          muscleGroup: exercise.muscleGroup,
          date: new Date().toISOString(),
          bestWeight,
          bestReps,
          totalVolume,
          sets: exercise.sets,
        });
      }

      // Refresh workouts in the app context
      await refreshWorkouts();
      addNotification('success', t('logSave'));
      navigate('/');
    } catch (err) {
      console.error('Failed to save workout:', err);
      addNotification('error', t('error'));
    }
    setIsSaving(false);
  };

  // Tutorial links are rendered as <a> tags directly for better browser compatibility

  const getLastTimeHint = (exerciseName: string): string | null => {
    const entry = exerciseHistoryMap[exerciseName];
    if (!entry) return null;
    return `${entry.bestWeight} ${t('kg')} × ${entry.bestReps} ${t('logRepsShort')}`;
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-surface-800 pb-4">
        <div>
          <h2 className="text-primary-400 font-medium tracking-wide text-xs uppercase">{t('logTitle')}</h2>
          <h1 className="text-3xl font-bold text-white">{t('logActiveSession')}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <X size={18} /> {t('logCancel')}
          </Button>
          <Button variant="primary" onClick={handleSaveWorkout} disabled={isSaving}>
            <Save size={18} /> {isSaving ? t('logSaving') : t('logSave')}
          </Button>
        </div>
      </header>

      {/* Exercise List */}
      <div className="space-y-4">
        {exercises.map((ex, exIdx) => (
          <Card key={exIdx} className="border-surface-800 p-4 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4 border-b border-surface-800 pb-2">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <h3 className="text-lg font-semibold text-white">{ex.name}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="accent">{ex.muscleGroup}</Badge>
                    {ex.suggestedReps && (
                      <Badge variant="primary">
                        <Zap size={10} /> {t('logTarget')}: {ex.suggestedReps} {t('logRepsShort')}
                      </Badge>
                    )}
                    {getLastTimeHint(ex.name) && (
                      <Badge variant="highlight">
                        {t('logLastTime')}: {getLastTimeHint(ex.name)}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {ex.description && (
                    <button
                      onClick={() => setExpandedInfo(expandedInfo === exIdx ? null : exIdx)}
                      className={`p-2 rounded-full transition-all ${
                        expandedInfo === exIdx
                          ? 'bg-primary-500 text-white'
                          : 'bg-surface-800 text-slate-400 hover:text-white'
                      }`}
                      title={t('logInfo')}
                    >
                      <Info size={18} />
                    </button>
                  )}
                  {ex.tutorialUrl && (
                    <a
                      href={ex.tutorialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-primary-500/10 text-primary-400 hover:bg-primary-500 hover:text-white transition-all"
                      title={t('logTutorial')}
                    >
                      <PlayCircle size={18} />
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={() => removeExercise(exIdx)}
                className="text-slate-600 hover:text-red-400 transition-colors mt-1"
              >
                <Trash2 size={18} />
              </button>
            </div>

            {/* Expanded description */}
            {expandedInfo === exIdx && ex.description && (
              <div className="mb-4 p-3 bg-primary-500/5 border border-primary-500/20 rounded-xl animate-slide-up">
                <p className="text-xs text-primary-400 font-medium mb-1 flex items-center gap-2">
                  <Sparkles size={12} /> {t('logInfo')}
                </p>
                <p className="text-sm text-slate-300 italic leading-relaxed">{ex.description}</p>
              </div>
            )}

            {/* Sets grid */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[10px] font-medium text-slate-500 uppercase tracking-wider px-2">
                <div className="col-span-1">{t('logSet')}</div>
                <div className="col-span-5 text-center">{t('logWeight')}</div>
                <div className="col-span-5 text-center">{t('logReps')}</div>
                <div className="col-span-1"></div>
              </div>

              {ex.sets.map((set, setIdx) => (
                <div
                  key={setIdx}
                  className="grid grid-cols-12 gap-2 items-center bg-surface-800/30 p-2 rounded-lg group"
                >
                  <div className="col-span-1 font-semibold text-primary-400 text-center text-sm">
                    {setIdx + 1}
                  </div>

                  {/* Weight with +/- buttons */}
                  <div className="col-span-5 flex items-center gap-1">
                    <button
                      onClick={() => adjustValue(exIdx, setIdx, 'weight', -1)}
                      className="p-1.5 rounded-lg bg-surface-700 text-slate-400 hover:text-white hover:bg-surface-600 transition-all shrink-0"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      value={set.weight || ''}
                      placeholder={ex.suggestedWeightRange || '0'}
                      onChange={(e) => updateSet(exIdx, setIdx, 'weight', parseFloat(e.target.value) || 0)}
                      className="w-full bg-surface-900 border border-surface-700 rounded-lg p-2 text-center text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/30 transition-all"
                    />
                    <button
                      onClick={() => adjustValue(exIdx, setIdx, 'weight', 1)}
                      className="p-1.5 rounded-lg bg-surface-700 text-slate-400 hover:text-white hover:bg-surface-600 transition-all shrink-0"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Reps with +/- buttons */}
                  <div className="col-span-5 flex items-center gap-1">
                    <button
                      onClick={() => adjustValue(exIdx, setIdx, 'reps', -1)}
                      className="p-1.5 rounded-lg bg-surface-700 text-slate-400 hover:text-white hover:bg-surface-600 transition-all shrink-0"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      value={set.reps || ''}
                      placeholder={ex.suggestedReps?.split('-')[0] || '0'}
                      onChange={(e) => updateSet(exIdx, setIdx, 'reps', parseInt(e.target.value) || 0)}
                      className="w-full bg-surface-900 border border-surface-700 rounded-lg p-2 text-center text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/30 transition-all"
                    />
                    <button
                      onClick={() => adjustValue(exIdx, setIdx, 'reps', 1)}
                      className="p-1.5 rounded-lg bg-surface-700 text-slate-400 hover:text-white hover:bg-surface-600 transition-all shrink-0"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Remove set */}
                  <div className="col-span-1 text-center">
                    <button
                      onClick={() => removeSet(exIdx, setIdx)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={() => addSet(exIdx)}
                className="w-full py-2 border border-dashed border-surface-700 rounded-lg text-slate-500 hover:text-primary-400 hover:border-primary-500 transition-all text-xs font-medium flex items-center justify-center gap-2"
              >
                <Plus size={14} /> {t('logAddSet')}
              </button>
            </div>
          </Card>
        ))}

        {/* Add exercise button */}
        <Button
          variant="outline"
          className="w-full border-dashed py-6 text-slate-400 hover:text-primary-400 hover:bg-primary-500/5"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={24} /> {t('logAddExercise')}
        </Button>
      </div>

      {/* Post-workout feedback */}
      {exercises.length > 0 && (
        <Card className="border-t-2 border-t-accent-500">
          <h3 className="text-sm font-semibold text-accent-400 uppercase tracking-wide mb-4">
            {t('logFeedback')}
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Slider label={t('logEffort')} min={1} max={10} value={rpe} onChange={setRpe} />
              <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                <span>{t('logWarmup')}</span>
                <span>{t('logMaxEffort')}</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 ms-1 block mb-1">
                {t('logNotes')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('logNotesPlaceholder')}
                className="w-full h-24 bg-surface-800/50 border border-surface-700 rounded-lg p-3 text-white focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30 text-sm resize-none transition-all"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Add exercise modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={t('logLibrary')}>
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder={t('logSearchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-surface-800 border border-surface-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all"
              />
            </div>
            <button
              onClick={syncNeuralDatabase}
              disabled={isSyncing}
              className={`p-3 rounded-xl border border-primary-500/50 text-primary-400 hover:bg-primary-500/10 transition-all ${
                isSyncing ? 'animate-spin opacity-50' : ''
              }`}
              title={t('logSyncAi')}
            >
              <RefreshCw size={20} />
            </button>
          </div>

          {isSyncing && (
            <div className="space-y-3">
              <div className="p-4 bg-primary-500/5 border border-primary-500/20 rounded-xl flex items-center gap-3">
                <Sparkles className="text-primary-400" size={20} />
                <p className="text-xs text-primary-400 font-medium">{t('logSyncing')}</p>
              </div>
              <Skeleton className="h-14 rounded-xl" />
              <Skeleton className="h-14 rounded-xl" />
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto pr-2">
            {filteredExercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => addExercise(ex)}
                className="flex flex-col p-3 rounded-xl hover:bg-surface-800 border border-transparent hover:border-surface-700 transition-all text-left group"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium">{ex.name}</p>
                    {ex.id.startsWith('ai-') && (
                      <Sparkles size={12} className="text-primary-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {ex.tutorialUrl && <PlayCircle size={16} className="text-primary-400/50" />}
                    <ChevronRight size={18} className="text-slate-600 group-hover:text-primary-400" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Badge variant="accent" className="text-[10px]">{ex.muscleGroup}</Badge>
                  {ex.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-tight pr-4">
                      {ex.description}
                    </p>
                  )}
                  {ex.suggestedReps && (
                    <p className="text-[10px] text-slate-400 italic border-t border-surface-800 mt-1 pt-1">
                      {ex.suggestedSets} {t('sets')} x {ex.suggestedReps} @ {ex.suggestedWeightRange}
                    </p>
                  )}
                  {getLastTimeHint(ex.name) && (
                    <p className="text-[10px] text-highlight-400 flex items-center gap-1">
                      <Zap size={10} /> {t('logLastTime')}: {getLastTimeHint(ex.name)}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};
