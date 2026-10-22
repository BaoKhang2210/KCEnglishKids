import React, { useEffect, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { sfx } from '../../../utils/audio';
import { VocabImage } from '../../shared/VocabImage';
import { GamePrompt } from '../../shared/GamePrompt';
import { shuffleArray } from '../../core/targetSelector';
import type { Vocabulary } from '../../../types';
import { playWordAudio } from '../../../utils/audio';
import { useManagedTimeout } from '../../shared/useManagedTimeout';

export const MysteryBoxesGame: React.FC<GameComponentProps> = ({
  config,
  targetVocab,
  options,
  attemptCount,
  isAssisted,
  onCorrect,
  onWrong,
}) => {
  const scheduleTimeout = useManagedTimeout();
  const [boxes, setBoxes] = useState<Vocabulary[]>([]);
  const [shuffling, setShuffling] = useState(true);
  const [previewing, setPreviewing] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    setBoxes(shuffleArray(options.slice(0, 3)));
    setShuffling(true);
    setPreviewing(true);
    setOpenId(null);
    setLocked(false);
    const pending: number[] = [];
    const shuffleCount = config.ageGroup === '3-4' ? 0 : config.ageGroup === '4-5' ? 1 : 2;
    pending.push(scheduleTimeout(() => {
      setPreviewing(false);
      if (shuffleCount === 0) {
        setShuffling(false);
        return;
      }
      setBoxes(current => shuffleArray(current));
      pending.push(scheduleTimeout(() => {
        if (shuffleCount > 1) setBoxes(current => shuffleArray(current));
        setShuffling(false);
      }, config.ageGroup === '5-6' ? 1000 : 1200));
    }, 2000));
    return () => pending.forEach(timer => window.clearTimeout(timer));
  }, [options, targetVocab._id, config.ageGroup]);

  const handlePick = (vocab: Vocabulary) => {
    if (shuffling || locked) return;
    sfx.playPop();
    setOpenId(vocab._id);
    if (vocab._id === targetVocab._id) {
      setLocked(true);
      scheduleTimeout(onCorrect, 550);
      return;
    }
    setLocked(true);
    void playWordAudio(vocab.english, vocab.audioUrl);
    scheduleTimeout(() => {
      setOpenId(null);
      setLocked(false);
    }, 700);
    onWrong(vocab._id);
  };

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center">
      <GamePrompt
        text={
          <>
            Which box has the <span className="text-amber-300 capitalize">{targetVocab.english}</span>? 🎁
          </>
        }
      />
      <div className={`flex items-end justify-center gap-4 sm:gap-8 ${shuffling ? 'stage3-box-shuffle' : ''}`}>
        {boxes.map((vocab, idx) => {
          const open = previewing || openId === vocab._id || (isAssisted && vocab._id === targetVocab._id);
          const glow = !shuffling && (attemptCount >= 2 || isAssisted) && vocab._id === targetVocab._id;
          return (
            <button
              key={`${vocab._id}_${idx}`}
              type="button"
              disabled={shuffling}
              onClick={() => handlePick(vocab)}
              className={`w-[clamp(88px,20vmin,150px)] flex flex-col items-center cursor-pointer ${
                glow ? 'ring-8 ring-amber-300 rounded-2xl' : ''
              }`}
            >
              <div className={`h-20 w-full flex items-center justify-center ${open ? 'opacity-100' : 'opacity-0'}`}>
                <VocabImage vocab={vocab} className="w-16 h-16" />
              </div>
              <div className="w-full h-[clamp(80px,18vmin,120px)] rounded-xl bg-gradient-to-b from-rose-500 to-rose-800 border-4 border-rose-200 flex items-center justify-center text-4xl shadow-xl">
                🎁
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-xs font-black text-indigo-200">{shuffling ? 'Watch the boxes...' : 'Pick a box!'}</p>
    </div>
  );
};

export default MysteryBoxesGame;
