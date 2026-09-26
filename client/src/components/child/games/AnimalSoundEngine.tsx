import React, { useEffect, useState } from 'react';
import { Volume2, Sparkles, Check, Music } from 'lucide-react';
import type { ActivityQuestion, ActivityOption } from '../../../types';
import { playWordAudio, sfx } from '../../../utils/audio';

interface AnimalSoundEngineProps {
  question: ActivityQuestion;
  onAnswer: (isCorrect: boolean, optionId: string) => void;
  disabled?: boolean;
}

export const AnimalSoundEngine: React.FC<AnimalSoundEngineProps> = ({
  question,
  onAnswer,
  disabled = false
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Common animal sound cues
  const animalSounds: Record<string, string> = {
    cat: 'Meow! Meow!',
    dog: 'Woof! Woof!',
    cow: 'Moo! Moo!',
    duck: 'Quack! Quack!',
    pig: 'Oink! Oink!',
    frog: 'Ribbit! Ribbit!',
    sheep: 'Baa! Baa!',
    lion: 'Roar! Roar!',
    bird: 'Tweet! Tweet!',
    rooster: 'Cock-a-doodle-doo!'
  };

  const soundFromMeta = question.metadata?.soundText;
  const wordLower = (question.correctAnswer || question.promptText || '').toLowerCase().trim();
  const soundText = soundFromMeta || animalSounds[wordLower] || `Listen! It says "${question.promptText}"!`;

  const handlePlaySound = () => {
    setIsPlaying(true);
    // Strip emojis for clean TTS speech
    const cleanSpeech = soundText.replace(/[^\w\s!]/gi, '').trim() || soundText;
    playWordAudio(cleanSpeech, question.promptAudioUrl);
    setTimeout(() => setIsPlaying(false), 1500);
  };

  useEffect(() => {
    setSelectedId(null);
    const timer = setTimeout(() => {
      handlePlaySound();
    }, 300);
    return () => clearTimeout(timer);
  }, [question.promptText]);

  const handleSelect = (opt: ActivityOption) => {
    if (disabled || selectedId) return;

    setSelectedId(opt.id);
    sfx.playPop();

    if (opt.isCorrect) {
      setTimeout(() => {
        onAnswer(true, opt.id);
      }, 700);
    } else {
      setTimeout(() => {
        setSelectedId(null);
        onAnswer(false, opt.id);
      }, 600);
    }
  };

  return (
    <div className="flex flex-col items-center select-none w-full max-w-5xl mx-auto px-4">
      {/* Title & Instructions Banner */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-purple-100 via-pink-100 to-amber-100 text-purple-950 font-black px-8 py-3 rounded-full text-base sm:text-xl mb-6 border-3 border-purple-300 shadow-md animate-pulse-glow">
        <Music className="w-6 h-6 text-purple-600 animate-bounce" />
        <span>Lắng nghe tiếng kêu: Con gì thế nhỉ? 🎵</span>
      </div>

      {/* Big Sound Button with pulsating ripples */}
      <div className="mb-8 flex flex-col items-center">
        <button
          onClick={handlePlaySound}
          type="button"
          className={`w-32 h-32 sm:w-44 sm:h-44 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-rose-400 text-white flex items-center justify-center shadow-2xl active:scale-90 transition-all cursor-pointer ring-10 ${
            isPlaying ? 'ring-purple-300 scale-110 animate-pulse' : 'ring-purple-200/60 hover:scale-105'
          }`}
          title="Bấm để nghe tiếng kêu"
        >
          <Volume2 className="w-16 h-16 sm:w-22 sm:h-22" />
        </button>

        {/* Sound Caption */}
        <div className="mt-4 flex items-center gap-2 bg-white px-6 py-2 rounded-2xl border-2 border-purple-200 shadow-sm">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <span className="font-black text-xl sm:text-2xl text-purple-900 tracking-wide">
            "{soundText}"
          </span>
        </div>
      </div>

      {/* Animal Choice Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8 w-full">
        {question.options.map((opt) => {
          const isSelected = selectedId === opt.id;
          let cardStyle = 'border-purple-200 hover:border-purple-400 bg-white hover:scale-104 shadow-lg';

          if (isSelected) {
            if (opt.isCorrect) {
              cardStyle = 'border-emerald-500 bg-emerald-50 ring-10 ring-emerald-300 scale-105 animate-soft-bounce';
            } else {
              cardStyle = 'border-rose-400 bg-rose-50 ring-10 ring-rose-200 animate-gentle-wobble';
            }
          }

          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt)}
              disabled={disabled || (!!selectedId && opt.id !== selectedId)}
              className={`rounded-3xl sm:rounded-4xl border-4 p-5 sm:p-7 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 relative overflow-hidden group ${cardStyle}`}
            >
              {/* Animal Image */}
              <div className="w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-3xl bg-purple-50 group-hover:bg-purple-100/70 flex items-center justify-center p-3 mb-3 transition-colors">
                {opt.imageUrl ? (
                  <img
                    src={opt.imageUrl}
                    alt={opt.text}
                    className="w-full h-full object-contain filter drop-shadow group-hover:scale-110 transition-transform pointer-events-none"
                  />
                ) : (
                  <span className="text-6xl select-none">🐾</span>
                )}
              </div>

              {/* Animal Name */}
              <span className="font-black text-2xl sm:text-3xl text-slate-800 capitalize leading-tight">
                {opt.text}
              </span>
              {opt.vietnameseText && (
                <span className="text-sm sm:text-base font-bold text-slate-400 mt-1">
                  ({opt.vietnameseText})
                </span>
              )}

              {/* Checkmark overlay */}
              {isSelected && opt.isCorrect && (
                <div className="absolute top-4 right-4 w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md animate-pop-in">
                  <Check className="w-7 h-7 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
