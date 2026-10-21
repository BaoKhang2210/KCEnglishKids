import React, { useEffect, useRef } from 'react';
import { X, Target, CheckCircle2, BookOpen, Volume2, RotateCcw } from 'lucide-react';
import type { Vocabulary } from '../../../types';
import { useVocabStats } from '../../../hooks/useVocabStats';
import { playWordAudio, sfx } from '../../../utils/audio';
import { getGameInstructions, getGameLabel } from '../../../data/labels';

interface ParentGameInfo {
  _id: string;
  title: string;
  vietnameseTitle?: string;
  activityType: string;
  questionCount?: number;
  instructions?: string;
  completed?: boolean;
  stars?: number;
}

interface ParentInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  childId?: string;
  lessonTitle?: string;
  lessonVietnameseTitle?: string;
  objectives?: string[];
  vocabulary?: Vocabulary[];
  ageGroupCode?: string;
  stage1Completed?: boolean;
  stage2Completed?: boolean;
  stage3Completed?: boolean;
  activeStage?: number;
  games?: ParentGameInfo[];
  enableSpeakCoach?: boolean;
  onToggleSpeakCoach?: (enabled: boolean) => void;
}

const STAGE_DESCRIPTIONS: Record<number, { label: string; icon: string; desc: string }> = {
  1: { label: 'Khám phá', icon: '🔍', desc: 'Bé chạm vào hình ảnh để nghe phát âm và khám phá từ vựng mới.' },
  2: { label: 'Học & Luyện tập', icon: '📖', desc: 'Bé luyện phản xạ 5 hoạt động (Nghe chạm, Tìm đồ, Đưa Koko, Đúng/Sai, Âm đầu).' },
  3: { label: 'Vui chơi', icon: '🎮', desc: 'Bé chơi mini-game tương tác để củng cố từ vựng đã học.' },
};

