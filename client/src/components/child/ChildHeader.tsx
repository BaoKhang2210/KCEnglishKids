import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Map, Compass, BookOpen, Gamepad2, Award, BookMarked, KeyRound, PlayCircle, BookOpenCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sfx } from '../../utils/audio';
import { KokoMascot } from './KokoMascot';
import { ChildBadgesModal } from './ChildBadgesModal';
import { ChildProfileModal, getChildAvatarEmoji } from './ChildProfileModal';
import { ParentNotebookModal } from './ParentNotebookModal';
import { DailyStreakBadge } from './DailyStreakBadge';
import { DailyStreakModal } from './DailyStreakModal';
import { streakApi, parentNotificationApi } from '../../services/api';
import type { ChildStreakData } from '../../types';

interface ChildHeaderProps {
  totalStars?: number;
  completedCount?: number;
  activeTab?: string;
  streakData?: ChildStreakData | null;
  onStreakUpdate?: (updated: ChildStreakData) => void;
}

export const ChildHeader: React.FC<ChildHeaderProps> = ({
  totalStars = 0,
  completedCount = 0,
  activeTab: propActiveTab,
  streakData: propStreakData,
  onStreakUpdate
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showBadgesModal, setShowBadgesModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [avatarImgError, setAvatarImgError] = useState(false);
  const [showParentModal, setShowParentModal] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [localStreakData, setLocalStreakData] = useState<ChildStreakData | null>(propStreakData || null);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  useEffect(() => {
    if (propStreakData) {
      setLocalStreakData(propStreakData);
      return;
    }
    const childId = user?.id || (user as any)?._id;
    if (childId && user?.role === 'CHILD') {
      streakApi.getStreak(childId)
        .then((res) => {
          if (res.success && res.data) {
            setLocalStreakData(res.data);
          }
        })
        .catch((err) => {
          console.error('Failed to load streak in header:', err);
        });

      parentNotificationApi.getChildNotificationsForParent(childId)
        .then((res) => {
          const list = res.data || [];
          const unread = list.filter((n: any) => !n.readAt).length;
          setUnreadNotifCount(unread);
        })
        .catch(() => {
          setUnreadNotifCount(0);
        });
    }
  }, [propStreakData, user]);

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
  const currentTab = propActiveTab || searchParams.get('tab') || (location.pathname.startsWith('/topics') ? 'topics' : location.pathname.startsWith('/videos') ? 'videos' : 'path');

  const isPathActive = currentTab === 'path' && !location.pathname.startsWith('/topics') && !location.pathname.startsWith('/videos');
  const isTopicsActive = currentTab === 'topics' || location.pathname.startsWith('/topics');
  const isVideosActive = currentTab === 'videos' || location.pathname.startsWith('/videos');
  const isVocabActive = currentTab === 'vocab';
  const isGamesActive = currentTab === 'games' || currentTab === 'arcade';
  const isDiaryActive = currentTab === 'diary' || currentTab === 'history';
  const isBadgesActive = currentTab === 'badges';

  const ageOptions: { code: string; book: string; ageLabel: string; color: string }[] = [
    { code: '3-4', book: 'Book 1', ageLabel: '3–4 tuổi', color: 'bg-amber-100 text-amber-900 border-amber-300' },
    { code: '4-5', book: 'Book 2', ageLabel: '4–5 tuổi', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
    { code: '5-6', book: 'Book 3', ageLabel: '5–6 tuổi', color: 'bg-sky-100 text-sky-900 border-sky-300' }
  ];

  const currentOption = ageOptions.find(o => o.code === currentAge) || ageOptions[0];

  return (
    <>
      {/* Compact ChildHeader: fixed slim height so 100dvh screens never overflow */}
      <header className="w-full border-b border-amber-200/70 bg-[#fffdf8]/95 backdrop-blur-md px-4 sm:px-8 h-16 sm:h-20 sticky top-0 z-30 shadow-[0_4px_20px_rgba(245,158,11,0.06)] outline-none ring-0 flex items-center shrink-0">
        <div className="w-full flex items-center justify-between gap-3 sm:gap-6">
          
          {/* Brand Logo & Mascot Mini */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={() => handleNav('path')}
              className="flex items-center gap-2 sm:gap-3 group cursor-pointer focus:outline-none"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-amber-400 p-0.5 shadow-sm group-hover:scale-105 transition-transform flex items-center justify-center flex-shrink-0">
                <KokoMascot state="happy" size="sm" interactive={false} />
              </div>
              <div className="text-left hidden md:block whitespace-nowrap">
                <span 
                  className="font-black text-lg lg:text-2xl bg-gradient-to-r from-amber-600 via-orange-500 to-pink-600 bg-clip-text text-transparent block leading-tight"
                  style={{ fontFamily: "'Quicksand', 'Nunito', sans-serif" }}
                >
                  KCEnglishKids
                </span>
                <span className="block text-[10px] lg:text-[11px] font-black text-amber-700 uppercase tracking-wider">
                  Mầm Non 3–6 Tuổi
                </span>
              </div>
            </button>

            {/* Desktop navigation: 6 destinations */}
            <div className="hidden xl:flex items-center gap-1 2xl:gap-2 ml-2 2xl:ml-6 pl-2 2xl:pl-6 border-l-2 border-amber-200/80 flex-shrink-0">
              
              <button
                onClick={() => handleNav('path')}
                className={`px-2 2xl:px-4 py-2 2xl:py-2.5 rounded-[20px] font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                  isPathActive
                    ? 'bg-amber-400 text-amber-950 shadow-[inset_0_-3px_0_#b45309]'
                    : 'text-slate-600 hover:bg-amber-100/70 hover:text-amber-900 border-2 border-transparent hover:border-amber-200 shadow-2xs'
                }`}
                style={{ fontFamily: "'Quicksand', 'Nunito', sans-serif" }}
              >
                <Map className={`w-6 h-6 2xl:w-7 2xl:h-7 ${isPathActive ? 'text-amber-900' : 'text-slate-400'}`} />
                <span className="text-[14px] 2xl:text-[16px] leading-none">Hành trình</span>
              </button>

              <button
                onClick={() => handleNav('topics')}
                className={`px-2 2xl:px-4 py-2 2xl:py-2.5 rounded-[20px] font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                  isTopicsActive
                    ? 'bg-emerald-500 text-white shadow-[inset_0_-3px_0_#047857]'
                    : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900 border-2 border-transparent hover:border-emerald-200 shadow-2xs'
                }`}
                style={{ fontFamily: "'Quicksand', 'Nunito', sans-serif" }}
              >
                <Compass className={`w-6 h-6 2xl:w-7 2xl:h-7 ${isTopicsActive ? 'text-white' : 'text-slate-500'}`} />
                <span className="text-[14px] 2xl:text-[16px] leading-none">Chủ đề</span>
              </button>

              <button
                onClick={() => handleNav('videos')}
                className={`px-2 2xl:px-4 py-2 2xl:py-2.5 rounded-[20px] font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                  isVideosActive
                    ? 'bg-indigo-500 text-white shadow-[inset_0_-3px_0_#4338ca]'
                    : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-900 border-2 border-transparent hover:border-indigo-200 shadow-2xs'
                }`}
                style={{ fontFamily: "'Quicksand', 'Nunito', sans-serif" }}
              >
                <PlayCircle className={`w-6 h-6 2xl:w-7 2xl:h-7 ${isVideosActive ? 'text-white' : 'text-slate-500'}`} />
                <span className="text-[14px] 2xl:text-[16px] leading-none">Video</span>
              </button>

              <button
                onClick={() => handleNav('vocab')}
                className={`px-2 2xl:px-4 py-2 2xl:py-2.5 rounded-[20px] font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                  isVocabActive
                    ? 'bg-rose-500 text-white shadow-[inset_0_-3px_0_#be123c]'
                    : 'text-slate-600 hover:bg-rose-50 hover:text-rose-900 border-2 border-transparent hover:border-rose-200 shadow-2xs'
                }`}
                style={{ fontFamily: "'Quicksand', 'Nunito', sans-serif" }}
              >
                <BookMarked className={`w-6 h-6 2xl:w-7 2xl:h-7 ${isVocabActive ? 'text-white' : 'text-slate-500'}`} />
<span className="text-[14px] 2xl:text-[16px] leading-none">Sổ từ vựng</span>
              </button>

              <button
                onClick={() => handleNav('games')}
                className={`px-2 2xl:px-3.5 py-2 2xl:py-2.5 rounded-[20px] font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                  isGamesActive
                    ? 'bg-sky-500 text-white shadow-[inset_0_-3px_0_#0369a1]'
                    : 'text-slate-600 hover:bg-sky-50 hover:text-sky-900 border-2 border-transparent hover:border-sky-200 shadow-2xs'
                }`}
                style={{ fontFamily: "'Quicksand', 'Nunito', sans-serif" }}
              >
                <Gamepad2 className={`w-6 h-6 2xl:w-7 2xl:h-7 ${isGamesActive ? 'text-white' : 'text-slate-500'}`} />
                <span className="text-[14px] 2xl:text-[15px] leading-none">Trò chơi</span>
              </button>

              <button
                onClick={() => handleNav('diary')}
                className={`px-2 2xl:px-3.5 py-2 2xl:py-2.5 rounded-[20px] font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                  isDiaryActive
                    ? 'bg-orange-500 text-white shadow-[inset_0_-3px_0_#c2410c]'
                    : 'text-slate-600 hover:bg-orange-50 hover:text-orange-900 border-2 border-transparent hover:border-orange-200 shadow-2xs'
                }`}
                style={{ fontFamily: "'Quicksand', 'Nunito', sans-serif" }}
              >
                <BookOpenCheck className={`w-6 h-6 2xl:w-7 2xl:h-7 ${isDiaryActive ? 'text-white' : 'text-slate-500'}`} />
                <span className="text-[14px] 2xl:text-[15px] leading-none">Nhật ký</span>
              </button>

              <button
                onClick={() => handleNav('badges')}
                className={`px-2 2xl:px-3.5 py-2 2xl:py-2.5 rounded-[20px] font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                  isBadgesActive
                    ? 'bg-purple-500 text-white shadow-[inset_0_-3px_0_#6d28d9]'
                    : 'text-slate-600 hover:bg-purple-50 hover:text-purple-900 border-2 border-transparent hover:border-purple-200 shadow-2xs'
                }`}
                style={{ fontFamily: "'Quicksand', 'Nunito', sans-serif" }}
              >
                <Award className={`w-6 h-6 2xl:w-7 2xl:h-7 ${isBadgesActive ? 'text-white' : 'text-slate-500'}`} />
                <span className="text-[14px] 2xl:text-[15px] leading-none">Bộ sưu tập</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 2xl:gap-4 flex-shrink-0">
            {/* The assigned class is read-only: a child cannot switch books. */}
            {/* User Info & Interactive Daily Streak Flame */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Daily Streak Flame Counter (Replaces Star Jar, opens DailyStreakModal) */}
              <DailyStreakBadge
                streak={localStreakData?.streak || 1}
                level={localStreakData?.levelInfo?.level || 1}
                onClick={() => {
                  sfx.playPop();
                  setShowStreakModal(true);
                }}
              />

              {/* Child Profile Pill (Always visible on navbar: Avatar, Name, Book, Age + opens ChildProfileModal with integrated Change PIN) */}
              {user && (
                <button
                  onClick={() => {
                    sfx.playPop();
                    setShowProfileModal(true);
                  }}
                  className="flex items-center gap-2 sm:gap-2.5 bg-amber-50/95 hover:bg-amber-100 border-2 border-amber-300/90 hover:border-amber-400 pl-1.5 pr-2.5 sm:pr-3.5 py-1 sm:py-1.5 rounded-[20px] cursor-pointer transition-all shadow-2xs active:scale-95 flex-shrink-0"
                  title={`Thông tin của ${user.name} · ${currentOption.book} · ${currentOption.ageLabel} (Bấm để xem hồ sơ & đổi mã PIN)`}
                >
                  <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-[14px] bg-amber-100 border-2 border-amber-300 flex items-center justify-center p-0.5 flex-shrink-0">
                    {user.avatarUrl && !avatarImgError ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        onError={() => setAvatarImgError(true)}
                        className="w-full h-full object-contain rounded-[10px]"
                      />
                    ) : (
                      <span className="text-lg sm:text-xl leading-none" aria-hidden="true">
                        {getChildAvatarEmoji(user.avatar)}
                      </span>
                    )}
                    <span
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-400 border border-white flex items-center justify-center text-amber-950 shadow-2xs"
                      aria-hidden="true"
                    >
                      <KeyRound className="w-2.5 h-2.5 stroke-[2.5]" />
                    </span>
                  </div>
                  <span className="flex flex-col items-start leading-tight text-left">
                    <span
                      className="font-black text-[13px] sm:text-[15px] text-slate-800 whitespace-nowrap max-w-[110px] sm:max-w-[150px] truncate"
                      style={{ fontFamily: "'Quicksand', 'Nunito', sans-serif" }}
                    >
                      {user.name}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-amber-700 whitespace-nowrap">
                      <BookOpen className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                      <span>{currentOption.book}</span>
                      <span className="text-amber-800/80">· {currentOption.ageLabel}</span>
                    </span>
                  </span>
                </button>
              )}

              {/* Avatar Sổ liên lạc của bé (GV-04) */}
              <button
                onClick={() => {
                  sfx.playPop();
                  setShowParentModal(true);
                  setUnreadNotifCount(0);
                }}
                title="Mở Sổ liên lạc của bé & Lời nhắn từ cô giáo"
                aria-label="Sổ liên lạc của bé"
                className="relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-[20px] bg-gradient-to-r from-amber-100 via-orange-50 to-amber-100 hover:from-amber-200 hover:to-orange-100 text-amber-900 border-[3px] border-amber-300 hover:border-amber-400 shadow-sm transition-all active:scale-95 cursor-pointer flex-shrink-0"
              >
                <span className="text-xl sm:text-2xl animate-bounce-gentle" role="img" aria-label="Sổ liên lạc">
                  📒
                </span>
                <span 
                  className="hidden 2xl:inline font-black text-[13px] sm:text-[14px] text-amber-950 whitespace-nowrap"
                  style={{ fontFamily: "'Quicksand', 'Nunito', sans-serif" }}
                >
                  Sổ liên lạc
                </span>
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 border-2 border-white ring-2 ring-rose-300 animate-pulse" />
                )}
              </button>

              {/* Switch Player / Logout */}
              <button
                onClick={handleLogout}
                title="Đổi tài khoản bé"
                aria-label="Đăng xuất"
                className="p-2 sm:p-3.5 rounded-[18px] bg-[#211d18] hover:bg-[#351d1d] text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-700 shadow-sm transition-colors cursor-pointer flex-shrink-0"
              >
                <LogOut className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Thông tin của bé & Đổi mã PIN Modal */}
      <ChildProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        bookLabel={currentOption.book}
        ageLabel={currentOption.ageLabel}
        ageCode={currentOption.code}
        totalStars={totalStars}
        completedCount={completedCount}
        streakDays={localStreakData?.streak || 1}
        onOpenBadges={() => setShowBadgesModal(true)}
      />

      {/* Sổ liên lạc Phụ huynh Modal */}
      {showParentModal && user && (
        <ParentNotebookModal
          childId={user.id || (user as any)._id}
          childName={user.name}
          onClose={() => {
            setShowParentModal(false);
            setUnreadNotifCount(0);
          }}
        />
      )}

      {/* Badges & Stars Modal */}
      <ChildBadgesModal
        isOpen={showBadgesModal}
        onClose={() => setShowBadgesModal(false)}
        totalStars={totalStars}
        completedCount={completedCount}
        childName={user?.name || 'Bé'}
      />

      {/* Daily Streak Modal */}
      <DailyStreakModal
        isOpen={showStreakModal}
        onClose={() => setShowStreakModal(false)}
        streakData={localStreakData}
        onStreakUpdate={(updated) => {
          setLocalStreakData(updated);
          if (onStreakUpdate) onStreakUpdate(updated);
        }}
      />
    </>
  );
};

