
import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { Card, Badge, Button, EmptyState, Input } from './UI';
import { MuscleGroup, WorkoutSession } from '../types';
import { useNavigate } from 'react-router-dom';
import {
  Clock, Search, ChevronDown, ChevronUp, Dumbbell,
  RotateCcw, Filter, TrendingUp
} from 'lucide-react';

const PAGE_SIZE = 20;

const MUSCLE_GROUPS: (MuscleGroup | null)[] = [
  null,
  MuscleGroup.Chest,
  MuscleGroup.Back,
  MuscleGroup.Legs,
  MuscleGroup.Shoulders,
  MuscleGroup.Arms,
];

function getMuscleLabel(mg: MuscleGroup | null, t: (key: any) => string): string {
  if (mg === null) return t('historyAll');
  return mg;
}

function getBadgeVariant(mg: MuscleGroup): 'primary' | 'accent' | 'highlight' | 'neutral' {
  switch (mg) {
    case MuscleGroup.Chest: return 'primary';
    case MuscleGroup.Back: return 'accent';
    case MuscleGroup.Legs: return 'highlight';
    case MuscleGroup.Shoulders: return 'primary';
    case MuscleGroup.Arms: return 'accent';
    default: return 'neutral';
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function calcTotalVolume(workout: WorkoutSession): number {
  return workout.exercises.reduce((total, ex) => {
    return total + ex.sets.reduce((setTotal, s) => setTotal + s.weight * s.reps, 0);
  }, 0);
}

export const WorkoutHistory: React.FC = () => {
  const { user } = useAuth();
  const { workouts, isLoadingWorkouts } = useApp();
  const { t } = useLanguage();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);
  const [filter, setFilter] = useState<MuscleGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const sortedWorkouts = useMemo(() => {
    return [...workouts].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [workouts]);

  const filteredWorkouts = useMemo(() => {
    let result = sortedWorkouts;

    if (filter) {
      result = result.filter((w) =>
        w.exercises.some((ex) => ex.muscleGroup === filter)
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((w) =>
        w.exercises.some((ex) => ex.name.toLowerCase().includes(q)) ||
        w.notes?.toLowerCase().includes(q) ||
        w.date.toLowerCase().includes(q)
      );
    }

    return result;
  }, [sortedWorkouts, filter, searchQuery]);

  const visibleWorkouts = filteredWorkouts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredWorkouts.length;

  const handleToggle = (workoutId: string) => {
    setExpandedWorkout((prev) => (prev === workoutId ? null : workoutId));
  };

  const handleRepeat = (workout: WorkoutSession) => {
    navigate('/workout', {
      state: {
        repeatExercises: workout.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          description: ex.description,
          sets: ex.sets,
          tutorialUrl: ex.tutorialUrl,
          suggestedReps: ex.suggestedReps,
          suggestedWeightRange: ex.suggestedWeightRange,
        })),
      },
    });
    addNotification('info', `Loaded ${workout.exercises.length} exercises from previous workout`);
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <header>
        <p className="text-sm text-slate-400 mb-1">{t('navHistory')}</p>
        <h1 className="text-3xl font-bold text-white">{t('historyTitle')}</h1>
      </header>

      {/* Filter Bar */}
      <div className="space-y-4">
        <Input
          placeholder={t('historyFilter') + '...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search size={16} />}
        />

        <div className="flex gap-2 flex-wrap">
          {MUSCLE_GROUPS.map((mg) => (
            <button
              key={mg ?? 'all'}
              onClick={() => {
                setFilter(mg);
                setVisibleCount(PAGE_SIZE);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${filter === mg
                ? 'bg-primary-500/10 text-primary-400 border-primary-500/30'
                : 'text-slate-400 hover:text-white hover:bg-surface-800 border-surface-700'
                }`}
            >
              {getMuscleLabel(mg, t)}
            </button>
          ))}
        </div>
      </div>

      {/* Workout List */}
      {isLoadingWorkouts ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredWorkouts.length === 0 ? (
        <EmptyState
          icon={<Dumbbell size={48} />}
          title={t('historyEmpty')}
          description={searchQuery || filter ? 'Try adjusting your filters' : ''}
          action={
            !searchQuery && !filter ? (
              <Button variant="primary" onClick={() => navigate('/workout')}>
                {t('dashStartWorkout')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {visibleWorkouts.map((workout) => {
            const isExpanded = expandedWorkout === workout.id;
            const totalVolume = calcTotalVolume(workout);
            const uniqueMuscles = [...new Set(workout.exercises.map((ex) => ex.muscleGroup))];

            return (
              <Card key={workout.id} className="p-0 overflow-hidden">
                {/* Summary row */}
                <button
                  onClick={() => handleToggle(workout.id)}
                  className="w-full p-5 flex items-center justify-between hover:bg-surface-800/50 transition-colors text-start"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-400 shrink-0">
                      <Clock size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-medium text-sm">{formatDate(workout.date)}</p>
                      <div className="flex gap-1.5 flex-wrap mt-1.5">
                        {workout.exercises.slice(0, 4).map((ex, i) => (
                          <Badge key={i} variant={getBadgeVariant(ex.muscleGroup)}>
                            {ex.name}
                          </Badge>
                        ))}
                        {workout.exercises.length > 4 && (
                          <Badge variant="neutral">+{workout.exercises.length - 4}</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-end hidden sm:block">
                      <p className="text-xs text-slate-400">{t('historyTotalVolume')}</p>
                      <p className="text-white font-medium text-sm">
                        {totalVolume >= 1000
                          ? `${(totalVolume / 1000).toFixed(1)} ${t('tons')}`
                          : `${totalVolume} ${t('kg')}`}
                      </p>
                    </div>
                    <Badge variant={workout.rpe >= 8 ? 'highlight' : workout.rpe >= 5 ? 'accent' : 'primary'}>
                      {t('rpe')} {workout.rpe}
                    </Badge>
                    {isExpanded ? (
                      <ChevronUp size={18} className="text-slate-400" />
                    ) : (
                      <ChevronDown size={18} className="text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-surface-700 bg-surface-900/50 p-5 space-y-4 animate-slide-up">
                    {workout.exercises.map((exercise, exIdx) => (
                      <div key={exIdx} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={getBadgeVariant(exercise.muscleGroup)}>
                            {exercise.muscleGroup}
                          </Badge>
                          <span className="text-white font-medium text-sm">{exercise.name}</span>
                        </div>
                        <div className="ms-2 space-y-1">
                          {exercise.sets.map((set, setIdx) => (
                            <div key={setIdx} className="flex items-center gap-3 text-xs">
                              <span className="text-slate-500 w-12">{t('logSet')} {setIdx + 1}</span>
                              <span className="text-white">{set.weight} {t('kg')}</span>
                              <span className="text-slate-500">x</span>
                              <span className="text-white">{set.reps} {t('logRepsShort')}</span>
                              <span className="text-slate-600">
                                ({(set.weight * set.reps).toLocaleString()} {t('kg')} vol)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {workout.notes && (
                      <div className="pt-2 border-t border-surface-700">
                        <p className="text-xs text-slate-400">{t('logNotes')}</p>
                        <p className="text-sm text-slate-300 mt-1">{workout.notes}</p>
                      </div>
                    )}

                    <div className="pt-2 flex justify-end">
                      <Button
                        variant="outline"
                        onClick={() => handleRepeat(workout)}
                        className="text-xs"
                      >
                        <RotateCcw size={14} />
                        {t('historyRepeat')}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={handleLoadMore}>
                {t('historyLoadMore')} ({filteredWorkouts.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