export const ParentInfoDrawer: React.FC<ParentInfoDrawerProps> = ({
  isOpen,
  onClose,
  childId = 'default',
  lessonTitle = 'Bài học',
  lessonVietnameseTitle,
  objectives = [],
  vocabulary = [],
  ageGroupCode: _ageGroupCode,
  stage1Completed,
  stage2Completed,
  stage3Completed,
  activeStage = 1,
  games = [],
  enableSpeakCoach = true,
  onToggleSpeakCoach,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const { statsMap, clearStats } = useVocabStats(childId);

  // Focus trap & ESC close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    setTimeout(() => closeRef.current?.focus(), 100);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Thông tin cho phụ huynh"
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="w-full max-w-md h-full bg-slate-50 shadow-2xl flex flex-col overflow-hidden animate-slide-in-right"
        style={{ minWidth: 320 }}
      >
        {/* Header */}
        <div className="shrink-0 px-5 py-4 bg-indigo-700 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl" aria-hidden>👨‍👩‍👧</span>
            <div className="min-w-0">
              <h2 className="text-base font-black truncate leading-tight">Dành cho phụ huynh</h2>
              <p className="text-sm text-indigo-100 truncate leading-tight mt-0.5">
                {lessonTitle} {lessonVietnameseTitle && `• ${lessonVietnameseTitle}`}
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Đóng bảng thông tin"
            className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer active:scale-95 transition-all shrink-0 ml-2"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
          {/* Settings: Speak Switch & Reset */}
          <div className="bg-white border-2 border-indigo-100 rounded-2xl p-4 shadow-xs space-y-3">
            <h3 className="text-sm font-black text-slate-800 flex items-center justify-between">
              <span>⚙️ Cài đặt buổi học</span>
            </h3>

            {onToggleSpeakCoach && (
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-sm font-bold text-slate-800">Luyện nói cùng Koko (Microphone)</p>
                  <p className="text-sm text-slate-600">Khuyến khích bé nhắc lại từ vựng khi trả lời đúng</p>
                </div>
                <input
                  type="checkbox"
                  checked={enableSpeakCoach}
                  onChange={(e) => onToggleSpeakCoach(e.target.checked)}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div>
                <p className="text-sm font-bold text-slate-800">Xóa dữ liệu luyện tập Chặng 2</p>
                <p className="text-sm text-slate-600">Đặt lại thống kê từ thuộc / từ hay sai về ban đầu</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Bạn có chắc muốn xóa lịch sử luyện tập Chặng 2 của bé để học lại từ đầu?')) {
                    clearStats();
                    sfx.playPop();
                  }
                }}
                className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm font-bold hover:bg-rose-100 cursor-pointer flex items-center gap-1 active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xóa dữ liệu</span>
              </button>
            </div>
          </div>

          {/* 3 Stages progress */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-xs">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              Lộ trình 3 Chặng học
            </h3>
            <div className="space-y-2">
              {[1, 2, 3].map((stageNum) => {
                const info = STAGE_DESCRIPTIONS[stageNum];
                const isCompleted =
                  stageNum === 1
                    ? stage1Completed
                    : stageNum === 2
                    ? stage2Completed
                    : stage3Completed;
                const isCurrent = activeStage === stageNum;

                return (
                  <div
                    key={stageNum}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      isCurrent
                        ? 'border-indigo-400 bg-indigo-50/60'
                        : isCompleted
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : 'border-slate-200 bg-white opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{info.icon}</span>
                        <span className="text-sm font-black text-slate-800">
                          Chặng {stageNum}: {info.label}
                        </span>
                      </div>
                      {isCompleted ? (
                        <span className="flex items-center gap-1 text-sm font-black text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn thành
                        </span>
                      ) : isCurrent ? (
                        <span className="text-sm font-black text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-full">
                          Đang học
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-slate-600">Chưa mở</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 font-bold mt-1 leading-snug">{info.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stage 3 game reference for adults */}
          {games.length > 0 && (
            <section className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4 shadow-xs">
              <h3 className="text-base font-black text-indigo-950 mb-3 flex items-center gap-2">
                🎮 Trò chơi ở Chặng 3
              </h3>
              <div className="space-y-3">
                {games.map((game) => (
                  <article key={game._id} className="rounded-xl border border-indigo-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-sm font-black leading-snug text-slate-900">
                          {game.title}
                        </h4>
                        {game.vietnameseTitle && game.vietnameseTitle !== game.title && (
                          <p className="mt-0.5 text-sm font-bold text-slate-700">{game.vietnameseTitle}</p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-lg bg-indigo-100 px-2 py-1 text-sm font-black text-indigo-900">
                        {game.completed ? '✓ Xong' : 'Đang chờ'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-800">
                      {getGameLabel(game.activityType)} · {game.questionCount || 0} câu · {Math.max(0, Math.min(3, Number(game.stars) || 0))}/3 sao
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">
                      {game.instructions || getGameInstructions(game.activityType)}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Objectives */}
          {objectives.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 shadow-xs">
              <h3 className="text-sm font-black text-amber-900 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-700" />
                Mục tiêu sau buổi học
              </h3>
              <ul className="space-y-1.5">
                {objectives.map((obj, i) => (
                  <li key={i} className="text-sm font-bold text-amber-950 flex items-start gap-2">
                    <span className="text-amber-500 font-black">•</span>
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Vocabulary details with Mastery Badge and Confusions */}
          {vocabulary.length > 0 && (
            <div>
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide mb-3 flex items-center justify-between">
                <span>📝 Trạng thái từ vựng ({vocabulary.length} từ)</span>
              </h3>
              <div className="space-y-2">
                {vocabulary.map((vocab, idx) => {
                  const vId = vocab._id || (vocab as any).id || vocab.english;
                  const stat = statsMap[vId];
                  const mastery = stat?.mastery || 'new';
                  const isTrouble = stat?.trouble || false;

                  // Find top confusion
                  let topConfusion = '';
                  if (stat?.confusions && Object.keys(stat.confusions).length > 0) {
                    const sortedConf = Object.entries(stat.confusions).sort((a, b) => b[1] - a[1]);
                    const wrongWord = vocabulary.find(
                      (v) => (v._id || (v as any).id || v.english) === sortedConf[0][0]
                    );
                    if (wrongWord) {
                      topConfusion = wrongWord.english;
                    }
                  }

                  let badgeColor = 'bg-slate-100 text-slate-600 border-slate-200';
                  let badgeText = '⚪ Chưa luyện';
                  if (mastery === 'strong' || mastery === 'known') {
                    badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                    badgeText = '🟢 Đã thuộc';
                  } else if (isTrouble) {
                    badgeColor = 'bg-orange-100 text-orange-900 border-orange-300';
                    badgeText = '🟠 Cần ôn';
                  } else if (mastery === 'learning') {
                    badgeColor = 'bg-amber-100 text-amber-900 border-amber-300';
                    badgeText = '🟡 Đang học';
                  }

                  return (
                    <div key={vId || idx} className="bg-white border-2 border-slate-200 rounded-2xl p-3">
                      <div className="flex items-start gap-3">
                        {vocab.imageUrl && (
                          <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                            <img src={vocab.imageUrl} alt={vocab.english} className="w-full h-full object-contain" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-black text-slate-800 uppercase">{vocab.english}</span>
                            {vocab.pronunciation && (
                              <span className="text-sm font-bold text-slate-600 font-mono">/{vocab.pronunciation}/</span>
                            )}
                            <span className={`text-sm font-black px-2 py-0.5 rounded-full border ${badgeColor}`}>
                              {badgeText}
                            </span>
                          </div>
                          <p className="text-sm font-extrabold text-emerald-700 mt-0.5">{vocab.vietnamese}</p>

                          {topConfusion && (
                            <p className="text-sm font-bold text-orange-800 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md mt-1 inline-block">
                              ⚠️ Bé hay nhầm với từ "{topConfusion}"
                            </p>
                          )}

                          {vocab.exampleSentence && (
                            <p className="text-sm text-slate-700 font-bold mt-1 italic leading-snug">
                              "{vocab.exampleSentence}"
                              {vocab.exampleSentenceVietnamese && (
                                <span className="not-italic text-slate-400"> — {vocab.exampleSentenceVietnamese}</span>
                              )}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => playWordAudio(vocab.english, vocab.audioUrl)}
                          className="shrink-0 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center border border-emerald-300 hover:bg-emerald-200 transition-colors cursor-pointer"
                          title="Nghe phát âm"
                        >
                          <Volume2 className="w-4 h-4 text-emerald-700" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Parenting tips */}
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
            <h3 className="text-sm font-black text-purple-900 mb-2 flex items-center gap-2">
              💡 Hướng dẫn đồng hành cùng bé
            </h3>
            <ul className="space-y-1.5 text-sm font-bold text-purple-950">
              <li>• Bé 3–6 tuổi học qua trực giác thị giác & âm thanh. Không ép bé phải đọc mặt chữ.</li>
              <li>• Chặng 2 tự động nhận diện từ hay nhầm để đưa ra câu hỏi củng cố. Ba mẹ chỉ cần cổ vũ khi bé hoàn thành.</li>
              <li>• Khen ngợi mỗi lần bé chạm đúng ("Giỏi quá!", "Con làm được rồi!").</li>
              <li>• Không sửa lỗi phát âm trực tiếp — để Koko hướng dẫn tự nhiên.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-slate-200 bg-white">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm cursor-pointer transition-colors active:scale-95"
          >
            Đóng • Cùng học với bé 🚀
          </button>
        </div>
      </div>
    </div>
  );
};
