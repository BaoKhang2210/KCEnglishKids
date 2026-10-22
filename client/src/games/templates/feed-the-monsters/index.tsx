import React, { useEffect, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { VocabImage } from '../../shared/VocabImage';
import { GamePrompt } from '../../shared/GamePrompt';
import type { Vocabulary } from '../../../types';
import { hitDropId } from '../../shared/dropTarget';
import { useManagedTimeout } from '../../shared/useManagedTimeout';

const FACES = ['👾', '🐲'];

export const FeedTheMonstersGame: React.FC<GameComponentProps> = ({
  targetVocab,
  options,
  attemptCount,
  isAssisted,
  onCorrect,
  onWrong,
}) => {
  const scheduleTimeout = useManagedTimeout();
  const monsterChoices = [targetVocab, ...options.filter(v => v._id !== targetVocab._id)].slice(0, 2);
  const treats = [targetVocab, targetVocab, ...monsterChoices.slice(1), ...monsterChoices.slice(1)];
  const [dragging, setDragging] = useState<Vocabulary | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [happyId, setHappyId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    setLocked(false);
    setHappyId(null);
    setDragging(null);
  }, [targetVocab._id]);

  const feed = (monster: Vocabulary) => {
    if (locked || !dragging) return;
    if (dragging._id === targetVocab._id && monster._id === targetVocab._id) {
      setHappyId(monster._id);
      setLocked(true);
      setDragging(null);
      scheduleTimeout(onCorrect, 500);
      return;
    }
    onWrong(dragging._id);
    setDragging(null);
  };

  return (
    <div
      className="w-full h-full relative flex flex-col"
      onPointerMove={(e) => dragging && setPos({ x: e.clientX, y: e.clientY })}
      onPointerUp={(e) => {
        if (!dragging) return;
        const dropId = hitDropId(e.clientX, e.clientY);
        const monster = monsterChoices.find(v => v._id === dropId);
        if (monster) feed(monster);
      }}
    >
      <GamePrompt
        text={
          <>
            Feed the monster that wants <span className="text-lime-300 capitalize">{targetVocab.english}</span>! 👾
          </>
        }
      />
      <div className="flex-1 flex items-center justify-center gap-4 flex-wrap p-4">
        {monsterChoices.map((vocab, idx) => {
          const glow = (attemptCount >= 2 || isAssisted) && vocab._id === targetVocab._id;
          return (
            <button
              key={vocab._id}
              type="button"
              data-drop-id={vocab._id}
              onClick={() => dragging && feed(vocab)}
              className={`w-[clamp(110px,22vmin,180px)] rounded-3xl bg-emerald-950/60 border-4 p-3 flex flex-col items-center gap-2 ${
                glow ? 'ring-8 ring-amber-300 border-amber-300' : 'border-emerald-400/40'
              } ${happyId === vocab._id ? 'scale-110 bg-emerald-700/50' : ''}`}
            >
              <span className="relative text-4xl sm:text-5xl">
                {FACES[idx % FACES.length]}
                <span className="absolute -right-10 -top-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-white shadow" aria-label={`Wants ${vocab.english}`}>
                  <VocabImage vocab={vocab} className="h-[75%] w-[75%]" />
                </span>
              </span>
              <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center" aria-hidden>
                <span className="text-2xl">🍽️</span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="h-[26%] flex items-center justify-center gap-3">
        {treats.map((vocab, index) => (
          <button
            key={`treat_${vocab._id}_${index}`}
            type="button"
            onPointerDown={(e) => {
              setDragging(vocab);
              setPos({ x: e.clientX, y: e.clientY });
            }}
            onClick={() => setDragging(vocab)}
            className="min-w-[72px] min-h-[72px] w-24 h-24 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center cursor-grab"
          >
            <VocabImage vocab={vocab} className="w-[80%] h-[80%]" />
          </button>
        ))}
      </div>
      {dragging && (
        <div
          className="pointer-events-none fixed z-[10000] w-20 h-20 -translate-x-1/2 -translate-y-1/2"
          style={{ left: pos.x, top: pos.y }}
        >
          <VocabImage vocab={dragging} className="w-full h-full" />
        </div>
      )}
    </div>
  );
};

export default FeedTheMonstersGame;
