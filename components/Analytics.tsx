
import React, { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useLanguage } from '../i18n/LanguageContext';
import { Card, Tabs, Skeleton } from './UI';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { BarChart3, Target, Activity, Flame } from 'lucide-react';

export const Analytics: React.FC = () => {
  const { user } = useAuth();
  const { workouts, isLoadingWorkouts } = useApp();
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState('all');

  const filteredWorkouts = useMemo(() => {
    if (timeRange === 'all') return workouts;
    const now = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return workouts.filter(w => new Date(w.date) >= cutoff);
  }, [workouts, timeRange]);

  const chartData = useMemo(() => {
    return [...filteredWorkouts]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(w => {
        const firstEx = w.exercises[0];
        const maxWeight = firstEx ? Math.max(...firstEx.sets.map(s => s.weight)) : 0;
        return {
          date: new Date(w.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          weight: maxWeight,
          rpe: w.rpe,
          volume: w.exercises.reduce((acc, e) => acc + e.sets.reduce((s, set) => s + (set.weight * set.reps), 0), 0)
        };
      });
  }, [filteredWorkouts]);

  const stats = useMemo(() => {
    if (filteredWorkouts.length === 0) return { avgRpe: 0, totalVol: 0, bestLift: 0 };
    const allSets = filteredWorkouts.flatMap(w => w.exercises.flatMap(e => e.sets));
    return {
      avgRpe: (filteredWorkouts.reduce((acc, w) => acc + w.rpe, 0) / filteredWorkouts.length).toFixed(1),
      totalVol: filteredWorkouts.reduce((acc, w) => acc + w.exercises.reduce((accEx, e) => accEx + e.sets.reduce((accS, s) => accS + (s.weight * s.reps), 0), 0), 0),
      bestLift: Math.max(...allSets.map(s => s.weight), 0)
    };
  }, [filteredWorkouts]);

  const timeRangeTabs = [
    { id: '7d', label: t('stats7d') },
    { id: '30d', label: t('stats30d') },
    { id: '90d', label: t('stats90d') },
    { id: 'all', label: t('statsAll') },
  ];

  if (isLoadingWorkouts) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="h-[400px]" /><Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-white">{t('statsTitle')}</h1>
        <Tabs tabs={timeRangeTabs} activeTab={timeRange} onChange={setTimeRange} />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex items-center gap-4 border-s-4 border-primary-500">
          <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-400">
            <Flame size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">{t('statsBestLift')}</p>
            <p className="text-2xl font-semibold text-white">{stats.bestLift} <span className="text-xs text-slate-400">{t('kg')}</span></p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 border-s-4 border-accent-500">
          <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-400">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">{t('statsAvgIntensity')}</p>
            <p className="text-2xl font-semibold text-white">{stats.avgRpe} <span className="text-xs text-slate-400">{t('rpe')}</span></p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 border-s-4 border-highlight-500">
          <div className="w-12 h-12 rounded-xl bg-highlight-500/10 flex items-center justify-center text-highlight-400">
            <Target size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">{t('statsLifetimeVol')}</p>
            <p className="text-2xl font-semibold text-white">{(stats.totalVol / 1000).toFixed(1)} <span className="text-xs text-slate-400">{t('tons')}</span></p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6 h-[400px] flex flex-col">
          <h3 className="text-sm font-medium text-white mb-6 flex items-center gap-2">
            <BarChart3 className="text-primary-400" size={16} /> {t('statsWeightProgress')}
          </h3>
          <div className="flex-1">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={10} />
                  <YAxis stroke="#6b7280" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: '#60a5fa' }}
                  />
                  <Area type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorWeight)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">No data for this period</div>
            )}
          </div>
        </Card>

        <Card className="p-6 h-[400px] flex flex-col">
          <h3 className="text-sm font-medium text-white mb-6 flex items-center gap-2">
            <Target className="text-accent-400" size={16} /> {t('statsIntensityVol')}
          </h3>
          <div className="flex-1">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={10} />
                  <YAxis yAxisId="left" stroke="#10b981" fontSize={10} />
                  <YAxis yAxisId="right" orientation="right" stroke="#8b5cf6" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px', fontSize: '12px' }} />
                  <Line yAxisId="left" type="monotone" dataKey="rpe" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="volume" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">No data for this period</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
