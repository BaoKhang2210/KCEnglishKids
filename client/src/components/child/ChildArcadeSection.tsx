import React, { useState, useMemo, useEffect } from 'react';
import {
  Star,
  ArrowLeft,
  Play,
  Filter,
  LockKeyhole
} from 'lucide-react';
import type { Vocabulary, ActivityQuestion, Activity } from '../../types';
import { sfx, playWordAudio } from '../../utils/audio';
import { useAuth } from '../../context/AuthContext';
import { vocabMasteryService, type WordMasteryDetail } from '../../services/vocabMasteryService';
import { ResultModal } from './ResultModal';

// Dedicated Game Engines
import { FeedAnimalEngine } from './games/FeedAnimalEngine';
import { BubblePopEngine } from './games/BubblePopEngine';
import { TapPictureEngine } from './games/TapPictureEngine';
import { AnimalSoundEngine } from './games/AnimalSoundEngine';
import { TrueFalseEngine } from './games/TrueFalseEngine';
import { StarCatcherEngine } from './games/StarCatcherEngine';
import { ColorRecognitionEngine } from './games/ColorRecognitionEngine';
import { CountObjectsEngine } from './games/CountObjectsEngine';
import { MissingObjectEngine } from './games/MissingObjectEngine';
import { MemoryCardEngine } from './games/MemoryCardEngine';
import { ImageWordMatchEngine } from './games/ImageWordMatchEngine';
import { ListenChooseEngine } from './games/ListenChooseEngine';

interface ChildArcadeSectionProps {
  vocabularyList?: Vocabulary[];
  ageGroupCode?: string;
  initialSource?: 'learned' | 'mastered' | 'review';
  onNavigateTab?: (tab: string) => void;
}

export type GameMode =
  | 'menu'
  // Lớp Mầm (3–4 tuổi)
  | 'listen-choose'
  | 'feed-animal'
  | 'bubble-pop'
  | 'tap-picture'
  | 'animal-sound'
  // Lớp Chồi (4–5 tuổi)
  | 'color-recognition'
  | 'count-objects'
  | 'true-false'
  | 'missing-object'
  // Lớp Lá (5–6 tuổi)
  | 'memory-card'
  | 'image-word-match'
  | 'star-catcher';

type VocabSource = 'learned' | 'mastered' | 'review';
type AgeFilter = 'all' | '3-4' | '4-5' | '5-6';

