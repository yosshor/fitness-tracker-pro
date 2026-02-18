
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { getExerciseHistory, saveWorkout, saveExerciseHistory } from '../services/supabaseService';
import { generatePersonalizedExercises } from '../services/aiService';
import { EXERCISES as FALLBACK_EXERCISES } from '../constants';
import { Card, Button, Input, Slider, Modal, Badge, Skeleton, FilterChip, NumberStepper } from './UI';
import {
  Plus, Trash2, Save, X, Search, ChevronRight, PlayCircle,
  Sparkles, RefreshCw, Zap, Info
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
  const [filterMuscle, setFilterMuscle] = useState<string | null>(null);

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

      // Get exercise history for this muscle group
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
      // Save the workout
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

  const muscleColor = (muscle: string) => {
    const colors: Record<string, string> = {
      Chest: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
      Back: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
      Legs: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
      Shoulders: 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
      Arms: 'from-rose-500/20 to-rose-500/5 border-rose-500/30',
      Core: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30',
    };
    return colors[muscle] || 'from-primary-500/20 to-primary-500/5 border-primary-500/30';
  };

  const muscleBarColor = (muscle: string) => {
    const colors: Record<string, string> = {
      Chest: 'bg-blue-500', Back: 'bg-emerald-500', Legs: 'bg-purple-500',
      Shoulders: 'bg-amber-500', Arms: 'bg-rose-500', Core: 'bg-cyan-500',
    };
    return colors[muscle] || 'bg-primary-500';
  };

  // Muscle group filter for exercise picker
  const muscleGroups = [...new Set(library.map(e => e.muscleGroup))];

  const modalFilteredExercises = filteredExercises.filter(
    e => !filterMuscle || e.muscleGroup === filterMuscle
  );

  return (
    <div className="space-y-6">
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
      <div className="space-y-5">
        {exercises.map((ex, exIdx) => (
          <Card key={exIdx} className="!p-0 relative overflow-hidden animate-fade-in-up">
            {/* Colored header */}
            <div className={`bg-gradient-to-r ${muscleColor(ex.muscleGroup)} border-b p-4`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-white">{ex.name}</h3>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
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
                <div className="flex items-center gap-1.5">
                  {ex.description && (
                    <button
                      onClick={() => setExpandedInfo(expandedInfo === exIdx ? null : exIdx)}
                      className={`p-2 rounded-xl transition-all btn-press ${
                        expandedInfo === exIdx
                          ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                          : 'bg-surface-800/80 text-slate-400 hover:text-white hover:bg-surface-700'
                      }`}
                      title={t('logInfo')}
                    >
                      <Info size={16} />
                    </button>
                  )}
                  {ex.tutorialUrl && (
                    <a
                      href={ex.tutorialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-surface-800/80 text-primary-400 hover:bg-primary-500 hover:text-white transition-all btn-press"
                      title={t('logTutorial')}
                    >
                      <PlayCircle size={16} />
                    </a>
                  )}
                  <button
                    onClick={() => removeExercise(exIdx)}
                    className="p-2 rounded-xl bg-surface-800/80 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all btn-press"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded description */}
            {expandedInfo === exIdx && ex.description && (
              <div className="mx-4 mt-4 p-3 bg-primary-500/5 border border-primary-500/20 rounded-xl animate-expand">
                <p className="text-xs text-primary-400 font-medium mb-1 flex items-center gap-2">
                  <Sparkles size={12} /> {t('logInfo')}
                </p>
                <p className="text-sm text-slate-300 italic leading-relaxed">{ex.description}</p>
              </div>
            )}

            {/* Sets grid */}
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-12 gap-3 text-[10px] font-medium text-slate-500 uppercase tracking-wider px-1">
                <div className="col-span-1">{t('logSet')}</div>
                <div className="col-span-5 text-center">{t('logWeight')}</div>
                <div className="col-span-5 text-center">{t('logReps')}</div>
                <div className="col-span-1"></div>
              </div>

              {ex.sets.map((set, setIdx) => (
                <div
                  key={setIdx}
                  className="grid grid-cols-12 gap-3 items-center bg-surface-800/30 hover:bg-surface-800/50 p-2.5 rounded-xl group transition-colors"
                >
                  <div className="col-span-1 flex justify-center">
                    <span className="w-7 h-7 rounded-lg bg-primary-500/10 text-primary-400 font-semibold text-sm flex items-center justify-center">
                      {setIdx + 1}
                    </span>
                  </div>

                  {/* Weight */}
                  <div className="col-span-5">
                    <NumberStepper
                      value={set.weight}
                      placeholder={ex.suggestedWeightRange || '0'}
                      onDecrement={() => adjustValue(exIdx, setIdx, 'weight', -1)}
                      onIncrement={() => adjustValue(exIdx, setIdx, 'weight', 1)}
                      onChange={(val) => updateSet(exIdx, setIdx, 'weight', val)}
                    />
                  </div>

                  {/* Reps */}
                  <div className="col-span-5">
                    <NumberStepper
                      value={set.reps}
                      placeholder={ex.suggestedReps?.split('-')[0] || '0'}
                      onDecrement={() => adjustValue(exIdx, setIdx, 'reps', -1)}
                      onIncrement={() => adjustValue(exIdx, setIdx, 'reps', 1)}
                      onChange={(val) => updateSet(exIdx, setIdx, 'reps', val)}
                    />
                  </div>

                  {/* Remove set */}
                  <div className="col-span-1 flex justify-center">
                    <button
                      onClick={() => removeSet(exIdx, setIdx)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={() => addSet(exIdx)}
                className="w-full py-3 border border-dashed border-surface-700 rounded-xl text-slate-500 hover:text-primary-400 hover:border-primary-500/50 hover:bg-primary-500/5 transition-all text-xs font-medium flex items-center justify-center gap-2 btn-press"
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
                className="w-full h-24 bg-surface-800/50 border border-surface-700 rounded-xl p-3 text-white focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/30 text-sm resize-none transition-all"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Add exercise modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setSearch(''); setFilterMuscle(null); }} title={t('logLibrary')} size="lg">
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder={t('logSearchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                className="w-full bg-surface-800 border border-surface-700 rounded-xl ps-10 pe-10 py-3 text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              onClick={syncNeuralDatabase}
              disabled={isSyncing}
              className={`p-3 rounded-xl border border-primary-500/50 text-primary-400 hover:bg-primary-500/10 transition-all btn-press ${
                isSyncing ? 'animate-spin opacity-50' : ''
              }`}
              title={t('logSyncAi')}
            >
              <RefreshCw size={20} />
            </button>
          </div>

          {/* Muscle group filter chips */}
          <div className="flex gap-2 flex-wrap">
            <FilterChip active={!filterMuscle} onClick={() => setFilterMuscle(null)}>
              All ({filteredExercises.length})
            </FilterChip>
            {muscleGroups.map(mg => {
              const count = filteredExercises.filter(e => e.muscleGroup === mg).length;
              if (count === 0) return null;
              return (
                <FilterChip key={mg} active={filterMuscle === mg} onClick={() => setFilterMuscle(filterMuscle === mg ? null : mg)}>
                  {mg} ({count})
                </FilterChip>
              );
            })}
          </div>

          {isSyncing && (
            <div className="space-y-3">
              <div className="p-4 bg-primary-500/5 border border-primary-500/20 rounded-xl flex items-center gap-3 animate-pulse-glow">
                <Sparkles className="text-primary-400" size={20} />
                <p className="text-xs text-primary-400 font-medium">{t('logSyncing')}</p>
              </div>
              <Skeleton className="h-14 rounded-xl" />
              <Skeleton className="h-14 rounded-xl" />
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pe-1">
            {modalFilteredExercises.map((ex, i) => (
              <button
                key={ex.id}
                onClick={() => addExercise(ex)}
                className={`flex items-start gap-3 p-3 rounded-xl hover:bg-surface-800 border border-transparent hover:border-surface-700 transition-all text-left group animate-fade-in-up stagger-${Math.min(i + 1, 8)}`}
              >
                <div className={`w-1 self-stretch rounded-full ${muscleBarColor(ex.muscleGroup)} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between w-full mb-1">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium text-sm">{ex.name}</p>
                      {ex.id.startsWith('ai-') && (
                        <Sparkles size={12} className="text-primary-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {ex.tutorialUrl && <PlayCircle size={14} className="text-primary-400/50" />}
                      <ChevronRight size={16} className="text-slate-600 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Badge variant="accent" className="text-[10px]">{ex.muscleGroup}</Badge>
                    {ex.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 leading-tight pe-4">
                        {ex.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3">
                      {ex.suggestedReps && (
                        <p className="text-[10px] text-slate-400">
                          {ex.suggestedSets} {t('sets')} x {ex.suggestedReps} @ {ex.suggestedWeightRange}
                        </p>
                      )}
                      {getLastTimeHint(ex.name) && (
                        <p className="text-[10px] text-highlight-400 flex items-center gap-1">
                          <Zap size={10} /> {getLastTimeHint(ex.name)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};
