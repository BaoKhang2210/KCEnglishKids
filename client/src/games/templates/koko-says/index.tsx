import React, { useEffect, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { VocabImage } from '../../shared/VocabImage';
import { GamePrompt } from '../../shared/GamePrompt';
import { GameSpeedControl } from '../../shared/GameSpeedControl';
import { KokoMascot } from '../../../components/child/KokoMascot';
import { useManagedTimeout } from '../../shared/useManagedTimeout';
import { speakText } from '../../core/audioPhrases';
import { sfx } from '../../../utils/audio';
import type { Vocabulary } from '../../../types';

const HABITAT_BADGES = [
  '🌿 Bụi cỏ xanh',
  '☁️ Đám mây bông',
  '🌸 Vườn hoa nắng',
  '🌈 Cầu vồng nhỏ',
];

export const KokoSaysGame: React.FC<GameComponentProps> = ({
  targetVocab,
  options,
  attemptCount,
  isAssisted,
  onCorrect,
  onWrong,
  onReplayAudio,
}) => {
  const scheduleTimeout = useManagedTimeout();
  const [speed, setSpeed] = useState<number>(1);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [flashing, setFlashing] = useState(false);
  const [snappedVocab, setSnappedVocab] = useState<Vocabulary | null>(null);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [spotlightIdx, setSpotlightIdx] = useState<number>(0);

  useEffect(() => {
    setFocusedId(null);
    setFlashing(false);
    setSnappedVocab(null);
    setWrongId(null);
  }, [targetVocab._id]);

  // Animated playful movement across the stage
  useEffect(() => {
    if (snappedVocab || options.length === 0) return;
    const intervalMs = Math.round(1350 / speed);
    const id = window.setInterval(() => {
      setSpotlightIdx((prev) => (prev + 1) % options.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [snappedVocab, options.length, speed]);

  const handleSnapPhoto = (vocab: Vocabulary) => {
    if (snappedVocab) return;
    setFocusedId(vocab._id);
    setFlashing(true);
    scheduleTimeout(() => setFlashing(false), 260);
    void speakText(vocab.english, vocab.audioUrl);

    if (vocab._id === targetVocab._id) {
      sfx.playSuccess();
      setSnappedVocab(vocab);
      scheduleTimeout(() => {
        onCorrect();
      }, 950);
    } else {
      setWrongId(vocab._id);
      scheduleTimeout(() => setWrongId(null), 500);
      onWrong(vocab._id);
    }
  };

  return (
    <div className="w-full h-full relative flex flex-col justify-between py-1 select-none overflow-hidden">
      {/* Camera Flash Effect */}
      {flashing && (
        <div className="pointer-events-none fixed inset-0 z-[9999] bg-white/85 transition-opacity duration-200" />
      )}

      <GamePrompt
        text={
          <>
            Snap a photo of <span className="text-amber-300 font-black capitalize">{targetVocab.english}</span>! 📸
          </>
        }
        subtext={`Bấm ống kính chụp ảnh "${targetVocab.english}" (${targetVocab.vietnamese || 'mục tiêu'}) cùng Koko!`}
        onSpeak={onReplayAudio}
        rightSlot={<GameSpeedControl speed={speed} onChange={setSpeed} />}
      />

      {/* Camera Viewfinder Arena */}
      <div className="relative flex-1 flex flex-col items-center justify-between px-3 py-2 min-h-0">
        {/* Top Koko Photographer Bar */}
        <div className="flex items-center gap-3 bg-slate-900/60 border-2 border-amber-300/40 rounded-3xl px-4 py-1.5 shadow-lg">
          <KokoMascot
            state={snappedVocab ? 'celebrating' : isAssisted ? 'encouraging' : 'waving'}
            size="sm"
            interactive={false}
          />
          <div className="text-left">
            <div className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1.5">
              <span>📸 Koko Safari Camera</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 border border-emerald-300/40 text-[10px] text-emerald-200">
                AUTO-FOCUS
              </span>
            </div>
            <p className="text-xs font-bold text-indigo-100">
              {snappedVocab
                ? `Tuyệt vời! Bức ảnh "${snappedVocab.english}" đẹp xuất sắc! 🌟`
                : `Chạm vào "${targetVocab.english}" để bấm máy chụp ảnh nhé!`}
            </p>
          </div>
        </div>

        {/* Viewfinder Frame with Corner Brackets */}
        <div className="relative flex-1 w-full max-w-3xl my-2 rounded-3xl border-2 border-dashed border-cyan-300/40 bg-gradient-to-b from-sky-900/35 via-indigo-950/40 to-emerald-950/50 p-3 sm:p-5 flex items-center justify-center overflow-hidden shadow-inner">
          {/* Viewfinder Corner Marks */}
          <span className="pointer-events-none absolute top-3 left-3 w-7 h-7 border-t-4 border-l-4 border-amber-300 rounded-tl-xl" />
          <span className="pointer-events-none absolute top-3 right-3 w-7 h-7 border-t-4 border-r-4 border-amber-300 rounded-tr-xl" />
          <span className="pointer-events-none absolute bottom-3 left-3 w-7 h-7 border-b-4 border-l-4 border-amber-300 rounded-bl-xl" />
          <span className="pointer-events-none absolute bottom-3 right-3 w-7 h-7 border-b-4 border-r-4 border-amber-300 rounded-br-xl" />

          {/* Moving Safari Subjects */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full h-full place-items-center">
            {options.map((vocab, idx) => {
              const isTarget = vocab._id === targetVocab._id;
              const isSnapped = snappedVocab?._id === vocab._id;
              const isWrong = wrongId === vocab._id;
              const isDancing = spotlightIdx === idx;
              const showHint = (attemptCount >= 2 || isAssisted) && isTarget;

              return (
                <button
                  key={vocab._id}
                  type="button"
                  onClick={() => handleSnapPhoto(vocab)}
                  style={{
                    transform: isSnapped
                      ? 'scale(1.12) rotate(-3deg)'
                      : isDancing
                      ? 'translateY(-10px) scale(1.04)'
                      : 'translateY(4px) scale(0.97)',
                    transitionDuration: `${Math.round(450 / speed)}ms`,
                  }}
                  className={`group relative w-full max-w-[165px] h-[clamp(135px,26vmin,195px)] rounded-3xl border-4 flex flex-col items-center justify-between p-2.5 cursor-pointer transition-all shadow-xl ${
                    isSnapped
                      ? 'bg-white text-slate-900 border-white ring-8 ring-amber-300 z-20'
                      : showHint
                      ? 'bg-amber-400/25 border-amber-300 ring-8 ring-amber-300/60 animate-pulse'
                      : isWrong
                      ? 'bg-rose-500/30 border-rose-400 animate-gentle-wobble'
                      : isDancing
                      ? 'bg-white/20 border-cyan-300/80 shadow-cyan-400/20'
                      : 'bg-white/10 border-white/25 hover:bg-white/20 hover:border-amber-200'
                  }`}
                >
                  {/* Camera Crosshair Reticle on Hover / Active */}
                  <div
                    className={`w-full flex items-center justify-between text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      isSnapped
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-950/55 text-cyan-200'
                    }`}
                  >
                    <span>{HABITAT_BADGES[idx % HABITAT_BADGES.length]}</span>
                    <span>{isSnapped ? '📸 ĐÃ CHỤP!' : '🎯 NGẮM'}</span>
                  </div>

                  {/* Subject Art */}
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center my-auto">
                    <VocabImage vocab={vocab} className="w-full h-full drop-shadow-lg" />
                    {/* Viewfinder Focus Ring */}
                    <div
                      className={`pointer-events-none absolute -inset-2 rounded-full border-2 border-dashed transition-opacity ${
                        focusedId === vocab._id || showHint || isDancing
                          ? 'border-amber-300 opacity-90'
                          : 'border-white/30 opacity-0 group-hover:opacity-80'
                      }`}
                    />
                  </div>

                  {/* Polaroid Caption */}
                  <div
                    className={`w-full rounded-xl px-2 py-1 text-center font-black text-xs sm:text-sm capitalize truncate ${
                      isSnapped
                        ? 'bg-amber-100 text-slate-950'
                        : 'bg-slate-950/65 text-white'
                    }`}
                  >
                    {vocab.english}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Instant Polaroid Printout Celebration Overlay */}
          {snappedVocab && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-slate-950/45 backdrop-blur-[2px]">
              <div className="bg-white p-4 pb-6 rounded-3xl shadow-2xl border-4 border-amber-300 transform -rotate-3 animate-bounce flex flex-col items-center gap-2 max-w-[220px]">
                <div className="w-36 h-32 rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 flex items-center justify-center p-3 border-2 border-slate-200">
                  <VocabImage vocab={snappedVocab} className="w-full h-full" />
                </div>
                <div className="text-lg font-black text-slate-900 capitalize">
                  📸 {snappedVocab.english}!
                </div>
                {snappedVocab.vietnamese && (
                  <div className="text-xs font-bold text-slate-600">{snappedVocab.vietnamese}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KokoSaysGame;
