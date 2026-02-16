
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { Button, Input, Card, LanguageToggle } from './UI';
import { Lock, Mail, User, Eye, EyeOff } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { login, loginWithGoogle, signup, resetPassword, error, clearError } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (mode === 'signup' && password !== confirmPassword) return;
    setIsLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(email, password, displayName);
      }
    } catch {}
    setIsLoading(false);
  };

  const handleReset = async () => {
    if (!email) return;
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch {}
  };

  const handleGoogleSignIn = async () => {
    clearError();
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch {}
    setIsGoogleLoading(false);
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    clearError();
    setResetSent(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-surface-900 via-surface-950 to-black relative">
      <div className="absolute top-4 end-4">
        <LanguageToggle language={language} onToggle={toggleLanguage} />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-white mb-1">
            Fitness Tracker <span className="text-primary-400">Pro</span>
          </h1>
          <p className="text-slate-500 text-sm">{t('appTagline')}</p>
        </div>

        <Card className="border-surface-700/50">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-primary-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">
              {mode === 'login' ? t('authSignIn') : t('authSignUp')}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <Input
                label={t('authDisplayName')}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="John Doe"
                icon={<User size={16} />}
              />
            )}

            <Input
              label={t('authEmail')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              icon={<Mail size={16} />}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400 ms-1">{t('authPassword')}</label>
              <div className="relative">
                <div className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-800/60 border border-surface-700 rounded-xl ps-10 pe-10 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <Input
                label={t('authConfirmPassword')}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                icon={<Lock size={16} />}
              />
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {mode === 'signup' && password && confirmPassword && password !== confirmPassword && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                Passwords do not match
              </div>
            )}

            {resetSent && (
              <div className="p-3 rounded-xl bg-accent-500/10 border border-accent-500/20 text-accent-400 text-sm">
                {t('authResetSent')}
              </div>
            )}

            <Button
              type="submit"
              className="w-full mt-2"
              variant="primary"
              disabled={isLoading || (mode === 'signup' && password !== confirmPassword)}
            >
              {isLoading ? t('loading') : mode === 'login' ? t('authSignInBtn') : t('authSignUpBtn')}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-surface-700" />
            <span className="text-xs text-slate-500">{t('authOrContinueWith')}</span>
            <div className="flex-1 h-px bg-surface-700" />
          </div>

          {/* Google Sign-In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-surface-700 bg-surface-800/50 text-white hover:bg-surface-800 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {isGoogleLoading ? t('loading') : t('authGoogleSignIn')}
          </button>

          <div className="mt-6 space-y-3">
            {mode === 'login' && (
              <button
                onClick={handleReset}
                className="text-xs text-primary-400 hover:text-primary-300 transition-colors w-full text-center"
              >
                {t('authForgotPassword')}
              </button>
            )}

            <div className="text-center">
              <span className="text-xs text-slate-500">
                {mode === 'login' ? t('authNoAccount') : t('authHasAccount')}{' '}
              </span>
              <button
                onClick={toggleMode}
                className="text-xs text-primary-400 hover:text-primary-300 font-medium transition-colors"
              >
                {mode === 'login' ? t('authSignUp') : t('authSignIn')}
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
