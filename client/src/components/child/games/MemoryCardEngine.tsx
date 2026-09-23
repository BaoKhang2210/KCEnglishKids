import React, { useState, useEffect } from 'react';
import { Sparkles, Check, HelpCircle } from 'lucide-react';
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
  onComplete
}) => {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [flippedIds, setFlippedIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize cards from activity questions (pairs count determined by age progression: 2 for 3-4, 3 for 4-5, 4 for 5-6)
  useEffect(() => {
    const ageCode = (activity as any)?.ageGroupCode || (activity as any)?.lesson?.ageGroupCode || '3-4';
    const maxPairs = ageCode === '5-6' ? 4 : ageCode === '3-4' ? 2 : 3;
    const rawPairs = (activity.questions || []).slice(0, maxPairs);
    const cardList: CardItem[] = [];

    rawPairs.forEach((q, idx) => {
      const pairId = `pair_${idx}`;
      const targetWord = q.metadata?.targetWord || q.promptText.replace(/^Find the pair for:\s*/i, '');
      const targetImage = q.metadata?.targetImage || q.promptImageUrl || q.options?.[0]?.imageUrl;

      // Card 1: Image Card
      cardList.push({
        id: `${pairId}_img`,
        pairId,
        type: 'image',
        text: targetWord,
        imageUrl: targetImage,
        isFlipped: false,
        isMatched: false
      });

      // Card 2: Word Card
      cardList.push({
        id: `${pairId}_word`,
        pairId,
        type: 'word',
        text: targetWord,
        isFlipped: false,
        isMatched: false
      });
    });

    // Shuffle cards
    const shuffled = [...cardList].sort(() => Math.random() - 0.5);
    setCards(shuffled);
  }, [activity]);

  const handleCardClick = (card: CardItem) => {
    if (isProcessing || card.isFlipped || card.isMatched) return;

    sfx.playPop();

    // Play word pronunciation
    if (card.text) {
      playWordAudio(card.text);
    }

    const nextCards = cards.map(c => c.id === card.id ? { ...c, isFlipped: true } : c);
    setCards(nextCards);

    const nextFlipped = [...flippedIds, card.id];
    setFlippedIds(nextFlipped);

    if (nextFlipped.length === 2) {
      setIsProcessing(true);
      const [firstId, secondId] = nextFlipped;
      const firstCard = nextCards.find(c => c.id === firstId);
      const secondCard = nextCards.find(c => c.id === secondId);

      if (firstCard && secondCard && firstCard.pairId === secondCard.pairId) {
        // MATCH!
        setTimeout(() => {
          sfx.playCorrect();
          const matchedCards = nextCards.map(c =>
            c.pairId === firstCard.pairId ? { ...c, isMatched: true } : c
          );
          setCards(matchedCards);
          setFlippedIds([]);
          setIsProcessing(false);

          // Check if all matched
          if (matchedCards.every(c => c.isMatched)) {
            setTimeout(() => {
              onComplete();
            }, 1000);
          }
        }, 500);
      } else {
        // MISMATCH -> Flip back after 900ms
        setTimeout(() => {
          sfx.playGentleWrong();
          setCards(prev => prev.map(c =>
            c.id === firstId || c.id === secondId ? { ...c, isFlipped: false } : c
          ));
          setFlippedIds([]);
          setIsProcessing(false);
        }, 900);
      }
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto text-center">
      {/* Banner */}
      <span className="inline-flex items-center gap-2 bg-pink-100 text-pink-900 font-black px-4 py-1.5 rounded-full text-sm mb-6 border border-pink-300 animate-pulse">
        <Sparkles className="w-4 h-4 text-pink-600" />
        Lật thẻ tìm cặp hình và từ tương ứng nhé bé!
      </span>

      {/* Cards Grid */}
      <div className={`grid ${cards.length <= 4 ? 'grid-cols-2 max-w-sm' : cards.length <= 6 ? 'grid-cols-2 sm:grid-cols-3 max-w-lg' : 'grid-cols-2 sm:grid-cols-4 max-w-2xl'} gap-4 sm:gap-6 w-full mx-auto`}>
        {cards.map((card) => {
          const showFront = card.isFlipped || card.isMatched;

          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card)}
              disabled={showFront || isProcessing}
              className={`aspect-square rounded-3xl border-4 p-3 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative shadow-lg ${
                card.isMatched
                  ? 'border-emerald-400 bg-emerald-50 scale-95 ring-4 ring-emerald-200'
                  : showFront
                  ? 'border-amber-400 bg-white ring-4 ring-amber-200 scale-100'
                  : 'border-white bg-gradient-to-br from-amber-400 via-pink-400 to-indigo-500 hover:scale-105 active:scale-95 shadow-md'
              }`}
            >
              {showFront ? (
                card.type === 'image' && card.imageUrl ? (
                  <div className="w-full h-full p-2 flex items-center justify-center">
                    <img
                      src={card.imageUrl}
                      alt={card.text}
                      className="w-full h-full object-contain filter drop-shadow"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-2">
                    <span className="text-2xl sm:text-3xl font-black text-indigo-900 capitalize">
                      {card.text}
                    </span>
                    <span className="text-xs font-bold text-slate-400 mt-1">Từ vựng</span>
                  </div>
                )
              ) : (
                /* Card Back */
                <div className="flex flex-col items-center justify-center text-white">
                  <HelpCircle className="w-12 h-12 opacity-80 animate-pulse" />
                  <span className="text-xs font-black tracking-wider uppercase mt-1 opacity-90">
                    KCEnglish
                  </span>
                </div>
              )}

              {card.isMatched && (
                <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md animate-pop-in">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
