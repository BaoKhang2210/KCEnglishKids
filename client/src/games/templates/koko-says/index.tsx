import React, { useEffect, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { ChoiceBoard } from '../../shared/ChoiceBoard';
import { GamePrompt } from '../../shared/GamePrompt';
import { KokoMascot } from '../../../components/child/KokoMascot';
import type { Vocabulary } from '../../../types';
import { useManagedTimeout } from '../../shared/useManagedTimeout';

export const KokoSaysGame: React.FC<GameComponentProps> = ({
  targetVocab,
  options,
  attemptCount,
  isAssisted,
  onCorrect,
  onWrong,
}) => {
  const scheduleTimeout = useManagedTimeout();
  const [revealed, setRevealed] = useState(false);
  const [wobbleId, setWobbleId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    setLocked(false);
    setRevealed(false);
    const t = scheduleTimeout(() => setRevealed(true), 900);
    return () => window.clearTimeout(t);
  }, [targetVocab._id]);

  const handleChoose = (vocab: Vocabulary) => {
    if (!revealed || locked) return;
    if (vocab._id === targetVocab._id) {
      setLocked(true);
      onCorrect();
      return;
    }
    setWobbleId(vocab._id);
    scheduleTimeout(() => setWobbleId(null), 400);
    onWrong(vocab._id);
  };

  return (
    <div className="w-full h-full relative flex flex-col">
      <GamePrompt
        text={
          <>
            Koko says: touch the <span className="text-amber-300 capitalize">{targetVocab.english}</span>! 🐻
          </>
        }
      />
      <div className="pt-12 flex justify-center">
        <KokoMascot
          state={revealed ? 'listening' : 'thinking'}
          size="md"
          interactive={false}
          speechBubble={revealed ? `Touch the ${targetVocab.english}!` : 'Listen...'}
        />
      </div>
      <div className="flex-1 min-h-0">
        {revealed ? (
          <ChoiceBoard
            options={options}
            targetId={targetVocab._id}
            attemptCount={attemptCount}
            isAssisted={isAssisted}
            wobbleId={wobbleId}
            onChoose={handleChoose}
            shape="round"
            accent="border-amber-300/50"
          />
        ) : (
          <p className="text-center text-white/70 font-bold mt-8">Get ready...</p>
        )}
      </div>
    </div>
  );
};

export default KokoSaysGame;
