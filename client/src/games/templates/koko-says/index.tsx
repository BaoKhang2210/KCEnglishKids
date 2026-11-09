import React, { useCallback, useEffect, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { RotateCcw } from 'lucide-react';
import { sfx, playWordAudio, stopWordAudio } from '../../../utils/audio';
import { VocabImage } from '../../shared/VocabImage';
import { GamePrompt } from '../../shared/GamePrompt';
import { KokoMascot } from '../../../components/child/KokoMascot';
import type { Vocabulary } from '../../../types';
import { useManagedTimeout } from '../../shared/useManagedTimeout';

/**
 * Koko Says (tương đương Pip Says trên kidscards.vercel.app):
 * Pha 1 ('watch'): Koko chỉ tay & làm sáng thẻ mục tiêu kèm phát âm ("Watch and listen…")
 * Pha 2 ('play'): Đến lượt bé chạm lại đúng thẻ vừa sáng đèn ("Your turn! Repeat it!")
 * Pha 3 ('dance'): Koko nhảy mừng ("Dance party!")
 */
export const KokoSaysGame: React.FC<GameComponentProps> = ({
  targetVocab,
  options,
  attemptCount,
  isAssisted,
  onCorrect,
  onWrong,
}) => {
  const scheduleTimeout = useManagedTimeout();
  const [phase, setPhase] = useState<'watch' | 'play' | 'dance'>('watch');
  const [litId, setLitId] = useState<string | null>(null);
  const [wobbleId, setWobbleId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const playDemoSequence = useCallback(() => {
    setPhase('watch');
    setLitId(null);
    scheduleTimeout(() => {
      sfx.playPop();
      setLitId(targetVocab._id);
      stopWordAudio();
      void playWordAudio(targetVocab.english, targetVocab.audioUrl);
      scheduleTimeout(() => {
        setLitId(null);
        setPhase('play');
      }, 850);
    }, 450);
  }, [scheduleTimeout, targetVocab._id, targetVocab.english, targetVocab.audioUrl]);

  useEffect(() => {
    setLocked(false);
    setWobbleId(null);
    playDemoSequence();
  }, [targetVocab._id, playDemoSequence]);

  const handleChoose = (vocab: Vocabulary) => {
    if (phase !== 'play' || locked) return;
    setLitId(vocab._id);
    scheduleTimeout(() => setLitId(null), 350);

    if (vocab._id === targetVocab._id) {
      sfx.playSuccess();
      stopWordAudio();
      void playWordAudio(targetVocab.english, targetVocab.audioUrl);
      setLocked(true);
      setPhase('dance');
      scheduleTimeout(onCorrect, 550);
      return;
    }

    stopWordAudio();
    void playWordAudio(vocab.english, vocab.audioUrl);
    setWobbleId(vocab._id);
    scheduleTimeout(() => setWobbleId(null), 450);
    onWrong(vocab._id);
  };

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center gap-3 pt-10 select-none">
      <GamePrompt
        onSpeak={playDemoSequence}
        text={
          <>
            Koko says: touch the <span className="text-amber-300 capitalize">{targetVocab.english}</span>! 🐻
          </>
        }
        subtext={
          phase === 'watch'
            ? 'Watch and listen… (Nhìn & nghe Koko nhé)'
            : phase === 'dance'
              ? 'Dance party! Giỏi lắm! 🎉'
              : 'Your turn! Chạm lại thẻ Koko vừa gọi nhé!'
        }
        rightSlot={
          <button
            type="button"
            onClick={playDemoSequence}
            className="inline-flex items-center gap-1 rounded-full bg-amber-400/90 hover:bg-amber-300 px-3 py-1 text-xs font-black text-slate-950 shadow cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Xem lại</span>
          </button>
        }
      />

      <div className="shrink-0">
        <KokoMascot
          state={phase === 'dance' ? 'celebrating' : phase === 'watch' ? 'speaking' : 'happy'}
          size="md"
          interactive={false}
          speechBubble={
            phase === 'watch'
              ? `Listen: "${targetVocab.english}"! 👀`
              : phase === 'dance'
                ? 'Awesome! 🎶'
                : `Your turn! Touch "${targetVocab.english}"!`
          }
        />
      </div>

      {/* Hàng thẻ Koko Says chuẩn says-row trên kidscards */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 px-3 max-w-4xl">
        {options.map((vocab) => {
          const isLit = litId === vocab._id;
          const isWobble = wobbleId === vocab._id;
          const glow =
            phase === 'play' && (attemptCount >= 2 || isAssisted) && vocab._id === targetVocab._id;

          return (
            <button
              key={vocab._id}
              type="button"
              disabled={phase !== 'play'}
              aria-label={vocab.english}
              onClick={() => handleChoose(vocab)}
              className={`w-[clamp(112px,22vmin,165px)] h-[clamp(132px,26vmin,190px)] rounded-3xl border-4 p-3 flex flex-col items-center justify-between transition-all duration-200 cursor-pointer shadow-xl ${
                isLit
                  ? 'bg-amber-200 border-amber-400 ring-8 ring-amber-300/80 -translate-y-2 scale-105'
                  : 'bg-white/95 border-indigo-200 hover:border-amber-300 active:scale-95'
              } ${isWobble ? 'animate-gentle-wobble border-rose-500 ring-4 ring-rose-300' : ''} ${
                glow ? 'ring-8 ring-amber-300 border-amber-400' : ''
              } ${phase === 'dance' && vocab._id === targetVocab._id ? 'animate-bounce' : ''}`}
            >
              <div className="flex-1 w-full flex items-center justify-center min-h-0">
                <VocabImage vocab={vocab} className="w-[78%] h-[78%] object-contain" />
              </div>
              <span className="mt-1 text-sm sm:text-base font-black text-slate-800 capitalize truncate max-w-full">
                {vocab.english}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default KokoSaysGame;
