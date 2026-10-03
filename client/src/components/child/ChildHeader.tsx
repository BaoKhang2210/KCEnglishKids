import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Star, LogOut, Map, Compass, BookOpen, Gamepad2, Award, BookMarked, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sfx } from '../../utils/audio';
import { KokoMascot } from './KokoMascot';
import { ChildBadgesModal } from './ChildBadgesModal';

interface ChildHeaderProps {
  totalStars?: number;
  completedCount?: number;
  activeTab?: string;
}

export const ChildHeader: React.FC<ChildHeaderProps> = ({
  totalStars = 0,
  completedCount = 0,
  activeTab: propActiveTab
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showBadgesModal, setShowBadgesModal] = useState(false);

  const handleLogout = () => {
    sfx.playPop();
    logout();
    navigate('/login');
  };

  const handleNav = (tab: string) => {
    sfx.playPop();
    if (tab === 'path') {
      navigate('/');
    } else {
      navigate(`/?tab=${tab}`);
    }
  };

  const currentAge = user?.ageGroupCode || '3-4';
  const searchParams = new URLSearchParams(location.search);
  const currentTab = propActiveTab || searchParams.get('tab') || (location.pathname.startsWith('/topics') ? 'topics' : 'path');

  const isPathActive = currentTab === 'path' && !location.pathname.startsWith('/topics');
  const isTopicsActive = currentTab === 'topics' || location.pathname.startsWith('/topics');
  const isVocabActive = currentTab === 'vocab';
  const isGamesActive = currentTab === 'games' || currentTab === 'arcade';
  const isBadgesActive = currentTab === 'badges';

  const ageOptions: { code: string; book: string; ageLabel: string; color: string }[] = [
    { code: '3-4', book: 'Book 1', ageLabel: '3–4 tuổi', color: 'bg-amber-100 text-amber-900 border-amber-300' },
    { code: '4-5', book: 'Book 2', ageLabel: '4–5 tuổi', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
    { code: '5-6', book: 'Book 3', ageLabel: '5–6 tuổi', color: 'bg-sky-100 text-sky-900 border-sky-300' }
  ];

  const currentOption = ageOptions.find(o => o.code === currentAge) || ageOptions[0];

  return (
    <>
      <header className="bg-white/95 backdrop-blur-md border-b-4 border-amber-200 px-3 sm:px-6 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl w-full mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo & Mascot Mini */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => handleNav('path')}
              className="flex items-center gap-2.5 group cursor-pointer focus:outline-none"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-400 p-0.5 shadow-md group-hover:scale-105 transition-transform flex items-center justify-center flex-shrink-0">
                <KokoMascot state="happy" size="sm" interactive={false} />
              </div>
              <div className="text-left hidden xs:block">
                <span className="font-black text-2xl sm:text-3xl bg-gradient-to-r from-amber-600 via-orange-500 to-pink-600 bg-clip-text text-transparent">
                  KCEnglishKids
                </span>
                <span className="block text-xs font-black text-amber-600 uppercase tracking-wider">
                  Mầm Non 3–6 Tuổi
                </span>
              </div>
            </button>

            {/* Desktop navigation: 5 destinations with distinct vibrant active lights */}
            <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l-2 border-amber-200">
              <button
                onClick={() => handleNav('path')}
                className={`px-4.5 py-2.5 rounded-2xl text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
                  isPathActive
                    ? 'bg-amber-400 text-amber-950 shadow-md shadow-amber-400/30 ring-2 ring-amber-300 scale-105'
                    : 'text-slate-600 hover:bg-amber-50 hover:text-amber-900'
                }`}
              >
                <Map className="w-5 h-5" />
                <span>Hành trình</span>
              </button>

              <button
                onClick={() => handleNav('topics')}
                className={`px-4.5 py-2.5 rounded-2xl text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
                  isTopicsActive
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-300 scale-105'
                    : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900'
                }`}
              >
                <Compass className="w-5 h-5" />
                <span>Chủ đề mở rộng</span>
              </button>

              <button
                onClick={() => handleNav('vocab')}
                className={`px-4.5 py-2.5 rounded-2xl text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
                  isVocabActive
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 ring-2 ring-rose-300 scale-105'
                    : 'text-slate-600 hover:bg-rose-50 hover:text-rose-900'
                }`}
              >
                <BookMarked className="w-5 h-5" />
                <span>Sổ từ vựng</span>
              </button>

              <button
                onClick={() => handleNav('games')}
                className={`px-4.5 py-2.5 rounded-2xl text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
                  isGamesActive
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30 ring-2 ring-sky-300 scale-105'
                    : 'text-slate-600 hover:bg-sky-50 hover:text-sky-900'
                }`}
              >
                <Gamepad2 className="w-5 h-5" />
                <span>Trò chơi</span>
              </button>

              <button
                onClick={() => handleNav('badges')}
                className={`px-4.5 py-2.5 rounded-2xl text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
                  isBadgesActive
                    ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30 ring-2 ring-purple-300 scale-105'
                    : 'text-slate-600 hover:bg-purple-50 hover:text-purple-900'
                }`}
              >
                <Award className="w-5 h-5" />
                <span>Huy hiệu</span>
              </button>
            </div>
          </div>

          {/* The assigned class is read-only: a child cannot switch books. */}
          <div className="hidden sm:flex items-center gap-1.5 bg-amber-50 border-2 border-amber-300 px-3 py-1.5 rounded-2xl shadow-xs" title="Lớp học được giáo viên gán">
              <BookOpen className="w-4 h-4 text-amber-600" />
              <div className="text-left">
                <span className="text-xs font-black text-amber-950 block leading-tight">
                  {currentOption.book}
                </span>
                <span className="text-[10px] font-bold text-amber-700 block -mt-0.5">
                  ({currentOption.ageLabel})
                </span>
              </div>
          </div>

          {/* User Info & Interactive Star Jar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Clickable Star Jar Counter (Opens Badges Modal) */}
            <button
              onClick={() => {
                sfx.playPop();
                setShowBadgesModal(true);
              }}
              title="Xem huy hiệu & sao của bé"
              className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-200 border-3 border-amber-300 px-3 sm:px-4 py-1 sm:py-1.5 rounded-2xl shadow-sm animate-pulse-glow cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            >
              <Star className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 fill-amber-400 animate-soft-bounce" />
              <div className="flex flex-col text-left">
                <span className="font-black text-base sm:text-lg text-amber-900 leading-tight">
                  {totalStars}
                </span>
                <span className="text-[8px] sm:text-[9px] font-black text-amber-700 uppercase tracking-widest hidden xs:block">
                  Ngôi sao
                </span>
              </div>
            </button>

            {/* Child Profile Pill (Clickable) */}
            {user && (
              <button
                onClick={() => {
                  sfx.playPop();
                  setShowBadgesModal(true);
                }}
                className="hidden sm:flex items-center gap-2 bg-slate-100 hover:bg-amber-50 border-2 border-slate-200 hover:border-amber-300 pl-1.5 pr-3 py-1 rounded-2xl cursor-pointer transition-all"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center p-0.5">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-base">🦁</span>
                  )}
                </div>
                <span className="font-black text-xs sm:text-sm text-slate-800">
                  {user.name}
                </span>
              </button>
            )}

            {/* Change Password */}
            <button
              onClick={() => {
                sfx.playPop();
                navigate('/child/change-pin');
              }}
              title="Đổi mật khẩu của bé"
              aria-label="Đổi mật khẩu của bé"
              className="p-2 rounded-2xl bg-slate-100 hover:bg-amber-100 text-slate-500 hover:text-amber-700 border border-slate-200 transition-colors cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
            </button>

            {/* Switch Player / Logout */}
            <button
              onClick={handleLogout}
              title="Đổi tài khoản bé"
              aria-label="Đăng xuất"
              className="p-2 rounded-2xl bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Badges & Stars Modal */}
      <ChildBadgesModal
        isOpen={showBadgesModal}
        onClose={() => setShowBadgesModal(false)}
        totalStars={totalStars}
        completedCount={completedCount}
        childName={user?.name || 'Bé'}
      />
    </>
  );
};
