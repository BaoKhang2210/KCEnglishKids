import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Map, Compass, Award, Gamepad2, BookMarked } from 'lucide-react';
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
  const currentTab = activeTab || searchParams.get('tab') || (location.pathname.startsWith('/topics') ? 'topics' : 'path');

  const isPathActive = currentTab === 'path' && !location.pathname.startsWith('/topics');
  const isTopicsActive = currentTab === 'topics' || location.pathname.startsWith('/topics');
  const isVocabActive = currentTab === 'vocab';
  const isGamesActive = currentTab === 'games' || currentTab === 'arcade';
  const isBadgesActive = currentTab === 'badges';

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t-4 border-amber-200 px-3 py-2.5 shadow-2xl flex items-center justify-around">
        <button
          onClick={() => handleNav('/', 'path')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-transform active:scale-90 ${
            isPathActive ? 'text-amber-800 scale-105 font-black' : 'text-slate-400 font-bold'
          }`}
        >
          <div className={`p-2.5 rounded-2xl transition-all ${isPathActive ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300 shadow-sm' : ''}`}>
            <Map className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-xs">Hành trình</span>
        </button>

        <button
          onClick={() => handleNav('/', 'topics')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-transform active:scale-90 ${
            isTopicsActive ? 'text-emerald-700 scale-105 font-black' : 'text-slate-400 font-bold'
          }`}
        >
          <div className={`p-2.5 rounded-2xl transition-all ${isTopicsActive ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 shadow-sm' : ''}`}>
            <Compass className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-xs">Chủ đề</span>
        </button>

        <button
          onClick={() => handleNav('/', 'vocab')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-transform active:scale-90 ${
            isVocabActive ? 'text-rose-700 scale-105 font-black' : 'text-slate-400 font-bold'
          }`}
        >
          <div className={`p-2.5 rounded-2xl transition-all ${isVocabActive ? 'bg-rose-500 text-white ring-2 ring-rose-300 shadow-sm' : ''}`}>
            <BookMarked className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-xs">Từ vựng</span>
        </button>

        <button
          onClick={() => handleNav('/', 'games')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-transform active:scale-90 ${
            isGamesActive ? 'text-sky-700 scale-105 font-black' : 'text-slate-400 font-bold'
          }`}
        >
          <div className={`p-2.5 rounded-2xl transition-all ${isGamesActive ? 'bg-sky-500 text-white ring-2 ring-sky-300 shadow-sm' : ''}`}>
            <Gamepad2 className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-xs">Trò chơi</span>
        </button>

        <button
          onClick={() => {
            sfx.playPop();
            if (onTabChange) onTabChange('badges'); else setShowBadges(true);
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-transform active:scale-90 ${
            isBadgesActive ? 'text-purple-700 scale-105 font-black' : 'text-slate-400 font-bold'
          }`}
        >
          <div className={`p-2.5 rounded-2xl transition-all ${isBadgesActive ? 'bg-purple-500 text-white ring-2 ring-purple-300 shadow-sm' : ''}`}>
            <Award className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-xs">Huy hiệu</span>
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
