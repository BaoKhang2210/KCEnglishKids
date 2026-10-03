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
      {/* Thêm overflow-x-auto và hide-scrollbar để cho phép lướt ngang mượt mà trên màn hình nhỏ mà không bị vỡ layout */}
      <header className="bg-white/95 backdrop-blur-md border-b-4 border-amber-200 px-3 sm:px-6 py-2 sm:py-3 sticky top-0 z-30 shadow-sm min-h-[90px] flex items-center overflow-x-auto no-scrollbar">
        <div className="max-w-[1700px] min-w-max w-full mx-auto flex items-center justify-between gap-4">
          
          {/* Brand Logo & Mascot Mini */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={() => handleNav('path')}
              className="flex items-center gap-2 sm:gap-3 group cursor-pointer focus:outline-none"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-400 p-1 shadow-md group-hover:scale-105 transition-transform flex items-center justify-center flex-shrink-0">
                <KokoMascot state="happy" size="sm" interactive={false} />
              </div>
              <div className="text-left hidden md:block whitespace-nowrap">
                <span 
                  className="font-black text-xl lg:text-3xl bg-gradient-to-r from-amber-600 via-orange-500 to-pink-600 bg-clip-text text-transparent block"
                  style={{ fontFamily: "'Quicksand', 'Nunito', sans-serif" }}
                >
                  KCEnglishKids
                </span>
                <span className="block text-[10px] lg:text-[11px] font-black text-amber-600 uppercase tracking-wider">
                  Mầm Non 3–6 Tuổi
                </span>
              </div>
            </button>

            {/* Desktop navigation: 5 destinations */}
            <div className="hidden xl:flex items-center gap-2 2xl:gap-4 ml-4 2xl:ml-6 pl-4 2xl:pl-6 border-l-[3px] border-amber-200 flex-shrink-0">
              
              <button
                onClick={() => handleNav('path')}
                className={`px-3 2xl:px-5 py-2 2xl:py-2.5 rounded-[20px] font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                  isPathActive
                    ? 'bg-amber-400 text-amber-950 shadow-[0_4px_0_#b45309] scale-105 translate-y-[-2px]'
                    : 'text-slate-600 hover:bg-amber-50 hover:text-amber-900 border-2 border-transparent hover:border-amber-200 hover:shadow-sm'
                }`}
                style={{ fontFamily: "'Quicksand', 'Nunito', sans-serif" }}
              >
                <Map className={`w-6 h-6 2xl:w-7 2xl:h-7 ${isPathActive ? 'text-amber-900' : 'text-slate-500'}`} />
                <span className="text-[14px] 2xl:text-[16px] leading-none">Hành trình</span>
              </button>

              <button
                onClick={() => handleNav('topics')}
                className={`px-3 2xl:px-5 py-2 2xl:py-2.5 rounded-[20px] font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                  isTopicsActive
                    ? 'bg-emerald-500 text-white shadow-[0_4px_0_#047857] scale-105 translate-y-[-2px]'
                    : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900 border-2 border-transparent hover:border-emerald-200 hover:shadow-sm'
                }`}
                style={{ fontFamily: "'Quicksand', 'Nunito', sans-serif" }}
              >
                <Compass className={`w-6 h-6 2xl:w-7 2xl:h-7 ${isTopicsActive ? 'text-white' : 'text-slate-500'}`} />
                <span className="text-[14px] 2xl:text-[16px] leading-none">Chủ đề</span>
              </button>

              <button
                onClick={() => handleNav('vocab')}
                className={`px-3 2xl:px-5 py-2 2xl:py-2.5 rounded-[20px] font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                  isVocabActive
                    ? 'bg-rose-500 text-white shadow-[0_4px_0_#be123c] scale-105 translate-y-[-2px]'
                    : 'text-slate-600 hover:bg-rose-50 hover:text-rose-900 border-2 border-transparent hover:border-rose-200 hover:shadow-sm'
                }`}
                style={{ fontFamily: "'Quicksand', 'Nunito', sans-serif" }}
              >
                <BookMarked className={`w-6 h-6 2xl:w-7 2xl:h-7 ${isVocabActive ? 'text-white' : 'text-slate-500'}`} />
                <span className="text-[14px] 2xl:text-[16px] leading-none">Từ vựng</span>
              </button>

              <button
                onClick={() => handleNav('games')}
                className={`px-3 2xl:px-5 py-2 2xl:py-2.5 rounded-[20px] font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                  isGamesActive
                    ? 'bg-sky-500 text-white shadow-[0_4px_0_#0369a1] scale-105 translate-y-[-2px]'
                    : 'text-slate-600 hover:bg-sky-50 hover:text-sky-900 border-2 border-transparent hover:border-sky-200 hover:shadow-sm'
                }`}
                style={{ fontFamily: "'Quicksand', 'Nunito', sans-serif" }}
              >
                <Gamepad2 className={`w-6 h-6 2xl:w-7 2xl:h-7 ${isGamesActive ? 'text-white' : 'text-slate-500'}`} />
                <span className="text-[14px] 2xl:text-[16px] leading-none">Trò chơi</span>
              </button>

              <button
                onClick={() => handleNav('badges')}
                className={`px-3 2xl:px-5 py-2 2xl:py-2.5 rounded-[20px] font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                  isBadgesActive
                    ? 'bg-purple-500 text-white shadow-[0_4px_0_#6d28d9] scale-105 translate-y-[-2px]'
                    : 'text-slate-600 hover:bg-purple-50 hover:text-purple-900 border-2 border-transparent hover:border-purple-200 hover:shadow-sm'
                }`}
                style={{ fontFamily: "'Quicksand', 'Nunito', sans-serif" }}
              >
                <Award className={`w-6 h-6 2xl:w-7 2xl:h-7 ${isBadgesActive ? 'text-white' : 'text-slate-500'}`} />
                <span className="text-[14px] 2xl:text-[16px] leading-none">Huy hiệu</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 2xl:gap-4 flex-shrink-0">
            {/* The assigned class is read-only: a child cannot switch books. */}
            <div className="hidden lg:flex items-center gap-1.5 2xl:gap-2.5 bg-amber-50 border-[3px] border-amber-300 px-3 py-1.5 2xl:px-4 2xl:py-2.5 rounded-[20px] shadow-sm" title="Lớp học được giáo viên gán">
                <BookOpen className="w-5 h-5 2xl:w-6 2xl:h-6 text-amber-600" />
                <div className="text-left whitespace-nowrap">
                  <span className="text-[14px] 2xl:text-[15px] font-black text-amber-950 block leading-tight" style={{ fontFamily: "'Quicksand', 'Nunito', sans-serif" }}>
                    {currentOption.book}
                  </span>
                  <span className="text-[10px] 2xl:text-[11px] font-bold text-amber-700 block mt-0.5">
                    ({currentOption.ageLabel})
                  </span>
                </div>
            </div>

            {/* User Info & Interactive Star Jar */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Clickable Star Jar Counter (Opens Badges Modal) */}
              <button
                onClick={() => {
                  sfx.playPop();
                  setShowBadgesModal(true);
                }}
                title="Xem huy hiệu & sao của bé"
                className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-200 border-[3px] border-amber-400 px-3 sm:px-4 py-1.5 sm:py-2.5 rounded-[20px] shadow-[0_4px_0_#d97706] animate-pulse-glow cursor-pointer hover:scale-105 active:scale-95 transition-transform"
              >
                <Star className="w-6 h-6 sm:w-7 sm:h-7 text-amber-500 fill-amber-400 animate-soft-bounce" />
                <div className="flex flex-col text-left whitespace-nowrap">
                  <span 
                    className="font-black text-[18px] sm:text-[22px] text-amber-950 leading-none"
                    style={{ fontFamily: "'Quicksand', 'Nunito', sans-serif" }}
                  >
                    {totalStars}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-black text-amber-700 uppercase tracking-widest hidden xs:block mt-1">
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
                  className="hidden md:flex items-center gap-2 sm:gap-3 bg-slate-50 hover:bg-amber-50 border-[3px] border-slate-200 hover:border-amber-300 pl-1.5 pr-3 py-1 sm:py-1.5 rounded-[20px] cursor-pointer transition-all shadow-sm"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-[14px] bg-amber-100 border-2 border-amber-300 flex items-center justify-center p-0.5 overflow-hidden flex-shrink-0">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-lg sm:text-xl">🦁</span>
                    )}
                  </div>
                  <span 
                    className="font-black text-[15px] sm:text-[17px] text-slate-800 whitespace-nowrap"
                    style={{ fontFamily: "'Quicksand', 'Nunito', sans-serif" }}
                  >
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
                className="p-2 sm:p-3.5 rounded-[18px] bg-slate-50 hover:bg-amber-100 text-slate-500 hover:text-amber-700 border-[3px] border-slate-200 hover:border-amber-300 shadow-sm transition-colors cursor-pointer flex-shrink-0"
              >
                <KeyRound className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Switch Player / Logout */}
              <button
                onClick={handleLogout}
                title="Đổi tài khoản bé"
                aria-label="Đăng xuất"
                className="p-2 sm:p-3.5 rounded-[18px] bg-slate-50 hover:bg-rose-100 text-slate-400 hover:text-rose-600 border-[3px] border-slate-200 hover:border-rose-300 shadow-sm transition-colors cursor-pointer flex-shrink-0"
              >
                <LogOut className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
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
