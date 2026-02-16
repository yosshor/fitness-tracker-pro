
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useLanguage } from '../i18n/LanguageContext';
import { Card, Button, Skeleton, EmptyState } from './UI';
import { Trophy, Clock, Zap, TrendingUp, Calendar, Sparkles, Dumbbell, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { workouts, isLoadingWorkouts } = useApp();
  const { t } = useLanguage();

  const recentWorkouts = [...workouts]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  const avgRpe = workouts.length > 0
    ? (workouts.reduce((sum, w) => sum + (w.rpe || 0), 0) / workouts.length).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400 mb-1">{t('dashTitle')}</p>
          <h1 className="text-3xl font-bold text-white">
            {t('dashWelcome')}, {user?.displayName}
          </h1>
        </div>
        <div className="flex items-center gap-2 bg-surface-800 border border-surface-700 px-4 py-2 rounded-xl">
          <Calendar className="text-primary-400 w-4 h-4" />
          <span className="text-xs text-slate-400">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </header>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoadingWorkouts ? (
          <>
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </>
        ) : (
          <>
            {/* Current Split */}
            <Card className="border-s-4 border-primary-500 relative overflow-hidden group">
              <div className="absolute top-0 end-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Trophy className="w-16 h-16 text-primary-400" />
              </div>
              <p className="text-xs text-slate-400 mb-1">{t('dashCurrentSplit')}</p>
              <h3 className="text-2xl font-semibold text-white">{user?.currentSplit}</h3>
              <p className="text-xs text-primary-400 mt-2">
                {user?.volumePerMuscle} {t('dashVolume')}
              </p>
            </Card>

            {/* Total Sessions */}
            <Card className="border-s-4 border-accent-500 relative overflow-hidden group">
              <div className="absolute top-0 end-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Clock className="w-16 h-16 text-accent-400" />
              </div>
              <p className="text-xs text-slate-400 mb-1">{t('dashSessions')}</p>
              <h3 className="text-3xl font-semibold text-white">{workouts.length}</h3>
              <p className="text-xs text-accent-400 mt-2">
                {t('dashExercises')}: {workouts.reduce((sum, w) => sum + w.exercises.length, 0)}
              </p>
            </Card>

            {/* Avg RPE */}
            <Card className="border-s-4 border-highlight-500 relative overflow-hidden group">
              <div className="absolute top-0 end-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap className="w-16 h-16 text-highlight-400" />
              </div>
              <p className="text-xs text-slate-400 mb-1">{t('dashAvgRpe')}</p>
              <h3 className="text-3xl font-semibold text-white">{avgRpe}</h3>
              <p className="text-xs text-highlight-400 mt-2">{t('rpe')} / 10</p>
            </Card>
          </>
        )}
      </div>

      {/* Recent Activity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="text-primary-400 w-5 h-5" />
              {t('dashRecentActivity')}
            </h3>
            <Link to="/history">
              <Button variant="ghost" className="text-xs">{t('dashViewAll')}</Button>
            </Link>
          </div>

          <div className="space-y-4">
            {isLoadingWorkouts ? (
              <>
                <Skeleton className="h-20 rounded-2xl" />
                <Skeleton className="h-20 rounded-2xl" />
                <Skeleton className="h-20 rounded-2xl" />
              </>
            ) : recentWorkouts.length === 0 ? (
              <EmptyState
                icon={<Dumbbell size={48} />}
                title={t('dashNoLogs')}
                description=""
                action={
                  <Link to="/workout">
                    <Button variant="outline">{t('dashStartWorkout')}</Button>
                  </Link>
                }
              />
            ) : (
              recentWorkouts.map((workout) => (
                <Card
                  key={workout.id}
                  className="p-4 flex items-center justify-between hover:bg-surface-800/80 transition-colors border-surface-700"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-400">
                      <TrendingUp size={24} />
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {workout.exercises.length > 0
                          ? `${workout.exercises[0].name}${workout.exercises.length > 1 ? ` + ${workout.exercises.length - 1} more` : ''}`
                          : t('dashExercises')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(workout.date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-end">
                    <p className="text-accent-400 font-medium">{t('rpe')} {workout.rpe}</p>
                    <p className="text-[10px] text-slate-500">
                      {workout.exercises.length} {t('dashExercises')}
                    </p>
                  </div>
                </Card>
              ))
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Zap className="text-accent-400 w-5 h-5" />
              {t('dashQuickActions')}
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/generate" className="block">
              <div className="p-6 h-full rounded-2xl bg-gradient-to-br from-primary-500/10 to-transparent border border-primary-500/20 hover:border-primary-500/40 transition-all group">
                <Sparkles className="text-primary-400 mb-4 transition-transform group-hover:scale-110" />
                <h4 className="text-white font-medium">{t('dashGeneratePlan')}</h4>
                <p className="text-xs text-slate-400 mt-1">{t('dashNewRoutine')}</p>
              </div>
            </Link>
            <Link to="/workout" className="block">
              <div className="p-6 h-full rounded-2xl bg-gradient-to-br from-accent-500/10 to-transparent border border-accent-500/20 hover:border-accent-500/40 transition-all group">
                <Dumbbell className="text-accent-400 mb-4 transition-transform group-hover:scale-110" />
                <h4 className="text-white font-medium">{t('dashStartWorkout')}</h4>
                <p className="text-xs text-slate-400 mt-1">{t('dashLogSession')}</p>
              </div>
            </Link>
            <Link to="/photos" className="block col-span-2">
              <div className="p-6 rounded-2xl bg-surface-900 border border-surface-700 hover:border-surface-600 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <Camera className="text-highlight-400 transition-transform group-hover:rotate-12" />
                  <div>
                    <h4 className="text-white font-medium">{t('dashProgressPhotos')}</h4>
                    <p className="text-xs text-slate-400 mt-1">{t('dashCaptureProgress')}</p>
                  </div>
                </div>
                <TrendingUp className="text-surface-700" size={24} />
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};
