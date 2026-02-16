
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { getExerciseHistory } from '../services/firestoreService';
import { generateAIRoutine } from '../services/aiService';
import { EXERCISES as FALLBACK_EXERCISES, SPLITS } from '../constants';
import { Card, Button, Slider, Skeleton, Badge, EmptyState } from './UI';
import { Sparkles, Dna, Info, PlayCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MuscleGroup, ExerciseDefinition } from '../types';

interface GeneratedExercise {
  name: string;
  description?: string;
  tutorialUrl?: string;
  suggestedSets?: number;
  suggestedReps?: string;
  suggestedWeightRange?: string;
}

interface GeneratedRoutineItem {
  muscle: MuscleGroup;
  exercises: GeneratedExercise[];
}

export const WorkoutGenerator: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useApp();
  const { t, language } = useLanguage();
  const { addNotification } = useNotification();

  const [selectedSplit, setSelectedSplit] = useState(user?.currentSplit || 'Full Body');
  const [volume, setVolume] = useState(user?.volumePerMuscle || 2);
  const [generated, setGenerated] = useState<GeneratedRoutineItem[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateRoutine = async () => {
    const splitConfig = SPLITS.find((s) => s.id === selectedSplit);
    if (!splitConfig || !user) return;

    // Check for API key
    if (!settings.geminiApiKey) {
      addNotification('warning', t('settingsGeminiHint'));
      // Fall back to shuffled exercises from FALLBACK_EXERCISES
      const routine = fallbackGenerate(splitConfig.muscleGroups, volume);
      setGenerated(routine);
      return;
    }

    setIsGenerating(true);
    try {
      // Gather exercise history for all relevant muscle groups
      const historyPromises = splitConfig.muscleGroups.map((muscle) =>
        getExerciseHistory(user.id, muscle)
      );
      const historyResults = await Promise.all(historyPromises);
      const allHistory = historyResults.flat();

      // Call AI routine generation
      const aiRoutine = await generateAIRoutine(
        selectedSplit,
        splitConfig.muscleGroups,
        volume,
        allHistory,
        settings.geminiApiKey,
        language
      );

      if (aiRoutine && aiRoutine.length > 0) {
        setGenerated(aiRoutine);
        addNotification('success', t('genResult'));
      } else {
        // Fallback if AI returns empty
        const routine = fallbackGenerate(splitConfig.muscleGroups, volume);
        setGenerated(routine);
        addNotification('info', t('error'));
      }
    } catch (err) {
      console.error('AI routine generation failed:', err);
      // Fallback on error
      const routine = fallbackGenerate(splitConfig.muscleGroups, volume);
      setGenerated(routine);
      addNotification('error', t('error'));
    }
    setIsGenerating(false);
  };

  const fallbackGenerate = (muscleGroups: MuscleGroup[], vol: number): GeneratedRoutineItem[] => {
    return muscleGroups.map((muscle) => {
      const available = FALLBACK_EXERCISES.filter((ex) => ex.muscleGroup === muscle);
      const picked = [...available]
        .sort(() => Math.random() - 0.5)
        .slice(0, vol)
        .map((ex) => ({
          name: ex.name,
          description: ex.description,
          tutorialUrl: ex.tutorialUrl,
          suggestedSets: ex.suggestedSets,
          suggestedReps: ex.suggestedReps,
          suggestedWeightRange: ex.suggestedWeightRange,
        }));
      return { muscle, exercises: picked };
    });
  };

  const handleStartWorkout = () => {
    if (!generated) return;

    // Flatten all generated exercises into ExerciseDefinition objects for the WorkoutLogger
    const allExercises: ExerciseDefinition[] = generated.flatMap((item) =>
      item.exercises.map((ex) => ({
        id: `gen-${Math.random().toString(36).substr(2, 9)}`,
        name: ex.name,
        muscleGroup: item.muscle,
        description: ex.description,
        tutorialUrl: ex.tutorialUrl,
        suggestedSets: ex.suggestedSets,
        suggestedReps: ex.suggestedReps,
        suggestedWeightRange: ex.suggestedWeightRange,
      }))
    );

    navigate('/workout', { state: { preloadedExercises: allExercises } });
  };

  const handleRegenerate = () => {
    setGenerated(null);
    generateRoutine();
  };

  // Tutorial links are rendered as <a> tags directly for better browser compatibility

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <header>
        <h2 className="text-primary-400 font-medium tracking-wide text-xs uppercase">{t('genTitle')}</h2>
        <h1 className="text-3xl font-bold text-white">{t('genTitle')}</h1>
        <p className="text-slate-400 mt-2 max-w-lg">{t('genSubtitle')}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Parameters Panel */}
        <Card className="lg:col-span-1 space-y-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 border-b border-surface-800 pb-2">
            <Dna className="text-primary-400" size={20} /> {t('genParameters')}
          </h3>

          <div className="space-y-4">
            <label className="text-xs font-medium text-slate-400 ms-1 block">{t('genSplitProtocol')}</label>
            <div className="grid grid-cols-1 gap-2">
              {SPLITS.map((split) => (
                <button
                  key={split.id}
                  onClick={() => setSelectedSplit(split.id as any)}
                  className={`p-3 rounded-xl border transition-all text-left font-medium text-sm ${
                    selectedSplit === split.id
                      ? 'border-primary-500 bg-primary-500/10 text-primary-400 shadow-lg shadow-primary-500/10'
                      : 'border-surface-800 bg-surface-900 text-slate-500 hover:border-surface-700'
                  }`}
                >
                  {split.name}
                </button>
              ))}
            </div>
          </div>

          <Slider label={t('genVolume')} min={1} max={4} value={volume} onChange={setVolume} />

          <Button
            variant="primary"
            className="w-full py-4 mt-4"
            onClick={generateRoutine}
            disabled={isGenerating}
          >
            <Sparkles size={18} /> {isGenerating ? t('genGenerating') : t('genGenerate')}
          </Button>

          {!settings.geminiApiKey && (
            <div className="bg-surface-900/50 p-4 rounded-xl border border-surface-800 flex gap-3">
              <Info className="text-primary-400 shrink-0" size={18} />
              <p className="text-xs text-slate-500 leading-relaxed">
                {t('settingsGeminiHint')}. Go to{' '}
                <button
                  onClick={() => navigate('/settings')}
                  className="text-primary-400 hover:underline"
                >
                  {t('navSettings')}
                </button>{' '}
                to configure your Gemini API key for AI-powered generation.
              </p>
            </div>
          )}

          {settings.geminiApiKey && (
            <div className="bg-surface-900/50 p-4 rounded-xl border border-surface-800 flex gap-3">
              <Sparkles className="text-primary-400 shrink-0" size={18} />
              <p className="text-xs text-slate-500 leading-relaxed">
                AI-powered generation will use your training history to create personalized routines
                tailored to your experience and progress.
              </p>
            </div>
          )}
        </Card>

        {/* Results Panel */}
        <Card className="lg:col-span-2 min-h-[400px] flex flex-col">
          {isGenerating ? (
            <div className="flex-1 space-y-6">
              <h3 className="text-lg font-semibold text-primary-400 mb-4">{t('genGenerating')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 rounded-2xl bg-surface-900 border border-surface-800">
                    <Skeleton className="h-4 w-24 mb-3 rounded" />
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-full rounded" />
                      <Skeleton className="h-8 w-full rounded" />
                      <Skeleton className="h-8 w-3/4 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : generated ? (
            <div className="space-y-6 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-accent-400">{t('genResult')}</h3>
                <Button variant="ghost" onClick={handleRegenerate}>
                  <RefreshCw size={16} /> {t('genRegenerate')}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {generated.map((item, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-surface-900 border border-surface-800 group hover:border-primary-500/50 transition-all"
                  >
                    <h4 className="text-primary-400 font-semibold text-xs mb-3 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
                      {item.muscle}
                    </h4>
                    <ul className="space-y-3">
                      {item.exercises.map((ex, j) => (
                        <li
                          key={j}
                          className="border-l-2 border-surface-700 pl-3 py-1 group-hover:border-primary-500/30 transition-all"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white font-medium text-sm">{ex.name}</span>
                            {ex.tutorialUrl && (
                              <a
                                href={ex.tutorialUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-400/50 hover:text-primary-400 transition-colors"
                              >
                                <PlayCircle size={16} />
                              </a>
                            )}
                          </div>
                          {ex.description && (
                            <p className="text-[11px] text-slate-500 leading-tight mb-1">
                              {ex.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            {ex.suggestedSets && ex.suggestedReps && (
                              <Badge variant="neutral">
                                {ex.suggestedSets} {t('sets')} x {ex.suggestedReps}
                              </Badge>
                            )}
                            {ex.suggestedWeightRange && (
                              <Badge variant="neutral">{ex.suggestedWeightRange}</Badge>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-6 border-t border-surface-800 flex justify-end gap-3">
                <Button variant="outline" onClick={handleRegenerate}>
                  <RefreshCw size={16} /> {t('genRegenerate')}
                </Button>
                <Button variant="primary" onClick={handleStartWorkout}>
                  {t('genStartWorkout')} <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Sparkles size={64} />}
              title={t('genTitle')}
              description={t('genWaiting')}
            />
          )}
        </Card>
      </div>
    </div>
  );
};
