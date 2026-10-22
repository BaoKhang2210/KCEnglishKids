import React, { useEffect, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { sfx } from '../../../utils/audio';
import { VocabImage } from '../../shared/VocabImage';
import { GamePrompt } from '../../shared/GamePrompt';
import { shuffleArray } from '../../core/targetSelector';
import type { Vocabulary } from '../../../types';
import { playWordAudio } from '../../../utils/audio';
import { useManagedTimeout } from '../../shared/useManagedTimeout';

export const PeekABooGame: React.FC<GameComponentProps> = ({
  config,
  targetVocab,
  options,
  attemptCount,
  isAssisted,
  onCorrect,
  onWrong,
}) => {
  const scheduleTimeout = useManagedTimeout();
  const [doors, setDoors] = useState<Vocabulary[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    setDoors(shuffleArray(options));
    setOpenId(null);
    setLocked(false);
  }, [options, targetVocab._id]);

  const handleOpen = (vocab: Vocabulary) => {
    if (locked) return;
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
    <div className="w-full h-full relative flex flex-col">
      <GamePrompt
        text={
          <>
            Open the door to find <span className="text-amber-300 capitalize">{targetVocab.english}</span>! 🚪
          </>
        }
      />
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4 place-content-center p-6 max-w-3xl mx-auto w-full">
        {doors.map((vocab, idx) => {
          const open = openId === vocab._id || (isAssisted && vocab._id === targetVocab._id);
          const glow = (attemptCount >= 2 || isAssisted) && vocab._id === targetVocab._id;
          return (
            <button
              key={vocab._id}
              type="button"
              onClick={() => handleOpen(vocab)}
              className={`relative min-h-[120px] rounded-3xl overflow-hidden border-4 cursor-pointer shadow-xl ${
                glow ? 'ring-8 ring-amber-300 border-amber-300' : 'border-amber-800'
              }`}
            >
              <div className="absolute inset-0 bg-indigo-950 flex items-center justify-center">
                <VocabImage vocab={vocab} className="w-[70%] h-[70%]" />
              </div>
              <div
                className={`absolute inset-0 bg-gradient-to-br from-rose-700 to-rose-950 flex items-center justify-center transition-transform duration-500 origin-left ${
                  open ? 'stage3-door-open' : ''
                }`}
                style={{ opacity: config.ageGroup === '5-6' && !open ? 0.55 : 1 }}
              >
                <span className="text-4xl">{['🚪', '🪟', '🏠', '🎁'][idx % 4]}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PeekABooGame;
