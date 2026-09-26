import React, { useState } from 'react';
import { Volume2, Sparkles, Heart } from 'lucide-react';
import type { ActivityQuestion, ActivityOption } from '../../../types';
import { playWordAudio, sfx } from '../../../utils/audio';

interface FeedAnimalEngineProps {
  question: ActivityQuestion;
  onAnswer: (isCorrect: boolean, optionId: string) => void;
  disabled?: boolean;
}

export const FeedAnimalEngine: React.FC<FeedAnimalEngineProps> = ({
  question,
  onAnswer,
  disabled = false
}) => {
  const [selectedOptId, setSelectedOptId] = useState<string | null>(null);
  const [animalState, setAnimalState] = useState<'hungry' | 'eating' | 'refusing'>('hungry');

  // Dynamic cute animal character
  const animals = [
    { emoji: '🐰', name: 'Rabbit', favorite: 'Carrot', hungryText: 'Bé ơi, thỏ đói bụng quá! Cho thỏ ăn với nhé!' },
    { emoji: '🐻', name: 'Bear', favorite: 'Honey', hungryText: 'Gấu con đang đói bụng, bé chọn đúng món nha!' },
    { emoji: '🐵', name: 'Monkey', favorite: 'Banana', hungryText: 'Khỉ con thích ăn gì nhỉ? Bé giúp khỉ nào!' },
    { emoji: '🐶', name: 'Puppy', favorite: 'Bone', hungryText: 'Cún con vẫy đuôi chờ bé cho ăn đây!' }
  ];

  // Pick animal deterministically from question index or prompt
  const animalIdx = Math.abs(question.promptText?.length || 0) % animals.length;
  const currentAnimal = animals[animalIdx];

  const handlePlayAudio = () => {
    playWordAudio(question.promptText, question.promptAudioUrl);
  };

  const handleFeed = (opt: ActivityOption) => {
    if (disabled || animalState === 'eating') return;

    setSelectedOptId(opt.id);
    sfx.playPop();

    if (opt.isCorrect) {
      setAnimalState('eating');
      setTimeout(() => {
        onAnswer(true, opt.id);
      }, 900);
    } else {
      setAnimalState('refusing');
      setTimeout(() => {
        setAnimalState('hungry');
        setSelectedOptId(null);
        onAnswer(false, opt.id);
      }, 800);
    }
  };

  return (
    <div className="flex flex-col items-center select-none w-full max-w-5xl mx-auto px-4">
      {/* Title & Instructions Banner */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-orange-100 via-amber-100 to-yellow-100 text-amber-950 font-black px-8 py-3 rounded-full text-base sm:text-xl mb-6 border-3 border-amber-300 shadow-md animate-pulse-glow">
        <Sparkles className="w-6 h-6 text-amber-500 fill-amber-400" />
        <span>Bé hãy cho bạn nhỏ ăn đúng món nhé!</span>
      </div>

      {/* Animal Feeder Character Stage */}
      <div className="relative mb-8 flex flex-col items-center">
        {/* Animal Head Container with animated reactions */}
        <div
          className={`w-44 h-44 sm:w-56 sm:h-56 rounded-4xl bg-gradient-to-b from-amber-50 to-orange-100 border-4 border-amber-300 shadow-2xl flex items-center justify-center relative transition-transform duration-300 ${
            animalState === 'eating'
              ? 'scale-115 ring-10 ring-emerald-300 animate-soft-bounce bg-emerald-50'
              : animalState === 'refusing'
              ? 'ring-10 ring-rose-200 animate-gentle-wobble'
              : 'hover:scale-105'
          }`}
        >
          {/* Heart bubbles when eating */}
          {animalState === 'eating' && (
            <div className="absolute -top-5 -right-5 flex gap-1 animate-bounce">
              <Heart className="w-10 h-10 text-rose-500 fill-rose-400 animate-pulse" />
              <span className="text-2xl">✨</span>
            </div>
          )}

          {/* Huge Animal Emoji */}
          <span className="text-8xl sm:text-9xl filter drop-shadow-md">
            {animalState === 'eating' ? '😋' : currentAnimal.emoji}
          </span>

          {/* Open mouth plate */}
          <div className="absolute -bottom-3 bg-amber-200/95 border-2 border-amber-400 px-4 py-1 rounded-full text-xs sm:text-sm font-black text-amber-950 shadow-md flex items-center gap-1">
            <span>{animalState === 'eating' ? 'Măm măm! Yummy! 🍽️' : animalState === 'refusing' ? 'Không phải món này rồi 🙈' : 'Há miệng đợi bé nè 👄'}</span>
          </div>
        </div>

        {/* Speech Bubble with Target Word & Audio */}
        <div className="mt-6 flex items-center gap-4 bg-white px-7 py-3 rounded-3xl border-3 border-amber-200 shadow-lg">
          <button
            onClick={handlePlayAudio}
            type="button"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-400 hover:bg-amber-500 text-amber-950 flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer"
            title="Nghe lại phát âm"
          >
            <Volume2 className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
          <div className="text-left">
            <span className="text-xs sm:text-sm font-bold text-slate-400 block uppercase">Cho bạn ăn món:</span>
            <span className="text-3xl sm:text-4xl font-black text-amber-950 uppercase tracking-wide">
              {question.promptText}
            </span>
          </div>
        </div>
      </div>

      {/* Food Choices Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 w-full">
        {question.options.map((opt) => {
          const isSelected = selectedOptId === opt.id;
          let cardBorder = 'border-amber-200 hover:border-amber-400 bg-white hover:scale-105';

          if (isSelected) {
            if (animalState === 'eating') {
              cardBorder = 'border-emerald-500 bg-emerald-50 ring-6 ring-emerald-300 scale-95 opacity-50';
            } else if (animalState === 'refusing') {
              cardBorder = 'border-rose-400 bg-rose-50 ring-6 ring-rose-200';
            }
          }

          return (
            <button
              key={opt.id}
              onClick={() => handleFeed(opt)}
              disabled={disabled || animalState === 'eating'}
              className={`btn-kid rounded-3xl border-4 p-4 sm:p-5 flex flex-col items-center justify-between cursor-pointer shadow-lg hover:shadow-xl transition-all active:scale-95 group ${cardBorder}`}
            >
              {/* Food Image */}
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-amber-50 group-hover:bg-amber-100/60 flex items-center justify-center p-3 mb-2 transition-colors">
                {opt.imageUrl ? (
                  <img
                    src={opt.imageUrl}
                    alt={opt.text}
                    className="w-full h-full object-contain filter drop-shadow group-hover:scale-110 transition-transform"
                  />
                ) : (
                  <span className="text-5xl">🍎</span>
                )}
              </div>

              {/* Food Name */}
              <span className="font-black text-xl sm:text-2xl text-slate-800 capitalize leading-tight">
                {opt.text}
              </span>
              {opt.vietnameseText && (
                <span className="text-xs sm:text-sm font-bold text-slate-400 mt-0.5">
                  ({opt.vietnameseText})
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
