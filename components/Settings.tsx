
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { Card, Button, Input, Tabs, Avatar } from './UI';
import { SPLITS } from '../constants';
import { uploadImage } from '../services/storageService';
import { getWorkouts } from '../services/supabaseService';
import { Key, Globe, Upload, Trash2, Download, Check } from 'lucide-react';

export const Settings: React.FC = () => {
  const { user, updateProfile, logout } = useAuth();
  const { settings, updateSettings } = useApp();
  const { t, language, setLanguage } = useLanguage();
  const { addNotification } = useNotification();
  const [activeTab, setActiveTab] = useState('profile');

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [selectedSplit, setSelectedSplit] = useState(user?.currentSplit || 'Full Body');
  const [volume, setVolume] = useState(user?.volumePerMuscle || 2);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [geminiKey, setGeminiKey] = useState(settings.geminiApiKey || '');

  useEffect(() => {
    setGeminiKey(settings.geminiApiKey || '');
  }, [settings]);

  const saveProfile = async () => {
    await updateProfile({ displayName, currentSplit: selectedSplit as any, volumePerMuscle: volume });
    addNotification('success', t('success'));
  };

  const saveApiKeys = async () => {
    await updateSettings({ geminiApiKey: geminiKey });
    addNotification('success', t('success'));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsUploadingPhoto(true);
    try {
      const result = await uploadImage(file, user.id, 'profiles');
      await updateProfile({ profilePhotoUrl: result.url });
      addNotification('success', 'Profile photo updated');
    } catch {
      addNotification('error', 'Failed to upload photo');
    }
    setIsUploadingPhoto(false);
  };

  const exportData = async () => {
    if (!user) return;
    try {
      const workouts = await getWorkouts(user.id, 1000);
      const blob = new Blob([JSON.stringify(workouts, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fitness-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addNotification('success', 'Data exported');
    } catch {
      addNotification('error', 'Export failed');
    }
  };

  const tabs = [
    { id: 'profile', label: t('settingsProfile') },
    { id: 'api', label: t('settingsApiKeys') },
    { id: 'language', label: t('settingsLanguage') },
    { id: 'data', label: t('settingsData') },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <header>
        <h1 className="text-2xl font-semibold text-white">{t('settingsTitle')}</h1>
      </header>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'profile' && (
        <Card className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar src={user?.profilePhotoUrl} name={user?.displayName || 'U'} size="lg" />
            <div>
              <p className="text-white font-medium">{user?.displayName}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <label className="mt-2 inline-flex items-center gap-2 text-xs text-primary-400 hover:text-primary-300 cursor-pointer transition-colors">
                <Upload size={14} />
                {isUploadingPhoto ? t('loading') : t('settingsChangePhoto')}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
          </div>
          <Input label={t('settingsDisplayName')} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <div>
            <label className="text-xs font-medium text-slate-400 ms-1 block mb-2">{t('settingsSplit')}</label>
            <div className="grid grid-cols-2 gap-2">
              {SPLITS.map(split => (
                <button key={split.id} onClick={() => setSelectedSplit(split.id as any)}
                  className={`p-3 rounded-xl border text-sm transition-all text-start ${selectedSplit === split.id ? 'border-primary-500 bg-primary-500/10 text-primary-400' : 'border-surface-700 text-slate-500 hover:border-surface-600'}`}>
                  {split.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 ms-1 block mb-2">{t('settingsVolume')}: {volume}</label>
            <input type="range" min={1} max={4} value={volume} onChange={(e) => setVolume(parseInt(e.target.value))}
              className="w-full h-1.5 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-primary-500" />
          </div>
          <Button variant="primary" onClick={saveProfile}><Check size={16} /> {t('settingsSave')}</Button>
        </Card>
      )}

      {activeTab === 'api' && (
        <Card className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-white font-medium flex items-center gap-2"><Key size={16} className="text-highlight-400" /> {t('settingsGeminiKey')}</h3>
            <p className="text-xs text-slate-500">{t('settingsGeminiHint')}</p>
          </div>
          <Input value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} placeholder="AIza..." type="password" />
          <Button variant="primary" onClick={saveApiKeys}><Check size={16} /> {t('settingsSave')}</Button>
        </Card>
      )}

      {activeTab === 'language' && (
        <Card className="space-y-6">
          <h3 className="text-white font-medium flex items-center gap-2"><Globe size={16} className="text-primary-400" /> {t('settingsLanguage')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setLanguage('en')}
              className={`p-4 rounded-xl border text-center transition-all ${language === 'en' ? 'border-primary-500 bg-primary-500/10 text-primary-400' : 'border-surface-700 text-slate-400 hover:border-surface-600'}`}>
              <span className="text-2xl block mb-1">EN</span>
              <span className="text-sm font-medium">English</span>
            </button>
            <button onClick={() => setLanguage('he')}
              className={`p-4 rounded-xl border text-center transition-all ${language === 'he' ? 'border-primary-500 bg-primary-500/10 text-primary-400' : 'border-surface-700 text-slate-400 hover:border-surface-600'}`}>
              <span className="text-2xl block mb-1">עב</span>
              <span className="text-sm font-medium">עברית</span>
            </button>
          </div>
        </Card>
      )}

      {activeTab === 'data' && (
        <Card className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-surface-800/50 rounded-xl border border-surface-700/30">
            <div>
              <h3 className="text-white font-medium flex items-center gap-2"><Download size={16} /> {t('settingsExportData')}</h3>
              <p className="text-xs text-slate-500 mt-1">{t('settingsExportDesc')}</p>
            </div>
            <Button variant="outline" onClick={exportData}>Export</Button>
          </div>
          <div className="flex items-center justify-between p-4 bg-red-500/5 rounded-xl border border-red-500/10">
            <div>
              <h3 className="text-red-400 font-medium flex items-center gap-2"><Trash2 size={16} /> {t('settingsDeleteAccount')}</h3>
              <p className="text-xs text-slate-500 mt-1">{t('settingsDeleteDesc')}</p>
            </div>
            <Button variant="danger">{t('delete')}</Button>
          </div>
          <div className="pt-4 border-t border-surface-700/30">
            <Button variant="danger" className="w-full" onClick={logout}>{t('authLogout')}</Button>
          </div>
        </Card>
      )}
    </div>
  );
};
