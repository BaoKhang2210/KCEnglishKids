import React, { useState, useEffect } from 'react';
import { X, Volume2, Home, RotateCcw, ArrowRight } from 'lucide-react';
import { ChoiceCard } from '../common/ChoiceCard';
import { KokoMascot } from '../KokoMascot';
import { vocabMasteryService, type WordMasteryDetail } from '../../../services/vocabMasteryService';
import { playWordAudio, sfx } from '../../../utils/audio';
import { buildReviewSession, type ReviewSessionPlan } from '../../../services/reviewSessionBuilder';
import { VOCAB_LEARNING_CONFIG } from '../../../config/vocabLearningConfig';

interface VocabReviewScreenProps {
  words: (WordMasteryDetail & { state: 'learning' | 'mastered' | 'review' })[];
  childId: string;
  scope?: string;
  onExit: () => void;
  onGoHome?: () => void;
  onCompleted: () => void;
}

export const VocabReviewScreen: React.FC<VocabReviewScreenProps> = ({
  words,
  childId,
  scope = 'all',
  onExit,
  onGoHome,
  onCompleted,
}) => {
  const [sessionPlan, setSessionPlan] = useState<ReviewSessionPlan>(() =>
    buildReviewSession(words, scope, Date.now(), VOCAB_LEARNING_CONFIG)
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [stateTransitions, setStateTransitions] = useState<
    { word: WordMasteryDetail; prevState: string; nextState: string }[]
  >([]);

  const currentItem = sessionPlan.items[currentIdx];
  const targetWord = currentItem?.targetWord;

  // Tự động phát âm khi câu hỏi mới bắt đầu
  useEffect(() => {
    if (targetWord && !isFinished) {
      const timer = setTimeout(() => {
        playWordAudio(targetWord.english, targetWord.audioUrl);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentIdx, targetWord, isFinished]);

  if (!targetWord && !isFinished) {
    return null;
  }

  const handleSelectOption = (opt: WordMasteryDetail & { isCorrect: boolean }) => {
    if (feedback !== 'idle' || isFinished) return;
    setSelectedId(opt._id);

    if (opt.isCorrect) {
      setFeedback('correct');
      sfx.playCorrect();

      // Lưu kết quả vào service
      vocabMasteryService.recordGameResult(childId, targetWord.vocabId || targetWord._id, true);

      // Ghi nhận chuyển trạng thái: 💧 -> 🌸 (hoặc 🌱 lớn thêm)
      const prevState = targetWord.state;
      const nextState = prevState === 'review' ? 'mastered' : 'learning';
      setStateTransitions(prev => [
        ...prev,
        { word: targetWord, prevState, nextState }
      ]);

      setTimeout(() => {
        setFeedback('idle');
        setSelectedId(null);

        if (currentIdx + 1 < sessionPlan.items.length) {
          setCurrentIdx(prev => prev + 1);
        } else {
          sfx.playSuccess();
          setIsFinished(true);
          onCompleted();
        }
      }, 1300);
    } else {
      // Sai nhẹ theo chính sách "không thất bại", cây không đổi
      setFeedback('wrong');
      sfx.playGentleWrong();
      vocabMasteryService.recordGameResult(childId, targetWord.vocabId || targetWord._id, false);

      setTimeout(() => {
        setFeedback('idle');
        setSelectedId(null);
      }, 900);
    }
  };

  const handlePlayPrompt = () => {
    if (targetWord) {
      playWordAudio(targetWord.english, targetWord.audioUrl);
    }
  };

  const handleRestart = () => {
    sfx.playPop();
    const newPlan = buildReviewSession(words, scope, Date.now(), VOCAB_LEARNING_CONFIG);
    setSessionPlan(newPlan);
    setCurrentIdx(0);
    setFeedback('idle');
    setSelectedId(null);
    setIsFinished(false);
    setStateTransitions([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-amber-100 via-orange-50 to-amber-100 select-none overflow-hidden">
      {/* ── 1. Top Bar: Nút ✕ (>= 56px) + DẢI CHẬU CÂY TRỰC QUAN ── */}
      <header className="w-full px-4 sm:px-8 py-3 bg-white/90 backdrop-blur-md border-b-3 border-amber-200 flex items-center justify-between gap-4 flex-shrink-0 shadow-xs">
        {/* Nút thoát */}
        <button
          type="button"
          onClick={onExit}
          aria-label="Thoát phiên ôn"
          style={{ minWidth: '56px', minHeight: '56px' }}
          className="rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center cursor-pointer shadow-xs transition-transform"
        >
          <X className="w-8 h-8 stroke-[3]" />
        </button>

        {/* Dải chậu cây: mỗi từ đích là một chậu hiển thị icon trạng thái (🌱/💧/🌸) */}
        <div className="flex items-center gap-3 sm:gap-5">
          {sessionPlan.items.map((item, idx) => {
            const isCurrent = idx === currentIdx && !isFinished;
            const isDone = idx < currentIdx || isFinished;
            const stateIcon =
              item.targetWord.state === 'mastered'
                ? '🌸'
                : item.targetWord.state === 'review'
                ? '💧'
                : '🌱';

            return (
              <div
                key={item.targetWord._id || idx}
                style={{
                  width: isCurrent ? '64px' : '52px',
                  height: isCurrent ? '64px' : '52px',
                }}
                className={`rounded-2xl flex flex-col items-center justify-center transition-all duration-300 border-3 relative ${
                  isCurrent
                    ? 'bg-amber-300 border-amber-500 scale-110 shadow-lg ring-4 ring-amber-200'
                    : isDone
                    ? 'bg-emerald-100 border-emerald-400 opacity-90'
                    : 'bg-white border-slate-200 opacity-60'
                }`}
              >
                <span className="text-2xl sm:text-3xl leading-none">
                  {isDone ? '✨' : stateIcon}
                </span>
                {/* Chậu hoa nhỏ ở đáy */}
                <span className="text-[10px] leading-none mt-0.5">🪴</span>
              </div>
            );
          })}
        </div>

        <div style={{ width: '56px' }} /> {/* Spacer cân bằng header */}
      </header>

      {/* ── 2. Nội dung chính: Bên trái Koko, Bên phải các lựa chọn ChoiceCard ── */}
      {!isFinished ? (
        <main className="flex-1 w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between p-4 sm:p-8 gap-6 overflow-hidden">
          {/* CỘT TRÁI: Koko (>= 96px) + Nút 🔊 lớn (>= 72px) */}
          <div className="flex flex-col items-center justify-center gap-4 flex-shrink-0">
            <div className="w-36 h-36 sm:w-48 sm:h-48 flex items-center justify-center">
              <KokoMascot
                state={feedback === 'correct' ? 'celebrating' : feedback === 'wrong' ? 'thinking' : 'happy'}
                size="lg"
              />
            </div>

            <button
              type="button"
              onClick={handlePlayPrompt}
              aria-label="Phát âm từ"
              style={{ minWidth: '76px', minHeight: '76px' }}
              className="rounded-full bg-amber-400 hover:bg-amber-500 active:scale-95 text-amber-950 flex items-center justify-center shadow-xl border-4 border-white transition-all cursor-pointer"
            >
              <Volume2 className="w-11 h-11 stroke-[3]" />
            </button>
          </div>

          {/* CỘT PHẢI: Lựa chọn bằng ChoiceCard vuông, không bóp méo, chữ >= 28px */}
          <div
            className={`flex-1 w-full flex items-center justify-center gap-4 sm:gap-6 ${
              currentItem.options.length === 2
                ? 'grid grid-cols-2 max-w-xl'
                : 'grid grid-cols-2 sm:grid-cols-3 max-w-3xl'
            }`}
          >
            {currentItem.options.map(opt => (
              <ChoiceCard
                key={opt._id}
                item={{
                  english: opt.english,
                  vietnamese: opt.vietnamese,
                  imageUrl: opt.imageUrl,
                }}
                isSelected={selectedId === opt._id}
                status={
                  feedback === 'correct' && opt.isCorrect
                    ? 'correct'
                    : feedback === 'wrong' && selectedId === opt._id
                    ? 'wrong'
                    : 'idle'
                }
                onClick={() => handleSelectOption(opt)}
                size={230}
              />
            ))}
          </div>
        </main>
      ) : (
        /* ── 3. MÀN TỔNG KẾT: Dải chậu cây với Koko ăn mừng & 3 nút hành động lớn ── */
        <main className="flex-1 w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-6 text-center animate-pop-in">
          <div className="w-40 h-40 mb-3 flex items-center justify-center">
            <KokoMascot state="celebrating" size="lg" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-amber-950 font-display mb-2">
            Vườn hoa của bé rực rỡ quá! 🌟
          </h2>

          {/* Dải chậu hoa hoàn thành & tóm tắt chuyển trạng thái */}
          <div className="flex flex-wrap items-center justify-center gap-4 my-6 bg-white/80 p-5 rounded-3xl border-3 border-amber-300 shadow-md">
            {sessionPlan.items.map((item, idx) => {
              const trans = stateTransitions.find(t => t.word._id === item.targetWord._id);
              return (
                <div key={idx} className="flex flex-col items-center">
                  <span className="text-4xl animate-soft-bounce">🌸</span>
                  <span className="text-xs font-black text-amber-950 capitalize mt-1">
                    {item.targetWord.english}
                  </span>
                  {trans && trans.prevState === 'review' && (
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-1 border border-emerald-200">
                      Đã nở hoa ✨
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 3 nút icon lớn: ➜ Về album, 🔁 Chơi tiếp, 🏠 Trang chủ */}
          <div className="flex items-center justify-center gap-5 mt-4">
            <button
              type="button"
              onClick={onExit}
              aria-label="Về Album từ"
              style={{ minWidth: '64px', minHeight: '64px' }}
              className="rounded-3xl bg-amber-400 hover:bg-amber-500 active:scale-95 text-amber-950 flex items-center justify-center shadow-lg border-2 border-amber-300 cursor-pointer transition-transform"
              title="Về Album từ"
            >
              <ArrowRight className="w-8 h-8 stroke-[3]" />
            </button>

            <button
              type="button"
              onClick={handleRestart}
              aria-label="Chơi tiếp phiên mới"
              style={{ minWidth: '64px', minHeight: '64px' }}
              className="rounded-3xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white flex items-center justify-center shadow-lg border-2 border-emerald-400 cursor-pointer transition-transform"
              title="Chơi tiếp phiên mới"
            >
              <RotateCcw className="w-8 h-8 stroke-[3]" />
            </button>

            {onGoHome && (
              <button
                type="button"
                onClick={onGoHome}
                aria-label="Về trang chủ"
                style={{ minWidth: '64px', minHeight: '64px' }}
                className="rounded-3xl bg-sky-400 hover:bg-sky-500 active:scale-95 text-sky-950 flex items-center justify-center shadow-lg border-2 border-sky-300 cursor-pointer transition-transform"
                title="Về trang chủ"
              >
                <Home className="w-8 h-8 stroke-[2.5]" />
              </button>
            )}
          </div>
        </main>
      )}
    </div>
  );
};
