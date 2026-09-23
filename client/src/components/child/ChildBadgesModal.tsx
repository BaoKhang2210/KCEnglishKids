import React, { useEffect, useState } from 'react';
import { X, Star, Sparkles, Award, Gift } from 'lucide-react';
import { sfx } from '../../utils/audio';
import { KokoMascot } from './KokoMascot';
import { ALL_BADGES, type BadgeItem } from '../../data/badges';
import { ALL_STICKERS, stickerService } from '../../data/stickers';
import { useAuth } from '../../context/AuthContext';
import { BadgeShowcaseModal } from './BadgeShowcaseModal';

interface ChildBadgesModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalStars: number;
  completedCount: number;
  completedUnits?: number;
  childName: string;
}

export const ChildBadgesModal: React.FC<ChildBadgesModalProps> = ({
  isOpen,
  onClose,
  totalStars,
  completedCount,
  completedUnits = 0,
  childName
}) => {
  const { user } = useAuth();
  const childId = user?._id || user?.id || 'child_guest';

  const [activeTab, setActiveTab] = useState<'badges' | 'stickers'>('badges');
  const [selectedCat, setSelectedCat] = useState<'all' | 'journey' | 'stars' | 'skills'>('all');
  const [showcaseBadge, setShowcaseBadge] = useState<(BadgeItem & { unlocked: boolean }) | null>(null);

  useEffect(() => {
    if (isOpen) {
      sfx.playPop();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const badges = ALL_BADGES.map(badge => {
    let unlocked = false;
    if (badge.reqType === 'star') {
      unlocked = totalStars >= badge.requirement;
    } else if (badge.reqType === 'unit') {
      unlocked = completedUnits >= badge.requirement;
    } else {
      unlocked = completedCount >= badge.requirement;
    }
    return {
      ...badge,
      unlocked
    };
  });

  const filteredBadges = selectedCat === 'all' ? badges : badges.filter(b => b.category === selectedCat);
  const unlockedBadgesCount = badges.filter(b => b.unlocked).length;

  const unlockedStickerIds = stickerService.getUnlockedStickers(childId);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl border-4 border-amber-300 shadow-2xl max-w-lg w-full p-6 sm:p-7 relative overflow-hidden animate-pop-in max-h-[90vh] flex flex-col">
        {/* Soft Background Blob */}
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-amber-100/60 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => {
            sfx.playPop();
            onClose();
          }}
          aria-label="Đóng"
          className="absolute top-4 right-4 w-10 h-10 rounded-2xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-colors z-20"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Header with Koko Mini */}
        <div className="flex items-center gap-4 mb-4 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 border-2 border-amber-300 p-1 flex items-center justify-center flex-shrink-0 shadow-inner">
            <KokoMascot state="happy" size="sm" interactive={false} />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 font-black text-xs px-2.5 py-0.5 rounded-full mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Góc phần thưởng của bé
            </div>
            <h3 className="text-2xl font-black text-slate-800">
              Phần thưởng của {childName}
            </h3>
            <p className="text-xs font-bold text-slate-400">
              {activeTab === 'badges'
                ? `Bé đã mở khoá ${unlockedBadgesCount}/${badges.length} huy hiệu`
                : `Bé đã sưu tập được ${unlockedStickerIds.length}/${ALL_STICKERS.length} sticker`}
            </p>
          </div>
        </div>

        {/* Tab Switcher: Badges vs Stickers */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl mb-4 relative z-10">
          <button
            onClick={() => {
              sfx.playPop();
              setActiveTab('badges');
            }}
            className={`py-2 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'badges'
                ? 'bg-white text-amber-900 shadow-xs ring-2 ring-amber-300'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>Huy hiệu ({unlockedBadgesCount})</span>
          </button>
          <button
            onClick={() => {
              sfx.playPop();
              setActiveTab('stickers');
            }}
            className={`py-2 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'stickers'
                ? 'bg-white text-rose-900 shadow-xs ring-2 ring-rose-300'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Gift className="w-4 h-4 text-rose-500" />
            <span>Bộ sưu tập Sticker ({unlockedStickerIds.length})</span>
          </button>
        </div>

        {/* Stars Metric Banner */}
        <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 rounded-2xl p-3 sm:p-4 text-white flex items-center justify-between mb-4 shadow-sm relative z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-yellow-100">
              <Star className="w-6 h-6 sm:w-7 sm:h-7 fill-yellow-200" />
            </div>
            <div>
              <span className="text-[10px] sm:text-xs font-black text-amber-100 block uppercase">
                Tổng số sao vàng
              </span>
              <span className="text-xl sm:text-2xl font-black">
                {totalStars} Ngôi sao ⭐
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] sm:text-xs font-black text-amber-100 block">Bài hoàn thành</span>
            <span className="text-lg sm:text-xl font-black">{completedCount} bài</span>
          </div>
        </div>

        {/* BADGES TAB */}
        {activeTab === 'badges' && (
          <>
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-none relative z-10 flex-shrink-0">
              {[
                { id: 'all', label: `Tất cả (${badges.length})` },
                { id: 'journey', label: '🐾 Hành trình' },
                { id: 'stars', label: '⭐ Ngôi sao' },
                { id: 'skills', label: '🎯 Kỹ năng' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    sfx.playPop();
                    setSelectedCat(cat.id as any);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer flex-shrink-0 ${
                    selectedCat === cat.id
                      ? 'bg-amber-400 text-amber-950 shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Badges Grid (Scrollable) */}
            <div className="overflow-y-auto pr-1 flex-1 space-y-3 relative z-10">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredBadges.map(badge => {
                  const currentVal = badge.reqType === 'star' ? totalStars : badge.reqType === 'unit' ? completedUnits : completedCount;
                  const percent = Math.min(100, Math.round((currentVal / badge.requirement) * 100));

                  return (
                    <div
                      key={badge.id}
                      onClick={() => {
                        sfx.playPop();
                        setShowcaseBadge(badge);
                      }}
                      className={`p-3.5 rounded-3xl border-3 flex flex-col items-center text-center transition-all cursor-pointer relative group badge-shimmer-effect ${
                        badge.unlocked
                          ? 'bg-gradient-to-b from-amber-50 to-orange-50/40 border-amber-300 shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-95'
                          : 'bg-white/80 border-slate-200 hover:border-amber-200 hover:-translate-y-0.5'
                      }`}
                    >
                      {/* Badge 3D Icon Container */}
                      <div
                        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl mb-2 relative transition-transform duration-300 group-hover:scale-110 ${
                          badge.unlocked
                            ? `bg-gradient-to-tr ${badge.color} text-white shadow-md ring-2 ring-amber-300 animate-badge-float`
                            : 'bg-slate-100 text-slate-400 border-2 border-dashed border-slate-300'
                        }`}
                      >
                        {badge.unlocked ? badge.icon : '🔒'}
                        {badge.unlocked && (
                          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-400 text-amber-950 rounded-full flex items-center justify-center text-[10px] font-black shadow-xs">
                            ⭐
                          </span>
                        )}
                      </div>

                      <h4 className="font-black text-xs sm:text-sm text-slate-800 mb-0.5 leading-snug group-hover:text-amber-700 transition-colors">
                        {badge.name}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-500 leading-tight mb-2 line-clamp-2">
                        {badge.desc}
                      </p>

                      {badge.unlocked ? (
                        <span className="mt-auto inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300 shadow-2xs">
                          <span>Đã đạt</span>
                          <span>✨</span>
                        </span>
                      ) : (
                        <div className="w-full mt-auto space-y-1">
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                            <div
                              className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-extrabold text-slate-400 block">
                            {currentVal}/{badge.requirement} {badge.reqType === 'star' ? '⭐' : 'bài'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* STICKERS TAB */}
        {activeTab === 'stickers' && (
          <div className="overflow-y-auto pr-1 flex-1 space-y-3 relative z-10">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {ALL_STICKERS.map(st => {
                const isUnlocked = unlockedStickerIds.includes(st.id);
                return (
                  <div
                    key={st.id}
                    className={`p-3 rounded-2xl border-2 flex flex-col items-center text-center transition-all ${
                      isUnlocked
                        ? 'bg-rose-50/70 border-rose-300 shadow-xs hover:scale-105'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-1.5 shadow-sm ${
                        isUnlocked
                          ? `bg-gradient-to-tr ${st.bgGradient} text-white animate-bounce-subtle`
                          : 'bg-slate-200 text-slate-400 grayscale'
                      }`}
                    >
                      {isUnlocked ? st.icon : '❓'}
                    </div>

                    <h4 className="font-black text-xs sm:text-sm text-slate-800 mb-0.5 leading-snug">
                      {isUnlocked ? st.name : 'Sticker Bí Mật'}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 leading-tight">
                      {isUnlocked ? st.desc : 'Đạt 2-3 sao khi chơi game để mở!'}
                    </p>

                    {isUnlocked ? (
                      <span className="mt-1.5 text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                        Đã sưu tập 🎁
                      </span>
                    ) : (
                      <span className="mt-1.5 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        Chưa mở khóa 🔒
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Close CTA */}
        <div className="mt-4 pt-3 border-t border-slate-100 relative z-10 flex-shrink-0">
          <button
            onClick={() => {
              sfx.playPop();
              onClose();
            }}
            className="btn-3d-amber w-full py-3 rounded-2xl text-amber-950 font-black text-base flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Tiếp tục học để rinh thêm quà! 🚀</span>
          </button>
        </div>
      </div>

      {/* 3D Badge Showcase Spotlight Modal */}
      {showcaseBadge && (
        <BadgeShowcaseModal
          badge={showcaseBadge}
          currentProgress={
            showcaseBadge.reqType === 'star'
              ? totalStars
              : showcaseBadge.reqType === 'unit'
              ? completedUnits
              : completedCount
          }
          onClose={() => setShowcaseBadge(null)}
        />
      )}
    </div>
  );
};

