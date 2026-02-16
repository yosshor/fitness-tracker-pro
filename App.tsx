
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useLanguage } from './i18n/LanguageContext';
import { Dashboard } from './components/Dashboard';
import { WorkoutLogger } from './components/WorkoutLogger';
import { WorkoutGenerator } from './components/WorkoutGenerator';
import { ProgressPhotos } from './components/ProgressPhotos';
import { Analytics } from './components/Analytics';
import { WorkoutHistory } from './components/WorkoutHistory';
import { Settings } from './components/Settings';
import { FitnessChat } from './components/FitnessChat';
import { AuthScreen } from './components/AuthScreen';
import { NotificationToast } from './components/NotificationToast';
import { Avatar, LanguageToggle } from './components/UI';
import {
  LayoutDashboard, Dumbbell, Sparkles, Camera,
  BarChart3, LogOut, Clock, Settings as SettingsIcon, MessageCircle
} from 'lucide-react';

const Navigation: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();

  const navItems = [
    { path: '/', label: t('navOverview'), icon: LayoutDashboard },
    { path: '/workout', label: t('navSession'), icon: Dumbbell },
    { path: '/generate', label: t('navGenerate'), icon: Sparkles },
    { path: '/photos', label: t('navPhotos'), icon: Camera },
    { path: '/stats', label: t('navStats'), icon: BarChart3 },
    { path: '/history', label: t('navHistory'), icon: Clock },
    { path: '/chat', label: t('navChat'), icon: MessageCircle },
    { path: '/settings', label: t('navSettings'), icon: SettingsIcon },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen fixed start-0 top-0 bg-surface-950 border-e border-surface-800 p-6 z-40">
        <div className="mb-10">
          <h1 className="text-2xl font-display font-bold text-white">
            FT <span className="text-primary-400">Pro</span>
          </h1>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                  active
                    ? 'bg-primary-500/10 text-primary-400 border border-primary-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-surface-800 border border-transparent'
                }`}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-surface-800">
          <div className="flex items-center gap-3 mb-4 px-4">
            <Avatar
              src={user?.profilePhotoUrl}
              name={user?.displayName || 'User'}
              size="md"
            />
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-medium text-white truncate">
                {user?.displayName}
              </p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 mb-3">
            <LanguageToggle
              language={language}
              onToggle={toggleLanguage}
              className="text-slate-400"
            />
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 transition-colors w-full rounded-xl hover:bg-surface-800 text-sm font-medium"
          >
            <LogOut size={18} />
            {t('authLogout')}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 start-0 end-0 bg-surface-950/90 backdrop-blur-xl border-t border-surface-800 flex justify-around p-2 z-50">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                active ? 'text-primary-400' : 'text-slate-500'
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
};

const App: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthScreen />
        <NotificationToast />
      </>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-surface-950 pb-24 md:pb-0 md:ps-64">
        <Navigation />

        <main className="p-4 md:p-8 max-w-6xl mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/workout" element={<WorkoutLogger />} />
            <Route path="/generate" element={<WorkoutGenerator />} />
            <Route path="/photos" element={<ProgressPhotos />} />
            <Route path="/stats" element={<Analytics />} />
            <Route path="/history" element={<WorkoutHistory />} />
            <Route path="/chat" element={<FitnessChat />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <NotificationToast />
    </Router>
  );
};

export default App;
