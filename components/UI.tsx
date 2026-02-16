
import React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

// ─── Button ───

export const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}> = ({ children, onClick, variant = 'primary', className = '', disabled, type = 'button' }) => {
  const base = "px-4 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm";
  const variants = {
    primary: "bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-500/20 font-semibold",
    secondary: "bg-accent-500 text-white hover:bg-accent-600 shadow-lg shadow-accent-500/20 font-semibold",
    outline: "border border-surface-700 text-slate-300 hover:bg-surface-800 hover:text-white hover:border-surface-600",
    ghost: "bg-transparent text-slate-400 hover:text-white hover:bg-surface-800",
    danger: "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

// ─── Card ───

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`glass-card rounded-2xl p-6 card-elevated ${className}`}>
    {children}
  </div>
);

// ─── Input ───

export const Input: React.FC<{
  label?: string;
  placeholder?: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  icon?: React.ReactNode;
}> = ({ label, placeholder, type = 'text', value, onChange, className = '', icon }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    {label && <label className="text-xs font-medium text-slate-400 ms-1">{label}</label>}
    <div className="relative">
      {icon && <div className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500">{icon}</div>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full bg-surface-800/60 border border-surface-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all text-sm ${icon ? 'ps-10' : ''}`}
      />
    </div>
  </div>
);

// ─── Modal ───

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-card w-full max-w-lg rounded-2xl overflow-hidden card-elevated animate-scale-in">
        <div className="p-4 border-b border-surface-700/50 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-surface-700 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// ─── Slider ───

export const Slider: React.FC<{
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (val: number) => void;
}> = ({ label, min, max, value, onChange }) => (
  <div className="flex flex-col gap-2">
    <div className="flex justify-between items-center px-1">
      <label className="text-xs font-medium text-slate-400">{label}</label>
      <span className="text-primary-400 font-semibold text-sm">{value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="w-full h-1.5 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
    />
  </div>
);

// ─── Badge ───

export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'accent' | 'highlight' | 'neutral';
  className?: string;
}> = ({ children, variant = 'primary', className = '' }) => {
  const variants = {
    primary: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
    accent: 'bg-accent-500/10 text-accent-400 border-accent-500/20',
    highlight: 'bg-highlight-500/10 text-highlight-400 border-highlight-500/20',
    neutral: 'bg-surface-700/50 text-slate-400 border-surface-600/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

// ─── Skeleton ───

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton ${className}`}></div>
);

// ─── Toast ───

export const Toast: React.FC<{
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  onClose: () => void;
}> = ({ type, message, onClose }) => {
  const icons = {
    success: <CheckCircle size={18} className="text-accent-400" />,
    error: <AlertCircle size={18} className="text-red-400" />,
    info: <Info size={18} className="text-primary-400" />,
    warning: <AlertTriangle size={18} className="text-yellow-400" />,
  };
  const borders = {
    success: 'border-accent-500/30',
    error: 'border-red-500/30',
    info: 'border-primary-500/30',
    warning: 'border-yellow-500/30',
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl glass-card border ${borders[type]} animate-slide-up min-w-[280px]`}>
      {icons[type]}
      <p className="text-sm text-slate-200 flex-1">{message}</p>
      <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
        <X size={14} />
      </button>
    </div>
  );
};

// ─── Tabs ───

export const Tabs: React.FC<{
  tabs: { id: string; label: string }[];
  activeTab: string;
  onChange: (id: string) => void;
}> = ({ tabs, activeTab, onChange }) => (
  <div className="flex gap-1 bg-surface-800/50 p-1 rounded-xl border border-surface-700/30 overflow-x-auto">
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
          activeTab === tab.id
            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
            : 'text-slate-400 hover:text-white hover:bg-surface-700/50'
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

// ─── EmptyState ───

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="text-surface-600 mb-4">{icon}</div>
    <h3 className="text-lg font-semibold text-slate-300 mb-1">{title}</h3>
    <p className="text-sm text-slate-500 mb-6 max-w-sm">{description}</p>
    {action}
  </div>
);

// ─── Avatar ───

export const Avatar: React.FC<{
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ src, name, size = 'md', className = '' }) => {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' };
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (src) {
    return <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover ring-2 ring-surface-700 ${className}`} />;
  }
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-primary-500 to-highlight-500 flex items-center justify-center font-semibold text-white ring-2 ring-surface-700 ${className}`}>
      {initials}
    </div>
  );
};

// ─── LanguageToggle ───

export const LanguageToggle: React.FC<{
  language: 'en' | 'he';
  onToggle: () => void;
  className?: string;
}> = ({ language, onToggle, className = '' }) => (
  <button
    onClick={onToggle}
    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border border-surface-700 hover:bg-surface-800 transition-all ${className}`}
  >
    {language === 'en' ? 'עב' : 'EN'}
  </button>
);

// ─── ProgressBar ───

export const ProgressBar: React.FC<{
  progress: number;
  className?: string;
}> = ({ progress, className = '' }) => (
  <div className={`w-full h-1.5 bg-surface-700 rounded-full overflow-hidden ${className}`}>
    <div
      className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500"
      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
    />
  </div>
);
