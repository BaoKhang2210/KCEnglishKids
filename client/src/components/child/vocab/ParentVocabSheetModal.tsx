import React, { useState } from 'react';
import {
  X,
  Search,
  RotateCcw,
  Info,
  ChevronDown,
  ChevronUp,
  Volume2,
} from 'lucide-react';
import { formatPronunciation } from '../../../services/vocabStateSelector';
import { vocabMasteryService, type WordMasteryDetail } from '../../../services/vocabMasteryService';
import { playWordAudio, sfx } from '../../../utils/audio';

interface ParentVocabSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  childId: string;
  summary: {
    learned: number;
    learning: number;
    mastered: number;
    review: number;
    words: (WordMasteryDetail & {
      state: 'learning' | 'mastered' | 'review';
      reviewReason?: 'due' | 'failed' | 'override';
    })[];
  };
  onRefresh: () => void;
}

type TabFilter = 'all' | 'learning' | 'mastered' | 'review';

export const ParentVocabSheetModal: React.FC<ParentVocabSheetModalProps> = ({
  isOpen,
  onClose,
  childId,
  summary,
  onRefresh,
}) => {
  const [filter, setFilter] = useState<TabFilter>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; vocabId: string; prevOverride: any } | null>(null);

  if (!isOpen) return null;

  const filteredWords = summary.words.filter(w => {
    if (filter === 'learning' && w.state !== 'learning') return false;
    if (filter === 'mastered' && w.state !== 'mastered') return false;
    if (filter === 'review' && w.state !== 'review') return false;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return (
        w.english.toLowerCase().includes(q) ||
        w.vietnamese.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSetOverride = (vocabId: string, override: 'mastered' | 'review' | null) => {
    const word = summary.words.find(w => w.vocabId === vocabId || w._id === vocabId);
    const prev = word?.parentOverride ?? null;

    sfx.playPop();
    vocabMasteryService.setParentOverride(childId, vocabId, override);
    onRefresh();

    setToastMsg({
      text: override === 'mastered' ? 'Đã đánh dấu Đã thuộc' : override === 'review' ? 'Đã đánh dấu Cần ôn lại' : 'Đã xóa ghi đè',
      vocabId,
      prevOverride: prev,
    });

    setTimeout(() => {
      setToastMsg(null);
    }, 4000);
  };

  const handleUndo = () => {
    if (!toastMsg) return;
    sfx.playPop();
    vocabMasteryService.setParentOverride(childId, toastMsg.vocabId, toastMsg.prevOverride);
    onRefresh();
    setToastMsg(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sổ tay theo dõi từ vựng dành cho phụ huynh"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-4xl max-h-[92dvh] flex flex-col shadow-2xl border-4 border-slate-200 overflow-hidden relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 flex-shrink-0 bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-800">
                Sổ tay theo dõi từ vựng
              </h2>
              <button
                type="button"
                onClick={() => setShowInfoModal(true)}
                className="text-slate-400 hover:text-amber-600 transition-colors p-1 rounded-full cursor-pointer"
                title="Xem giải thích định nghĩa các trạng thái"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-500 mt-0.5">
              Định nghĩa chuẩn và minh bạch theo thời gian học tập của bé
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng sổ tay"
            className="w-11 h-11 rounded-full bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Thống kê dạng phương trình bất biến toán học */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-amber-50/30 to-slate-50 border-b border-slate-100 flex-shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-white p-3 rounded-2xl border-2 border-slate-200 shadow-2xs">
              <span className="text-2xl sm:text-3xl font-black text-slate-800 block">
                {summary.learned}
              </span>
              <span className="text-xs font-bold text-slate-500">📚 Đã học</span>
            </div>

            <div className="bg-white p-3 rounded-2xl border-2 border-emerald-200 shadow-2xs">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 block">
                {summary.learning}
              </span>
              <span className="text-xs font-bold text-emerald-700">🌱 Đang học</span>
            </div>

            <div className="bg-white p-3 rounded-2xl border-2 border-amber-200 shadow-2xs">
              <span className="text-2xl sm:text-3xl font-black text-amber-600 block">
                {summary.mastered}
              </span>
              <span className="text-xs font-bold text-amber-700">⭐ Đã thuộc</span>
            </div>

            <div className="bg-white p-3 rounded-2xl border-2 border-sky-200 shadow-2xs">
              <span className="text-2xl sm:text-3xl font-black text-sky-600 block">
                {summary.review}
              </span>
              <span className="text-xs font-bold text-sky-700">💧 Cần ôn lại</span>
            </div>
          </div>

          {/* Phương trình minh bạch */}
          <p className="text-center text-xs font-bold text-slate-400 mt-2">
            Phương trình theo dõi: <span className="text-slate-600 font-extrabold">{summary.learned} Đã học</span> = {summary.learning} Đang học + {summary.mastered} Đã thuộc + {summary.review} Cần ôn
          </p>
        </div>

        {/* Thanh công cụ lọc & tìm kiếm */}
        <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0 bg-white">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                filter === 'all' ? 'bg-slate-800 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({summary.learned})
            </button>
            <button
              type="button"
              onClick={() => setFilter('learning')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                filter === 'learning' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Đang học ({summary.learning})
            </button>
            <button
              type="button"
              onClick={() => setFilter('mastered')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                filter === 'mastered' ? 'bg-amber-500 text-white shadow-xs' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Đã thuộc ({summary.mastered})
            </button>
            <button
              type="button"
              onClick={() => setFilter('review')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                filter === 'review' ? 'bg-sky-500 text-white shadow-xs' : 'bg-sky-50 text-sky-800 hover:bg-sky-100'
              }`}
            >
              Cần ôn ({summary.review})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm từ vựng..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Danh sách các từ chi tiết */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filteredWords.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm font-bold">
              Không tìm thấy từ vựng nào phù hợp.
            </div>
          ) : (
            filteredWords.map(word => {
              const isExpanded = expandedId === word.vocabId;
              const formattedIpa = formatPronunciation(word.pronunciation);

              return (
                <div
                  key={word.vocabId}
                  className="bg-white rounded-2xl border-2 border-slate-200 hover:border-amber-300 p-3 sm:p-4 transition-all shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Ảnh thu nhỏ & Thông tin từ */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {word.imageUrl ? (
                          <img
                            src={word.imageUrl}
                            alt={word.english}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-xl">🐾</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-800 text-base capitalize">
                            {word.english}
                          </span>
                          {formattedIpa && (
                            <span className="text-xs font-mono font-bold text-slate-400">
                              {formattedIpa}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => playWordAudio(word.english, word.audioUrl)}
                            className="text-slate-400 hover:text-amber-600 transition-colors p-0.5"
                            title="Nghe âm thanh"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="text-xs font-bold text-slate-500 block truncate">
                          {word.vietnamese}
                        </span>
                      </div>
                    </div>

                    {/* Huy hiệu trạng thái & nút Thao tác Phụ huynh */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Trạng thái hiện tại (Danh từ, không phải nút) */}
                      {word.state === 'mastered' ? (
                        <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          ⭐ Đã thuộc
                        </span>
                      ) : word.state === 'review' ? (
                        <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-sky-100 text-sky-900 border border-sky-300 flex items-center gap-1">
                          💧 Cần ôn
                          {word.reviewReason === 'due' && ' (đến hạn)'}
                          {word.reviewReason === 'failed' && ' (cần giúp)'}
                        </span>
                      ) : (
                        <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                          🌱 Đang học
                        </span>
                      )}

                      {/* Các nút hành động bằng ĐỘNG TỪ */}
                      <div className="flex items-center gap-1">
                        {word.state !== 'mastered' && (
                          <button
                            type="button"
                            onClick={() => handleSetOverride(word.vocabId, 'mastered')}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                          >
                            Đánh dấu đã thuộc
                          </button>
                        )}
                        {word.state !== 'review' && (
                          <button
                            type="button"
                            onClick={() => handleSetOverride(word.vocabId, 'review')}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-sky-900 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                          >
                            Cần ôn lại
                          </button>
                        )}
                        {word.parentOverride && (
                          <button
                            type="button"
                            onClick={() => handleSetOverride(word.vocabId, null)}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                            title="Xóa ghi đè"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : word.vocabId)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                        title={isExpanded ? 'Thu gọn' : 'Xem chi tiết'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Thông tin mở rộng: câu ví dụ, nguồn bài học, thống kê */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1.5 animate-fade-in">
                      {word.exampleSentence && (
                        <p className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <span className="font-bold text-slate-700">Ví dụ: </span>
                          "{word.exampleSentence}" {word.exampleSentenceVietnamese ? `(${word.exampleSentenceVietnamese})` : ''}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-slate-400 pt-1">
                        <span>Nguồn: <strong className="text-slate-600">{word.source === 'JOURNEY' ? 'Bài học Hành trình' : 'Chủ đề mở rộng'}</strong></span>
                        <span>Lần đúng: <strong className="text-slate-600">{(word.rememberCount || 0) + (word.gamesCorrectCount || 0)}</strong></span>
                        <span>Cần hỗ trợ: <strong className="text-slate-600">{word.reviewCount || 0}</strong></span>
                        {word.lastPracticedAt && (
                          <span>Gần nhất: <strong className="text-slate-600">{new Date(word.lastPracticedAt).toLocaleDateString('vi-VN')}</strong></span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Toast thông báo ghi đè kèm Hoàn tác (Undo) */}
        {toastMsg && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold z-50 animate-pop-in">
            <span>{toastMsg.text}</span>
            <button
              type="button"
              onClick={handleUndo}
              className="text-amber-400 hover:text-amber-300 underline font-black cursor-pointer"
            >
              Hoàn tác
            </button>
          </div>
        )}
      </div>

      {/* Modal giải thích các định nghĩa (Mục F) */}
      {showInfoModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setShowInfoModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-slate-200 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-slate-800">
              Giải thích các trạng thái từ vựng
            </h3>
            <div className="space-y-3 text-xs leading-relaxed text-slate-600">
              <p>
                <strong className="text-slate-800">📚 Đã học:</strong> Từ bé đã gặp ít nhất một lần (xem thẻ, nghe hoặc chơi).
              </p>
              <p>
                <strong className="text-emerald-700">🌱 Đang học:</strong> Bé đã gặp từ này nhưng chưa nhận ra đúng nhiều lần.
              </p>
              <p>
                <strong className="text-amber-700">⭐ Đã thuộc:</strong> Bé nhận ra đúng nhiều lần mà không cần gợi ý, ở ít nhất 2 ngày khác nhau (hoặc đã đánh dấu thuộc).
              </p>
              <p>
                <strong className="text-sky-700">💧 Cần ôn lại:</strong> Từ bé từng thuộc nhưng đã đến lúc ôn lại, hoặc lần gần nhất bé làm sai/cần gợi ý. Ôn lại cách vài ngày giúp bé nhớ lâu hơn.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowInfoModal(false)}
              className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 font-black text-xs text-amber-950 transition-colors cursor-pointer"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
