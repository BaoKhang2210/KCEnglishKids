import React, { useEffect, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { VocabImage } from '../../shared/VocabImage';
import { GamePrompt } from '../../shared/GamePrompt';
import { KokoMascot } from '../../../components/child/KokoMascot';
import type { Vocabulary } from '../../../types';
import { useManagedTimeout } from '../../shared/useManagedTimeout';
import { speakText } from '../../core/audioPhrases';
import { sfx } from '../../../utils/audio';

const CAPSULE_COLORS = [
  'from-rose-400/80 to-pink-600/80 border-rose-200',
  'from-sky-400/80 to-blue-600/80 border-sky-200',
  'from-amber-400/80 to-orange-600/80 border-amber-200',
  'from-emerald-400/80 to-teal-600/80 border-emerald-200',
];

type ClawPhase = 'idle' | 'dropping' | 'lifting' | 'delivering' | 'celebrating' | 'wrong';

export const KokosDeliveryGame: React.FC<GameComponentProps> = ({
  targetVocab,
  options,
  attemptCount,
  isAssisted,
  onCorrect,
  onWrong,
  onReplayAudio,
}) => {
  const scheduleTimeout = useManagedTimeout();
  const [clawIndex, setClawIndex] = useState<number>(0);
  const [phase, setPhase] = useState<ClawPhase>('idle');
  const [grabbedVocab, setGrabbedVocab] = useState<Vocabulary | null>(null);
  const [wrongId, setWrongId] = useState<string | null>(null);

  useEffect(() => {
    setPhase('idle');
    setGrabbedVocab(null);
    setWrongId(null);
    setClawIndex(0);
  }, [targetVocab._id]);

  const count = Math.max(options.length, 1);
  // Compute horizontal percentage for slot index so the claw aligns directly over the chosen capsule
  const slotPercent = (idx: number) => ((idx + 0.5) / count) * 100;

  const triggerClawGrab = (vocab: Vocabulary, idx: number) => {
    if (phase !== 'idle') return;
    sfx.playPop();
    setClawIndex(idx);
    setPhase('dropping');
    void speakText(vocab.english, vocab.audioUrl);

    scheduleTimeout(() => {
      setGrabbedVocab(vocab);
      setPhase('lifting');

      scheduleTimeout(() => {
        if (vocab._id === targetVocab._id) {
          setPhase('delivering');
          sfx.playSuccess();
          scheduleTimeout(() => {
            setPhase('celebrating');
            scheduleTimeout(onCorrect, 550);
          }, 420);
        } else {
          setPhase('wrong');
          setWrongId(vocab._id);
          onWrong(vocab._id);
          scheduleTimeout(() => {
            setGrabbedVocab(null);
            setWrongId(null);
            setPhase('idle');
          }, 520);
        }
      }, 420);
    }, 380);
  };

  const clawLeftPercent =
    phase === 'delivering' || phase === 'celebrating' ? 84 : slotPercent(clawIndex);

  const cableHeight =
    phase === 'dropping' ? 145 : phase === 'lifting' ? 48 : phase === 'delivering' ? 40 : 44;

  return (
    <div className="w-full h-full relative flex flex-col justify-between py-1 select-none overflow-hidden">
      <GamePrompt
        text={
          <>
            Use the Claw to catch <span className="text-amber-300 font-black capitalize">{targetVocab.english}</span>! 🕹️
          </>
        }
        subtext={`Chạm vào quả bóng "${targetVocab.english}" (${targetVocab.vietnamese || 'mục tiêu'}) để tay gắp tự động gắp lên tàu cho Koko!`}
        onSpeak={onReplayAudio}
      />

      {/* Claw Machine Arena */}
      <div className="relative flex-1 w-full max-w-4xl mx-auto my-1 rounded-3xl border-4 border-amber-300/50 bg-gradient-to-b from-indigo-950/80 via-purple-950/70 to-slate-950/90 shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Top Crane Gantry Rail */}
        <div className="relative w-full h-7 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 border-b-4 border-amber-700 flex items-center justify-between px-4 z-20">
          <span className="text-[11px] font-black text-slate-950 uppercase tracking-wider">
            🕹️ Koko Arcade Crane Express
          </span>
          <span className="text-[11px] font-black text-slate-950">
            {phase === 'idle' ? 'CHẠM BÓNG ĐỂ GẮP!' : 'ĐANG GẮP...'}
          </span>
        </div>

        {/* Moving Crane Trolley & Mechanical Claw */}
        <div className="relative flex-1 min-h-[140px] w-full">
          <div
            className="absolute top-0 -translate-x-1/2 flex flex-col items-center z-20 transition-all duration-300 ease-out"
            style={{ left: `${clawLeftPercent}%` }}
          >
            {/* Trolley Box */}
            <div className="w-14 h-5 rounded-b-xl bg-amber-400 border-2 border-slate-900 shadow-md flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            </div>

            {/* Steel Cable */}
            <div
              className="w-1.5 bg-gradient-to-b from-slate-300 to-slate-500 transition-all duration-300"
              style={{ height: `${cableHeight}px` }}
            />

            {/* 3-Prong Mechanical Claw */}
            <div className="relative flex flex-col items-center">
              <div className="w-8 h-4 rounded-t-full bg-amber-400 border-2 border-slate-900" />
              <div className="relative w-20 h-12 flex items-start justify-between px-1">
                {/* Left Prong */}
                <div
                  className={`w-3 h-11 rounded-b-full border-2 border-slate-900 bg-slate-200 origin-top transition-transform duration-200 ${
                    phase === 'dropping'
                      ? 'rotate-[28deg]'
                      : grabbedVocab
                      ? '-rotate-[14deg]'
                      : 'rotate-[12deg]'
                  }`}
                />
                {/* Right Prong */}
                <div
                  className={`w-3 h-11 rounded-b-full border-2 border-slate-900 bg-slate-200 origin-top transition-transform duration-200 ${
                    phase === 'dropping'
                      ? '-rotate-[28deg]'
                      : grabbedVocab
                      ? 'rotate-[14deg]'
                      : '-rotate-[12deg]'
                  }`}
                />
              </div>

              {/* Grabbed Capsule Held in Claw */}
              {grabbedVocab && phase !== 'celebrating' && (
                <div
                  className={`-mt-7 w-20 h-20 rounded-full border-4 border-white bg-gradient-to-br from-amber-300 to-orange-500 shadow-2xl flex items-center justify-center p-2 ${
                    phase === 'wrong' ? 'animate-gentle-wobble border-rose-400' : ''
                  }`}
                >
                  <VocabImage vocab={grabbedVocab} className="w-full h-full" />
                </div>
              )}
            </div>
          </div>

          {/* Right-side Koko Express Train Hopper */}
          <div className="absolute right-3 bottom-2 z-10 flex flex-col items-center">
            <KokoMascot
              state={
                phase === 'celebrating'
                  ? 'celebrating'
                  : isAssisted
                  ? 'encouraging'
                  : 'happy'
              }
              size="sm"
              interactive={false}
            />
            <div
              className={`mt-1 w-28 sm:w-32 h-20 rounded-2xl border-4 flex flex-col items-center justify-center gap-1 shadow-xl transition-all ${
                phase === 'celebrating'
                  ? 'bg-emerald-500 border-emerald-200 ring-8 ring-emerald-300/50 scale-105'
                  : 'bg-gradient-to-b from-amber-600 to-amber-800 border-amber-300'
              }`}
            >
              {phase === 'celebrating' ? (
                <VocabImage vocab={targetVocab} className="w-12 h-12 animate-bounce" />
              ) : (
                <VocabImage vocab={targetVocab} silhouette className="w-10 h-10 opacity-75" />
              )}
              <span className="text-[10px] font-black text-amber-100 uppercase tracking-wider">
                🚂 Toa Tàu Koko
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Conveyor Belt with Toy Capsules */}
        <div className="relative z-20 bg-slate-900/90 border-t-4 border-slate-700 px-3 py-3">
          <div
            className="grid gap-2.5 sm:gap-4 w-full"
            style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
          >
            {options.map((vocab, idx) => {
              const isTarget = vocab._id === targetVocab._id;
              const isGrabbed = grabbedVocab?._id === vocab._id && phase !== 'idle';
              const isWrong = wrongId === vocab._id;
              const showHint = (attemptCount >= 2 || isAssisted) && isTarget;
              const colorCls = CAPSULE_COLORS[idx % CAPSULE_COLORS.length];

              return (
                <div key={vocab._id} className="flex flex-col items-center">
                  <button
                    type="button"
                    disabled={phase !== 'idle'}
                    onClick={() => triggerClawGrab(vocab, idx)}
                    className={`group relative w-[clamp(78px,17vmin,118px)] h-[clamp(78px,17vmin,118px)] rounded-full border-4 bg-gradient-to-br ${colorCls} flex flex-col items-center justify-center p-2 shadow-xl cursor-pointer transition-all ${
                      isGrabbed
                        ? 'opacity-20 scale-75'
                        : showHint
                        ? 'ring-8 ring-amber-300 animate-bounce scale-105'
                        : isWrong
                        ? 'animate-gentle-wobble border-rose-400'
                        : 'hover:-translate-y-2 hover:scale-105 active:scale-95'
                    }`}
                  >
                    {/* Glossy Capsule Top Dome Highlight */}
                    <span className="pointer-events-none absolute top-1.5 left-3 w-7 h-3 rounded-full bg-white/55 -rotate-12" />
                    <VocabImage vocab={vocab} className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-md" />
                    <span className="mt-0.5 px-2 py-0.5 rounded-full bg-slate-950/70 text-[11px] sm:text-xs font-black text-white capitalize truncate max-w-[92%]">
                      {vocab.english}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KokosDeliveryGame;
