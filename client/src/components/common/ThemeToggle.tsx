import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  onToggle: () => void;
  variant?: 'sidebar' | 'compact';
  portal?: 'teacher' | 'admin';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  theme,
  onToggle,
  variant = 'sidebar',
  portal = 'teacher',
  className = ''
}) => {
  const isDark = theme === 'dark';
  const isTeacher = portal === 'teacher';

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={onToggle}
        title={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
        className={`relative flex items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${
          isDark
            ? 'bg-slate-800 text-amber-300 hover:bg-slate-700 hover:text-amber-200 ring-1 ring-slate-700'
            : isTeacher
            ? 'bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-700'
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
        } ${className}`}
        aria-label="Toggle theme"
      >
        {isDark ? (
          <Sun size={18} className="animate-spin-slow transition-transform hover:rotate-45" />
        ) : (
          <Moon size={18} className="transition-transform hover:-rotate-12" />
        )}
      </button>
    );
  }

  // Sidebar variant: full pill with toggle switch
  return (
    <div
      onClick={onToggle}
      className={`group relative flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all select-none border ${
        isDark
          ? 'bg-[#121a2c]/90 hover:bg-[#182238] border-slate-700/70 text-slate-200 shadow-inner'
          : isTeacher
          ? 'bg-slate-100/90 hover:bg-teal-50/80 border-slate-200 text-slate-700 shadow-xs'
          : 'bg-slate-100 hover:bg-indigo-50/80 border-slate-200 text-slate-700 shadow-xs'
      } ${className}`}
      title={isDark ? 'Bấm để chuyển sang chế độ Sáng' : 'Bấm để chuyển sang chế độ Tối'}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
            isDark
              ? 'bg-amber-400/20 text-amber-300 group-hover:bg-amber-400/30'
              : isTeacher
              ? 'bg-teal-600/10 text-teal-700 group-hover:bg-teal-600/20'
              : 'bg-indigo-600/20 text-indigo-300 group-hover:bg-indigo-600/30'
          }`}
        >
          {isDark ? (
            <Moon size={16} className="text-amber-300 animate-pulse" />
          ) : (
            <Sun size={16} className={isTeacher ? 'text-teal-600' : 'text-amber-500'} />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold leading-tight truncate">
            {isDark ? 'Chế độ Tối' : 'Chế độ Sáng'}
          </p>
          <span className="text-[10px] text-slate-400 block leading-tight truncate">
            {isDark ? 'Bấm để bật Sáng' : 'Bấm để bật Tối'}
          </span>
        </div>
      </div>

      {/* Modern Switch Capsule */}
      <div
        className={`relative h-6 w-11 rounded-full transition-colors flex items-center p-0.5 ${
          isDark ? (isTeacher ? 'bg-teal-600' : 'bg-indigo-600') : 'bg-slate-300'
        }`}
      >
        <div
          className={`h-5 w-5 rounded-full bg-white shadow-md transform transition-transform flex items-center justify-center text-[10px] ${
            isDark ? 'translate-x-5' : 'translate-x-0'
          }`}
        >
          {isDark ? '🌙' : '☀️'}
        </div>
      </div>
    </div>
  );
};
