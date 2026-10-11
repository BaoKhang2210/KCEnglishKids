import React, { useState, useEffect, useRef } from 'react';
import type { Activity } from '../../../types';
import { sfx, playWordAudio } from '../../../utils/audio';
import { WordImage } from '../common/WordImage';
import { useFitGrid } from '../../../hooks/useFitGrid';

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

  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 420 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDims({
          w: entry.contentRect.width,
          h: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // 3-4yo: Standard 4 pairs (8 cards)
    const rawPairs = (activity.questions || []).slice(0, 4);
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

  const { cardSize, gap } = useFitGrid(cards.length, dims.w, dims.h, 240);

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

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col justify-center items-center select-none py-1 overflow-hidden"
    >
      <div
        style={{ gap: `${gap}px` }}
        className="flex flex-wrap justify-center items-center my-auto p-2"
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
                width: `${cardSize}px`,
                height: `${cardSize}px`,
              }}
              className={`rounded-3xl border-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative shadow-lg p-2 ${
                card.isMatched
                  ? 'border-emerald-400 bg-emerald-50 scale-95 ring-6 ring-emerald-200'
                  : showFront
                  ? 'border-amber-400 bg-white ring-6 ring-amber-200'
                  : 'border-white bg-gradient-to-br from-amber-400 via-pink-400 to-indigo-500 hover:scale-104 active:scale-95'
              }`}
            >
              {showFront ? (
                card.type === 'image' && card.imageUrl ? (
                  <div className="w-full h-full p-1 overflow-hidden rounded-2xl flex items-center justify-center">
                    <WordImage word={{ english: card.text, imageUrl: card.imageUrl }} />
                  </div>
                ) : (
                  <span
                    style={{ fontSize: `${Math.max(18, Math.min(32, cardSize * 0.16))}px` }}
                    className="font-black text-slate-800 uppercase text-center px-1"
                  >
                    {card.text}
                  </span>
                )
              ) : (
                <span className="text-4xl sm:text-5xl select-none filter drop-shadow">✨</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
