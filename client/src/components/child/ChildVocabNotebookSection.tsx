import React, { useState, useMemo, useEffect } from 'react';
import {
  BookMarked,
  Check,
  Volume2,
  Gamepad2,
  Search
} from 'lucide-react';
import { vocabMasteryService, type WordMasteryDetail } from '../../services/vocabMasteryService';
import { useAuth } from '../../context/AuthContext';
import { playWordAudio, sfx } from '../../utils/audio';
import { getSensibleSentenceClient } from '../../utils/sentenceDictionary';
import { KokoMascot } from './KokoMascot';

interface ChildVocabNotebookSectionProps {
  onNavigateTab: (tab: string) => void;
}

type FilterType = 'all' | 'mastered' | 'review';

export const ChildVocabNotebookSection: React.FC<ChildVocabNotebookSectionProps> = ({
  onNavigateTab
}) => {
  const { user } = useAuth();
  const childId = (user as any)?.id || (user as any)?._id || 'guest';

  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setTick(t => t + 1);
    window.addEventListener('kc_vocab_mastery_updated', handleUpdate);
    return () => window.removeEventListener('kc_vocab_mastery_updated', handleUpdate);
  }, []);

  const allWords = useMemo(() => {
    return vocabMasteryService.getAllLearnedWords(childId);
  }, [childId, tick]);

  const masteredWords = useMemo(() => {
    return vocabMasteryService.getMasteredWords(childId);
  }, [childId, tick]);

  const reviewWords = useMemo(() => {
    return vocabMasteryService.getReviewWords(childId);
  }, [childId, tick]);

  const filteredWords = useMemo(() => {
    let list: WordMasteryDetail[] = [];
    if (filter === 'mastered') list = masteredWords;
    else if (filter === 'review') list = reviewWords;
    else list = allWords;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(w =>
        (w.english || '').toLowerCase().includes(q) ||
        (w.vietnamese || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [filter, allWords, masteredWords, reviewWords, searchQuery]);

  const averageScore = useMemo(() => {
    if (allWords.length === 0) return 0;
    const sum = allWords.reduce((acc, w) => acc + (w.masteryScore || 50), 0);
    return Math.round(sum / allWords.length);
  }, [allWords]);

  const handleToggle = (vocabId: string) => {
    sfx.playPop();
    vocabMasteryService.toggleWordStatus(childId, vocabId);
  };

  const handlePlaySentence = (text: string) => {
    if (!text || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="space-y-6">
      {/* Hero Stats Card */}
      <section className="bg-gradient-to-r from-teal-500 via-emerald-500 to-amber-500 rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider text-emerald-50 mb-3 shadow-xs">
              <BookMarked className="w-4 h-4 text-emerald-100" />
              <span>Sổ tay từ vựng thông minh</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
              Kho từ vựng của bé {user?.name || 'yêu'} ✨
            </h2>

            <p className="text-white/90 font-extrabold text-xs sm:text-sm max-w-lg mb-4">
              Theo dõi chi tiết các từ bé đã thuộc lòng và những từ cần ôn luyện thêm mỗi ngày!
            </p>

            {/* Stat Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-xl">
              <div className="bg-black/15 backdrop-blur-md border border-white/20 rounded-2xl p-2.5 text-center">
                <span className="text-xl sm:text-2xl font-black block leading-none mb-1">
                  {allWords.length}
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold text-white/80">
                  📚 Đã học
                </span>
              </div>

              <div className="bg-black/15 backdrop-blur-md border border-white/20 rounded-2xl p-2.5 text-center">
                <span className="text-xl sm:text-2xl font-black text-emerald-200 block leading-none mb-1">
                  {masteredWords.length}
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold text-white/80">
                  💚 Đã thuộc
                </span>
              </div>

              <div className="bg-black/15 backdrop-blur-md border border-white/20 rounded-2xl p-2.5 text-center">
                <span className="text-xl sm:text-2xl font-black text-amber-200 block leading-none mb-1">
                  {reviewWords.length}
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold text-white/80">
                  💡 Cần ôn lại
                </span>
              </div>

              <div className="bg-black/15 backdrop-blur-md border border-white/20 rounded-2xl p-2.5 text-center">
                <span className="text-xl sm:text-2xl font-black text-yellow-200 block leading-none mb-1">
                  {averageScore}%
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold text-white/80">
                  ⭐ Độ nhớ
                </span>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 flex items-center justify-center">
            <KokoMascot state="happy" size="md" speechBubble="Bé nhớ từ siêu quá! 🌟" />
          </div>
        </div>
      </section>

      {/* Control Bar: Filter Tabs & Quick Action */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-3xl p-3.5 border-2 border-emerald-100 shadow-sm">
        {/* Filter Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              setFilter('all');
            }}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0 ${
              filter === 'all'
                ? 'bg-emerald-500 text-white shadow-md ring-2 ring-emerald-300 scale-103'
                : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-900'
            }`}
          >
            <span>Tất cả</span>
            <span className="bg-white/25 px-2 py-0.5 rounded-full text-[11px]">
              {allWords.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              setFilter('mastered');
            }}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0 ${
              filter === 'mastered'
                ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300 scale-103'
                : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-900'
            }`}
          >
            <span>💚 Đã thuộc</span>
            <span className="bg-white/25 px-2 py-0.5 rounded-full text-[11px]">
              {masteredWords.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              setFilter('review');
            }}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0 ${
              filter === 'review'
                ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-300 scale-103'
                : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-900'
            }`}
          >
            <span>💡 Cần ôn lại</span>
            <span className="bg-white/25 px-2 py-0.5 rounded-full text-[11px]">
              {reviewWords.length}
            </span>
          </button>
        </div>

        {/* Quick Play & Search */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Quick Search */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm từ vựng..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-3 py-1.5 text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-400"
            />
          </div>

          {/* Jump to Mini-Games button */}
          {allWords.length >= 2 && (
            <button
              type="button"
              onClick={() => {
                sfx.playPop();
                onNavigateTab('games');
              }}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer flex-shrink-0"
              title="Luyện tập từ vựng qua trò chơi"
            >
              <Gamepad2 className="w-4 h-4" />
              <span className="hidden sm:inline">Chơi trò chơi</span>
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {filteredWords.length === 0 && (
        <div className="bg-white rounded-3xl p-10 border-3 border-dashed border-emerald-200 text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center text-4xl shadow-inner">
            📖
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 mb-1">
              {allWords.length === 0
                ? 'Bé chưa có từ vựng nào trong sổ tay!'
                : 'Không tìm thấy từ vựng phù hợp với bộ lọc.'}
            </h3>
            <p className="text-sm font-bold text-slate-500 max-w-md mx-auto">
              {allWords.length === 0
                ? 'Hãy vào Hành trình học bài hoặc khám phá Chủ đề mở rộng và quẹt thẻ Flashcard để tích lũy những từ đầu tiên nhé!'
                : 'Bé hãy thử chọn tab lọc khác hoặc xóa từ khóa tìm kiếm nhé!'}
            </p>
          </div>

          {allWords.length === 0 && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigateTab('path')}
                className="btn-3d-amber text-amber-950 font-black text-xs sm:text-sm px-5 py-2.5 rounded-2xl cursor-pointer"
              >
                🐾 Vào Hành trình học
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('topics')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs sm:text-sm px-5 py-2.5 rounded-2xl cursor-pointer transition-all shadow-md"
              >
                🌈 Khám phá Chủ đề mở rộng
              </button>
            </div>
          )}
        </div>
      )}

      {/* Vocabulary Grid */}
      {filteredWords.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredWords.map((item) => {
            const sentence = getSensibleSentenceClient(item);
            const isMastered = item.status === 'MASTERED';

            return (
              <div
                key={item.vocabId}
                className={`rounded-3xl p-5 border-3 transition-all flex flex-col justify-between bg-white shadow-sm hover:shadow-xl relative overflow-hidden ${
                  isMastered
                    ? 'border-emerald-200 hover:border-emerald-400'
                    : 'border-amber-200 hover:border-amber-400'
                }`}
              >
                {/* Header info badge */}
                <div className="flex items-center justify-between mb-3 w-full">
                  <span
                    className={`text-[11px] font-black px-3 py-1 rounded-full border flex items-center gap-1 ${
                      isMastered
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-amber-100 text-amber-900 border-amber-300'
                    }`}
                  >
                    {isMastered ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Đã thuộc ({item.masteryScore || 85}%)</span>
                      </>
                    ) : (
                      <>
                        <span>💡 Cần ôn ({item.masteryScore || 45}%)</span>
                      </>
                    )}
                  </span>

                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-md">
                    {item.source === 'JOURNEY' ? '🐾 Hành trình' : '🌈 Chủ đề'}
                  </span>
                </div>

                {/* Picture Container */}
                <div className="w-full h-36 rounded-2xl bg-gradient-to-b from-slate-50 to-emerald-50/40 border border-slate-100 flex items-center justify-center p-3 relative overflow-hidden group mb-3">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.english}
                      className="w-full h-full object-contain filter drop-shadow-sm group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-6xl select-none">🐾</span>
                  )}
                </div>

                {/* English Word, Audio, & Vietnamese Meaning */}
                <div className="text-center w-full mb-3">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <h4 className="text-2xl font-black text-slate-800 capitalize font-display">
                      {item.english}
                    </h4>
                    <button
                      type="button"
                      onClick={() => playWordAudio(item.english, item.audioUrl)}
                      className="w-8 h-8 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-800 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                      title="Nghe phát âm"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  {item.pronunciation && (
                    <span className="text-xs font-extrabold text-slate-400 font-mono block mb-1">
                      /{item.pronunciation}/
                    </span>
                  )}

                  <span className="bg-slate-100 text-slate-700 font-black px-3.5 py-1 rounded-full text-xs inline-block border border-slate-200">
                    {item.vietnamese}
                  </span>
                </div>

                {/* Contextual Example Sentence Card */}
                {sentence.en && (
                  <div
                    onClick={() => handlePlaySentence(sentence.en)}
                    className="w-full bg-slate-50/90 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 rounded-2xl p-2.5 text-center text-xs text-slate-600 transition-all cursor-pointer group mb-3"
                    title="Chạm để nghe đọc câu ví dụ"
                  >
                    <p className="font-extrabold text-slate-800 group-hover:text-emerald-950 transition-colors mb-0.5 leading-snug">
                      "{sentence.en}"
                    </p>
                    {sentence.vi && (
                      <p className="text-emerald-700 font-bold text-[11px] leading-tight">
                        {sentence.vi}
                      </p>
                    )}
                  </div>
                )}

                {/* Stats row & Quick Toggle Action */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="text-[11px] font-bold text-slate-400">
                    Nhớ: <span className="text-emerald-600 font-black">{item.rememberCount || 1}</span> • Ôn:{' '}
                    <span className="text-amber-600 font-black">{item.reviewCount || 0}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggle(item.vocabId)}
                    className={`text-[11px] font-black px-3 py-1 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95 ${
                      isMastered
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {isMastered ? '💡 Đánh dấu cần ôn' : '💚 Đã thuộc rồi'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
