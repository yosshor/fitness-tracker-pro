
import React, { lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useLanguage } from './i18n/LanguageContext';
import { Dashboard } from './components/Dashboard';
import { AuthScreen } from './components/AuthScreen';
import { NotificationToast } from './components/NotificationToast';
import { Avatar, LanguageToggle } from './components/UI';
import {
  LayoutDashboard, Dumbbell, Sparkles, Camera,
  BarChart3, LogOut, Clock, Settings as SettingsIcon, MessageCircle,
  MoreHorizontal, X as XIcon
} from 'lucide-react';

// Lazy-load non-critical routes for code splitting
const WorkoutLogger = lazy(() => import('./components/WorkoutLogger').then(m => ({ default: m.WorkoutLogger })));
const WorkoutGenerator = lazy(() => import('./components/WorkoutGenerator').then(m => ({ default: m.WorkoutGenerator })));
const ProgressPhotos = lazy(() => import('./components/ProgressPhotos').then(m => ({ default: m.ProgressPhotos })));
const Analytics = lazy(() => import('./components/Analytics').then(m => ({ default: m.Analytics })));
const WorkoutHistory = lazy(() => import('./components/WorkoutHistory').then(m => ({ default: m.WorkoutHistory })));
const Settings = lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })));
const FitnessChat = lazy(() => import('./components/FitnessChat').then(m => ({ default: m.FitnessChat })));

const RouteFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const Navigation: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const [moreOpen, setMoreOpen] = React.useState(false);

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

  // Mobile: show first 4 items + More button
  const mobileMainItems = navItems.slice(0, 4);
  const mobileMoreItems = navItems.slice(4);
  const isMoreActive = mobileMoreItems.some(item => location.pathname === item.path);

  // Close more menu on route change
  React.useEffect(() => { setMoreOpen(false); }, [location.pathname]);

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
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                  active
                    ? 'bg-primary-500/10 text-primary-400 border border-primary-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-surface-800 hover:translate-x-1 border border-transparent'
                }`}
              >
                <Icon size={20} />
                {item.label}
                {active && <div className="ms-auto w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />}
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
              <p className="text-xs text-slate-400">{user?.email}</p>
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

      {/* Mobile More Menu Overlay */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 bg-surface-950/80 backdrop-blur-sm z-50 animate-fade-in"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute bottom-0 start-0 end-0 bg-surface-900 border-t border-surface-700 rounded-t-2xl p-4 pb-6 animate-slide-up"
            style={{ paddingBottom: 'max(1.5rem, calc(var(--safe-area-bottom) + 1rem))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-sm font-semibold text-white">{t('navMore') || 'More'}</h3>
              <button onClick={() => setMoreOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 transition-all">
                <XIcon size={18} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {mobileMoreItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                      active ? 'bg-primary-500/10 text-primary-400' : 'text-slate-400 hover:text-white hover:bg-surface-800'
                    }`}
                  >
                    <Icon size={22} />
                    <span className="text-[11px] font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 start-0 end-0 bg-surface-950/90 backdrop-blur-xl border-t border-surface-800 flex justify-around p-2 z-40" style={{ paddingBottom: 'max(0.5rem, var(--safe-area-bottom))' }}>
        {mobileMainItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 ${
                active ? 'text-primary-400 scale-110' : 'text-slate-500'
              }`}
            >
              <Icon size={22} />
              <span className="text-[11px] font-medium">{item.label}</span>
              {active && <div className="w-1 h-1 rounded-full bg-primary-400" />}
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 ${
            isMoreActive || moreOpen ? 'text-primary-400 scale-110' : 'text-slate-500'
          }`}
        >
          <MoreHorizontal size={22} />
          <span className="text-[11px] font-medium">{t('navMore') || 'More'}</span>
          {isMoreActive && <div className="w-1 h-1 rounded-full bg-primary-400" />}
        </button>
      </nav>
    </>
  );
};

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-fade-in-up">
      <Suspense fallback={<RouteFallback />}>
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
      </Suspense>
    </div>
  );
};

const App: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 animate-fade-in">
          <div className="relative">
            <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-2xl scale-150" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-highlight-500 flex items-center justify-center shadow-lg shadow-primary-500/25">
              <Dumbbell className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-display font-bold text-white mb-1">
              FT <span className="text-primary-400">Pro</span>
            </h1>
            <div className="w-8 h-0.5 bg-primary-500/50 rounded-full mx-auto mt-3 animate-pulse" />
          </div>
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
          <AnimatedRoutes />
        </main>
      </div>
      <NotificationToast />
    </Router>
  );
};

export default App;
