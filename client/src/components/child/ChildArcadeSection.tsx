import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Volume2,
  Sparkles,
  Star,
  ArrowLeft,
  Check,
  Clock,
  Lock
} from 'lucide-react';
import type { Vocabulary } from '../../types';
import { sfx, playWordAudio } from '../../utils/audio';
import { useAuth } from '../../context/AuthContext';
import { vocabMasteryService, type WordMasteryDetail } from '../../services/vocabMasteryService';
import { ResultModal } from './ResultModal';

interface ChildArcadeSectionProps {
  vocabularyList?: Vocabulary[];
  ageGroupCode?: string;
  initialSource?: 'learned' | 'mastered' | 'review';
  onNavigateTab?: (tab: string) => void;
}

type GameMode =
  | 'menu'
  | 'listen-choose'       // Nhóm Mầm: Nghe và chọn hình
  | 'color-recognition'   // Nhóm Mầm: Nhận biết màu sắc
  | 'image-word-match'    // Nhóm Chồi/Lá: Nối từ với hình
  | 'count-objects'       // Nhóm Chồi/Lá: Đếm số lượng
  | 'missing-object'      // Nhóm Chồi/Lá: Tìm đồ vật bị thiếu
  | 'memory-card';        // Nhóm Chồi/Lá: Lật thẻ ghi nhớ

type VocabSource = 'learned' | 'mastered' | 'review';

// Vibrant color presets for Color Recognition game
const COLOR_PRESETS = [
  { name: 'Red', nameVi: 'Màu đỏ', hex: '#EF4444', border: '#DC2626', icon: '🍎', label: 'Quả táo đỏ' },
  { name: 'Blue', nameVi: 'Màu xanh dương', hex: '#3B82F6', border: '#2563EB', icon: '🐬', label: 'Cá heo xanh' },
  { name: 'Yellow', nameVi: 'Màu vàng', hex: '#EAB308', border: '#CA8A04', icon: '⭐', label: 'Ngôi sao vàng' },
  { name: 'Green', nameVi: 'Màu xanh lá', hex: '#22C55E', border: '#16A34A', icon: '🐸', label: 'Chú ếch xanh' },
  { name: 'Orange', nameVi: 'Màu cam', hex: '#F97316', border: '#EA580C', icon: '🍊', label: 'Quả cam mọng' },
  { name: 'Purple', nameVi: 'Màu tím', hex: '#A855F7', border: '#9333EA', icon: '🍇', label: 'Chùm nho tím' },
  { name: 'Pink', nameVi: 'Màu hồng', hex: '#EC4899', border: '#DB2777', icon: '🌸', label: 'Bông hoa hồng' },
  { name: 'Brown', nameVi: 'Màu nâu', hex: '#8D6E63', border: '#6D4C41', icon: '🐻', label: 'Chú gấu nâu' }
];

const COUNT_EMOJIS = ['🍎', '⭐', '🎈', '🚗', '🐱', '🐶', '🧸', '🍓', '🥕', '🌸'];

