import React, { useState, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import type { Activity } from '../../../types';
import { sfx, playWordAudio } from '../../../utils/audio';

interface CardItem {
  id: string;
  pairId: string;
  type: 'image' | 'word';
  text: string;
  imageUrl?: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface MemoryCardEngineProps {
  activity: Activity;
  onComplete: () => void;
}

export const MemoryCardEngine: React.FC<MemoryCardEngineProps> = ({
  activity,
  onComplete,
}) => {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [flippedIds, setFlippedIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // 3-4yo defaults to 2 pairs (4 cards) or 3 pairs (6 cards)
    const rawPairs = (activity.questions || []).slice(0, 3);
    const cardList: CardItem[] = [];

    rawPairs.forEach((q, idx) => {
      const pairId = `pair_${idx}`;
      const targetWord =
        q.metadata?.targetWord ||
        q.promptText.replace(/^Find the pair for:\s*/i, '');
      const targetImage =
        q.metadata?.targetImage || q.promptImageUrl || q.options?.[0]?.imageUrl;

      cardList.push({
        id: `${pairId}_img`,
        pairId,
        type: 'image',
        text: targetWord,
        imageUrl: targetImage,
        isFlipped: false,
        isMatched: false,
      });

      cardList.push({
        id: `${pairId}_word`,
        pairId,
        type: 'word',
        text: targetWord,
        isFlipped: false,
        isMatched: false,
      });
    });

    const shuffled = [...cardList].sort(() => Math.random() - 0.5);
    setCards(shuffled);
  }, [activity]);

  const handleCardClick = (card: CardItem) => {
    if (isProcessing || card.isFlipped || card.isMatched) return;

    sfx.playPop();
    if (card.text) {
      playWordAudio(card.text);
    }

    const nextCards = cards.map((c) =>
      c.id === card.id ? { ...c, isFlipped: true } : c
    );
    setCards(nextCards);

    const nextFlipped = [...flippedIds, card.id];
    setFlippedIds(nextFlipped);

    if (nextFlipped.length === 2) {
      setIsProcessing(true);
      const [firstId, secondId] = nextFlipped;
      const firstCard = nextCards.find((c) => c.id === firstId);
      const secondCard = nextCards.find((c) => c.id === secondId);

      if (firstCard && secondCard && firstCard.pairId === secondCard.pairId) {
        // MATCH!
        setTimeout(() => {
          sfx.playCorrect();
          const matchedCards = nextCards.map((c) =>
            c.pairId === firstCard.pairId ? { ...c, isMatched: true } : c
          );
          setCards(matchedCards);
          setFlippedIds([]);
          setIsProcessing(false);

          if (matchedCards.every((c) => c.isMatched)) {
            setTimeout(() => {
              onComplete();
            }, 1000);
          }
        }, 500);
      } else {
        // MISMATCH
        setTimeout(() => {
          sfx.playGentleWrong();
          setCards((prev) =>
            prev.map((c) =>
              c.id === firstId || c.id === secondId
                ? { ...c, isFlipped: false }
                : c
            )
          );
          setFlippedIds([]);
          setIsProcessing(false);
        }, 800);
      }
    }
  };

  // Dynamic grid column sizing based on card count (N = 4, 6, 8, 12)
  const colsClass =
    cards.length <= 4
      ? 'grid-cols-2'
      : cards.length <= 6
      ? 'grid-cols-3'
      : 'grid-cols-4';

  return (
    <div className="w-full h-full flex flex-col justify-center items-center select-none py-1">
      <div
        className={`grid ${colsClass} gap-2.5 sm:gap-4 w-full max-w-xl max-h-[360px] justify-items-center items-center`}
      >
        {cards.map((card) => {
          const showFront = card.isFlipped || card.isMatched;

          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card)}
              disabled={showFront || isProcessing}
              type="button"
              style={{
                width: 'clamp(70px, 18vw, 120px)',
                height: 'clamp(70px, 18vw, 120px)',
              }}
              className={`rounded-2xl sm:rounded-3xl border-3 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative shadow-md p-1.5 ${
                card.isMatched
                  ? 'border-emerald-400 bg-emerald-50 scale-95 ring-4 ring-emerald-200'
                  : showFront
                  ? 'border-amber-400 bg-white ring-4 ring-amber-200'
                  : 'border-white bg-gradient-to-br from-amber-400 via-pink-400 to-indigo-500 hover:scale-105 active:scale-95'
              }`}
            >
              {showFront ? (
                card.type === 'image' && card.imageUrl ? (
                  <img
                    src={card.imageUrl}
                    alt={card.text}
                    className="max-h-full max-w-full object-contain pointer-events-none"
                  />
                ) : (
                  <span className="font-black text-xs sm:text-sm text-slate-800 uppercase text-center px-1">
                    {card.text}
                  </span>
                )
              ) : (
                <HelpCircle className="w-8 h-8 text-white/90" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
