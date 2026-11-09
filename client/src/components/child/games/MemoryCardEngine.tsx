import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Check, HelpCircle } from 'lucide-react';
import type { Activity } from '../../../types';
import { sfx, playWordAudio, stopWordAudio } from '../../../utils/audio';
import { createActivityRun } from '../../../utils/activityRun';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const runRef = useRef(createActivityRun());
  const flippedRef = useRef<string[]>([]);
  const processingRef = useRef(false);

  // Initialize cards from activity questions (pairs count determined by age progression: 2 for 3-4, 3 for 4-5, 4 for 5-6)
  useEffect(() => {
    const run = createActivityRun();
    runRef.current = run;
    flippedRef.current = [];
    processingRef.current = false;
    setIsProcessing(false);
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
    return () => {
      run.cancel();
      stopWordAudio();
    };
  }, [activity]);

  const handleCardClick = (card: CardItem) => {
    const run = runRef.current;
    if (!run.active || processingRef.current || flippedRef.current.includes(card.id) || card.isFlipped || card.isMatched) return;

    sfx.playPop();

    // Play word pronunciation
    if (card.text) {
      playWordAudio(card.text);
    }

    const nextFlipped = [...flippedRef.current, card.id];
    flippedRef.current = nextFlipped;
    const nextCards = cards.map(c => nextFlipped.includes(c.id) ? { ...c, isFlipped: true } : c);
    setCards(nextCards);

    if (nextFlipped.length === 2) {
      processingRef.current = true;
      setIsProcessing(true);
      const [firstId, secondId] = nextFlipped;
      const firstCard = nextCards.find(c => c.id === firstId);
      const secondCard = nextCards.find(c => c.id === secondId);

      if (firstCard && secondCard && firstCard.pairId === secondCard.pairId) {
        // MATCH!
        run.schedule(() => {
          sfx.playCorrect();
          const matchedCards = nextCards.map(c =>
            c.pairId === firstCard.pairId ? { ...c, isMatched: true } : c
          );
          setCards(matchedCards);
          flippedRef.current = [];

          // Check if all matched
          if (matchedCards.every(c => c.isMatched)) {
            run.schedule(() => {
              onComplete();
            }, 1000);
          } else {
            processingRef.current = false;
            setIsProcessing(false);
          }
        }, 500);
      } else {
        // MISMATCH -> Flip back after 900ms
        run.schedule(() => {
          sfx.playGentleWrong();
          setCards(prev => prev.map(c =>
            c.id === firstId || c.id === secondId ? { ...c, isFlipped: false } : c
          ));
          flippedRef.current = [];
          processingRef.current = false;
          setIsProcessing(false);
        }, 900);
      }
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto text-center select-none">
      {/* Banner */}
      <span className="inline-flex items-center gap-2 bg-pink-100 text-pink-950 font-black px-4 sm:px-8 py-3 rounded-3xl text-base sm:text-xl mb-6 border-3 border-pink-300 shadow-md animate-pulse">
        <Sparkles className="w-6 h-6 text-pink-600" />
        Lật thẻ tìm cặp hình và từ tương ứng nhé bé!
      </span>

      {/* Cards Grid */}
      <div className={`grid ${cards.length <= 4 ? 'grid-cols-2 max-w-xl' : cards.length <= 6 ? 'grid-cols-2 sm:grid-cols-3 max-w-3xl' : 'grid-cols-2 sm:grid-cols-4 max-w-5xl'} gap-4 sm:gap-8 w-full mx-auto px-3`}>
        {cards.map((card) => {
          const showFront = card.isFlipped || card.isMatched;

          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card)}
              disabled={showFront || isProcessing}
              className={`aspect-square min-w-0 rounded-3xl sm:rounded-4xl border-4 p-2 sm:p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative shadow-xl ${
                card.isMatched
                  ? 'border-emerald-400 bg-emerald-50 scale-95 ring-8 ring-emerald-200'
                  : showFront
                  ? 'border-amber-400 bg-white ring-8 ring-amber-200 scale-100'
                  : 'border-white bg-gradient-to-br from-amber-400 via-pink-400 to-indigo-500 hover:scale-105 active:scale-95 shadow-lg'
              }`}
            >
              {showFront ? (
                card.type === 'image' && card.imageUrl ? (
                  <div className="w-full h-full p-2 flex items-center justify-center">
                    <img
                      src={card.imageUrl}
                      alt={card.text}
                      className="w-full h-full object-contain filter drop-shadow-md"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center w-full min-w-0 p-1">
                    <span className="text-xl sm:text-4xl break-words w-full font-black text-indigo-900 capitalize">
                      {card.text}
                    </span>
                    <span className="text-sm sm:text-base font-bold text-slate-400 mt-2">Từ vựng</span>
                  </div>
                )
              ) : (
                /* Card Back */
                <div className="flex flex-col items-center justify-center text-white">
                  <HelpCircle className="w-12 h-12 sm:w-20 sm:h-20 opacity-80 animate-pulse" />
                  <span className="text-xs sm:text-sm font-black tracking-wider uppercase mt-2 opacity-90">
                    KCEnglish
                  </span>
                </div>
              )}

              {card.isMatched && (
                <div className="absolute top-3 right-3 w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg animate-pop-in">
                  <Check className="w-6 h-6 stroke-[3.5]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
