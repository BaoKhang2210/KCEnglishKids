import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Target,
  Volume2,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Flame,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Gamepad2,
  Play,
  Layers,
  Star
} from 'lucide-react';
import { teacherApi, aiApi } from '../../services/api';
import { playWordAudio, sfx } from '../../utils/audio';
import { getPreschoolTprGesture } from '../../utils/tprGestures';
import { wordArt } from '../../utils/learningArt';
import confetti from 'canvas-confetti';
import { GameRunner } from '../../games/core/GameRunner';
import { getAvailableLessonGames } from '../../games/registry';
import type { Vocabulary } from '../../types';

interface GapWord {
  vocabularyId?: string;
  english: string;
  vietnamese?: string;
  severity?: 'critical' | 'watch' | 'moderate' | 'healthy';
  accuracyPercent?: number | null;
  masteredPercent?: number;
  totalAttempts?: number;
  wrongCount?: number;
  imageUrl?: string | null;
  audioUrl?: string | null;
  phonetic?: string | null;
  pronunciation?: string | null;
  tprGesture?: string;
}

export const TeacherLessonPlanner: React.FC = () => {
  const [searchParams] = useSearchParams();

  const initialClassId = searchParams.get('classroomId') || '';
  const urlGapWords = searchParams.get('gapWords') || '';

  // Data states
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [activeTab, setActiveTab] = useState<'flashcard' | 'game'>('flashcard');

  // Gaps and word selection
  const [classGaps, setClassGaps] = useState<GapWord[]>([]);
  const [loadingGaps, setLoadingGaps] = useState(false);
  const [selectedGapWords, setSelectedGapWords] = useState<string[]>([]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);

  // Audio & Notification
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  // Mini-Game: Listen & Tap
  const [gameTarget, setGameTarget] = useState<GapWord | null>(null);
  const [gameChoices, setGameChoices] = useState<GapWord[]>([]);
  const [gameScore, setGameScore] = useState(0);
  const [gameAnswerState, setGameAnswerState] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [selectedChoiceWord, setSelectedChoiceWord] = useState<string | null>(null);
  const [gameRound, setGameRound] = useState(1);
  const totalRounds = 5;

  // GameRunner Modal
  const [launchGameRunner, setLaunchGameRunner] = useState(false);

  // 1. Load teacher classes
  useEffect(() => {
    teacherApi.getClasses()
      .then((res) => {
        const clsList = res.data || [];
        setClasses(clsList);
        if (!selectedClassId && clsList.length > 0) {
          setSelectedClassId(String(clsList[0]._id));
        }
      })
      .catch((err) => {
        setError(err.message || 'Không thể tải danh sách lớp học.');
      });
  }, []);

  // Review only measured gaps. Missing practice must never fabricate 100% accuracy.
  useEffect(() => {
    let cancelled = false;
    setClassGaps([]); setSelectedGapWords([]); setActiveCardIndex(0); setIsFlipped(false);
    if (!selectedClassId) return;
    setLoadingGaps(true); setError('');
    aiApi.detectClassGaps(selectedClassId).then(res => {
      if (cancelled) return;
      const list: GapWord[] = res.data?.gaps || [];
      setClassGaps(list);
      const requested = urlGapWords.split(',').map(word => word.trim().toLowerCase()).filter(Boolean);
      const matches = list.filter(word => !requested.length || requested.includes(word.english.toLowerCase()));
      setSelectedGapWords(matches.slice(0, 12).map(word => word.english));
    }).catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoadingGaps(false); });
    return () => { cancelled = true; };
  }, [selectedClassId, urlGapWords]);

  const currentClass = useMemo(() => {
    return classes.find((c) => String(c._id) === selectedClassId);
  }, [classes, selectedClassId]);

  // Enriched active review words with image fallback and TPR gesture
  const activeReviewWords = useMemo(() => {
    return selectedGapWords.map((word) => {
      const found = classGaps.find((g) => g.english.toLowerCase() === word.toLowerCase());
      const art = wordArt(word);
      const imageUrl = found?.imageUrl || art?.url || null;
      return {
        vocabularyId: found?.vocabularyId,
        english: word,
        vietnamese: found?.vietnamese || 'từ vựng',
        severity: found?.severity || 'critical',
        accuracyPercent: found?.accuracyPercent,
        imageUrl,
        audioUrl: found?.audioUrl || null,
        phonetic: found?.phonetic || null,
        tprGesture: getPreschoolTprGesture(word, found?.vietnamese)
      };
    });
  }, [selectedGapWords, classGaps]);

  const currentCard = activeReviewWords[activeCardIndex] || activeReviewWords[0] || null;

  // Play audio for a word
  const handlePlayWord = useCallback((word: string, audioUrl?: string | null) => {
    sfx.playPop();
    setPlayingWord(word);
    void playWordAudio(word, audioUrl || undefined).finally(() => {
      setPlayingWord(null);
    });
  }, []);

  // Auto-play audio when card changes if autoSpeak is enabled
  useEffect(() => {
    if (activeTab === 'flashcard' && autoSpeak && currentCard && !isFlipped) {
      const timer = setTimeout(() => {
        handlePlayWord(currentCard.english, currentCard.audioUrl);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [activeCardIndex, autoSpeak, currentCard, activeTab, isFlipped, handlePlayWord]);

  // Card navigation
  const handlePrevCard = () => {
    sfx.playPop();
    setIsFlipped(false);
    setActiveCardIndex((prev) => (prev > 0 ? prev - 1 : activeReviewWords.length - 1));
  };

  const handleNextCard = () => {
    sfx.playPop();
    setIsFlipped(false);
    setActiveCardIndex((prev) => (prev < activeReviewWords.length - 1 ? prev + 1 : 0));
  };

  const handleFlipCard = () => {
    sfx.playPop();
    setIsFlipped((prev) => !prev);
  };

  // Toggle word selection
  const handleToggleWord = (word: string) => {
    sfx.playPop();
    setSelectedGapWords((prev) => {
      const next = prev.includes(word) ? prev.filter((w) => w !== word) : [...prev, word];
      return next;
    });
  };

  // Select all or critical
  const handleSelectAll = () => {
    sfx.playPop();
    if (selectedGapWords.length === classGaps.length) {
      setSelectedGapWords([]);
    } else {
      setSelectedGapWords(classGaps.map((g) => g.english));
    }
  };

  // Mini-Game: Setup a question round
  const setupGameRound = useCallback(() => {
    if (activeReviewWords.length === 0) return;
    setGameAnswerState('idle');
    setSelectedChoiceWord(null);

    // Pick a target word
    const randomTarget = activeReviewWords[Math.floor(Math.random() * activeReviewWords.length)];
    setGameTarget(randomTarget);

    // Pick 2 to 4 choices
    const otherWords = activeReviewWords.filter((w) => w.english !== randomTarget.english);
    const shuffledOthers = [...otherWords].sort(() => 0.5 - Math.random()).slice(0, 3);
    const choices = [randomTarget, ...shuffledOthers].sort(() => 0.5 - Math.random());
    setGameChoices(choices);

    // Auto-speak target prompt
    setTimeout(() => {
      void playWordAudio(randomTarget.english, randomTarget.audioUrl || undefined);
    }, 400);
  }, [activeReviewWords]);

  // When switching to Game tab, start round
  useEffect(() => {
    if (activeTab === 'game' && activeReviewWords.length > 0) {
      setGameScore(0);
      setGameRound(1);
      setupGameRound();
    }
  }, [activeTab, activeReviewWords.length, setupGameRound]);

  // Handle player choice in mini-game
  const handleSelectGameChoice = (choice: GapWord) => {
    if (gameAnswerState !== 'idle' || !gameTarget) return;
    setSelectedChoiceWord(choice.english);

    if (choice.english.toLowerCase() === gameTarget.english.toLowerCase()) {
      sfx.playSuccess();
      setGameAnswerState('correct');
      setGameScore((s) => s + 1);

      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch { }

      setTimeout(() => {
        if (gameRound < totalRounds) {
          setGameRound((r) => r + 1);
          setupGameRound();
        } else {
          sfx.playStarFanfare();
        }
      }, 1400);
    } else {
      sfx.playPop();
      setGameAnswerState('wrong');
      setTimeout(() => {
        setGameAnswerState('idle');
        setSelectedChoiceWord(null);
      }, 1000);
    }
  };

  // Words converted for GameRunner compatibility
  const gameRunnerWords: Vocabulary[] = useMemo(() => {
    return activeReviewWords.map((w, idx) => ({
      _id: w.vocabularyId || `vocab-gap-${idx}`,
      english: w.english,
      vietnamese: w.vietnamese,
      imageUrl: w.imageUrl || '/images/mascots/koko-happy.png',
      audioUrl: w.audioUrl || undefined,
      status: 'ACTIVE',
      topic: 'gaps' as any
    }));
  }, [activeReviewWords]);

  const reviewGames = useMemo(() => {
    return getAvailableLessonGames(gameRunnerWords, 1, 1);
  }, [gameRunnerWords]);

  return (
    <div className="mx-auto max-w-[1700px] space-y-6 pb-16 font-sans w-full">
      {/* ── TOP BANNER: STREAMLINED ACTION HEADER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-5 sm:p-7 text-white shadow-lg">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-0.5 text-xs font-black tracking-wide text-white backdrop-blur-md">
              <Target size={14} className="text-amber-200" />
              <span>ÔN TẬP LỖ HỔNG KIẾN THỨC MẦM NON</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white drop-shadow-xs">
              Thẻ Flashcard & Trò Chơi Ôn Luyện Lỗ Hổng
            </h1>
            <p className="text-xs sm:text-sm text-amber-100 font-medium leading-relaxed">
              Tự động tập hợp những từ vựng trẻ trong lớp hay làm sai hoặc chưa vững. Cô giáo có thể chiếu Flashcard kèm động tác TPR hài hước hoặc tổ chức đố vui nhanh ngay tại chỗ!
            </p>
          </div>
        </div>
      </div>

      {/* ── TOP CONTROLS & TAB SWITCHER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
        {/* Classroom Picker */}
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-100 text-amber-800 shrink-0">
            <Target size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Đang chọn lớp:
            </span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-transparent text-sm sm:text-base font-black text-slate-900 outline-none cursor-pointer hover:text-amber-700 transition-colors"
            >
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name} ({cls.ageGroupCode ? `Nhóm ${cls.ageGroupCode} tuổi` : 'Mầm non'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Mode Tabs (Flashcard vs Interactive Game) */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl self-start sm:self-center border border-slate-200">
          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              setActiveTab('flashcard');
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${activeTab === 'flashcard'
              ? 'bg-white text-amber-900 shadow-xs scale-102'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Layers size={16} className={activeTab === 'flashcard' ? 'text-amber-600' : ''} />
            <span>🎴 Thẻ Flashcard Tương Tác</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              setActiveTab('game');
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${activeTab === 'game'
              ? 'bg-amber-500 text-white shadow-xs scale-102'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Gamepad2 size={16} />
            <span>🎮 Trò Chơi Ôn Tập Nhanh</span>
          </button>
        </div>
      </div>

      {/* ── LOADING & ERROR NOTIFICATIONS ── */}
      {loadingGaps && (
        <div className="p-8 rounded-3xl bg-amber-50/70 border border-amber-200 text-center text-sm text-amber-900 font-bold flex items-center justify-center gap-3">
          <RefreshCw size={18} className="animate-spin text-amber-600" />
          <span>Đang tổng hợp các từ vựng lỗ hổng của lớp {currentClass?.name || ''}...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertCircle size={18} className="shrink-0 text-rose-700" />
          <span>{error}</span>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ── */}
      {!loadingGaps && activeReviewWords.length === 0 ? (
        <div className="rounded-3xl border border-emerald-200 bg-white p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-3xl shadow-inner">
            🎉
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900">
              Không có từ vựng nào bị cảnh báo lỗ hổng!
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
              Lớp {currentClass?.name} đang nắm rất vững kiến thức qua các buổi học.
            </p>
          </div>
        </div>
      ) : !loadingGaps && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── LEFT / MAIN PANEL: FLASHCARD VIEWER OR MINI-GAME ── */}
          <div className="lg:col-span-8 space-y-5">
            {activeTab === 'flashcard' ? (
              /* ── FLASHCARD INTERACTIVE VIEWER ── */
              <div className="rounded-3xl border-3 border-amber-200 bg-white p-6 sm:p-8 shadow-md space-y-6">
                {/* Flashcard Header Controls */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-950 border border-amber-300">
                      Thẻ #{activeCardIndex + 1} / {activeReviewWords.length}
                    </span>
                    {currentCard?.severity === 'critical' ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                        <Flame size={12} className="text-rose-600" /> Cần ôn gấp
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
                        Cần củng cố
                      </span>
                    )}
                    {currentCard?.accuracyPercent != null && (
                      <span className="text-xs font-bold text-slate-500">
                        (Độ đúng lớp: {currentCard.accuracyPercent}%)
                      </span>
                    )}
                  </div>

                  {/* Auto-Speak Toggle */}
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoSpeak}
                      onChange={(e) => setAutoSpeak(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Tự động phát âm</span>
                  </label>
                </div>

                {/* THE 3D FLIPPABLE FLASHCARD */}
                <div className="perspective-1000 w-full min-h-[340px] sm:min-h-[400px]">
                  {!isFlipped ? (
                    /* ── FRONT SIDE: LARGE ILLUSTRATION & AUDIO ── */
                    <div className="relative flex flex-col items-center justify-between p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-amber-50/40 via-white to-amber-50/20 border-2 border-amber-200 shadow-sm transition-all text-center">
                      {/* Big Picture */}
                      <div className="relative w-48 h-48 sm:w-60 sm:h-60 flex items-center justify-center p-2">
                        {currentCard?.imageUrl ? (
                          <img
                            src={currentCard.imageUrl}
                            alt={currentCard.english}
                            className="max-h-full max-w-full object-contain drop-shadow-md hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-36 h-36 rounded-3xl bg-amber-100 flex items-center justify-center text-5xl">
                            🎴
                          </div>
                        )}

                        {/* Speaker Button On Card */}
                        <button
                          type="button"
                          aria-label={`Nghe phát âm từ ${currentCard?.english}`}
                          onClick={() => handlePlayWord(currentCard?.english || '', currentCard?.audioUrl)}
                          className={`absolute top-2 right-2 w-12 h-12 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer ${playingWord === currentCard?.english ? 'animate-bounce ring-4 ring-amber-300' : ''
                            }`}
                        >
                          <Volume2 size={24} />
                        </button>
                      </div>

                      {/* English & Vietnamese Word Label */}
                      <div className="space-y-1 mt-4">
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                          {currentCard?.english}
                        </h2>
                        {currentCard?.phonetic && (
                          <p className="text-xs sm:text-sm font-mono text-slate-500">
                            /{currentCard.phonetic}/
                          </p>
                        )}
                        <p className="text-lg sm:text-xl font-bold text-amber-700">
                          {currentCard?.vietnamese}
                        </p>
                      </div>

                      {/* Flip Card Action Pill */}
                      <button
                        type="button"
                        onClick={handleFlipCard}
                        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-100 hover:bg-amber-200/80 text-amber-950 font-black text-xs sm:text-sm transition-all cursor-pointer hover:scale-102"
                      >
                        <RotateCw size={15} />
                        <span>Lật Thẻ Xem Động Tác TPR & Khẩu Lệnh Của Cô</span>
                      </button>
                    </div>
                  ) : (
                    /* ── BACK SIDE: TPR GESTURE & TEACHER CUE ── */
                    <div className="relative flex flex-col items-center justify-between p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-teal-50 via-white to-sky-50 border-2 border-teal-200 shadow-sm transition-all text-center space-y-5">
                      <div className="w-full flex items-center justify-between border-b border-teal-100 pb-3">
                        <div className="flex items-center gap-2 text-teal-900 font-black text-base">
                          <span>🤸 Động Tác Vận Động TPR Mầm Non</span>
                        </div>
                        <span className="text-xs font-bold text-teal-700 bg-teal-100 px-2.5 py-0.5 rounded-full">
                          Từ vựng: {currentCard?.english}
                        </span>
                      </div>

                      {/* Gesture Box */}
                      <div className="max-w-md w-full space-y-4 py-2">
                        <div className="p-4 rounded-2xl bg-white border-2 border-teal-200/80 shadow-xs space-y-2">
                          <span className="text-xs font-black uppercase tracking-wider text-teal-800 block">
                            Hướng dẫn động tác cho bé:
                          </span>
                          <p className="text-base sm:text-lg font-bold text-slate-800 leading-relaxed">
                            "{currentCard?.tprGesture}"
                          </p>
                        </div>

                        {/* Teacher Cue */}
                        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left space-y-1">
                          <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                            <Sparkles size={14} className="text-amber-600" />
                            <span>Khẩu lệnh cô giáo hướng dẫn lớp:</span>
                          </span>
                          <p className="text-xs sm:text-sm text-amber-950 font-semibold italic">
                            "Look at teacher! Listen: <strong>{currentCard?.english}</strong>! Everyone say: <strong>{currentCard?.english}</strong> and do the action!"
                          </p>
                        </div>
                      </div>

                      {/* Flip Back Button */}
                      <button
                        type="button"
                        onClick={handleFlipCard}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-black text-xs sm:text-sm transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        <RotateCw size={15} />
                        <span>Quay Lại Mặt Tranh & Phát Âm</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* CARD NAVIGATION CONTROLS */}
                <div className="flex items-center justify-between gap-4 pt-2">
                  <button
                    type="button"
                    onClick={handlePrevCard}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-95"
                  >
                    <ChevronLeft size={18} />
                    <span>Thẻ trước</span>
                  </button>

                  {/* Dots Indicator */}
                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    {activeReviewWords.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          sfx.playPop();
                          setIsFlipped(false);
                          setActiveCardIndex(idx);
                        }}
                        className={`h-2.5 rounded-full transition-all cursor-pointer ${idx === activeCardIndex
                          ? 'w-7 bg-amber-500'
                          : 'w-2.5 bg-slate-200 hover:bg-slate-300'
                          }`}
                        title={`Xem thẻ ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleNextCard}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <span>Thẻ tiếp theo</span>
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            ) : (
              /* ── INTERACTIVE REVIEW MINI-GAME: LISTEN & TAP ── */
              <div className="rounded-3xl border-3 border-amber-300 bg-white p-6 sm:p-8 shadow-md space-y-6">
                {/* Game Header */}
                <div className="flex items-center justify-between border-b border-amber-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
                      <Gamepad2 size={22} />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-slate-900">
                        Trò Chơi: Nghe & Chạm Đúng Tranh
                      </h2>
                      <p className="text-xs text-slate-500">
                        Bấm loa nghe từ phát âm, sau đó mời bé hoặc cô chạm vào thẻ tranh tương ứng!
                      </p>
                    </div>
                  </div>

                  {/* Round & Score Pill */}
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 rounded-xl bg-amber-100 text-amber-950 font-black text-xs sm:text-sm flex items-center gap-1 border border-amber-300">
                      <Star size={14} className="text-amber-600 fill-amber-500" />
                      <span>{gameScore} Điểm</span>
                    </div>
                    <span className="text-xs font-bold text-slate-500">
                      Câu {gameRound} / {totalRounds}
                    </span>
                  </div>
                </div>

                {/* Question Prompt */}
                <div className="rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-6 text-white text-center shadow-sm space-y-3">
                  <p className="text-xs uppercase font-black tracking-wider text-amber-100">
                    Bấm loa để nghe lại từ vựng cần tìm:
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (gameTarget) handlePlayWord(gameTarget.english, gameTarget.audioUrl);
                    }}
                    className="inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-white text-amber-900 font-black text-base sm:text-lg shadow-md hover:bg-amber-50 active:scale-95 transition-all cursor-pointer"
                  >
                    <Volume2 size={24} className="text-amber-600 animate-pulse" />
                    <span>Nghe phát âm: "{gameTarget?.english}"</span>
                  </button>
                  <p className="text-xs text-amber-100 font-medium">
                    (Nghĩa tiếng Việt gợi ý: <em>{gameTarget?.vietnamese}</em>)
                  </p>
                </div>

                {/* Choices Grid (2 to 4 interactive cards) */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  {gameChoices.map((choice) => {
                    const isSelected = selectedChoiceWord === choice.english;
                    const isTarget = choice.english.toLowerCase() === gameTarget?.english.toLowerCase();
                    let cardBorder = 'border-slate-200 hover:border-amber-400 bg-white';
                    if (isSelected && isTarget) {
                      cardBorder = 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-300 scale-105';
                    } else if (isSelected && !isTarget) {
                      cardBorder = 'border-rose-400 bg-rose-50 ring-4 ring-rose-200 animate-shake';
                    }

                    return (
                      <button
                        key={choice.english}
                        type="button"
                        onClick={() => handleSelectGameChoice(choice)}
                        className={`group relative flex flex-col items-center justify-between p-4 rounded-3xl border-3 transition-all duration-200 cursor-pointer shadow-xs active:scale-95 ${cardBorder}`}
                      >
                        <div className="w-full aspect-square flex items-center justify-center p-2">
                          {choice.imageUrl ? (
                            <img
                              src={choice.imageUrl}
                              alt={choice.english}
                              className="max-h-full max-w-full object-contain drop-shadow-sm group-hover:scale-110 transition-transform"
                            />
                          ) : (
                            <span className="text-4xl">🎴</span>
                          )}
                        </div>
                        <div className="w-full mt-2 pt-2 border-t border-slate-100 text-center">
                          <span className="block font-black text-slate-800 text-sm group-hover:text-amber-700">
                            {choice.english}
                          </span>
                          <span className="block text-xs font-semibold text-slate-500">
                            {choice.vietnamese}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Bottom Game Controls & GameRunner Trigger */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      sfx.playPop();
                      setupGameRound();
                    }}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw size={14} />
                    <span>Đổi câu hỏi khác</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sfx.playPop();
                      setLaunchGameRunner(true);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <Play size={16} className="fill-white" />
                    <span>Mở Trò Chơi Ôn Tập Cho Cả Lớp (Màn hình lớn)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL: QUICK THUMBNAIL SELECTOR & REMEDIATION SUMMARY ── */}
          <div className="lg:col-span-4 space-y-5">
            {/* Warning Word Selector Grid */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Flame size={16} className="text-amber-600" />
                  <h3 className="text-sm font-black text-slate-900">
                    Từ Lỗ Hổng Của Lớp ({activeReviewWords.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs font-bold text-amber-800 hover:underline cursor-pointer"
                >
                  {selectedGapWords.length === classGaps.length ? 'Bỏ chọn' : 'Chọn tất cả'}
                </button>
              </div>

              {/* Thumbnails list */}
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                {classGaps.map((word) => {
                  const isSelected = selectedGapWords.includes(word.english);
                  const isCurrentActive = activeReviewWords[activeCardIndex]?.english === word.english;
                  const art = wordArt(word.english);
                  const img = word.imageUrl || art?.url || null;

                  return (
                    <div
                      key={word.english}
                      onClick={() => {
                        const targetIdx = activeReviewWords.findIndex((w) => w.english === word.english);
                        if (targetIdx >= 0) {
                          sfx.playPop();
                          setIsFlipped(false);
                          setActiveCardIndex(targetIdx);
                        } else {
                          handleToggleWord(word.english);
                        }
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${isCurrentActive
                        ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-300 shadow-xs'
                        : isSelected
                          ? 'border-amber-200 bg-amber-50/40 hover:border-amber-300'
                          : 'border-slate-200 bg-white opacity-60 hover:opacity-100'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-2xs">
                          {img ? (
                            <img src={img} alt={word.english} className="max-h-full max-w-full object-contain" />
                          ) : (
                            <span className="text-lg">🎴</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 leading-tight">
                            {word.english}
                          </p>
                          <p className="text-[11px] font-semibold text-slate-500">
                            {word.vietnamese}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          aria-label={`Nghe phát âm ${word.english}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayWord(word.english, word.audioUrl);
                          }}
                          className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <Volume2 size={14} className={playingWord === word.english ? 'animate-bounce text-amber-600' : ''} />
                        </button>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md ${word.severity === 'critical'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                        >
                          {word.severity === 'critical' ? 'Gấp' : 'Nên ôn'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Practical Teaching Guide Callout */}
            <div className="rounded-3xl border border-teal-200 bg-teal-50/70 p-5 space-y-2.5 shadow-xs">
              <div className="flex items-center gap-2 text-teal-900 font-black text-xs uppercase tracking-wider">
                <Sparkles size={15} className="text-teal-700" />
                <span>Phương Pháp Ôn Lỗ Hổng Mầm Non</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                • <strong>Nguyên tắc vàng:</strong> Kết hợp hình ảnh Flashcard + Nghe phát âm to + Bé thực hiện động tác vận động hình thể TPR (vẫy tay, giậm chân, làm tai thỏ...).
              </p>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                • <strong>Khích lệ & Không phạt:</strong> Trẻ mầm non chỉ nhớ lâu khi được vui cười và đập tay khen ngợi. Tuyệt đối không chê bai khi bé đọc nhầm!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── FULLSCREEN GAMERUNNER MODAL ── */}
      {launchGameRunner && reviewGames[0] && (
        <GameRunner
          allowedGameIds={reviewGames.map((g) => g.id)}
          config={{
            unitId: 'gaps-review',
            preview: true,
            lessonId: 'class-gaps-' + (selectedClassId || 'active'),
            gameId: reviewGames[0].id,
            vocabularyList: gameRunnerWords,
            ageGroup: currentClass?.ageGroupCode || '3-4',
            childId: 'teacher-demo'
          }}
          onExit={() => setLaunchGameRunner(false)}
          onGameComplete={() => {
            setLaunchGameRunner(false);
            sfx.playSuccess();
            sfx.playStarFanfare();
          }}
        />
      )}
    </div>
  );
};
