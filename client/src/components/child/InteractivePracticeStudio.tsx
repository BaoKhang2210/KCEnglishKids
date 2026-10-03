import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Star,
  Mic,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Gamepad2,
  Lightbulb
} from 'lucide-react';
import type { Vocabulary } from '../../types';
import { sfx, playWordAudio, stopWordAudio } from '../../utils/audio';
import { KokoMascot } from './KokoMascot';

interface InteractivePracticeStudioProps {
  vocabulary: Vocabulary[];
  lessonTitle?: string;
  ageGroupCode?: string;
  onComplete: (stats: { score: number; stars: number }) => void;
  onBackToStage1: () => void;
}

export const InteractivePracticeStudio: React.FC<InteractivePracticeStudioProps> = ({
  vocabulary,
  ageGroupCode = '3-4',
  onComplete,
  onBackToStage1
}) => {
  // Ensure we have at least 1 vocabulary item, fallback to sample items if empty
  const words: Vocabulary[] = vocabulary.length > 0 ? vocabulary : [
    {
      _id: 'sample_1',
      english: 'Apple',
      vietnamese: 'Quả táo',
      pronunciation: '/ˈæp.əl/',
      imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&auto=format&fit=crop&q=80',
      exampleSentence: 'This is an apple.'
    }
  ];

  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [subStep, setSubStep] = useState<1 | 2>(1); // Step 1: Phonics/Exploration, Step 2: Context/Application
  const [isAwakened, setIsAwakened] = useState(false); // For 3-4 age tap to awaken
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [starsEarned, setStarsEarned] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const triggerWrongFeedback = () => {
    setFeedbackState('wrong');
    sfx.playGentleWrong();
    setShowEncouragement(true);
    setTimeout(() => {
      setFeedbackState('idle');
      setSelectedOptionId(null);
      setShowEncouragement(false);
    }, 2200);
  };

  // For 5-6 Age Train Speller
  const [spelledLetters, setSpelledLetters] = useState<string[]>([]);

  const currentWord = words[currentWordIdx] || words[0];
  const isMamAge = ageGroupCode === '3-4';
  const isChoiAge = ageGroupCode === '4-5';

  // Play audio on new word or step
  useEffect(() => {
    setIsAwakened(false);
    setSelectedOptionId(null);
    setFeedbackState('idle');
    setSpelledLetters([]);
    stopWordAudio();

    if (!isMamAge || subStep === 2) {
      // Auto pronounce word for older groups or step 2
      const timer = setTimeout(() => {
        playWordAudio(currentWord.english, currentWord.audioUrl);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentWordIdx, subStep, isMamAge]);

  const handleAwakenEgg = () => {
    if (isAwakened) return;
    sfx.playBadgeChime();
    setIsAwakened(true);
    playWordAudio(currentWord.english, currentWord.audioUrl);
  };

  const handlePlayNormal = () => {
    playWordAudio(currentWord.english, currentWord.audioUrl);
  };

  const handleMicSimulate = () => {
    if (isRecording) return;
    sfx.playPop();
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      sfx.playCorrect();
    }, 2500);
  };

  // Generate options for Shadow / Context / Sentence match
  const getDistractorWords = (count: number) => {
    const others = words.filter(w => w.english !== currentWord.english);
    if (others.length >= count) {
      return [...others].sort(() => 0.5 - Math.random()).slice(0, count);
    }
    // Fallback if not enough words
    return others;
  };

  // -------------------------------------------------------------
  // AGE 3-4 (MẦM): SHADOW SILHOUETTE MATCH (SUBSTEP 2)
  // -------------------------------------------------------------
  const renderMamSubStep2 = () => {
    const distractors = getDistractorWords(2);
    const options = [currentWord, ...distractors].sort(() => 0.5 - Math.random());

    const handleSelectShadowOption = (word: Vocabulary) => {
      if (feedbackState !== 'idle') return;
      setSelectedOptionId(word._id);

      if (word.english === currentWord.english) {
        setFeedbackState('correct');
        sfx.playCorrect();
        setStarsEarned(prev => prev + 1);

        setTimeout(() => {
          advanceToNextWordOrFinish();
        }, 1500);
      } else {
        triggerWrongFeedback();
      }
    };

    return (
      <div className="space-y-6 text-center animate-fade-in">
        <div className="bg-amber-100/70 border-2 border-amber-300 px-4 py-2 rounded-2xl inline-flex items-center gap-2 text-amber-900 font-extrabold text-sm sm:text-base shadow-xs">
          <span>✨</span>
          <span>Bé hãy tìm hình thật để khớp với bóng đổ bí ẩn nhé!</span>
        </div>

        {/* Center: Silhouette Shadow Target */}
        <div className="flex justify-center items-center my-4">
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-3xl bg-slate-100 border-4 border-dashed border-slate-300 flex items-center justify-center p-4 shadow-inner overflow-hidden">
            {feedbackState === 'correct' ? (
              <img
                src={currentWord.imageUrl}
                alt={currentWord.english}
                className="w-full h-full object-contain animate-star-celebrate"
              />
            ) : (
              <img
                src={currentWord.imageUrl}
                alt="Shadow silhouette"
                className="w-full h-full object-contain filter brightness-0 opacity-80"
              />
            )}
            <div className="absolute bottom-2 bg-slate-800/80 text-white text-xs font-black px-3 py-0.5 rounded-full">
              {feedbackState === 'correct' ? currentWord.english : 'Bóng bí ẩn ❓'}
            </div>
          </div>
        </div>

        {/* 3 Option Choices */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-lg mx-auto">
          {options.map((opt) => {
            const isSelected = selectedOptionId === opt._id;
            return (
              <button
                key={opt._id}
                onClick={() => handleSelectShadowOption(opt)}
                disabled={feedbackState !== 'idle'}
                className={`p-3 sm:p-4 rounded-3xl border-3 flex flex-col items-center justify-between transition-all cursor-pointer card-kid bg-white shadow-sm ${
                  isSelected && feedbackState === 'correct'
                    ? 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-300'
                    : isSelected && feedbackState === 'wrong'
                    ? 'border-rose-400 bg-rose-50 animate-gentle-wobble'
                    : 'border-amber-200 hover:border-amber-400 hover:shadow-md'
                }`}
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden mb-2">
                  <img
                    src={opt.imageUrl}
                    alt={opt.english}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="font-black text-xs sm:text-sm text-slate-800">
                  {opt.vietnamese}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // AGE 4-5 (CHỒI): INITIAL PHONICS CATCH (SUBSTEP 1)
  // -------------------------------------------------------------
  const renderChoiSubStep1 = () => {
    const cleanWord = currentWord.english.trim();
    const firstLetter = cleanWord.charAt(0).toUpperCase();
    const restOfWord = cleanWord.slice(1);

    // Generate 3 bubble letter choices
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const distractorLetters = alphabet
      .filter(l => l !== firstLetter)
      .sort(() => 0.5 - Math.random())
      .slice(0, 2);
    const letterChoices = [firstLetter, ...distractorLetters].sort(() => 0.5 - Math.random());

    const handleSelectLetter = (letter: string) => {
      if (feedbackState !== 'idle') return;
      setSelectedOptionId(letter);

      if (letter === firstLetter) {
        setFeedbackState('correct');
        sfx.playCorrect();
        playWordAudio(currentWord.english, currentWord.audioUrl);
        setStarsEarned(prev => prev + 1);

        setTimeout(() => {
          setSubStep(2);
        }, 1600);
      } else {
        setFeedbackState('wrong');
        sfx.playGentleWrong();
        setTimeout(() => {
          setFeedbackState('idle');
          setSelectedOptionId(null);
        }, 1000);
      }
    };

    return (
      <div className="space-y-6 text-center animate-fade-in">
        <div className="bg-sky-100/80 border-2 border-sky-300 px-4 py-2 rounded-2xl inline-flex items-center gap-2 text-sky-900 font-extrabold text-sm sm:text-base shadow-xs">
          <span>🎯</span>
          <span>Bé hãy bắt bong bóng chữ cái bắt đầu của từ nhé!</span>
        </div>

        {/* Word Picture & Word Mask */}
        <div className="bg-white rounded-3xl border-3 border-sky-200 p-6 max-w-md mx-auto shadow-md">
          <div className="w-36 h-36 sm:w-44 sm:h-44 mx-auto rounded-3xl overflow-hidden mb-4 shadow-sm border-2 border-slate-100">
            <img
              src={currentWord.imageUrl}
              alt={currentWord.english}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="text-3xl sm:text-4xl font-black text-slate-800 tracking-wider flex items-center justify-center gap-2">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black border-3 transition-all ${
                feedbackState === 'correct'
                  ? 'bg-emerald-500 text-white border-emerald-600 animate-star-celebrate'
                  : 'bg-sky-50 text-sky-700 border-dashed border-sky-400'
              }`}
            >
              {feedbackState === 'correct' ? firstLetter : '?'}
            </div>
            <span>{restOfWord}</span>
          </div>

          <p className="text-sm font-extrabold text-slate-500 mt-2">
            {currentWord.vietnamese}
          </p>
        </div>

        {/* 3 Candy Letter Bubbles */}
        <div className="flex justify-center items-center gap-4 sm:gap-6">
          {letterChoices.map((letter) => {
            const isSelected = selectedOptionId === letter;
            return (
              <button
                key={letter}
                onClick={() => handleSelectLetter(letter)}
                disabled={feedbackState !== 'idle'}
                className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full font-black text-2xl sm:text-3xl flex items-center justify-center cursor-pointer shadow-lg transition-all animate-bounce-subtle ${
                  isSelected && feedbackState === 'correct'
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-300 scale-110'
                    : isSelected && feedbackState === 'wrong'
                    ? 'bg-rose-500 text-white animate-gentle-wobble'
                    : 'bg-gradient-to-tr from-amber-400 to-orange-400 text-white hover:scale-110 active:scale-95'
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // AGE 4-5 (CHỒI): PICTURE IN CONTEXT SCENE (SUBSTEP 2)
  // -------------------------------------------------------------
  const renderChoiSubStep2 = () => {
    const distractors = getDistractorWords(2);
    const options = [currentWord, ...distractors].sort(() => 0.5 - Math.random());

    const handleSelectContextOption = (word: Vocabulary) => {
      if (feedbackState !== 'idle') return;
      setSelectedOptionId(word._id);

      if (word.english === currentWord.english) {
        setFeedbackState('correct');
        sfx.playCorrect();
        playWordAudio(currentWord.english, currentWord.audioUrl);
        setStarsEarned(prev => prev + 1);

        setTimeout(() => {
          advanceToNextWordOrFinish();
        }, 1600);
      } else {
        setFeedbackState('wrong');
        sfx.playGentleWrong();
        setTimeout(() => {
          setFeedbackState('idle');
          setSelectedOptionId(null);
        }, 1000);
      }
    };

    return (
      <div className="space-y-6 text-center animate-fade-in">
        <div className="bg-teal-100/80 border-2 border-teal-300 px-4 py-2 rounded-2xl inline-flex items-center gap-2 text-teal-900 font-extrabold text-sm sm:text-base shadow-xs">
          <span>🏡</span>
          <span>Bé hãy tìm và đặt [ {currentWord.english} ] vào bức tranh thần kỳ nhé!</span>
        </div>

        {/* Scene Canvas Target */}
        <div className="relative w-full max-w-md h-52 sm:h-60 mx-auto rounded-3xl bg-gradient-to-b from-sky-200 via-amber-100 to-emerald-100 border-4 border-teal-300 p-4 shadow-md flex items-center justify-center overflow-hidden">
          {/* Decorative Scene Elements */}
          <span className="absolute top-4 left-6 text-4xl opacity-70">☀️</span>
          <span className="absolute top-6 right-8 text-3xl opacity-70">🌈</span>
          <span className="absolute bottom-3 left-6 text-3xl opacity-70">🌿</span>
          <span className="absolute bottom-3 right-6 text-3xl opacity-70">🌸</span>

          {/* Center Target Ring */}
          <div className="relative w-36 h-36 rounded-3xl bg-white/85 border-3 border-dashed border-teal-400 flex flex-col items-center justify-center p-2 shadow-inner">
            {feedbackState === 'correct' ? (
              <div className="text-center animate-star-celebrate">
                <img
                  src={currentWord.imageUrl}
                  alt={currentWord.english}
                  className="w-24 h-24 object-contain mx-auto"
                />
                <span className="text-xs font-black text-emerald-800 block mt-1">
                  {currentWord.english} ⭐
                </span>
              </div>
            ) : (
              <div className="text-center">
                <span className="text-4xl animate-pulse">✨</span>
                <span className="text-xs font-black text-teal-800 block mt-1">
                  Đặt vào đây
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 3 Choices */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-lg mx-auto">
          {options.map((opt) => {
            const isSelected = selectedOptionId === opt._id;
            return (
              <button
                key={opt._id}
                onClick={() => handleSelectContextOption(opt)}
                disabled={feedbackState !== 'idle'}
                className={`p-3 rounded-3xl border-3 flex flex-col items-center justify-between transition-all cursor-pointer card-kid bg-white shadow-sm ${
                  isSelected && feedbackState === 'correct'
                    ? 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-300'
                    : isSelected && feedbackState === 'wrong'
                    ? 'border-rose-400 bg-rose-50 animate-gentle-wobble'
                    : 'border-slate-200 hover:border-teal-400'
                }`}
              >
                <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl overflow-hidden mb-2">
                  <img
                    src={opt.imageUrl}
                    alt={opt.english}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="font-black text-xs sm:text-sm text-slate-800">
                  {opt.english}
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {opt.vietnamese}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // AGE 5-6 (LÁ): TRAIN WORD SPELLER (SUBSTEP 1)
  // -------------------------------------------------------------
  const renderLaSubStep1 = () => {
    const letters = currentWord.english.toUpperCase().split('');
    const nextLetterIndex = spelledLetters.length;
    const isCompleted = spelledLetters.length === letters.length;

    // Scrambled letters for choices
    const scrambled = [...letters].sort(() => 0.5 - Math.random());

    const handleTapLetter = (letter: string) => {
      if (feedbackState !== 'idle' || isCompleted) return;

      const expectedLetter = letters[nextLetterIndex];
      if (letter === expectedLetter) {
        sfx.playCorrect();
        const updated = [...spelledLetters, letter];
        setSpelledLetters(updated);

        if (updated.length === letters.length) {
          setFeedbackState('correct');
          playWordAudio(currentWord.english, currentWord.audioUrl);
          setStarsEarned(prev => prev + 1);

          setTimeout(() => {
            setSubStep(2);
          }, 1800);
        }
      } else {
        sfx.playGentleWrong();
      }
    };

    return (
      <div className="space-y-6 text-center animate-fade-in">
        <div className="bg-purple-100/80 border-2 border-purple-300 px-4 py-2 rounded-2xl inline-flex items-center gap-2 text-purple-900 font-extrabold text-sm sm:text-base shadow-xs">
          <span>🚂</span>
          <span>Bé hãy xếp các chữ cái lên đoàn tàu theo đúng thứ tự nhé!</span>
        </div>

        {/* Word Picture */}
        <div className="w-32 h-32 sm:w-36 sm:h-36 mx-auto rounded-3xl overflow-hidden shadow-md border-3 border-purple-200">
          <img
            src={currentWord.imageUrl}
            alt={currentWord.english}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Train Track with Empty / Filled Cars */}
        <div className="bg-purple-50/80 border-3 border-purple-200 rounded-3xl p-4 sm:p-6 max-w-xl mx-auto shadow-inner">
          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
            {/* Engine Car */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-purple-600 text-white flex items-center justify-center text-2xl sm:text-3xl shadow-md">
              🚂
            </div>

            {/* Letter Slots */}
            {letters.map((_char, idx) => {
              const filledChar = spelledLetters[idx];
              return (
                <div
                  key={idx}
                  className={`w-12 h-14 sm:w-14 sm:h-16 rounded-2xl flex items-center justify-center font-black text-2xl sm:text-3xl border-3 transition-all ${
                    filledChar
                      ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-md animate-pop-in'
                      : idx === nextLetterIndex
                      ? 'bg-white border-purple-400 border-dashed animate-pulse ring-2 ring-purple-300'
                      : 'bg-white/60 border-slate-300'
                  }`}
                >
                  {filledChar || ''}
                </div>
              );
            })}
          </div>

          <p className="text-xs font-black text-purple-800 mt-3">
            Nghĩa: {currentWord.vietnamese}
          </p>
        </div>

        {/* Clickable Letter Blocks */}
        <div className="flex justify-center items-center gap-3 sm:gap-4 flex-wrap max-w-md mx-auto">
          {scrambled.map((char, idx) => (
            <button
              key={`${char}_${idx}`}
              onClick={() => handleTapLetter(char)}
              disabled={isCompleted}
              className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-white border-3 border-purple-300 hover:border-purple-500 font-black text-2xl sm:text-3xl text-purple-900 flex items-center justify-center cursor-pointer shadow-md hover:scale-110 active:scale-95 transition-all"
            >
              {char}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // AGE 5-6 (LÁ): MINI SENTENCE BUILDER (SUBSTEP 2)
  // -------------------------------------------------------------
  const renderLaSubStep2 = () => {
    const distractors = getDistractorWords(2);
    const options = [currentWord, ...distractors].sort(() => 0.5 - Math.random());

    const sentenceTemplate = currentWord.exampleSentence
      ? currentWord.exampleSentence.replace(new RegExp(currentWord.english, 'i'), '[ ... ]')
      : `Look! This is a [ ... ].`;

    const fullSentence = currentWord.exampleSentence || `Look! This is a ${currentWord.english}.`;

    const handleSelectSentenceWord = (word: Vocabulary) => {
      if (feedbackState !== 'idle') return;
      setSelectedOptionId(word._id);

      if (word.english === currentWord.english) {
        setFeedbackState('correct');
        sfx.playCorrect();
        playWordAudio(fullSentence);
        setStarsEarned(prev => prev + 1);

        setTimeout(() => {
          advanceToNextWordOrFinish();
        }, 2000);
      } else {
        setFeedbackState('wrong');
        sfx.playGentleWrong();
        setTimeout(() => {
          setFeedbackState('idle');
          setSelectedOptionId(null);
        }, 1000);
      }
    };

    return (
      <div className="space-y-6 text-center animate-fade-in">
        <div className="bg-pink-100/80 border-2 border-pink-300 px-4 py-2 rounded-2xl inline-flex items-center gap-2 text-pink-900 font-extrabold text-sm sm:text-base shadow-xs">
          <span>💬</span>
          <span>Bé hãy chọn từ đúng để hoàn thành câu tiếng Anh nhé!</span>
        </div>

        {/* Sentence Display Card */}
        <div className="bg-white rounded-3xl border-3 border-pink-200 p-6 sm:p-7 max-w-lg mx-auto shadow-md">
          <div className="w-28 h-28 mx-auto rounded-2xl overflow-hidden mb-3 border-2 border-slate-100 shadow-sm">
            <img
              src={currentWord.imageUrl}
              alt={currentWord.english}
              className="w-full h-full object-cover"
            />
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-800 mb-2 leading-relaxed">
            {feedbackState === 'correct' ? (
              <span className="text-emerald-600 animate-pop-in">{fullSentence}</span>
            ) : (
              sentenceTemplate
            )}
          </h3>

          <p className="text-xs sm:text-sm font-bold text-slate-500">
            {currentWord.exampleSentenceVietnamese || `Nhìn kìa! Đây là ${currentWord.vietnamese.toLowerCase()}.`}
          </p>
        </div>

        {/* 3 Choices */}
        <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
          {options.map((opt) => {
            const isSelected = selectedOptionId === opt._id;
            return (
              <button
                key={opt._id}
                onClick={() => handleSelectSentenceWord(opt)}
                disabled={feedbackState !== 'idle'}
                className={`p-3 rounded-2xl border-3 flex flex-col items-center justify-center transition-all cursor-pointer card-kid bg-white shadow-sm ${
                  isSelected && feedbackState === 'correct'
                    ? 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-300'
                    : isSelected && feedbackState === 'wrong'
                    ? 'border-rose-400 bg-rose-50 animate-gentle-wobble'
                    : 'border-slate-200 hover:border-pink-300'
                }`}
              >
                <span className="font-black text-sm sm:text-base text-slate-800 mb-0.5">
                  {opt.english}
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {opt.vietnamese}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const advanceToNextWordOrFinish = () => {
    if (currentWordIdx + 1 < words.length) {
      setCurrentWordIdx(prev => prev + 1);
      setSubStep(1);
    } else {
      // Completed all words in lesson!
      sfx.playStarFanfare();
      setIsFinished(true);
    }
  };

  const handleFinishStudio = () => {
    onComplete({
      score: starsEarned * 20,
      stars: 3
    });
  };

  // -------------------------------------------------------------
  // COMPLETION CELEBRATION MODAL
  // -------------------------------------------------------------
  if (isFinished) {
    return (
      <div className="bg-white rounded-3xl border-4 border-amber-300 p-8 sm:p-10 text-center max-w-xl mx-auto shadow-2xl animate-pop-in space-y-6">
        <div className="w-24 h-24 mx-auto rounded-3xl bg-amber-100 border-3 border-amber-300 flex items-center justify-center text-5xl shadow-md animate-bounce-subtle">
          🏆
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-900 font-black text-xs px-3 py-1 rounded-full mb-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Chặng 2: Luyện tập hoàn thành xuất sắc!
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-1">
            Bé giỏi quá! Đã thuộc trọn vẹn từ vựng!
          </h2>
          <p className="text-sm font-bold text-slate-500 max-w-md mx-auto">
            Bé đã hoàn thành xuất sắc các bài thực hành củng cố. Bây giờ cánh cửa Mini-game Chặng 3 đã chính thức mở khóa!
          </p>
        </div>

        {/* Stars Metric */}
        <div className="flex justify-center items-center gap-2 text-amber-500">
          {[1, 2, 3].map((star) => (
            <Star
              key={star}
              className="w-10 h-10 fill-amber-400 animate-star-celebrate"
            />
          ))}
        </div>

        <div className="flex items-center justify-center gap-3">
          <KokoMascot
            state="celebrating"
            size="sm"
            speechBubble="Cùng Koko chơi Mini-game thôi nào! 🎮"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-slate-100">
          <button
            onClick={() => {
              sfx.playPop();
              setCurrentWordIdx(0);
              setSubStep(1);
              setIsFinished(false);
            }}
            className="btn-kid bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm py-3 px-6 rounded-2xl w-full sm:w-auto"
          >
            <RotateCcw className="w-4 h-4 inline mr-1.5" />
            Luyện tập lại
          </button>

          <button
            onClick={handleFinishStudio}
            className="btn-3d-purple text-white font-black text-base py-3.5 px-8 rounded-2xl shadow-xl w-full sm:w-auto flex items-center justify-center gap-2 cursor-pointer"
          >
            <Gamepad2 className="w-5 h-5 fill-current" />
            <span>Tiến tới Chặng 3: Mini-game ngay 🚀</span>
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MAIN STUDIO INTERACTION STAGE
  // -------------------------------------------------------------
  return (
    <div className="space-y-5 relative">
      {/* Encouragement Alert Banner – inline, no fixed/overflow */}
      {showEncouragement && (
        <div className="flex items-center gap-3 bg-gradient-to-r from-amber-400 to-orange-400 text-amber-950 font-black px-5 py-3 rounded-2xl shadow-md border-2 border-white animate-pop-in">
          <span className="text-xl flex-shrink-0">💪</span>
          <span className="text-sm">Bé cố lên nhé! Thử lại chọn câu trả lời đúng nào! ✨</span>
        </div>
      )}

      {/* Studio Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-sky-100 text-sky-900 border border-sky-200">
            <Lightbulb className="w-3.5 h-3.5 text-sky-600" />
            <span>
              {isMamAge
                ? 'Xưởng Giác Quan & Bóng Đổ (Nhóm Mầm 3–4t)'
                : isChoiAge
                ? 'Xưởng Săn Âm Phonics & Ngữ Cảnh (Nhóm Chồi 4–5t)'
                : 'Xưởng Đoàn Tàu Ghép Chữ & Câu Nhí (Nhóm Lá 5–6t)'}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-800 mt-1">
            Luyện tập từ {currentWordIdx + 1} / {words.length}: {currentWord.english}
          </h3>
        </div>

        {/* Word Progress Dots */}
        <div className="flex items-center gap-1.5">
          {words.map((_, idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full transition-all ${
                idx === currentWordIdx
                  ? 'bg-amber-400 scale-125 ring-2 ring-amber-300'
                  : idx < currentWordIdx
                  ? 'bg-emerald-500'
                  : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Studio Interaction Stage */}
      {isMamAge ? (
        subStep === 1 ? (
          /* STEP 1 (MẦM): TAP TO AWAKEN & DUAL PRONUNCIATION */
          <div className="space-y-6 text-center animate-fade-in">
            <div className="bg-amber-100/70 border-2 border-amber-300 px-4 py-2 rounded-2xl inline-flex items-center gap-2 text-amber-900 font-extrabold text-sm sm:text-base shadow-xs">
              <span>🎈</span>
              <span>
                {isAwakened
                  ? 'Tuyệt vời! Bé hãy nghe Koko đọc và tập đọc theo nhé!'
                  : 'Bé chạm vào quả bóng ma thuật để đánh thức từ mới nhé!'}
              </span>
            </div>

            {/* Central Magic Egg / Revealed Word */}
            <div className="flex justify-center items-center my-4">
              {!isAwakened ? (
                <button
                  onClick={handleAwakenEgg}
                  className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-orange-400 text-white flex flex-col items-center justify-center cursor-pointer shadow-2xl hover:scale-105 active:scale-95 animate-soft-bounce border-4 border-white"
                >
                  <span className="text-6xl sm:text-7xl mb-1">🎁</span>
                  <span className="font-black text-sm text-amber-950 bg-white/80 px-3 py-1 rounded-full shadow-xs">
                    Chạm để mở! ✨
                  </span>
                </button>
              ) : (
                <div className="bg-white rounded-3xl border-3 border-amber-300 p-6 sm:p-8 max-w-sm w-full shadow-xl animate-pop-in text-center">
                  <div className="w-36 h-36 sm:w-44 sm:h-44 mx-auto rounded-3xl overflow-hidden mb-4 shadow-sm border-2 border-slate-100">
                    <img
                      src={currentWord.imageUrl}
                      alt={currentWord.english}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="text-3xl font-black text-slate-800">
                    {currentWord.english}
                  </h4>
                  <p className="text-base font-extrabold text-amber-700">
                    {currentWord.vietnamese}
                  </p>
                  {currentWord.pronunciation && (
                    <span className="text-xs font-bold text-slate-400 block mt-0.5">
                      {currentWord.pronunciation}
                    </span>
                  )}

                  {/* Single Audio Play Button */}
                  <div className="mt-4">
                    <button
                      onClick={handlePlayNormal}
                      className="w-full btn-kid bg-sky-100 hover:bg-sky-200 text-sky-950 font-black text-xs sm:text-sm py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 cursor-pointer border border-sky-300 shadow-xs"
                    >
                      <span className="text-base">🔊</span>
                      <span>Nghe Koko đọc chuẩn</span>
                    </button>
                  </div>

                  {/* Child Echo Mic Button */}
                  <button
                    onClick={handleMicSimulate}
                    className={`w-full mt-3 py-2.5 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      isRecording
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                    <span>{isRecording ? 'Bé đọc to lên nào... 🎤' : 'Bé đọc theo mẫu 🎤'}</span>
                  </button>

                  {/* Advance to Step 2 */}
                  <button
                    onClick={() => {
                      sfx.playPop();
                      setSubStep(2);
                    }}
                    className="btn-3d-amber w-full mt-4 py-3 rounded-2xl text-amber-950 font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <span>Sang bước ghép bóng bí ẩn ✨</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* STEP 2 (MẦM): SHADOW SILHOUETTE MATCH */
          renderMamSubStep2()
        )
      ) : isChoiAge ? (
        subStep === 1 ? (
          /* STEP 1 (CHỒI): INITIAL PHONICS CATCH */
          renderChoiSubStep1()
        ) : (
          /* STEP 2 (CHỒI): PICTURE IN CONTEXT */
          renderChoiSubStep2()
        )
      ) : (
        /* Nhóm Lá (5-6 tuổi) */
        subStep === 1 ? (
          /* STEP 1 (LÁ): TRAIN WORD SPELLER */
          renderLaSubStep1()
        ) : (
          /* STEP 2 (LÁ): MINI SENTENCE BUILDER */
          renderLaSubStep2()
        )
      )}

      {/* Mascot Assistant & Back button */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100 flex-wrap gap-2">
        <button
          onClick={() => {
            sfx.playPop();
            onBackToStage1();
          }}
          className="text-xs font-black text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer py-2 px-3 rounded-xl hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Flashcard (Chặng 1)</span>
        </button>

        <KokoMascot
          state="happy"
          size="sm"
          speechBubble={
            isMamAge
              ? 'Chạm nhẹ tay là nhớ từ ngay bé nhé! 🎈'
              : isChoiAge
              ? 'Bắt đúng âm là từ hiện ra! 🌟'
              : 'Đoàn tàu sắp về ga rồi, bé cố lên! 🚂'
          }
        />
      </div>
    </div>
  );
};