// Rich fallback preschool vocabulary dataset with real images & words
const DEFAULT_PRESCHOOL_VOCAB: WordMasteryDetail[] = [
  { _id: 'def_cat', vocabId: 'def_cat', english: 'Cat', vietnamese: 'Con mèo', imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400', audioUrl: '', status: 'MASTERED', rememberCount: 2, reviewCount: 0, gamesPlayedCount: 1, gamesCorrectCount: 1, lastPracticedAt: Date.now(), masteryScore: 90, source: 'JOURNEY' },
  { _id: 'def_dog', vocabId: 'def_dog', english: 'Dog', vietnamese: 'Con chó', imageUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400', audioUrl: '', status: 'MASTERED', rememberCount: 2, reviewCount: 0, gamesPlayedCount: 1, gamesCorrectCount: 1, lastPracticedAt: Date.now(), masteryScore: 90, source: 'JOURNEY' },
  { _id: 'def_apple', vocabId: 'def_apple', english: 'Apple', vietnamese: 'Quả táo', imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400', audioUrl: '', status: 'MASTERED', rememberCount: 2, reviewCount: 0, gamesPlayedCount: 1, gamesCorrectCount: 1, lastPracticedAt: Date.now(), masteryScore: 90, source: 'JOURNEY' },
  { _id: 'def_car', vocabId: 'def_car', english: 'Car', vietnamese: 'Xe hơi', imageUrl: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=400', audioUrl: '', status: 'MASTERED', rememberCount: 2, reviewCount: 0, gamesPlayedCount: 1, gamesCorrectCount: 1, lastPracticedAt: Date.now(), masteryScore: 90, source: 'JOURNEY' },
  { _id: 'def_bird', vocabId: 'def_bird', english: 'Bird', vietnamese: 'Con chim', imageUrl: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=400', audioUrl: '', status: 'MASTERED', rememberCount: 2, reviewCount: 0, gamesPlayedCount: 1, gamesCorrectCount: 1, lastPracticedAt: Date.now(), masteryScore: 90, source: 'JOURNEY' },
  { _id: 'def_fish', vocabId: 'def_fish', english: 'Fish', vietnamese: 'Con cá', imageUrl: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=400', audioUrl: '', status: 'MASTERED', rememberCount: 2, reviewCount: 0, gamesPlayedCount: 1, gamesCorrectCount: 1, lastPracticedAt: Date.now(), masteryScore: 90, source: 'JOURNEY' },
  { _id: 'def_sun', vocabId: 'def_sun', english: 'Sun', vietnamese: 'Mặt trời', imageUrl: 'https://images.unsplash.com/photo-1538370965046-79c0d6907d47?w=400', audioUrl: '', status: 'MASTERED', rememberCount: 2, reviewCount: 0, gamesPlayedCount: 1, gamesCorrectCount: 1, lastPracticedAt: Date.now(), masteryScore: 90, source: 'JOURNEY' },
  { _id: 'def_star', vocabId: 'def_star', english: 'Star', vietnamese: 'Ngôi sao', imageUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=400', audioUrl: '', status: 'MASTERED', rememberCount: 2, reviewCount: 0, gamesPlayedCount: 1, gamesCorrectCount: 1, lastPracticedAt: Date.now(), masteryScore: 90, source: 'JOURNEY' },
  { _id: 'def_bear', vocabId: 'def_bear', english: 'Bear', vietnamese: 'Con gấu', imageUrl: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=400', audioUrl: '', status: 'MASTERED', rememberCount: 2, reviewCount: 0, gamesPlayedCount: 1, gamesCorrectCount: 1, lastPracticedAt: Date.now(), masteryScore: 90, source: 'JOURNEY' },
  { _id: 'def_banana', vocabId: 'def_banana', english: 'Banana', vietnamese: 'Quả chuối', imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400', audioUrl: '', status: 'MASTERED', rememberCount: 2, reviewCount: 0, gamesPlayedCount: 1, gamesCorrectCount: 1, lastPracticedAt: Date.now(), masteryScore: 90, source: 'JOURNEY' }
];

export const ChildArcadeSection: React.FC<ChildArcadeSectionProps> = ({
  vocabularyList: _vocabularyList,
  ageGroupCode: propAgeCode,
  initialSource = 'learned',
  onNavigateTab: _onNavigateTab
}) => {
  const { user } = useAuth();
  const childId = (user as any)?.id || (user as any)?._id || 'guest';
  const [activeGame, setActiveGame] = useState<GameMode>('menu');
  const [vocabSource] = useState<VocabSource>(initialSource);
  const [ageFilter, setAgeFilter] = useState<AgeFilter>(
    propAgeCode === '5-6' ? '5-6' : propAgeCode === '4-5' ? '4-5' : 'all'
  );
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('ALL');
  const [masteryTick, setMasteryTick] = useState(0);

  const userAgeCode = (user as any)?.ageGroupCode || propAgeCode || '3-4';
  const ageLevels: Record<string, number> = { '3-4': 1, '4-5': 2, '5-6': 3 };
  const userLevel = ageLevels[userAgeCode] || 1;

  const isGameUnlocked = (gameAge: string) => {
    const requiredLevel = ageLevels[gameAge] || 1;
    return userLevel >= requiredLevel;
  };

  const getAgeLabel = (age: string) => {
    if (age === '3-4') return 'Lớp Mầm 3–4 tuổi';
    if (age === '4-5') return 'Lớp Chồi 4–5 tuổi';
    if (age === '5-6') return 'Lớp Lá 5–6 tuổi';
    return `${age} tuổi`;
  };

  // Friendly toast state for locked game clicks
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = React.useRef<any>(null);

  const handleLockedGameClick = (game: typeof ALL_GAMES[0]) => {
    sfx.playPop();
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(`Trò chơi này dành cho bé ${getAgeLabel(game.age)}! Bé hãy học lên lớp tiếp theo để mở khóa nhé 🚀✨`);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Overall arcade session score & result modal
  const [score, setScore] = useState(0);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultStats, setResultStats] = useState<{ score: number; maxScore: number; stars: number; correct: number; total: number }>({
    score: 0,
    maxScore: 50,
    stars: 3,
    correct: 5,
    total: 5
  });

  const [currentRound, setCurrentRound] = useState(0);
  const TOTAL_ROUNDS = 5;

  // Question runner state for modular engines
  const [currentEngineQuestion, setCurrentEngineQuestion] = useState<ActivityQuestion | null>(null);
  const [engineCorrectCount, setEngineCorrectCount] = useState(0);
  const [engineFeedback, setEngineFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [engineSelectedId, setEngineSelectedId] = useState<string | null>(null);

  // Memory Game State
  const [memoryActivity, setMemoryActivity] = useState<Activity | null>(null);

  useEffect(() => {
    const handleUpdate = () => setMasteryTick(t => t + 1);
    window.addEventListener('kc_vocab_mastery_updated', handleUpdate);
    return () => window.removeEventListener('kc_vocab_mastery_updated', handleUpdate);
  }, []);

  // Safe vocab pool: uses child's learned words, or prop vocab, or built-in presets (NEVER EMPTY)
  const learnedVocab = useMemo(() => {
    const fromMastery = vocabMasteryService.getAllLearnedWords(childId).filter(v => v.english && (v.imageUrl || v.vietnamese));
    if (fromMastery.length >= 2) return fromMastery;

    if (_vocabularyList && _vocabularyList.length >= 2) {
      return _vocabularyList.map(v => ({
        _id: v._id,
        vocabId: v._id,
        english: v.english || (v as any).word || '',
        vietnamese: v.vietnamese || '',
        imageUrl: v.imageUrl || '',
        audioUrl: v.audioUrl || '',
        status: 'MASTERED' as const,
        rememberCount: 1,
        reviewCount: 0,
        gamesPlayedCount: 0,
        gamesCorrectCount: 0,
        lastPracticedAt: Date.now(),
        masteryScore: 80,
        source: 'JOURNEY' as const
      }));
    }

    return DEFAULT_PRESCHOOL_VOCAB;
  }, [childId, masteryTick, _vocabularyList]);

  const masteredVocab = useMemo(() => {
    const fromMastery = vocabMasteryService.getMasteredWords(childId).filter(v => v.english && (v.imageUrl || v.vietnamese));
    return fromMastery.length >= 2 ? fromMastery : learnedVocab;
  }, [childId, masteryTick, learnedVocab]);

  const reviewVocab = useMemo(() => {
    const fromMastery = vocabMasteryService.getReviewWords(childId).filter(v => v.english && (v.imageUrl || v.vietnamese));
    return fromMastery.length >= 2 ? fromMastery : learnedVocab;
  }, [childId, masteryTick, learnedVocab]);

  const activeVocab = useMemo(() => {
    if (vocabSource === 'mastered') return masteredVocab;
    if (vocabSource === 'review') return reviewVocab;
    return learnedVocab;
  }, [vocabSource, masteredVocab, reviewVocab, learnedVocab]);

  // Handle game finished
  const handleGameFinished = (gameScore: number, correctAnswers: number, totalQ: number = 5) => {
    sfx.playStarFanfare();
    const stars = correctAnswers >= 4 ? 3 : correctAnswers >= 2 ? 2 : 1;
    setResultStats({
      score: gameScore,
      maxScore: totalQ * 10,
      stars,
      correct: correctAnswers,
      total: totalQ
    });
    setScore(prev => prev + gameScore);
    setShowResultModal(true);
  };

  // Setup round for modular engines
  const setupEngineRound = (game: GameMode, roundIdx: number) => {
    const pool = activeVocab.length >= 2 ? activeVocab : DEFAULT_PRESCHOOL_VOCAB;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const target = shuffled[0];

    // Determine choices count (2 for early rounds, 3-4 for later)
    const count = roundIdx <= 1 ? 2 : roundIdx <= 3 ? 3 : 4;
    const distractors = shuffled.slice(1, count);
    const choices = [target, ...distractors].sort(() => Math.random() - 0.5);

    setEngineSelectedId(null);
    setEngineFeedback('idle');

    if (game === 'color-recognition') {
      const colors = [
        { name: 'Red', hex: '#EF4444', label: 'Quả táo đỏ' },
        { name: 'Blue', hex: '#3B82F6', label: 'Cá heo xanh' },
        { name: 'Yellow', hex: '#EAB308', label: 'Ngôi sao vàng' },
        { name: 'Green', hex: '#22C55E', label: 'Chú ếch xanh' },
        { name: 'Orange', hex: '#F97316', label: 'Quả cam mọng' },
        { name: 'Purple', hex: '#A855F7', label: 'Chùm nho tím' }
      ].sort(() => Math.random() - 0.5);
      const targetColor = colors[0];
      const optColors = colors.slice(0, count);
      if (!optColors.find(c => c.name === targetColor.name)) optColors[0] = targetColor;
      optColors.sort(() => Math.random() - 0.5);

      const q: ActivityQuestion = {
        id: `q_col_${roundIdx}`,
        promptText: `Bé hãy chọn màu ${targetColor.name} nhé!`,
        correctAnswer: targetColor.name,
        options: optColors.map(c => ({
          id: c.name.toLowerCase(),
          text: c.name,
          isCorrect: c.name === targetColor.name,
          metadata: { colorHex: c.hex, label: c.label }
        })),
        metadata: { targetColor: targetColor.name }
      };
      setCurrentEngineQuestion(q);
      setTimeout(() => playWordAudio(targetColor.name), 400);
      return;
    }

    if (game === 'count-objects') {
      const qty = (roundIdx % 5) + 1; // 1 to 5 objects
      const emojis = ['🍎', '⭐', '🎈', '🚗', '🐱', '🧸'];
      const chosenEmoji = emojis[roundIdx % emojis.length];
      const allChoices = [qty, qty === 1 ? 2 : qty - 1, qty + 1].sort(() => Math.random() - 0.5);

      const q: ActivityQuestion = {
        id: `q_cnt_${roundIdx}`,
        promptText: `Bé đếm xem có bao nhiêu ${chosenEmoji} nhé!`,
        correctAnswer: qty.toString(),
        options: allChoices.map(num => ({
          id: num.toString(),
          text: num.toString(),
          isCorrect: num === qty
        })),
        metadata: { quantity: qty, objectEmoji: chosenEmoji }
      };
      setCurrentEngineQuestion(q);
      return;
    }

    if (game === 'true-false') {
      const isTruth = Math.random() > 0.5;
      const displayItem = isTruth ? target : distractors[0] || target;
      const q: ActivityQuestion = {
        id: `q_tf_${roundIdx}`,
        promptText: `Đây có phải là "${target.english}" (${target.vietnamese}) không bé?`,
        promptAudioUrl: target.audioUrl,
        promptImageUrl: displayItem.imageUrl,
        correctAnswer: isTruth ? 'true' : 'false',
        options: [
          { id: 'true', text: 'Đúng rồi! ✓', isCorrect: isTruth },
          { id: 'false', text: 'Chưa đúng ✕', isCorrect: !isTruth }
        ],
        metadata: {
          statement: `Is this a ${target.english}?`,
          image: displayItem.imageUrl,
          imageUrl: displayItem.imageUrl
        }
      };
      setCurrentEngineQuestion(q);
      setTimeout(() => playWordAudio(target.english, target.audioUrl), 400);
      return;
    }

    if (game === 'missing-object') {
      const initialPool = choices.slice(0, 3);
      const missing = initialPool[Math.floor(Math.random() * initialPool.length)];
      const visibleAfter = initialPool.filter(v => (v._id || v.vocabId) !== (missing._id || missing.vocabId));

      const q: ActivityQuestion = {
        id: `q_mis_${roundIdx}`,
        promptText: 'Đồ vật nào vừa biến mất sau chiếc hộp bí ẩn?',
        correctAnswer: missing.english,
        options: initialPool.map(v => ({
          id: v._id || v.vocabId,
          text: v.english,
          imageUrl: v.imageUrl,
          vietnameseText: v.vietnamese,
          isCorrect: (v._id || v.vocabId) === (missing._id || missing.vocabId)
        })),
        metadata: {
          initialObjects: initialPool.map(v => v.english),
          missingObject: missing.english,
          visibleObjects: visibleAfter.map(v => v.english)
        }
      };
      setCurrentEngineQuestion(q);
      return;
    }

    if (game === 'image-word-match') {
      const q: ActivityQuestion = {
        id: `q_iwm_${roundIdx}`,
        promptText: target.english,
        promptAudioUrl: target.audioUrl,
        promptImageUrl: target.imageUrl,
        correctAnswer: target.english,
        options: choices.map(c => ({
          id: c._id || c.vocabId,
          text: c.english,
          imageUrl: c.imageUrl,
          vietnameseText: c.vietnamese,
          isCorrect: (c._id || c.vocabId) === (target._id || target.vocabId)
        })),
        metadata: {
          image: target.imageUrl,
          imageUrl: target.imageUrl,
          word: target.english
        }
      };
      setCurrentEngineQuestion(q);
      setTimeout(() => playWordAudio(target.english, target.audioUrl), 400);
      return;
    }

    if (game === 'animal-sound') {
      const animalSounds = [
        { sound: 'Meow meow! 🐱', name: 'Cat', vi: 'Con mèo', emoji: '🐱', img: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400' },
        { sound: 'Woof woof! 🐶', name: 'Dog', vi: 'Con chó', emoji: '🐶', img: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400' },
        { sound: 'Quack quack! 🦆', name: 'Duck', vi: 'Con vịt', emoji: '🦆', img: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400' },
        { sound: 'Moo moo! 🐮', name: 'Cow', vi: 'Con bò', emoji: '🐮', img: 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=400' },
        { sound: 'Roar! 🦁', name: 'Lion', vi: 'Sư tử', emoji: '🦁', img: 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?w=400' }
      ].sort(() => Math.random() - 0.5);

      const targetAnimal = animalSounds[0];
      const choicesAnimal = animalSounds.slice(0, 3).sort(() => Math.random() - 0.5);

      const q: ActivityQuestion = {
        id: `q_snd_${roundIdx}`,
        promptText: `"${targetAnimal.sound}" - Đây là tiếng kêu của bạn nào?`,
        correctAnswer: targetAnimal.name,
        options: choicesAnimal.map(a => ({
          id: a.name.toLowerCase(),
          text: a.name,
          imageUrl: a.img,
          vietnameseText: a.vi,
          isCorrect: a.name === targetAnimal.name
        })),
        metadata: { soundText: targetAnimal.sound }
      };
      setCurrentEngineQuestion(q);
      return;
    }

    // Default for Listen-Choose, Feed-Animal, Bubble-Pop, Tap-Picture, Star-Catcher
    const q: ActivityQuestion = {
      id: `q_${game}_${roundIdx}`,
      promptText: target.english,
      promptAudioUrl: target.audioUrl,
      promptImageUrl: target.imageUrl,
      correctAnswer: target.english,
      options: choices.map(c => ({
        id: c._id || c.vocabId,
        text: c.english,
        imageUrl: c.imageUrl,
        vietnameseText: c.vietnamese,
        isCorrect: (c._id || c.vocabId) === (target._id || target.vocabId)
      })),
      metadata: {
        image: target.imageUrl,
        imageUrl: target.imageUrl,
        word: target.english
      }
    };
    setCurrentEngineQuestion(q);
    setTimeout(() => playWordAudio(target.english, target.audioUrl), 400);
  };

  // Handle answers for modular engines
  const handleEngineAnswer = (isCorrect: boolean, optionId: string) => {
    if (engineFeedback === 'correct') return;
    setEngineSelectedId(optionId);

    if (isCorrect) {
      sfx.playCorrect();
      setEngineFeedback('correct');
      const newCorrect = engineCorrectCount + 1;
      setEngineCorrectCount(newCorrect);

      setTimeout(() => {
        const nextRound = currentRound + 1;
        if (nextRound >= TOTAL_ROUNDS) {
          handleGameFinished(newCorrect * 10, newCorrect, TOTAL_ROUNDS);
        } else {
          setCurrentRound(nextRound);
          setupEngineRound(activeGame, nextRound);
        }
      }, 1200);
    } else {
      sfx.playGentleWrong();
      setEngineFeedback('wrong');
      setTimeout(() => {
        setEngineFeedback('idle');
        setEngineSelectedId(null);
      }, 900);
    }
  };

  // Launch any game
  const startGame = (game: GameMode) => {
    // Check if the game is unlocked for current age
    const gameDef = ALL_GAMES.find(g => g.id === game);
    if (gameDef && !isGameUnlocked(gameDef.age)) {
      handleLockedGameClick(gameDef);
      return;
    }

    sfx.playPop();
    setActiveGame(game);
    setCurrentRound(0);
    setEngineCorrectCount(0);

    if (game === 'memory-card') {
      const pool = activeVocab.slice(0, 4);
      const dummyActivity: Activity = {
        _id: 'act_mem',
        title: 'Lật thẻ ghi nhớ',
        activityType: 'MEMORY_CARD',
        instructions: 'Tìm cặp thẻ tương ứng',
        difficulty: 1,
        questionCount: pool.length,
        pointsPerQuestion: 10,
        starConfig: { threeStarsMin: 30, twoStarsMin: 20, oneStarMin: 10 },
        questions: pool.map((v, i) => ({
          id: `q_mem_${i}`,
          promptText: v.english,
          correctAnswer: v.english,
          options: [{ id: v._id || v.vocabId, text: v.english, imageUrl: v.imageUrl, isCorrect: true }]
        }))
      };
      setMemoryActivity(dummyActivity);
    } else {
      setupEngineRound(game, 0);
    }
  };

  // 12 Game definitions grouped by age
  const ALL_GAMES = [
    // LỚP MẦM (3–4 TUỔI)
    {
      id: 'listen-choose' as GameMode,
      age: '3-4',
      icon: '🎧',
      badge: 'Lớp Mầm (3–4t)',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
      title: 'Nghe & Chọn hình đúng',
      desc: 'Bé nghe phát âm tiếng Anh chuẩn từ cô giáo và chọn đúng hình ảnh sinh động tương ứng.',
      promptHint: 'Chạm loa để nghe và chọn hình nhé!',
      color: 'border-sky-300'
    },
    {
      id: 'feed-animal' as GameMode,
      age: '3-4',
      icon: '🐾',
      badge: 'Lớp Mầm (3–4t)',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      title: 'Cho thú đói ăn vui nhộn',
      desc: 'Các bạn thú mầm non đang đói bụng! Bé hãy nghe tên món ăn và cho các bạn ăn nhé.',
      promptHint: 'Kéo món ăn ngon lành vào miệng bạn thú nào!',
      color: 'border-emerald-300'
    },
    {
      id: 'bubble-pop' as GameMode,
      age: '3-4',
      icon: '🎈',
      badge: 'Lớp Mầm (3–4t)',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
      title: 'Chọc nổ bong bóng từ vựng',
      desc: 'Bong bóng màu sắc lấp lánh đang bay lên! Bé chạm nổ bong bóng có từ đúng để nhận sao.',
      promptHint: 'Chạm nhẹ ngón tay nổ bong bóng "Bốp! Bốp!"',
      color: 'border-rose-300'
    },
    {
      id: 'tap-picture' as GameMode,
      age: '3-4',
      icon: '🖼️',
      badge: 'Lớp Mầm (3–4t)',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      title: 'Chạm nhanh vào tranh',
      desc: 'Phản xạ mầm non vui tươi: Nghe tiếng gọi đồ vật và chạm vào tranh lớn trên màn hình.',
      promptHint: 'Bé quan sát và chạm vào bức tranh đúng nhé!',
      color: 'border-amber-300'
    },
    {
      id: 'animal-sound' as GameMode,
      age: '3-4',
      icon: '🐶',
      badge: 'Lớp Mầm (3–4t)',
      badgeColor: 'bg-orange-100 text-orange-800 border-orange-300',
      title: 'Tiếng kêu các bạn động vật',
      desc: 'Nghe tiếng "Gâu gâu", "Meo meo", "Cục tác" và đoán xem đó là bạn động vật nào.',
      promptHint: 'Lắng nghe thật kỹ tiếng kêu con vật bé ơi!',
      color: 'border-orange-300'
    },

    // LỚP CHỒI (4–5 TUỔI)
    {
      id: 'color-recognition' as GameMode,
      age: '4-5',
      icon: '🎨',
      badge: 'Lớp Chồi (4–5t)',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      title: 'Nhận biết thế giới sắc màu',
      desc: 'Khám phá Red, Blue, Yellow, Green... qua các món đồ chơi và hoa quả sắc màu rực rỡ.',
      promptHint: 'Tìm đồ vật mang màu sắc cô giáo vừa gọi nhé!',
      color: 'border-purple-300'
    },
    {
      id: 'count-objects' as GameMode,
      age: '4-5',
      icon: '🔢',
      badge: 'Lớp Chồi (4–5t)',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
      title: 'Đếm số lượng quả & đồ vật',
      desc: 'Bé chạm vào từng đồ vật để đếm 1, 2, 3... và chọn số lượng chính xác để nhận quà.',
      promptHint: 'Chạm ngón tay vào từng hình để đếm nhé!',
      color: 'border-teal-300'
    },
    {
      id: 'true-false' as GameMode,
      age: '4-5',
      icon: '👍',
      badge: 'Lớp Chồi (4–5t)',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      title: 'Trắc nghiệm Đúng hay Sai',
      desc: 'Xem hình và lắng nghe câu mô tả của bạn Koko, bé chọn Đúng (✓) hoặc Chưa đúng (✕).',
      promptHint: 'Bé chọn Đúng hay Sai cho câu nói này?',
      color: 'border-blue-300'
    },
    {
      id: 'missing-object' as GameMode,
      age: '4-5',
      icon: '🔍',
      badge: 'Lớp Chồi (4–5t)',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      title: 'Tìm đồ vật biến mất bí ẩn',
      desc: 'Ghi nhớ các đồ vật trong 4 giây! Chiếc hộp ma thuật mở ra và giấu mất một đồ vật bí mật.',
      promptHint: 'Đồ vật nào vừa bị giấu đi rồi bé ơi?',
      color: 'border-indigo-300'
    },

    // LỚP LÁ (5–6 TUỔI)
    {
      id: 'memory-card' as GameMode,
      age: '5-6',
      icon: '🧠',
      badge: 'Lớp Lá (5–6t)',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      title: 'Lật thẻ ghi nhớ trí nhớ',
      desc: 'Rèn luyện trí nhớ không gian: Lật các tấm thẻ úp để tìm cặp từ vựng và hình ảnh tương ứng.',
      promptHint: 'Mở 2 thẻ giống nhau để hoàn thành cặp nhé!',
      color: 'border-amber-300'
    },
    {
      id: 'image-word-match' as GameMode,
      age: '5-6',
      icon: '🔗',
      badge: 'Lớp Lá (5–6t)',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      title: 'Nối chữ tiếng Anh với tranh',
      desc: 'Chuẩn bị vào lớp 1: Làm quen với mặt chữ tiếng Anh lớn và nối với hình ảnh minh họa chuẩn.',
      promptHint: 'Nối từ tiếng Anh với hình tương ứng bé nha!',
      color: 'border-emerald-300'
    },
    {
      id: 'star-catcher' as GameMode,
      age: '5-6',
      icon: '🚀',
      badge: 'Lớp Lá (5–6t) • HTML5',
      badgeColor: 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-white',
      title: 'Game HTML5 Động: Hứng Sao Từ Vựng',
      desc: 'Animation chuyển động mượt mà 60 FPS: Di chuyển giỏ ngộ nghĩnh để hứng ngôi sao mang chữ đúng rơi từ bầu trời đêm!',
      promptHint: 'Di chuyển giỏ Koko hứng ngôi sao lấp lánh!',
      color: 'border-indigo-400'
    }
  ];

  // Filtered games based on active age filter
  const displayedGames = useMemo(() => {
    if (ageFilter === 'all') return ALL_GAMES;
    return ALL_GAMES.filter(g => g.age === ageFilter);
  }, [ageFilter]);

  return (
    <div className="w-full space-y-6">
      {/* Top Banner: Quick filter & status */}
      <div className="bg-white rounded-3xl border-4 border-amber-200 p-5 sm:p-7 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-400 flex items-center justify-center text-3xl shadow-sm">
              🎮
            </div>
            <div>
              <h2 className="font-black text-2xl sm:text-3xl text-slate-800">
                Khu Vườn 12 Mini-Games Mầm Non
              </h2>
              <p className="text-xs sm:text-sm font-bold text-slate-500">
                Được thiết kế riêng theo từng lứa tuổi (Mầm 3–4t • Chồi 4–5t • Lá 5–6t). Bé có thể chơi thử tất cả ngay!
              </p>
            </div>
          </div>

          <div className="bg-amber-100 border-2 border-amber-300 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xs">
            <Star className="w-5 h-5 text-amber-600 fill-amber-500" />
            <span className="text-base font-black text-amber-900">{score} sao tích lũy</span>
          </div>
        </div>

        {/* Age & Unit Filter Tabs */}
        <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-slate-100">
          <span className="text-xs font-black uppercase text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Lọc theo:
          </span>
          <button
            type="button"
            onClick={() => setAgeFilter('all')}
            className={`px-4 py-2 rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
              ageFilter === 'all'
                ? 'bg-amber-400 text-amber-950 shadow-md ring-2 ring-amber-300 scale-105'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            ⭐ Tất cả (12 Trò chơi)
          </button>
          <button
            type="button"
            onClick={() => setAgeFilter('3-4')}
            className={`px-4 py-2 rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
              ageFilter === '3-4'
                ? 'bg-sky-500 text-white shadow-md ring-2 ring-sky-300 scale-105'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            🐣 Lớp Mầm (3–4 tuổi)
          </button>
          <button
            type="button"
            onClick={() => setAgeFilter('4-5')}
            className={`px-4 py-2 rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
              ageFilter === '4-5'
                ? 'bg-emerald-500 text-white shadow-md ring-2 ring-emerald-300 scale-105'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            🌿 Lớp Chồi (4–5 tuổi)
          </button>
          <button
            type="button"
            onClick={() => setAgeFilter('5-6')}
            className={`px-4 py-2 rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
              ageFilter === '5-6'
                ? 'bg-purple-500 text-white shadow-md ring-2 ring-purple-300 scale-105'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            🚀 Lớp Lá (5–6 tuổi)
          </button>

          {/* Dedicated Unit Content Filter */}
          <div className="ml-auto flex items-center gap-2 bg-slate-50 border-2 border-slate-200 px-3 py-1.5 rounded-2xl">
            <span className="text-xs font-black text-slate-600">Nội dung theo Unit:</span>
            <select
              value={selectedUnitFilter}
              onChange={(e) => setSelectedUnitFilter(e.target.value)}
              className="bg-white text-xs font-black text-slate-800 rounded-xl px-2 py-1 border border-slate-300 outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả các Unit</option>
              <option value="1">Unit 1: Trường Mầm Non</option>
              <option value="2">Unit 2: Động Vật Nhỏ</option>
              <option value="3">Unit 3: Trái Cây Rực Rỡ</option>
              <option value="4">Unit 4: Đồ Chơi Kỳ Diệu</option>
              <option value="5">Unit 5: Thiên Nhiên Tươi Đẹp</option>
              <option value="6">Unit 6: Gia Đình Thân Yêu</option>
            </select>
          </div>
        </div>
      </div>

      {/* ==================== 1. ARCADE MENU: 12 GAMES GRID ==================== */}
      {activeGame === 'menu' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in">
          {displayedGames.map((game) => {
            const unlocked = isGameUnlocked(game.age);

            return (
              <div
                key={game.id}
                onClick={() => {
                  if (!unlocked) {
                    handleLockedGameClick(game);
                    return;
                  }
                  startGame(game.id);
                }}
                className={`bg-white rounded-3xl border-4 ${
                  unlocked ? game.color : 'border-slate-200 opacity-80'
                } p-6 shadow-md hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                  unlocked ? 'hover:-translate-y-1' : 'hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center text-4xl transition-transform ${
                        unlocked
                          ? 'bg-amber-50 border-amber-200 group-hover:scale-110'
                          : 'bg-slate-100 border-slate-200 text-slate-400 grayscale'
                      }`}
                    >
                      {game.icon}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-black px-3 py-1 rounded-full border shadow-2xs ${game.badgeColor}`}>
                        {game.badge}
                      </span>
                      {!unlocked && (
                        <span className="bg-slate-200 text-slate-700 text-[11px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 border border-slate-300">
                          <LockKeyhole className="w-3 h-3 text-slate-600 stroke-[2.5]" />
                          Khóa
                        </span>
                      )}
                    </div>
                  </div>

                  <h3
                    className={`text-xl sm:text-2xl font-black mb-2 transition-colors ${
                      unlocked ? 'text-slate-800 group-hover:text-amber-600' : 'text-slate-600'
                    }`}
                  >
                    {game.title}
                  </h3>
                  <p className="text-slate-500 font-bold text-xs sm:text-sm leading-relaxed mb-4">
                    {game.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-400">
                    {unlocked ? '5 vòng chơi vui nhộn' : `Yêu cầu: ${getAgeLabel(game.age)}`}
                  </span>
                  {unlocked ? (
                    <span className="btn-3d-amber py-2 px-4 rounded-xl text-xs font-black text-amber-950 flex items-center gap-1.5 shadow-xs">
                      <Play className="w-3.5 h-3.5 fill-amber-950" />
                      Chơi ngay
                    </span>
                  ) : (
                    <span className="bg-slate-200 text-slate-600 py-2 px-3.5 rounded-xl text-xs font-black flex items-center gap-1 border border-slate-300">
                      <LockKeyhole className="w-3.5 h-3.5 text-slate-500" />
                      Chưa mở
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================== 2. ACTIVE GAME ENGINE RUNNER ==================== */}
      {activeGame !== 'menu' && (
        <div className="bg-white rounded-4xl border-4 border-amber-300 p-6 sm:p-8 shadow-xl animate-fade-in">
          {/* Header bar with Back button and Round Progress */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3 pb-4 border-b-2 border-slate-100">
            <button
              onClick={() => {
                sfx.playPop();
                setActiveGame('menu');
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl border-2 border-slate-200 hover:bg-amber-50 text-slate-700 text-sm font-black cursor-pointer shadow-xs active:scale-95 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Trở lại danh sách trò chơi
            </button>

            <div className="flex items-center gap-3">
              <span className="text-xs sm:text-sm font-black text-amber-900 bg-amber-100 px-4 py-1.5 rounded-full border border-amber-300">
                Vòng {currentRound + 1} / {TOTAL_ROUNDS}
              </span>
              <div className="flex items-center gap-1.5 bg-amber-100 px-4 py-1.5 rounded-full border border-amber-300">
                <Star className="w-4 h-4 text-amber-600 fill-amber-500" />
                <span className="text-xs sm:text-sm font-black text-amber-900">{engineCorrectCount * 10} điểm</span>
              </div>
            </div>
          </div>

          {/* Render Active Engine */}
          <div className="py-2">
            {activeGame === 'memory-card' && memoryActivity ? (
              <MemoryCardEngine
                activity={memoryActivity}
                onComplete={() => handleGameFinished(50, 5, 5)}
              />
            ) : currentEngineQuestion && (
              <>
                {activeGame === 'feed-animal' ? (
                  <FeedAnimalEngine
                    question={currentEngineQuestion}
                    onAnswer={handleEngineAnswer}
                    disabled={engineFeedback !== 'idle'}
                  />
                ) : activeGame === 'bubble-pop' ? (
                  <BubblePopEngine
                    question={currentEngineQuestion}
                    onAnswer={handleEngineAnswer}
                    disabled={engineFeedback !== 'idle'}
                  />
                ) : activeGame === 'tap-picture' ? (
                  <TapPictureEngine
                    question={currentEngineQuestion}
                    onAnswer={handleEngineAnswer}
                    disabled={engineFeedback !== 'idle'}
                  />
                ) : activeGame === 'animal-sound' ? (
                  <AnimalSoundEngine
                    question={currentEngineQuestion}
                    onAnswer={handleEngineAnswer}
                    disabled={engineFeedback !== 'idle'}
                  />
                ) : activeGame === 'color-recognition' ? (
                  <ColorRecognitionEngine
                    question={currentEngineQuestion}
                    onAnswer={handleEngineAnswer}
                    disabled={engineFeedback !== 'idle'}
                  />
                ) : activeGame === 'count-objects' ? (
                  <CountObjectsEngine
                    question={currentEngineQuestion}
                    onAnswer={handleEngineAnswer}
                    disabled={engineFeedback !== 'idle'}
                  />
                ) : activeGame === 'true-false' ? (
                  <TrueFalseEngine
                    question={currentEngineQuestion}
                    onAnswer={handleEngineAnswer}
                    disabled={engineFeedback !== 'idle'}
                  />
                ) : activeGame === 'missing-object' ? (
                  <MissingObjectEngine
                    question={currentEngineQuestion}
                    onAnswer={handleEngineAnswer}
                    disabled={engineFeedback !== 'idle'}
                  />
                ) : activeGame === 'image-word-match' ? (
                  <ImageWordMatchEngine
                    question={currentEngineQuestion}
                    onAnswer={handleEngineAnswer}
                    disabled={engineFeedback !== 'idle'}
                  />
                ) : activeGame === 'star-catcher' ? (
                  <StarCatcherEngine
                    question={currentEngineQuestion}
                    selectedOptionId={engineSelectedId}
                    feedbackState={engineFeedback}
                    onSelectOption={(opt) => handleEngineAnswer(true, opt.id)}
                    onPlayPrompt={() => playWordAudio(currentEngineQuestion.promptText, currentEngineQuestion.promptAudioUrl)}
                  />
                ) : (
                  <ListenChooseEngine
                    question={currentEngineQuestion}
                    selectedOptionId={engineSelectedId}
                    feedbackState={engineFeedback}
                    onSelectOption={(opt) => handleEngineAnswer(opt.isCorrect, opt.id)}
                    onPlayPrompt={() => playWordAudio(currentEngineQuestion.promptText, currentEngineQuestion.promptAudioUrl)}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Celebratory Result Modal */}
      {showResultModal && (
        <ResultModal
          score={resultStats.score}
          maxScore={resultStats.maxScore}
          stars={resultStats.stars}
          correctCount={resultStats.correct}
          totalQuestions={resultStats.total}
          onRetry={() => {
            setShowResultModal(false);
            if (activeGame !== 'menu') {
              startGame(activeGame);
            }
          }}
          onFinish={() => {
            setShowResultModal(false);
            setActiveGame('menu');
          }}
        />
      )}
      {/* Friendly Gatekeeper Notification Toast for Locked Games */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] bg-slate-900/95 backdrop-blur-md text-white px-5 py-4 rounded-3xl shadow-2xl border-2 border-amber-400 flex items-center gap-3.5 animate-bounce-short">
          <div className="w-11 h-11 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center text-2xl flex-shrink-0 shadow-md">
            🔒
          </div>
          <div className="flex-1 text-xs sm:text-sm font-black text-amber-100 leading-snug">
            {toastMessage}
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white text-sm font-black p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
