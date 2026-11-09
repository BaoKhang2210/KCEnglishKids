import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Map, Compass, Award, Gamepad2, BookMarked, PlayCircle, BookOpenCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sfx } from '../../utils/audio';
import { ChildBadgesModal } from './ChildBadgesModal';

interface ChildBottomNavProps {
  totalStars?: number;
  completedCount?: number;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const ChildBottomNav: React.FC<ChildBottomNavProps> = ({
  totalStars = 0,
  completedCount = 0,
  activeTab,
  onTabChange
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [showBadges, setShowBadges] = useState(false);

  const handleNav = (path: string, tab?: string) => {
    sfx.playPop();
    if (tab && onTabChange) {
      onTabChange(tab);
      return;
    }
    navigate(path);
  };

  const searchParams = new URLSearchParams(location.search);
  const currentTab = activeTab || searchParams.get('tab') || (location.pathname.startsWith('/topics') ? 'topics' : location.pathname.startsWith('/videos') ? 'videos' : 'path');

  const isPathActive = currentTab === 'path' && !location.pathname.startsWith('/topics') && !location.pathname.startsWith('/videos');
  const isTopicsActive = currentTab === 'topics' || location.pathname.startsWith('/topics');
  const isVideosActive = currentTab === 'videos' || location.pathname.startsWith('/videos');
  const isVocabActive = currentTab === 'vocab';
  const isGamesActive = currentTab === 'games' || currentTab === 'arcade';
  const isDiaryActive = currentTab === 'diary' || currentTab === 'history';
  const isBadgesActive = currentTab === 'badges';

  return (
    <>
      <nav className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#13110e]/95 backdrop-blur-md border-t-0 border-amber-900/70 px-1.5 py-2 shadow-[0_-8px_24px_rgba(0,0,0,0.32)] outline-none ring-0 flex items-stretch justify-around">
        <button
          onClick={() => handleNav('/', 'path')}
          className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 cursor-pointer transition-transform active:scale-90 ${
            isPathActive ? 'text-amber-200 font-black' : 'text-stone-300 font-bold'
          }`}
        >
          <div className={`p-2 rounded-2xl transition-all ${isPathActive ? 'bg-amber-400 text-amber-950 shadow-sm' : ''}`}>
            <Map className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] sm:text-xs leading-tight whitespace-nowrap">Hành trình</span>
        </button>

        <button
          onClick={() => handleNav('/', 'topics')}
          className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 cursor-pointer transition-transform active:scale-90 ${
            isTopicsActive ? 'text-emerald-300 font-black' : 'text-stone-300 font-bold'
          }`}
        >
          <div className={`p-2 rounded-2xl transition-all ${isTopicsActive ? 'bg-emerald-500 text-white shadow-sm' : ''}`}>
            <Compass className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] sm:text-xs leading-tight whitespace-nowrap">Chủ đề</span>
        </button>

        <button
          onClick={() => handleNav('/', 'videos')}
          className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 cursor-pointer transition-transform active:scale-90 ${
            isVideosActive ? 'text-indigo-300 font-black' : 'text-stone-300 font-bold'
          }`}
        >
          <div className={`p-2 rounded-2xl transition-all ${isVideosActive ? 'bg-indigo-500 text-white shadow-sm' : ''}`}>
            <PlayCircle className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] sm:text-xs leading-tight whitespace-nowrap">Video</span>
        </button>

        <button
          onClick={() => handleNav('/', 'vocab')}
          className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 cursor-pointer transition-transform active:scale-90 ${
            isVocabActive ? 'text-rose-300 font-black' : 'text-stone-300 font-bold'
          }`}
        >
          <div className={`p-2 rounded-2xl transition-all ${isVocabActive ? 'bg-rose-500 text-white shadow-sm' : ''}`}>
            <BookMarked className="w-6 h-6 stroke-[2.5]" />
          </div>
<span className="text-[10px] sm:text-xs leading-tight whitespace-nowrap">Sổ từ vựng</span>
        </button>

        <button
          onClick={() => handleNav('/', 'games')}
          className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 cursor-pointer transition-transform active:scale-90 ${
            isGamesActive ? 'text-sky-300 font-black' : 'text-stone-300 font-bold'
          }`}
        >
          <div className={`p-2 rounded-2xl transition-all ${isGamesActive ? 'bg-sky-500 text-white shadow-sm' : ''}`}>
            <Gamepad2 className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] sm:text-xs leading-tight whitespace-nowrap">Trò chơi</span>
        </button>

        <button
          onClick={() => handleNav('/', 'diary')}
          className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 cursor-pointer transition-transform active:scale-90 ${
            isDiaryActive ? 'text-orange-300 font-black' : 'text-stone-300 font-bold'
          }`}
        >
          <div className={`p-2 rounded-2xl transition-all ${isDiaryActive ? 'bg-orange-500 text-white shadow-sm' : ''}`}>
            <BookOpenCheck className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] sm:text-xs leading-tight whitespace-nowrap">Nhật ký</span>
        </button>

        <button
          onClick={() => {
            sfx.playPop();
            if (onTabChange) onTabChange('badges'); else setShowBadges(true);
          }}
          className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 cursor-pointer transition-transform active:scale-90 ${
            isBadgesActive ? 'text-purple-300 font-black' : 'text-stone-300 font-bold'
          }`}
        >
          <div className={`p-2 rounded-2xl transition-all ${isBadgesActive ? 'bg-purple-500 text-white shadow-sm' : ''}`}>
            <Award className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] sm:text-xs leading-tight whitespace-nowrap">Bộ sưu tập</span>
        </button>
      </nav>

      <ChildBadgesModal
        isOpen={showBadges}
        onClose={() => setShowBadges(false)}
        totalStars={totalStars}
        completedCount={completedCount}
        childName={user?.name || 'Bé'}
      />
    </>
  );
};