export const ChildArcadeSection: React.FC<ChildArcadeSectionProps> = ({
  vocabularyList: _vocabularyList,
  ageGroupCode: propAgeCode,
  initialSource = 'learned',
  onNavigateTab
}) => {
  const { user } = useAuth();
  const childId = (user as any)?.id || (user as any)?._id || 'guest';
  const effectiveAgeCode = propAgeCode || (user as any)?.ageGroupCode || '3-4';
  const isMamAge = effectiveAgeCode === '3-4';

  const [activeGame, setActiveGame] = useState<GameMode>('menu');
  const [vocabSource, setVocabSource] = useState<VocabSource>(initialSource);
  const [masteryTick, setMasteryTick] = useState(0);

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

  // Current round in games (0 to 4 => 5 rounds per game session)
  const [currentRound, setCurrentRound] = useState(0);
  const TOTAL_ROUNDS = 5;

  useEffect(() => {
    const handleUpdate = () => setMasteryTick(t => t + 1);
    window.addEventListener('kc_vocab_mastery_updated', handleUpdate);
    return () => window.removeEventListener('kc_vocab_mastery_updated', handleUpdate);
  }, []);

  // Learned words strictly from Journey & Topics completed/practiced by this child
  const learnedVocab = useMemo(() => {
    return vocabMasteryService.getAllLearnedWords(childId).filter(v => v.english && (v.imageUrl || v.vietnamese));
  }, [childId, masteryTick]);

  const masteredVocab = useMemo(() => {
    return vocabMasteryService.getMasteredWords(childId).filter(v => v.english && (v.imageUrl || v.vietnamese));
  }, [childId, masteryTick]);

  const reviewVocab = useMemo(() => {
    return vocabMasteryService.getReviewWords(childId).filter(v => v.english && (v.imageUrl || v.vietnamese));
  }, [childId, masteryTick]);

  // Active pool based on selected source (strictly scoped to learned words)
  const { activeVocab, isFallbackNotice } = useMemo(() => {
    if (vocabSource === 'mastered') {
      if (masteredVocab.length >= 2) {
        return { activeVocab: masteredVocab, isFallbackNotice: false };
      }
      return {
        activeVocab: learnedVocab,
        isFallbackNotice: masteredVocab.length > 0
          ? 'Bé mới thuộc 1 từ, cần ít nhất 2 từ để chơi! Koko đang kết hợp thêm các từ bé đã học nhé ✨'
          : 'Bé chưa có từ nào trong danh sách "Đã nhớ". Hãy lật Flashcard và chọn "Đã nhớ" 💚 để bổ sung nhé! Đang dùng các từ bé đã học...'
      };
    }
    if (vocabSource === 'review') {
      if (reviewVocab.length >= 2) {
        return { activeVocab: reviewVocab, isFallbackNotice: false };
      }
      return {
        activeVocab: learnedVocab,
        isFallbackNotice: reviewVocab.length > 0
          ? 'Bé mới có 1 từ cần ôn, đang kết hợp thêm từ bé đã học để tạo trò chơi nhé ✨'
          : 'Bé không có từ nào đánh dấu "Cần ôn lại". Bé học siêu quá! Đang dùng các từ bé đã học...'
      };
    }
    return { activeVocab: learnedVocab, isFallbackNotice: false };
  }, [vocabSource, masteredVocab, reviewVocab, learnedVocab]);

  // Check saved round from localStorage to allow resuming
  const getSavedRound = (game: GameMode): number => {
    try {
      const saved = localStorage.getItem(`kc_arcade_round_${childId}_${game}`);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  };

  const saveRoundProgress = (game: GameMode, round: number) => {
    try {
      localStorage.setItem(`kc_arcade_round_${childId}_${game}`, round.toString());
    } catch {}
  };

  const clearRoundProgress = (game: GameMode) => {
    try {
      localStorage.removeItem(`kc_arcade_round_${childId}_${game}`);
    } catch {}
  };

  // Helper to trigger result modal on game completion
  const handleGameFinished = (gameScore: number, correctAnswers: number, totalQ: number = 5) => {
    sfx.playStarFanfare();
    const stars = correctAnswers >= 5 ? 3 : correctAnswers >= 3 ? 2 : 1;
    setResultStats({
      score: gameScore,
      maxScore: totalQ * 10,
      stars,
      correct: correctAnswers,
      total: totalQ
    });
    setScore(prev => prev + gameScore);
    setShowResultModal(true);
    if (activeGame !== 'menu') {
      clearRoundProgress(activeGame);
    }
  };

  // =========================================================================
  // 1. NHÓM MẦM: NGHE VÀ CHỌN HÌNH (LISTEN & CHOOSE)
  // Progressive difficulty: round 0-1 (2 choices), round 2-3 (3 choices), round 4 (4 choices)
  // =========================================================================
  const [listenTarget, setListenTarget] = useState<WordMasteryDetail | null>(null);
  const [listenOptions, setListenOptions] = useState<WordMasteryDetail[]>([]);
  const [listenPickedId, setListenPickedId] = useState<string | null>(null);
  const [listenFeedback, setListenFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [listenCorrectCount, setListenCorrectCount] = useState(0);

  const setupListenRound = (roundIdx: number) => {
    const pool = activeVocab.length >= 2 ? activeVocab : learnedVocab;
    if (pool.length < 2) return;

    // Progressive options count: 2 -> 3 -> 4
    const choicesCount = roundIdx <= 1 ? 2 : roundIdx <= 3 ? 3 : 4;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const target = shuffled[0];

    const choices = shuffled.slice(0, Math.min(choicesCount, shuffled.length));
    const targetKey = target._id || target.vocabId;
    if (!choices.find(c => (c._id || c.vocabId) === targetKey)) {
      choices[0] = target;
    }
    choices.sort(() => Math.random() - 0.5);

    setListenTarget(target);
    setListenOptions(choices);
    setListenPickedId(null);
    setListenFeedback('idle');

    setTimeout(() => {
      playWordAudio(target.english, target.audioUrl);
    }, 400);
  };

  const handlePickListenOption = (opt: WordMasteryDetail) => {
    if (!listenTarget || listenFeedback === 'correct') return;
    const optKey = opt._id || opt.vocabId;
    const tgtKey = listenTarget._id || listenTarget.vocabId;
    setListenPickedId(optKey);

    const correct = optKey === tgtKey;
    vocabMasteryService.recordGameResult(childId, tgtKey, correct);

    if (correct) {
      sfx.playCorrect();
      setListenFeedback('correct');
      setListenCorrectCount(c => c + 1);

      setTimeout(() => {
        const nextRound = currentRound + 1;
        if (nextRound >= TOTAL_ROUNDS) {
          handleGameFinished((listenCorrectCount + 1) * 10, listenCorrectCount + 1, TOTAL_ROUNDS);
        } else {
          setCurrentRound(nextRound);
          saveRoundProgress('listen-choose', nextRound);
          setupListenRound(nextRound);
        }
      }, 1200);
    } else {
      // Gentle wrong feedback & ALLOW RETRY
      sfx.playGentleWrong();
      setListenFeedback('wrong');
      setTimeout(() => {
        setListenFeedback('idle');
        setListenPickedId(null);
        // Gentle repeat audio
        if (listenTarget) playWordAudio(listenTarget.english, listenTarget.audioUrl);
      }, 1000);
    }
  };

  // =========================================================================
  // 2. NHÓM MẦM: NHẬN BIẾT MÀU SẮC (COLOR RECOGNITION)
  // Progressive difficulty: round 0-1 (2 colors), round 2-3 (3 colors), round 4 (4 confusable colors)
  // =========================================================================
  const [colorTarget, setColorTarget] = useState<typeof COLOR_PRESETS[0] | null>(null);
  const [colorOptions, setColorOptions] = useState<typeof COLOR_PRESETS>([]);
  const [colorPickedName, setColorPickedName] = useState<string | null>(null);
  const [colorFeedback, setColorFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [colorCorrectCount, setColorCorrectCount] = useState(0);

  const setupColorRound = (roundIdx: number) => {
    let pool = [...COLOR_PRESETS];
    let numChoices = 2;

    if (roundIdx <= 1) {
      // 2 basic contrasting colors (Red, Blue, Green, Yellow)
      pool = COLOR_PRESETS.slice(0, 4).sort(() => Math.random() - 0.5);
      numChoices = 2;
    } else if (roundIdx <= 3) {
      // 3 colors
      pool = [...COLOR_PRESETS].sort(() => Math.random() - 0.5);
      numChoices = 3;
    } else {
      // 4 colors with confusable shades (Red, Orange, Pink, Yellow or Blue, Purple, Green)
      numChoices = 4;
      pool = [...COLOR_PRESETS].sort(() => Math.random() - 0.5);
    }

    const target = pool[0];
    const choices = pool.slice(0, numChoices).sort(() => Math.random() - 0.5);

    setColorTarget(target);
    setColorOptions(choices);
    setColorPickedName(null);
    setColorFeedback('idle');

    setTimeout(() => {
      playWordAudio(target.name);
    }, 400);
  };

  const handlePickColorOption = (opt: typeof COLOR_PRESETS[0]) => {
    if (!colorTarget || colorFeedback === 'correct') return;
    setColorPickedName(opt.name);

    const correct = opt.name.toLowerCase() === colorTarget.name.toLowerCase();
    if (correct) {
      sfx.playCorrect();
      setColorFeedback('correct');
      setColorCorrectCount(c => c + 1);

      setTimeout(() => {
        const nextRound = currentRound + 1;
        if (nextRound >= TOTAL_ROUNDS) {
          handleGameFinished((colorCorrectCount + 1) * 10, colorCorrectCount + 1, TOTAL_ROUNDS);
        } else {
          setCurrentRound(nextRound);
          saveRoundProgress('color-recognition', nextRound);
          setupColorRound(nextRound);
        }
      }, 1200);
    } else {
      // Gentle wrong feedback & ALLOW RETRY
      sfx.playGentleWrong();
      setColorFeedback('wrong');
      setTimeout(() => {
        setColorFeedback('idle');
        setColorPickedName(null);
        if (colorTarget) playWordAudio(colorTarget.name);
      }, 1000);
    }
  };

  // =========================================================================
  // 3. NHÓM CHỒI/LÁ: NỐI TỪ VỚI HÌNH (IMAGE WORD MATCH)
  // Progressive difficulty: 2 pairs -> 3 pairs + 1 distractor -> 4 pairs + 2 distractors
  // =========================================================================
  const [matchPairs, setMatchPairs] = useState<{ id: string; english: string; imageUrl?: string }[]>([]);
  const [matchDistractors, setMatchDistractors] = useState<{ id: string; imageUrl?: string; english: string }[]>([]);
  const [selectedMatchWord, setSelectedMatchWord] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [matchFeedback, setMatchFeedback] = useState<'idle' | 'wrong'>('idle');
  const [matchCorrectRounds, setMatchCorrectRounds] = useState(0);

  const setupMatchRound = (roundIdx: number) => {
    const pool = activeVocab.length >= 4 ? activeVocab : learnedVocab;
    if (pool.length < 2) return;

    const numPairs = roundIdx <= 1 ? 2 : roundIdx <= 3 ? 3 : 4;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);

    const pairs = shuffled.slice(0, Math.min(numPairs, shuffled.length)).map(v => ({
      id: v._id || v.vocabId,
      english: v.english,
      imageUrl: v.imageUrl
    }));

    // Distractors (extra images without word match)
    const extraPool = shuffled.slice(numPairs);
    const distractorCount = roundIdx >= 4 ? 2 : roundIdx >= 2 ? 1 : 0;
    const distractors = extraPool.slice(0, distractorCount).map(v => ({
      id: `dist_${v._id || v.vocabId}`,
      english: v.english,
      imageUrl: v.imageUrl
    }));

    setMatchPairs(pairs);
    setMatchDistractors(distractors);
    setSelectedMatchWord(null);
    setMatchedIds([]);
    setMatchFeedback('idle');
  };

  const handleMatchSelectWord = (wordId: string) => {
    if (matchedIds.includes(wordId)) return;
    sfx.playPop();
    const pair = matchPairs.find(p => p.id === wordId);
    if (pair) playWordAudio(pair.english);
    setSelectedMatchWord(wordId);
  };

  const handleMatchSelectImage = (imgId: string) => {
    if (!selectedMatchWord || matchedIds.includes(imgId)) return;

    const isMatch = selectedMatchWord === imgId;
    if (isMatch) {
      sfx.playCorrect();
      const nextMatched = [...matchedIds, imgId];
      setMatchedIds(nextMatched);
      setSelectedMatchWord(null);

      // Check if all pairs in round are matched
      if (nextMatched.length === matchPairs.length) {
        setMatchCorrectRounds(c => c + 1);
        setTimeout(() => {
          const nextRound = currentRound + 1;
          if (nextRound >= TOTAL_ROUNDS) {
            handleGameFinished((matchCorrectRounds + 1) * 10, matchCorrectRounds + 1, TOTAL_ROUNDS);
          } else {
            setCurrentRound(nextRound);
            saveRoundProgress('image-word-match', nextRound);
            setupMatchRound(nextRound);
          }
        }, 1200);
      }
    } else {
      sfx.playGentleWrong();
      setMatchFeedback('wrong');
      setTimeout(() => {
        setMatchFeedback('idle');
        setSelectedMatchWord(null);
      }, 900);
    }
  };

  // =========================================================================
  // 4. NHÓM CHỒI/LÁ: ĐẾM SỐ LƯỢNG (COUNT OBJECTS)
  // Progressive difficulty: 1-4 objects -> 4-7 objects -> 6-10 objects with 3-4 options
  // =========================================================================
  const [countQuantity, setCountQuantity] = useState(3);
  const [countEmoji, setCountEmoji] = useState('🍎');
  const [countObjectName, setCountObjectName] = useState('apples');
  const [tappedIndices, setTappedIndices] = useState<number[]>([]);
  const [countOptions, setCountOptions] = useState<number[]>([]);
  const [countPickedNum, setCountPickedNum] = useState<number | null>(null);
  const [countFeedback, setCountFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [countCorrectRounds, setCountCorrectRounds] = useState(0);

  const setupCountRound = (roundIdx: number) => {
    let targetNum = 3;
    if (roundIdx <= 1) {
      targetNum = Math.floor(Math.random() * 3) + 2; // 2 - 4
    } else if (roundIdx <= 3) {
      targetNum = Math.floor(Math.random() * 4) + 4; // 4 - 7
    } else {
      targetNum = Math.floor(Math.random() * 4) + 6; // 6 - 9 (up to 10)
    }

    const emoji = COUNT_EMOJIS[Math.floor(Math.random() * COUNT_EMOJIS.length)];
    const emojiNames: Record<string, string> = {
      '🍎': 'apples', '⭐': 'stars', '🎈': 'balloons', '🚗': 'cars',
      '🐱': 'cats', '🐶': 'puppies', '🧸': 'teddies', '🍓': 'strawberries',
      '🥕': 'carrots', '🌸': 'flowers'
    };
    const objName = emojiNames[emoji] || 'items';

    // Generate 3-4 distinct numeric options
    const optionCount = roundIdx <= 1 ? 3 : 4;
    const optionsSet = new Set<number>([targetNum]);
    while (optionsSet.size < optionCount) {
      const delta = Math.floor(Math.random() * 5) - 2;
      const fake = targetNum + delta;
      if (fake >= 1 && fake <= 10 && fake !== targetNum) {
        optionsSet.add(fake);
      }
    }
    const options = Array.from(optionsSet).sort(() => Math.random() - 0.5);

    setCountQuantity(targetNum);
    setCountEmoji(emoji);
    setCountObjectName(objName);
    setTappedIndices([]);
    setCountOptions(options);
    setCountPickedNum(null);
    setCountFeedback('idle');

    setTimeout(() => {
      playWordAudio(`Can you count the ${objName}?`);
    }, 400);
  };

  const handleTapCountItem = (idx: number) => {
    sfx.playPop();
    if (!tappedIndices.includes(idx)) {
      setTappedIndices([...tappedIndices, idx]);
    }
  };

  const handlePickCountNumber = (num: number) => {
    if (countFeedback === 'correct') return;
    setCountPickedNum(num);

    const correct = num === countQuantity;
    if (correct) {
      sfx.playCorrect();
      setCountFeedback('correct');
      setCountCorrectRounds(c => c + 1);

      setTimeout(() => {
        const nextRound = currentRound + 1;
        if (nextRound >= TOTAL_ROUNDS) {
          handleGameFinished((countCorrectRounds + 1) * 10, countCorrectRounds + 1, TOTAL_ROUNDS);
        } else {
          setCurrentRound(nextRound);
          saveRoundProgress('count-objects', nextRound);
          setupCountRound(nextRound);
        }
      }, 1200);
    } else {
      sfx.playGentleWrong();
      setCountFeedback('wrong');
      setTimeout(() => {
        setCountFeedback('idle');
        setCountPickedNum(null);
      }, 1000);
    }
  };

  // =========================================================================
  // 5. NHÓM CHỒI/LÁ: TÌM ĐỒ VẬT BỊ THIẾU (MISSING OBJECT)
  // Progressive difficulty: 3 items (5s timer) -> 4 items (4s timer) -> 5 items (3s timer)
  // =========================================================================
  const [missingStage, setMissingStage] = useState<'MEMORIZING' | 'GUESSING'>('MEMORIZING');
  const [missingAllItems, setMissingAllItems] = useState<WordMasteryDetail[]>([]);
  const [missingHiddenItem, setMissingHiddenItem] = useState<WordMasteryDetail | null>(null);
  const [missingVisibleItems, setMissingVisibleItems] = useState<WordMasteryDetail[]>([]);
  const [missingChoices, setMissingChoices] = useState<WordMasteryDetail[]>([]);
  const [missingPickedId, setMissingPickedId] = useState<string | null>(null);
  const [missingFeedback, setMissingFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [missingTimerSeconds, setMissingTimerSeconds] = useState(5);
  const [missingCorrectRounds, setMissingCorrectRounds] = useState(0);
  const timerRef = useRef<any>(null);

  const setupMissingRound = (roundIdx: number) => {
    const pool = activeVocab.length >= 5 ? activeVocab : learnedVocab;
    if (pool.length < 3) return;

    // Progressive items count: 3 -> 4 -> 5 items
    const itemCount = roundIdx <= 1 ? 3 : roundIdx <= 3 ? 4 : 5;
    // Progressive observation time: 5s -> 4s -> 3s
    const observeTime = roundIdx <= 1 ? 5 : roundIdx <= 3 ? 4 : 3;

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selectedGroup = shuffled.slice(0, Math.min(itemCount, shuffled.length));

    // Choose 1 item to vanish
    const vanishIndex = Math.floor(Math.random() * selectedGroup.length);
    const hidden = selectedGroup[vanishIndex];
    const visible = selectedGroup.filter((_, idx) => idx !== vanishIndex);

    // Options to guess from: hidden + 2-3 distractors from remaining pool
    const distractorPool = shuffled.filter(item => !selectedGroup.some(g => (g._id || g.vocabId) === (item._id || item.vocabId)));
    const optionCount = roundIdx <= 1 ? 3 : 4;
    const choices = [hidden, ...distractorPool.slice(0, optionCount - 1)].sort(() => Math.random() - 0.5);

    setMissingAllItems(selectedGroup);
    setMissingHiddenItem(hidden);
    setMissingVisibleItems(visible);
    setMissingChoices(choices);
    setMissingPickedId(null);
    setMissingFeedback('idle');
    setMissingStage('MEMORIZING');
    setMissingTimerSeconds(observeTime);

    // Start memorization countdown
    if (timerRef.current) clearInterval(timerRef.current);
    let timeLeft = observeTime;
    timerRef.current = setInterval(() => {
      timeLeft -= 1;
      setMissingTimerSeconds(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(timerRef.current);
        sfx.playPop();
        setMissingStage('GUESSING');
      }
    }, 1000);
  };

  const handleSkipMissingTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    sfx.playPop();
    setMissingStage('GUESSING');
  };

  const handlePickMissingChoice = (choice: WordMasteryDetail) => {
    if (!missingHiddenItem || missingFeedback === 'correct') return;
    const choiceKey = choice._id || choice.vocabId;
    const hiddenKey = missingHiddenItem._id || missingHiddenItem.vocabId;
    setMissingPickedId(choiceKey);

    const correct = choiceKey === hiddenKey;
    if (correct) {
      sfx.playCorrect();
      setMissingFeedback('correct');
      setMissingCorrectRounds(c => c + 1);

      setTimeout(() => {
        const nextRound = currentRound + 1;
        if (nextRound >= TOTAL_ROUNDS) {
          handleGameFinished((missingCorrectRounds + 1) * 10, missingCorrectRounds + 1, TOTAL_ROUNDS);
        } else {
          setCurrentRound(nextRound);
          saveRoundProgress('missing-object', nextRound);
          setupMissingRound(nextRound);
        }
      }, 1300);
    } else {
      sfx.playGentleWrong();
      setMissingFeedback('wrong');
      setTimeout(() => {
        setMissingFeedback('idle');
        setMissingPickedId(null);
      }, 1000);
    }
  };

  // =========================================================================
  // 6. NHÓM CHỒI/LÁ: LẬT THẺ GHI NHỚ (MEMORY MATCH)
  // Progressive difficulty: 3 pairs for 4-5 years, 4 pairs for 5-6 years
  // =========================================================================
  type MemoryCard = {
    id: string;
    vocabId: string;
    type: 'image' | 'word';
    content: string;
    imageUrl?: string;
    isFlipped: boolean;
    isMatched: boolean;
  };
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);
  const [memoryFlippedIds, setMemoryFlippedIds] = useState<string[]>([]);

  const setupMemoryGame = () => {
    const pool = activeVocab.length >= 3 ? activeVocab : learnedVocab;
    const pairsCount = effectiveAgeCode === '5-6' ? 4 : 3;
    const actualPairs = Math.min(pairsCount, pool.length);
    if (actualPairs < 2) return;

    const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, actualPairs);
    const cards: MemoryCard[] = [];

    picked.forEach(v => {
      const vId = v._id || v.vocabId;
      // Image Card
      cards.push({
        id: `${vId}-img`,
        vocabId: vId,
        type: 'image',
        content: v.english,
        imageUrl: v.imageUrl,
        isFlipped: false,
        isMatched: false
      });
      // Word Card
      cards.push({
        id: `${vId}-word`,
        vocabId: vId,
        type: 'word',
        content: v.english,
        isFlipped: false,
        isMatched: false
      });
    });

    setMemoryCards(cards.sort(() => Math.random() - 0.5));
    setMemoryFlippedIds([]);
  };

  const handleCardClick = (card: MemoryCard) => {
    if (card.isFlipped || card.isMatched || memoryFlippedIds.length >= 2) return;
    sfx.playPop();
    const newFlipped = [...memoryFlippedIds, card.id];
    setMemoryFlippedIds(newFlipped);

    setMemoryCards(prev => prev.map(c => (c.id === card.id ? { ...c, isFlipped: true } : c)));

    if (newFlipped.length === 2) {
      const firstCard = memoryCards.find(c => c.id === newFlipped[0])!;
      const secondCard = card;
      const matched = firstCard.vocabId === secondCard.vocabId;

      vocabMasteryService.recordGameResult(childId, firstCard.vocabId, matched);

      if (matched) {
        sfx.playCorrect();
        setTimeout(() => {
          setMemoryCards(prev => {
            const updated = prev.map(c =>
              c.vocabId === firstCard.vocabId ? { ...c, isMatched: true, isFlipped: true } : c
            );
            if (updated.every(c => c.isMatched)) {
              handleGameFinished(50, 5, 5);
            }
            return updated;
          });
          setMemoryFlippedIds([]);
        }, 600);
      } else {
        // Flip back down after 800ms
        sfx.playGentleWrong();
        setTimeout(() => {
          setMemoryCards(prev =>
            prev.map(c => (newFlipped.includes(c.id) ? { ...c, isFlipped: false } : c))
          );
          setMemoryFlippedIds([]);
        }, 800);
      }
    }
  };

  // Launch specific game mode
  const startGame = (game: GameMode) => {
    sfx.playPop();
    setActiveGame(game);
    const saved = getSavedRound(game);
    const startRound = saved < TOTAL_ROUNDS ? saved : 0;
    setCurrentRound(startRound);

    if (game === 'listen-choose') {
      setListenCorrectCount(startRound);
      setupListenRound(startRound);
    } else if (game === 'color-recognition') {
      setColorCorrectCount(startRound);
      setupColorRound(startRound);
    } else if (game === 'image-word-match') {
      setMatchCorrectRounds(startRound);
      setupMatchRound(startRound);
    } else if (game === 'count-objects') {
      setCountCorrectRounds(startRound);
      setupCountRound(startRound);
    } else if (game === 'missing-object') {
      setMissingCorrectRounds(startRound);
      setupMissingRound(startRound);
    } else if (game === 'memory-card') {
      setupMemoryGame();
    }
  };

  // If child has not studied enough words in Journey or Topics yet
  if (learnedVocab.length < 2) {
    return (
      <div className="w-full animate-fade-in">
        <div className="bg-white/95 rounded-3xl border-3 border-amber-300 p-8 sm:p-10 text-center shadow-lg max-w-xl mx-auto">
          <div className="w-20 h-20 rounded-3xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-4xl mx-auto mb-4 shadow-sm animate-soft-bounce">
            🔒
          </div>
          <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 text-xs font-black px-3 py-1 rounded-full mb-3">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            Khu trò chơi tương tác đang khóa
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-800 mb-2">
            Chưa mở khóa khu trò chơi!
          </h3>
          <p className="text-slate-500 font-bold text-sm sm:text-base leading-relaxed mb-6">
            Bé hãy vào phần <strong>Hành trình</strong> để hoàn thành bài học và lật mở các thẻ từ vựng trước nhé. Khi bé đã học từ mới, các mini-game tương tác tương ứng sẽ tự động mở khóa!
          </p>
          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              if (onNavigateTab) onNavigateTab('path');
            }}
            className="btn-3d-amber py-3.5 px-8 rounded-2xl font-black text-base text-amber-950 inline-flex items-center gap-2 cursor-pointer shadow-md"
          >
            <span>Bắt đầu bài học ngay 🚀</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Top Source Switcher (Tất cả từ đã học / Từ đã nhớ / Từ cần ôn) */}
      <div className="bg-white rounded-3xl border-3 border-amber-200/90 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎮</span>
            <div>
              <h2 className="font-black text-lg sm:text-xl text-slate-800">
                Khu trò chơi tương tác theo độ tuổi
              </h2>
              <p className="text-xs font-bold text-slate-400">
                Hệ thống chỉ mở các trò chơi tương ứng theo nhóm tuổi và nội dung bài học bé đã tiếp thu
              </p>
            </div>
          </div>

          <span className="text-xs font-black px-3 py-1 rounded-full border shadow-xs bg-amber-100 text-amber-900 border-amber-300">
            {isMamAge ? '🐣 Nhóm Mầm (3–4 tuổi)' : effectiveAgeCode === '5-6' ? '🐯 Nhóm Lá (5–6 tuổi)' : '🌿 Nhóm Chồi (4–5 tuổi)'}
          </span>
        </div>

        {/* Vocab Source Filter Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              setVocabSource('learned');
            }}
            className={`py-2 px-3 rounded-2xl font-black text-xs border-2 transition-all cursor-pointer ${
              vocabSource === 'learned'
                ? 'bg-sky-100 border-sky-400 text-sky-950 shadow-xs ring-2 ring-sky-300'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            📚 Tất cả từ đã học ({learnedVocab.length})
          </button>
          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              setVocabSource('mastered');
            }}
            className={`py-2 px-3 rounded-2xl font-black text-xs border-2 transition-all cursor-pointer ${
              vocabSource === 'mastered'
                ? 'bg-emerald-100 border-emerald-400 text-emerald-950 shadow-xs ring-2 ring-emerald-300'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            💚 Từ bé đã nhớ ({masteredVocab.length})
          </button>
          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              setVocabSource('review');
            }}
            className={`py-2 px-3 rounded-2xl font-black text-xs border-2 transition-all cursor-pointer ${
              vocabSource === 'review'
                ? 'bg-amber-100 border-amber-400 text-amber-950 shadow-xs ring-2 ring-amber-300'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            💡 Từ cần ôn lại ({reviewVocab.length})
          </button>
        </div>

        {isFallbackNotice && (
          <div className="mt-2.5 bg-amber-50 border border-amber-300 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-800">
            {isFallbackNotice}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* ARCADE MENU: DISPLAY STRICTLY BY AGE GROUP */}
      {/* ===================================================================== */}
      {activeGame === 'menu' && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase text-sky-600 tracking-wider">
                {isMamAge ? 'Dành riêng cho lứa tuổi Mầm (3–4 tuổi)' : 'Dành riêng cho lứa tuổi Chồi & Lá (4–6 tuổi)'}
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-800">
                {isMamAge ? '2 Trò chơi vận động tư duy mầm non 🎈' : '4 Trò chơi thử thách phản xạ & trí nhớ 🚀'}
              </h3>
            </div>
            <div className="bg-amber-100 border-2 border-amber-300 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xs">
              <Star className="w-5 h-5 text-amber-600 fill-amber-500" />
              <span className="text-base font-black text-amber-900">{score} sao</span>
            </div>
          </div>

          {/* NHÓM MẦM: 2 TRÒ CHƠI */}
          {isMamAge ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Game 1: Nghe và chọn hình */}
              <div
                onClick={() => startGame('listen-choose')}
                className="card-kid bg-white rounded-3xl border-3 border-sky-300 p-6 shadow-md hover:shadow-xl cursor-pointer flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  <div className="w-16 h-16 rounded-2xl bg-sky-100 flex items-center justify-center text-4xl mb-3 group-hover:scale-110 transition-transform">
                    🎧
                  </div>
                  <span className="inline-block bg-sky-50 text-sky-700 text-[11px] font-black px-3 py-0.5 rounded-full mb-2 border border-sky-200">
                    Nghe phát âm & Chọn hình đúng
                  </span>
                  <h4 className="text-2xl font-black text-slate-800 mb-2">
                    Nghe và chọn hình
                  </h4>
                  <p className="text-slate-500 font-bold text-xs sm:text-sm leading-relaxed">
                    Trẻ nghe từ hoặc cụm từ tiếng Anh và chọn hình ảnh đúng. Đúng được cộng điểm và khen ngợi, sai được phản hồi nhẹ nhàng và cho phép thử lại. Độ khó tăng từ 2 lên 3 rồi 4 hình.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-400">Độ khó: 2 ➔ 4 hình</span>
                  <span className="btn-3d-sky text-white text-xs font-black px-4 py-2 rounded-xl">
                    {getSavedRound('listen-choose') > 0 ? `Chơi tiếp vòng ${getSavedRound('listen-choose') + 1} 🚀` : 'Chơi ngay 🚀'}
                  </span>
                </div>
              </div>

              {/* Game 2: Nhận biết màu sắc */}
              <div
                onClick={() => startGame('color-recognition')}
                className="card-kid bg-white rounded-3xl border-3 border-amber-300 p-6 shadow-md hover:shadow-xl cursor-pointer flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-4xl mb-3 group-hover:scale-110 transition-transform">
                    🎨
                  </div>
                  <span className="inline-block bg-amber-50 text-amber-800 text-[11px] font-black px-3 py-0.5 rounded-full mb-2 border border-amber-200">
                    Thế giới sắc màu rực rỡ
                  </span>
                  <h4 className="text-2xl font-black text-slate-800 mb-2">
                    Nhận biết màu sắc
                  </h4>
                  <p className="text-slate-500 font-bold text-xs sm:text-sm leading-relaxed">
                    Trẻ nghe tên màu tiếng Anh và chọn đồ vật có màu tương ứng. Đúng được cộng điểm, sai cho phép chọn lại. Độ khó tăng dần với các màu dễ gây nhầm lẫn hơn.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-400">Độ khó: Tăng màu gây nhiễu</span>
                  <span className="btn-3d-amber text-amber-950 text-xs font-black px-4 py-2 rounded-xl">
                    {getSavedRound('color-recognition') > 0 ? `Chơi tiếp vòng ${getSavedRound('color-recognition') + 1} 🚀` : 'Chơi ngay 🚀'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* NHÓM CHỒI/LÁ: 4 TRÒ CHƠI */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Game 1: Nối từ với hình */}
              <div
                onClick={() => startGame('image-word-match')}
                className="card-kid bg-white rounded-3xl border-3 border-emerald-300 p-6 shadow-md hover:shadow-xl cursor-pointer flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-4xl mb-3 group-hover:scale-110 transition-transform">
                    🔗
                  </div>
                  <span className="inline-block bg-emerald-50 text-emerald-800 text-[11px] font-black px-3 py-0.5 rounded-full mb-2 border border-emerald-200">
                    Ghép đôi từ vựng & hình ảnh
                  </span>
                  <h4 className="text-2xl font-black text-slate-800 mb-2">
                    Nối từ với hình
                  </h4>
                  <p className="text-slate-500 font-bold text-xs sm:text-sm leading-relaxed">
                    Trẻ ghép từ/cụm từ tiếng Anh với hình tương ứng. Ghép đúng được ghi nhận cộng điểm; ghép sai cho phép làm lại. Độ khó tăng bằng cách tăng số cặp và hình ảnh gây nhiễu.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-400">Độ khó: 2 ➔ 4 cặp + nhiễu</span>
                  <span className="btn-3d-emerald text-white text-xs font-black px-4 py-2 rounded-xl">
                    {getSavedRound('image-word-match') > 0 ? `Chơi tiếp vòng ${getSavedRound('image-word-match') + 1} 🚀` : 'Chơi ngay 🚀'}
                  </span>
                </div>
              </div>

              {/* Game 2: Đếm số lượng */}
              <div
                onClick={() => startGame('count-objects')}
                className="card-kid bg-white rounded-3xl border-3 border-sky-300 p-6 shadow-md hover:shadow-xl cursor-pointer flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  <div className="w-16 h-16 rounded-2xl bg-sky-100 flex items-center justify-center text-4xl mb-3 group-hover:scale-110 transition-transform">
                    🔢
                  </div>
                  <span className="inline-block bg-sky-50 text-sky-800 text-[11px] font-black px-3 py-0.5 rounded-full mb-2 border border-sky-200">
                    Đếm đồ vật & Nhận diện số
                  </span>
                  <h4 className="text-2xl font-black text-slate-800 mb-2">
                    Đếm số lượng
                  </h4>
                  <p className="text-slate-500 font-bold text-xs sm:text-sm leading-relaxed">
                    Trẻ nghe yêu cầu, chạm vào từng đối tượng để đếm và chọn số phù hợp. Đúng được cộng điểm và phát âm thanh khích lệ; sai cho phép thử lại. Độ khó tăng từ 1 lên 10 đối tượng.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-400">Độ khó: 1–10 đối tượng</span>
                  <span className="btn-3d-sky text-white text-xs font-black px-4 py-2 rounded-xl">
                    {getSavedRound('count-objects') > 0 ? `Chơi tiếp vòng ${getSavedRound('count-objects') + 1} 🚀` : 'Chơi ngay 🚀'}
                  </span>
                </div>
              </div>

              {/* Game 3: Tìm đồ vật bị thiếu */}
              <div
                onClick={() => startGame('missing-object')}
                className="card-kid bg-white rounded-3xl border-3 border-purple-300 p-6 shadow-md hover:shadow-xl cursor-pointer flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center text-4xl mb-3 group-hover:scale-110 transition-transform">
                    🔍
                  </div>
                  <span className="inline-block bg-purple-50 text-purple-800 text-[11px] font-black px-3 py-0.5 rounded-full mb-2 border border-purple-200">
                    Quan sát & Trí nhớ siêu phàm
                  </span>
                  <h4 className="text-2xl font-black text-slate-800 mb-2">
                    Tìm đồ vật bị thiếu
                  </h4>
                  <p className="text-slate-500 font-bold text-xs sm:text-sm leading-relaxed">
                    Trẻ quan sát nhóm đồ vật, ghi nhớ và xác định đồ vật biến mất sau chiếc hộp bí ẩn. Độ khó tăng bằng cách tăng số đồ vật (3–5), giảm thời gian quan sát (5s–3s) và tăng phương án gây nhiễu.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-400">Độ khó: 3–5 vật, 5s–3s</span>
                  <span className="btn-3d-purple text-white text-xs font-black px-4 py-2 rounded-xl">
                    {getSavedRound('missing-object') > 0 ? `Chơi tiếp vòng ${getSavedRound('missing-object') + 1} 🚀` : 'Chơi ngay 🚀'}
                  </span>
                </div>
              </div>

              {/* Game 4: Lật thẻ ghi nhớ */}
              <div
                onClick={() => startGame('memory-card')}
                className="card-kid bg-white rounded-3xl border-3 border-amber-300 p-6 shadow-md hover:shadow-xl cursor-pointer flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-4xl mb-3 group-hover:scale-110 transition-transform">
                    🧠
                  </div>
                  <span className="inline-block bg-amber-50 text-amber-800 text-[11px] font-black px-3 py-0.5 rounded-full mb-2 border border-amber-200">
                    Trí nhớ không gian & Ghép cặp
                  </span>
                  <h4 className="text-2xl font-black text-slate-800 mb-2">
                    Lật thẻ ghi nhớ
                  </h4>
                  <p className="text-slate-500 font-bold text-xs sm:text-sm leading-relaxed">
                    Trẻ lật thẻ để tìm hai thẻ có nội dung tương ứng. Ghép đúng được giữ mở và cộng điểm; ghép sai úp lại sau 800ms. Độ khó tăng theo số cặp thẻ (3–4 cặp) và giảm thời gian ghi nhớ.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-400">Độ khó: 3–4 cặp thẻ</span>
                  <span className="btn-3d-amber text-amber-950 text-xs font-black px-4 py-2 rounded-xl">
                    Chơi ngay 🚀
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 1. PLAY SCREEN: NGHE VÀ CHỌN HÌNH (LISTEN & CHOOSE) */}
      {/* ===================================================================== */}
      {activeGame === 'listen-choose' && (
        <div className="bg-white rounded-3xl border-3 border-sky-300 p-6 sm:p-8 shadow-lg animate-fade-in">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <button
              onClick={() => {
                sfx.playPop();
                setActiveGame('menu');
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-black cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Trở lại danh sách trò chơi
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-sky-800 bg-sky-100 px-3 py-1 rounded-full border border-sky-200">
                Vòng {currentRound + 1} / {TOTAL_ROUNDS} ({listenOptions.length} lựa chọn)
              </span>
              <div className="flex items-center gap-1.5 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                <Star className="w-4 h-4 text-amber-600 fill-amber-500" />
                <span className="text-xs font-black text-amber-900">{listenCorrectCount * 10} điểm</span>
              </div>
            </div>
          </div>

          {listenTarget && (
            <div className="flex flex-col items-center mb-8 text-center">
              <span className="bg-sky-100 text-sky-900 text-xs sm:text-sm font-black px-4 py-1.5 rounded-full mb-3 border border-sky-200 flex items-center gap-1.5 animate-pulse">
                <Sparkles className="w-4 h-4 text-sky-600" />
                Chạm loa nghe từ tiếng Anh và chọn hình ảnh đúng nhé!
              </span>

              <button
                onClick={() => playWordAudio(listenTarget.english, listenTarget.audioUrl)}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-500 text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer ring-6 ring-sky-200"
              >
                <Volume2 className="w-12 h-12 sm:w-14 sm:h-14" />
              </button>

              <p className="mt-3 text-2xl sm:text-3xl font-black text-slate-800 font-display capitalize">
                "{listenTarget.english}"
              </p>
            </div>
          )}

          {/* Options Grid: 2 -> 3 -> 4 choices */}
          <div className={`grid ${listenOptions.length <= 2 ? 'grid-cols-2 max-w-md' : listenOptions.length === 3 ? 'grid-cols-1 sm:grid-cols-3 max-w-2xl' : 'grid-cols-2 sm:grid-cols-4 max-w-3xl'} gap-4 mx-auto`}>
            {listenOptions.map(opt => {
              const optKey = opt._id || opt.vocabId;
              const isSelected = listenPickedId === optKey;
              let borderStyle = 'border-slate-200 bg-white hover:border-sky-400 hover:scale-103';

              if (isSelected) {
                if (listenFeedback === 'correct') {
                  borderStyle = 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-300 scale-105 animate-soft-bounce';
                } else if (listenFeedback === 'wrong') {
                  borderStyle = 'border-rose-500 bg-rose-50 ring-4 ring-rose-300 animate-gentle-wobble';
                }
              }

              return (
                <button
                  key={optKey}
                  onClick={() => handlePickListenOption(opt)}
                  disabled={listenFeedback === 'correct'}
                  className={`card-kid rounded-3xl border-3 p-4 flex flex-col items-center justify-center text-center cursor-pointer shadow-sm hover:shadow-md transition-all ${borderStyle}`}
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 mb-2 flex items-center justify-center">
                    {opt.imageUrl ? (
                      <img src={opt.imageUrl} alt={opt.english} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-4xl">🌟</span>
                    )}
                  </div>
                  <span className="text-sm font-black text-slate-700 capitalize">{opt.english}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. PLAY SCREEN: NHẬN BIẾT MÀU SẮC (COLOR RECOGNITION) */}
      {/* ===================================================================== */}
      {activeGame === 'color-recognition' && colorTarget && (
        <div className="bg-white rounded-3xl border-3 border-amber-300 p-6 sm:p-8 shadow-lg animate-fade-in text-center">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <button
              onClick={() => {
                sfx.playPop();
                setActiveGame('menu');
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-black cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Trở lại danh sách trò chơi
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                Vòng {currentRound + 1} / {TOTAL_ROUNDS} ({colorOptions.length} màu)
              </span>
              <div className="flex items-center gap-1.5 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                <Star className="w-4 h-4 text-amber-600 fill-amber-500" />
                <span className="text-xs font-black text-amber-900">{colorCorrectCount * 10} điểm</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center mb-7">
            <span className="bg-amber-100 text-amber-900 text-xs sm:text-sm font-black px-4 py-1.5 rounded-full mb-4 border border-amber-300 flex items-center gap-1.5 animate-pulse">
              <Sparkles className="w-4 h-4 text-amber-600" />
              Bé hãy lắng nghe tên màu và chọn đồ vật có màu tương ứng nhé!
            </span>

            <button
              onClick={() => playWordAudio(colorTarget.name)}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-rose-400 via-amber-400 to-emerald-400 text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer ring-6 ring-amber-200"
            >
              <Volume2 className="w-12 h-12 sm:w-14 sm:h-14" />
            </button>

            <div className="mt-3.5 inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl border-2 bg-white shadow-xs" style={{ borderColor: colorTarget.border }}>
              <span className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: colorTarget.hex }} />
              <span className="text-2xl font-black capitalize text-slate-800">
                {colorTarget.name}
              </span>
              <span className="text-xs font-bold text-slate-400">({colorTarget.nameVi})</span>
            </div>
          </div>

          {/* Color Options Grid */}
          <div className={`grid ${colorOptions.length <= 2 ? 'grid-cols-2 max-w-md' : colorOptions.length === 3 ? 'grid-cols-1 sm:grid-cols-3 max-w-2xl' : 'grid-cols-2 sm:grid-cols-4 max-w-3xl'} gap-4 mx-auto`}>
            {colorOptions.map(opt => {
              const isSelected = colorPickedName === opt.name;
              let borderStyle = 'border-slate-200 bg-white hover:border-amber-400 hover:scale-103';

              if (isSelected) {
                if (colorFeedback === 'correct') {
                  borderStyle = 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-300 scale-105 animate-soft-bounce';
                } else if (colorFeedback === 'wrong') {
                  borderStyle = 'border-rose-500 bg-rose-50 ring-4 ring-rose-300 animate-gentle-wobble';
                }
              }

              return (
                <button
                  key={opt.name}
                  onClick={() => handlePickColorOption(opt)}
                  disabled={colorFeedback === 'correct'}
                  className={`card-kid rounded-3xl border-3 p-5 flex flex-col items-center justify-center text-center cursor-pointer shadow-sm hover:shadow-md transition-all ${borderStyle}`}
                >
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-3 shadow-inner border-2" style={{ backgroundColor: `${opt.hex}22`, borderColor: opt.border }}>
                    {opt.icon}
                  </div>
                  <span className="text-base font-black text-slate-800 capitalize mb-0.5">{opt.label}</span>
                  <span className="text-xs font-bold text-slate-400">({opt.nameVi})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. PLAY SCREEN: NỐI TỪ VỚI HÌNH (IMAGE WORD MATCH) */}
      {/* ===================================================================== */}
      {activeGame === 'image-word-match' && (
        <div className="bg-white rounded-3xl border-3 border-emerald-300 p-6 sm:p-8 shadow-lg animate-fade-in">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <button
              onClick={() => {
                sfx.playPop();
                setActiveGame('menu');
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-black cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Trở lại danh sách trò chơi
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-emerald-900 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                Vòng {currentRound + 1} / {TOTAL_ROUNDS} ({matchPairs.length} cặp từ & {matchDistractors.length} hình nhiễu)
              </span>
              <div className="flex items-center gap-1.5 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                <Star className="w-4 h-4 text-amber-600 fill-amber-500" />
                <span className="text-xs font-black text-amber-900">{matchCorrectRounds * 10} điểm</span>
              </div>
            </div>
          </div>

          <div className="text-center mb-6">
            <span className="bg-emerald-100 text-emerald-900 text-xs sm:text-sm font-black px-4 py-1.5 rounded-full border border-emerald-300 inline-flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Bé chạm chọn thẻ chữ bên trái, rồi chạm vào hình tương ứng bên phải nhé!
            </span>
          </div>

          {/* Matching Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Left Column: English Words */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 text-center mb-1">
                Từ vựng tiếng Anh
              </h4>
              {matchPairs.map(p => {
                const isMatched = matchedIds.includes(p.id);
                const isSelected = selectedMatchWord === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleMatchSelectWord(p.id)}
                    disabled={isMatched}
                    className={`w-full py-3.5 px-4 rounded-2xl font-black text-base border-3 flex items-center justify-between transition-all cursor-pointer ${
                      isMatched
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800 opacity-60'
                        : isSelected
                        ? 'bg-amber-100 border-amber-400 text-amber-950 ring-4 ring-amber-300 scale-103 shadow-md'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 shadow-xs'
                    }`}
                  >
                    <span className="capitalize">{p.english}</span>
                    {isMatched ? <Check className="w-5 h-5 text-emerald-600" /> : <Volume2 className="w-4 h-4 text-slate-400" />}
                  </button>
                );
              })}
            </div>

            {/* Right Column: Images (Including distractors) */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 text-center mb-1">
                Hình ảnh minh họa
              </h4>
              {[...matchPairs, ...matchDistractors].sort(() => 0.5 - Math.sin(parseInt(matchPairs[0]?.id?.slice(-2) || '1'))).map(item => {
                const isMatched = matchedIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleMatchSelectImage(item.id)}
                    disabled={isMatched}
                    className={`w-full p-2.5 rounded-2xl font-black border-3 flex items-center justify-center gap-3 transition-all cursor-pointer ${
                      isMatched
                        ? 'bg-emerald-50 border-emerald-400 opacity-60'
                        : matchFeedback === 'wrong' && selectedMatchWord
                        ? 'bg-rose-50 border-rose-400 animate-gentle-wobble'
                        : 'bg-white border-slate-200 hover:border-emerald-300 shadow-xs hover:scale-102'
                    }`}
                  >
                    <div className="w-14 h-14 flex items-center justify-center">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.english} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-2xl">🐾</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. PLAY SCREEN: ĐẾM SỐ LƯỢNG (COUNT OBJECTS) */}
      {/* ===================================================================== */}
      {activeGame === 'count-objects' && (
        <div className="bg-white rounded-3xl border-3 border-sky-300 p-6 sm:p-8 shadow-lg animate-fade-in text-center">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <button
              onClick={() => {
                sfx.playPop();
                setActiveGame('menu');
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-black cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Trở lại danh sách trò chơi
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-sky-900 bg-sky-100 px-3 py-1 rounded-full border border-sky-300">
                Vòng {currentRound + 1} / {TOTAL_ROUNDS} ({countQuantity} đồ vật)
              </span>
              <div className="flex items-center gap-1.5 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                <Star className="w-4 h-4 text-amber-600 fill-amber-500" />
                <span className="text-xs font-black text-amber-900">{countCorrectRounds * 10} điểm</span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <span className="bg-sky-100 text-sky-900 text-xs sm:text-sm font-black px-4 py-1.5 rounded-full border border-sky-300 inline-flex items-center gap-1.5 mb-2">
              <Sparkles className="w-4 h-4 text-sky-600" />
              Chạm vào từng đồ vật để đếm 1, 2, 3... rồi chọn đáp án đúng nhé!
            </span>
            <h4 className="text-xl sm:text-2xl font-black text-slate-800">
              How many {countObjectName} are there?
            </h4>
          </div>

          {/* Interactive Objects to Tap & Count */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 min-h-[140px] max-w-xl mx-auto p-4 bg-sky-50/70 rounded-3xl border-2 border-dashed border-sky-300 mb-6">
            {[...Array(countQuantity)].map((_, idx) => {
              const isTapped = tappedIndices.includes(idx);
              const tapIndex = tappedIndices.indexOf(idx) + 1;
              return (
                <button
                  key={idx}
                  onClick={() => handleTapCountItem(idx)}
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-4xl sm:text-5xl transition-all cursor-pointer relative ${
                    isTapped
                      ? 'bg-amber-100 border-3 border-amber-400 scale-110 shadow-md ring-4 ring-amber-300 animate-pop-in'
                      : 'bg-white border-2 border-slate-200 hover:border-sky-400 hover:scale-105'
                  }`}
                >
                  <span>{countEmoji}</span>
                  {isTapped && (
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 text-white font-black text-xs flex items-center justify-center shadow-md animate-bounce">
                      {tapIndex}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Number Options Bubbles */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
            {countOptions.map(num => {
              const isSelected = countPickedNum === num;
              let btnStyle = 'border-slate-200 bg-white hover:border-sky-400 hover:scale-105';

              if (isSelected) {
                if (countFeedback === 'correct') {
                  btnStyle = 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-300 scale-110 animate-soft-bounce';
                } else if (countFeedback === 'wrong') {
                  btnStyle = 'border-rose-500 bg-rose-50 ring-4 ring-rose-300 animate-gentle-wobble';
                }
              }

              return (
                <button
                  key={num}
                  onClick={() => handlePickCountNumber(num)}
                  disabled={countFeedback === 'correct'}
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full font-black text-2xl sm:text-3xl border-3 flex items-center justify-center shadow-md cursor-pointer transition-all ${btnStyle}`}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. PLAY SCREEN: TÌM ĐỒ VẬT BỊ THIẾU (MISSING OBJECT) */}
      {/* ===================================================================== */}
      {activeGame === 'missing-object' && (
        <div className="bg-white rounded-3xl border-3 border-purple-300 p-6 sm:p-8 shadow-lg animate-fade-in text-center">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <button
              onClick={() => {
                sfx.playPop();
                setActiveGame('menu');
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-black cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Trở lại danh sách trò chơi
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-purple-900 bg-purple-100 px-3 py-1 rounded-full border border-purple-300">
                Vòng {currentRound + 1} / {TOTAL_ROUNDS} ({missingAllItems.length} đồ vật)
              </span>
              <div className="flex items-center gap-1.5 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                <Star className="w-4 h-4 text-amber-600 fill-amber-500" />
                <span className="text-xs font-black text-amber-900">{missingCorrectRounds * 10} điểm</span>
              </div>
            </div>
          </div>

          {missingStage === 'MEMORIZING' ? (
            <div className="space-y-6">
              <div>
                <span className="bg-purple-100 text-purple-900 text-xs sm:text-sm font-black px-4 py-1.5 rounded-full border border-purple-300 inline-flex items-center gap-1.5 mb-2">
                  <Clock className="w-4 h-4 text-purple-600 animate-spin" />
                  Ghi nhớ nhanh các đồ vật trước khi 1 món biến mất! ({missingTimerSeconds}s)
                </span>
                <h4 className="text-xl sm:text-2xl font-black text-slate-800">
                  Hãy quan sát thật kỹ nào!
                </h4>
              </div>

              {/* Countdown Progress Bar */}
              <div className="w-full max-w-md mx-auto h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${(missingTimerSeconds / 5) * 100}%` }}
                />
              </div>

              {/* Items Display */}
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 min-h-[140px]">
                {missingAllItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border-3 border-purple-300 p-2 flex flex-col items-center justify-center shadow-md animate-pop-in"
                  >
                    <div className="w-16 h-16 flex items-center justify-center">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.english} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-3xl">🐾</span>
                      )}
                    </div>
                    <span className="text-xs font-black text-slate-700 capitalize mt-1 truncate max-w-[90px]">
                      {item.english}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSkipMissingTimer}
                className="btn-3d-purple text-white text-xs font-black py-2.5 px-6 rounded-2xl cursor-pointer"
              >
                Bé đã nhớ xong! Bắt đầu tìm 🚀
              </button>
            </div>
          ) : (
            /* GUESSING STAGE */
            <div className="space-y-6">
              <div>
                <span className="bg-amber-100 text-amber-900 text-xs sm:text-sm font-black px-4 py-1.5 rounded-full border border-amber-300 inline-flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Đồ vật nào đã bị biến mất vào chiếc hộp bí ẩn ❓?
                </span>
                <h4 className="text-xl sm:text-2xl font-black text-slate-800">
                  Chọn đồ vật bị thiếu!
                </h4>
              </div>

              {/* Visual Group with 1 Missing Mystery Card */}
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 min-h-[140px]">
                {missingVisibleItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border-3 border-slate-200 p-2 flex flex-col items-center justify-center shadow-xs opacity-85"
                  >
                    <div className="w-16 h-16 flex items-center justify-center">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.english} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-3xl">🐾</span>
                      )}
                    </div>
                    <span className="text-xs font-black text-slate-600 capitalize mt-1 truncate max-w-[90px]">
                      {item.english}
                    </span>
                  </div>
                ))}

                {/* Mystery Box */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 border-3 border-amber-300 p-2 flex flex-col items-center justify-center shadow-lg animate-pulse ring-4 ring-amber-200">
                  <span className="text-4xl text-white">❓</span>
                  <span className="text-[10px] font-black text-amber-100 mt-1">Đồ vật bí ẩn</span>
                </div>
              </div>

              {/* Choices Grid */}
              <div className={`grid ${missingChoices.length <= 3 ? 'grid-cols-1 sm:grid-cols-3 max-w-2xl' : 'grid-cols-2 sm:grid-cols-4 max-w-3xl'} gap-4 mx-auto pt-4 border-t border-slate-100`}>
                {missingChoices.map(c => {
                  const choiceKey = c._id || c.vocabId;
                  const isSelected = missingPickedId === choiceKey;
                  let borderStyle = 'border-slate-200 bg-white hover:border-purple-400 hover:scale-103';

                  if (isSelected) {
                    if (missingFeedback === 'correct') {
                      borderStyle = 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-300 scale-105 animate-soft-bounce';
                    } else if (missingFeedback === 'wrong') {
                      borderStyle = 'border-rose-500 bg-rose-50 ring-4 ring-rose-300 animate-gentle-wobble';
                    }
                  }

                  return (
                    <button
                      key={choiceKey}
                      onClick={() => handlePickMissingChoice(c)}
                      disabled={missingFeedback === 'correct'}
                      className={`card-kid rounded-2xl border-3 p-3 flex flex-col items-center justify-center text-center cursor-pointer shadow-sm hover:shadow-md transition-all ${borderStyle}`}
                    >
                      <div className="w-20 h-20 mb-2 flex items-center justify-center">
                        {c.imageUrl ? (
                          <img src={c.imageUrl} alt={c.english} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-3xl">🐾</span>
                        )}
                      </div>
                      <span className="text-sm font-black text-slate-800 capitalize">{c.english}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. PLAY SCREEN: LẬT THẺ GHI NHỚ (MEMORY MATCH) */}
      {/* ===================================================================== */}
      {activeGame === 'memory-card' && (
        <div className="bg-white rounded-3xl border-3 border-amber-300 p-6 sm:p-8 shadow-lg animate-fade-in">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <button
              onClick={() => {
                sfx.playPop();
                setActiveGame('menu');
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-black cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Trở lại danh sách trò chơi
            </button>
            <div className="flex items-center gap-2 bg-amber-100 px-3.5 py-1 rounded-full border border-amber-300">
              <Star className="w-4 h-4 text-amber-600 fill-amber-500" />
              <span className="text-xs font-black text-amber-900">{memoryCards.filter(c => c.isMatched).length / 2} cặp đã tìm</span>
            </div>
          </div>

          <div className="text-center mb-6">
            <h4 className="text-2xl font-black text-slate-800">Lật thẻ tìm cặp từ vựng & hình ảnh</h4>
            <p className="text-slate-500 font-bold text-xs sm:text-sm">Chạm mở 2 thẻ cùng một từ để ghép cặp nhé!</p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {memoryCards.map(card => {
              const isFaceUp = card.isFlipped || card.isMatched;
              return (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(card)}
                  className={`h-36 sm:h-40 rounded-3xl border-3 p-3 flex flex-col items-center justify-center cursor-pointer transition-all ${
                    card.isMatched
                      ? 'border-emerald-400 bg-emerald-50/80 scale-95 opacity-90'
                      : isFaceUp
                      ? 'border-amber-400 bg-white shadow-md'
                      : 'border-slate-200 bg-gradient-to-br from-amber-400 to-orange-400 text-white shadow-sm hover:scale-103'
                  }`}
                >
                  {isFaceUp ? (
                    card.type === 'image' ? (
                      <div className="w-20 h-20 flex items-center justify-center">
                        {card.imageUrl ? (
                          <img src={card.imageUrl} alt={card.content} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-3xl">🐾</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xl font-black text-slate-800 capitalize font-display">
                        {card.content}
                      </span>
                    )
                  ) : (
                    <span className="text-3xl">❓</span>
                  )}
                </div>
              );
            })}
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
    </div>
  );
};
