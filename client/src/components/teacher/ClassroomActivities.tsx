import { useEffect, useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Volume2,
  CheckCircle2,
  XCircle,
  Headphones,
  Puzzle,
  Utensils,
  Award,
  Star,
  Eye,
  Timer,
  HelpCircle,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import type { Activity, ClassroomSession, StudentSessionScore, User } from '../../types';
import { playWordAudio, stopWordAudio, sfx } from '../../utils/audio';
import { playAnimalSound, stopAnimalSound } from '../../utils/animalAudio';
import { KokoSpeakingCoach } from '../child/KokoSpeakingCoach';
import { getStudentEmoji } from '../common/StudentAvatar';

type Answers = Record<string, 'CORRECT' | 'INCORRECT' | 'NOT_ANSWERED'>;

interface MemoryCardItem {
  id: string;
  pairId: string;
  type: 'image' | 'word';
  text: string;
  vietnameseText?: string;
  imageUrl?: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const NUMBER_WORDS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

const COLOR_HEX_MAP: Record<string, { bg: string; border: string; labelVi: string; isRainbow?: boolean }> = {
  red: { bg: '#FEE2E2', border: '#EF4444', labelVi: 'Màu Đỏ' },
  blue: { bg: '#DBEAFE', border: '#3B82F6', labelVi: 'Màu Xanh Dương' },
  yellow: { bg: '#FEF9C3', border: '#EAB308', labelVi: 'Màu Vàng' },
  green: { bg: '#DCFCE7', border: '#22C55E', labelVi: 'Màu Xanh Lá' },
  orange: { bg: '#FFEDD5', border: '#F97316', labelVi: 'Màu Cam' },
  pink: { bg: '#FCE7F3', border: '#EC4899', labelVi: 'Màu Hồng' },
  purple: { bg: '#F3E8FF', border: '#A855F7', labelVi: 'Màu Tím' },
  brown: { bg: '#EFEBE9', border: '#8D6E63', labelVi: 'Màu Nâu' },
  black: { bg: '#F1F5F9', border: '#475569', labelVi: 'Màu Đen' },
  white: { bg: '#FFFFFF', border: '#CBD5E1', labelVi: 'Màu Trắng' },
  gray: { bg: '#F1F5F9', border: '#64748B', labelVi: 'Màu Xám' },
  grey: { bg: '#F1F5F9', border: '#64748B', labelVi: 'Màu Xám' },
  gold: { bg: '#FEF9C3', border: '#CA8A04', labelVi: 'Màu Vàng Ánh Kim' },
  silver: { bg: '#F8FAFC', border: '#94A3B8', labelVi: 'Màu Bạc' },
  rainbow: { bg: '#FEF3C7', border: '#EC4899', labelVi: 'Cầu Vồng Bảy Sắc', isRainbow: true }
};

const FOOD_KEYWORDS = new Set([
  'apple', 'banana', 'orange', 'grape', 'milk', 'water', 'bread', 'cake', 'cookie',
  'rice', 'egg', 'fish', 'meat', 'chicken', 'juice', 'ice cream', 'candy', 'pear',
  'watermelon', 'strawberry', 'mango', 'carrot', 'tomato', 'potato', 'cheese', 'soup', 'noodle'
]);

const FALLBACK_VOCAB = [
  { _id: 'fb_1', english: 'Apple', vietnamese: 'Quả táo', imageUrl: '/images/vocabulary/apple-v1.svg', audioUrl: '' },
  { _id: 'fb_2', english: 'Cat', vietnamese: 'Con mèo', imageUrl: '/images/vocabulary/cat-v1.svg', audioUrl: '' },
  { _id: 'fb_3', english: 'Dog', vietnamese: 'Con chó', imageUrl: '/images/vocabulary/dog-v1.svg', audioUrl: '' },
  { _id: 'fb_4', english: 'Sun', vietnamese: 'Mặt trời', imageUrl: '/images/vocabulary/sun-v1.svg', audioUrl: '' },
  { _id: 'fb_5', english: 'Book', vietnamese: 'Quyển sách', imageUrl: '/images/vocabulary/book-v1.svg', audioUrl: '' },
  { _id: 'fb_6', english: 'Ball', vietnamese: 'Quả bóng', imageUrl: '/images/vocabulary/ball-v1.svg', audioUrl: '' }
];

function buildSynthesizedActivities(existingActivities: Activity[], lessonVocab: any[], _ageGroup: string, lessonTitle: string): Activity[] {
  const vocabPool = lessonVocab.length >= 3 ? lessonVocab : FALLBACK_VOCAB;
  const maxQ = Math.min(Math.max(vocabPool.length, 6), 8);
  const targets = Array.from({ length: maxQ }, (_, i) => vocabPool[i % vocabPool.length]);

  const makeOptions = (target: any, qIdx: number, count = 3) => {
    const others = vocabPool.filter(v => String(v._id || v.english) !== String(target._id || target.english));
    const picked = [];
    for (let i = 0; i < Math.min(count, others.length); i++) {
      picked.push(others[(qIdx * 2 + i) % others.length]);
    }
    const combined = [target, ...picked];
    const shift = qIdx % combined.length;
    const rotated = [...combined.slice(shift), ...combined.slice(0, shift)];
    return rotated.map((item, idx) => ({
      id: `syn_${qIdx}_${idx}_${String(item.english).toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      text: item.english,
      vietnameseText: item.vietnamese || '',
      imageUrl: item.imageUrl || '',
      audioUrl: item.audioUrl || '',
      isCorrect: String(item._id || item.english) === String(target._id || target.english)
    }));
  };

  // Enrich any existing activity that has fewer than 5 questions
  const enrichedExisting: Activity[] = existingActivities.map((act) => {
    if ((act.questions?.length || 0) >= 5) return act;
    const existingQs = act.questions || [];
    const needed = Math.max(6, maxQ) - existingQs.length;
    const extraQs = targets.slice(0, needed).map((target, idx) => {
      const qIdx = existingQs.length + idx;
      if (act.activityType === 'COUNT_OBJECTS') {
        const qty = ((qIdx * 2) % 8) + 2;
        const d1 = qty > 1 ? qty - 1 : qty + 2;
        const d2 = qty < 10 ? qty + 1 : qty - 2;
        return {
          promptText: `Có bao nhiêu "${target.english}" (${target.vietnamese || ''}) trên màn hình?`,
          promptImageUrl: target.imageUrl || '',
          promptAudioUrl: target.audioUrl || '',
          correctAnswer: String(qty),
          options: [
            { id: `cnt_syn_${qIdx}_0`, text: `${qty} (${NUMBER_WORDS[qty - 1]})`, isCorrect: true },
            { id: `cnt_syn_${qIdx}_1`, text: `${d1} (${NUMBER_WORDS[d1 - 1]})`, isCorrect: false },
            { id: `cnt_syn_${qIdx}_2`, text: `${d2} (${NUMBER_WORDS[d2 - 1]})`, isCorrect: false }
          ],
          metadata: { object: target.english, image: target.imageUrl, quantity: qty, correctAnswer: String(qty) }
        };
      }
      if (act.activityType === 'TRUE_FALSE') {
        const isTrue = qIdx % 2 === 0;
        const others = vocabPool.filter(v => v.english !== target.english);
        const wrong = others[qIdx % Math.max(1, others.length)] || target;
        const shown = isTrue ? target : wrong;
        return {
          promptText: `Đây có phải là "${shown.english}" (${shown.vietnamese || ''}) không?`,
          promptImageUrl: target.imageUrl || '',
          promptAudioUrl: shown.audioUrl || '',
          correctAnswer: isTrue ? 'True' : 'False',
          options: [
            { id: `tf_syn_${qIdx}_t`, text: 'True (Đúng)', isCorrect: isTrue },
            { id: `tf_syn_${qIdx}_f`, text: 'False (Sai)', isCorrect: !isTrue }
          ],
          metadata: { statement: `This is "${shown.english}" (${shown.vietnamese || ''}).`, image: target.imageUrl, targetWord: target.english }
        };
      }
      if (act.activityType === 'MISSING_OBJECT') {
        const others = vocabPool.filter(v => v.english !== target.english);
        const vis = [0, 1, 2].map(i => others[(qIdx + i) % Math.max(1, others.length)]?.english).filter(Boolean);
        return {
          promptText: 'Quan sát bàn đồ vật và tìm xem hình nào vừa biến mất?',
          promptImageUrl: target.imageUrl || '',
          correctAnswer: target.english,
          options: makeOptions(target, qIdx, 3),
          metadata: { visibleObjects: vis, missingObject: target.english }
        };
      }
      return {
        promptText: target.english,
        promptAudioUrl: target.audioUrl || '',
        promptImageUrl: target.imageUrl || '',
        correctAnswer: target.english,
        options: makeOptions(target, qIdx, 3),
        metadata: { targetWord: target.english, word: target.english, image: target.imageUrl, speechTarget: target.english }
      };
    });
    return {
      ...act,
      questions: [...existingQs, ...extraQs],
      questionCount: existingQs.length + extraQs.length
    };
  });

  // If the session already has activities explicitly configured or selected by the teacher
  // (e.g. 8 activities chosen in Step 2 of setup), strictly preserve the teacher's selection
  // and do NOT inject unselected catalogue activities.
  if (enrichedExisting.length > 0) {
    return enrichedExisting;
  }

  const existingTypes = new Set(enrichedExisting.map(a => a.activityType));
  const desiredCatalogue: Array<{ type: string; titleVi: string; instructions: string }> = [
    { type: 'LISTEN_CHOOSE', titleVi: `Nghe & Chọn Tranh: ${lessonTitle}`, instructions: 'Nghe phát âm và chạm vào bức tranh đúng nhất!' },
    { type: 'IMAGE_WORD_MATCH', titleVi: `Nhìn Tranh Chọn Từ: ${lessonTitle}`, instructions: 'Quan sát bức tranh và chọn từ tiếng Anh tương ứng!' },
    { type: 'MEMORY_CARD', titleVi: `Lật Thẻ Trí Nhớ: ${lessonTitle}`, instructions: 'Lật mở 2 thẻ để tìm cặp Hình ảnh và Từ vựng trùng khớp!' },
    { type: 'TRUE_FALSE', titleVi: `Đúng Hay Sai (Yes/No): ${lessonTitle}`, instructions: 'Nhìn tranh và chọn câu nói bên dưới là Đúng hay Sai!' },
    { type: 'COUNT_OBJECTS', titleVi: `Đếm Số Lượng: ${lessonTitle}`, instructions: 'Chạm vào từng hình để đếm to tiếng Anh rồi chọn con số đúng!' },
    { type: 'MISSING_OBJECT', titleVi: `Đồ Vật Biến Mất: ${lessonTitle}`, instructions: 'Ghi nhớ các hình trên bàn và tìm ra hình vừa biến mất!' },
    { type: 'BUBBLE_POP', titleVi: `Đập Bong Bóng: ${lessonTitle}`, instructions: 'Chạm làm nổ quả bong bóng mang từ vựng được yêu cầu!' },
    { type: 'FEED_ANIMAL', titleVi: `Cùng Gấu Koko: ${lessonTitle}`, instructions: 'Chọn đúng hình bạn Gấu Koko đang cần nhé!' },
    { type: 'STAR_CATCHER', titleVi: `Hứng Sao Từ Vựng: ${lessonTitle}`, instructions: 'Chạm thu hoạch ngôi sao mang đúng từ vựng vào giỏ!' },
    { type: 'LISTEN_REPEAT', titleVi: `Nghe & Đọc Theo Koko: ${lessonTitle}`, instructions: 'Nghe phát âm mẫu và đọc to rõ ràng cùng Koko!' }
  ];

  const synthesized: Activity[] = [...enrichedExisting];

  for (const spec of desiredCatalogue) {
    if (existingTypes.has(spec.type as any)) continue;
    const questions = targets.slice(0, 6).map((target, qIdx) => {
      if (spec.type === 'COUNT_OBJECTS') {
        const qty = ((qIdx * 2) % 8) + 2;
        const d1 = qty > 1 ? qty - 1 : qty + 2;
        const d2 = qty < 10 ? qty + 1 : qty - 2;
        return {
          promptText: `Có bao nhiêu "${target.english}" (${target.vietnamese || ''}) trên màn hình?`,
          promptImageUrl: target.imageUrl || '',
          promptAudioUrl: target.audioUrl || '',
          correctAnswer: String(qty),
          options: [
            { id: `cnt_v_${qIdx}_0`, text: `${qty} (${NUMBER_WORDS[qty - 1]})`, isCorrect: true },
            { id: `cnt_v_${qIdx}_1`, text: `${d1} (${NUMBER_WORDS[d1 - 1]})`, isCorrect: false },
            { id: `cnt_v_${qIdx}_2`, text: `${d2} (${NUMBER_WORDS[d2 - 1]})`, isCorrect: false }
          ],
          metadata: { object: target.english, image: target.imageUrl, quantity: qty, correctAnswer: String(qty) }
        };
      }
      if (spec.type === 'TRUE_FALSE') {
        const isTrue = qIdx % 2 === 0;
        const others = vocabPool.filter(v => v.english !== target.english);
        const wrong = others[qIdx % Math.max(1, others.length)] || target;
        const shown = isTrue ? target : wrong;
        return {
          promptText: `Đây có phải là "${shown.english}" (${shown.vietnamese || ''}) không?`,
          promptImageUrl: target.imageUrl || '',
          promptAudioUrl: shown.audioUrl || '',
          correctAnswer: isTrue ? 'True' : 'False',
          options: [
            { id: `tf_v_${qIdx}_t`, text: 'True (Đúng)', isCorrect: isTrue },
            { id: `tf_v_${qIdx}_f`, text: 'False (Sai)', isCorrect: !isTrue }
          ],
          metadata: { statement: `This is "${shown.english}" (${shown.vietnamese || ''}).`, image: target.imageUrl, targetWord: target.english }
        };
      }
      if (spec.type === 'MISSING_OBJECT') {
        const others = vocabPool.filter(v => v.english !== target.english);
        const vis = [0, 1, 2].map(i => others[(qIdx + i) % Math.max(1, others.length)]?.english).filter(Boolean);
        return {
          promptText: 'Quan sát bàn đồ vật và tìm xem hình nào vừa biến mất?',
          promptImageUrl: target.imageUrl || '',
          correctAnswer: target.english,
          options: makeOptions(target, qIdx, 3),
          metadata: { visibleObjects: vis, missingObject: target.english }
        };
      }
      return {
        promptText: target.english,
        promptAudioUrl: target.audioUrl || '',
        promptImageUrl: target.imageUrl || '',
        correctAnswer: target.english,
        options: makeOptions(target, qIdx, 3),
        metadata: {
          targetWord: target.english,
          word: target.english,
          image: target.imageUrl,
          targetImage: target.imageUrl,
          speechTarget: target.english
        }
      };
    });

    synthesized.push({
      _id: `virtual_${spec.type}`,
      title: spec.titleVi,
      vietnameseTitle: spec.titleVi,
      instructions: spec.instructions,
      activityType: spec.type,
      difficulty: 1,
      pointsPerQuestion: 10,
      starConfig: { threeStarsMin: 50, twoStarsMin: 30, oneStarMin: 10 },
      questionCount: questions.length,
      questions
    });
  }

  return synthesized;
}

export function ClassroomActivities({
  session,
  onSave,
  onAwardStudent,
  onAwardAllCorrect,
  onSpotlightStudent
}: {
  session: ClassroomSession;
  onSave: (activityId: string, index: number, prompt: string, answers: Answers) => Promise<void>;
  onAwardStudent?: (studentId: string, stars?: number) => void;
  onAwardAllCorrect?: (studentIds: string[], stars?: number) => void;
  onSpotlightStudent?: (score: StudentSessionScore, promptText?: string) => void;
}) {
  const [answers, onAnswers] = useState<Answers>({});
  const [activityIndex, setActivityIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState('');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // Interactive state for general choice
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<'CORRECT' | 'WRONG' | null>(null);

  // Interactive state for MEMORY_CARD (multi-round 2-card flip matching)
  const [memoryRound, setMemoryRound] = useState(0);
  const [memoryCards, setMemoryCards] = useState<MemoryCardItem[]>([]);
  const [flippedCardIds, setFlippedCardIds] = useState<string[]>([]);
  const [memoryProcessing, setMemoryProcessing] = useState(false);

  // Interactive state for COUNT_OBJECTS
  const [tappedIndices, setTappedIndices] = useState<number[]>([]);
  const [isAutoCounting, setIsAutoCounting] = useState(false);

  // Interactive state for MISSING_OBJECT
  const [missingStage, setMissingStage] = useState<'MEMORIZING' | 'GUESSING'>('MEMORIZING');
  const [missingTimeLeft, setMissingTimeLeft] = useState(5);

  // Interactive state for FEED_ANIMAL
  const [isFeeding, setIsFeeding] = useState(false);
  const [fedSuccess, setFedSuccess] = useState(false);

  // Interactive state for BUBBLE_POP / STAR_CATCHER
  const [poppedOptionId, setPoppedOptionId] = useState<string | null>(null);
  const [poppedBubbleIds, setPoppedBubbleIds] = useState<string[]>([]);

  // Vocabulary lookup map from lesson for images & Vietnamese translations
  const lessonVocabList = useMemo(() => {
    const raw = (session.lesson as any)?.vocabularyItems || [];
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((v: any) => ({
        _id: v._id || v.english,
        english: v.english || v.word || 'Word',
        vietnamese: v.vietnamese || '',
        imageUrl: v.imageUrl || '',
        audioUrl: v.audioUrl || ''
      }));
    }
    return FALLBACK_VOCAB;
  }, [session.lesson]);

  const vocabLookup = useMemo(() => {
    const map = new Map<string, { english: string; vietnamese: string; imageUrl: string; audioUrl: string }>();
    lessonVocabList.forEach((v) => {
      map.set(String(v.english).toLowerCase().trim(), v);
    });
    return map;
  }, [lessonVocabList]);

  // Full list of activities (DB activities enriched + synthesized missing game types)
  const activities = useMemo(() => {
    const rawActs = (session.activities || []) as Activity[];
    const lessonTitle = session.lesson?.vietnameseTitle || session.lesson?.title || session.title || 'Bài học';
    return buildSynthesizedActivities(rawActs, lessonVocabList, session.ageGroup || '3-4', lessonTitle);
  }, [session.activities, lessonVocabList, session.ageGroup, session.lesson, session.title]);

  const activity = activities[activityIndex] || activities[0];
  const question = activity?.questions?.[questionIndex];

  // Number of rounds for MEMORY_CARD (each round takes 4 pairs = 8 cards)
  const memoryRoundCount = useMemo(() => {
    if (!activity || !['MEMORY', 'MEMORY_CARD'].includes(activity.activityType)) return 1;
    const totalPairs = Math.max(lessonVocabList.length, activity.questions?.length || 4);
    return Math.max(1, Math.ceil(totalPairs / 4));
  }, [activity, lessonVocabList.length]);

  // Build Memory Cards for current round
  const initMemoryDeck = (act?: Activity, roundIdx = 0) => {
    if (!act || !['MEMORY', 'MEMORY_CARD'].includes(act.activityType)) return;
    // Combine activity questions and lesson vocabulary so all words are covered across rounds
    const pairPool: Array<{ word: string; vi: string; imageUrl: string }> = [];
    const seen = new Set<string>();

    (act.questions || []).forEach((q) => {
      const w = (
        q.metadata?.targetWord ||
        q.correctAnswer ||
        q.promptText.replace(/^(Find the (matching )?pair( for)?:\s*|Tìm cặp thẻ giống nhau:\s*)/i, '')
      ).trim();
      const key = w.toLowerCase();
      if (w && !seen.has(key)) {
        seen.add(key);
        const fromLookup = vocabLookup.get(key);
        pairPool.push({
          word: fromLookup?.english || w,
          vi: q.metadata?.vietnameseText || fromLookup?.vietnamese || '',
          imageUrl: q.metadata?.targetImage || q.promptImageUrl || fromLookup?.imageUrl || q.options?.find((o) => o.isCorrect)?.imageUrl || ''
        });
      }
    });

    lessonVocabList.forEach((v) => {
      const key = v.english.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        pairPool.push({
          word: v.english,
          vi: v.vietnamese || '',
          imageUrl: v.imageUrl || ''
        });
      }
    });

    const pairCount = Math.min(4, pairPool.length);
    const selectedPairs = Array.from({ length: pairCount }, (_, i) => pairPool[(roundIdx * 4 + i) % pairPool.length]);

    const deck: MemoryCardItem[] = [];
    selectedPairs.forEach((p, idx) => {
      const pairId = `pair_${roundIdx}_${idx}`;
      deck.push({
        id: `${pairId}_img`,
        pairId,
        type: 'image',
        text: p.word,
        vietnameseText: p.vi,
        imageUrl: p.imageUrl,
        isFlipped: false,
        isMatched: false
      });
      deck.push({
        id: `${pairId}_word`,
        pairId,
        type: 'word',
        text: p.word,
        vietnameseText: p.vi,
        imageUrl: p.imageUrl,
        isFlipped: false,
        isMatched: false
      });
    });

    // Deterministic-friendly shuffle
    setMemoryCards([...deck].sort(() => Math.random() - 0.5));
    setFlippedCardIds([]);
    setMemoryProcessing(false);
    setFeedbackStatus(null);
  };

  useEffect(() => {
    setRevealed(false);
    setError('');
    setSelectedOptionId(null);
    setFeedbackStatus(null);
    setTappedIndices([]);
    setIsAutoCounting(false);
    setIsFeeding(false);
    setFedSuccess(false);
    setPoppedOptionId(null);
    setPoppedBubbleIds([]);

    if (activity && ['MEMORY', 'MEMORY_CARD'].includes(activity.activityType)) {
      initMemoryDeck(activity, memoryRound);
    }

    if (activity?.activityType === 'MISSING_OBJECT') {
      setMissingStage('MEMORIZING');
      setMissingTimeLeft(5);
    }

    const saved = session.questionResults?.find(
      (result) =>
        (String(result.activityId) === activity?._id && result.questionIndex === questionIndex) ||
        (!result.activityId && result.questionIndex === questionIndex && result.promptText === question?.promptText)
    );
    const restored: Answers = {};
    for (const answer of saved?.studentAnswers || []) {
      const sid = String(typeof answer.student === 'object' ? (answer.student as any)?._id : answer.student);
      restored[sid] = answer.result;
    }
    onAnswers(restored);

    return () => {
      stopAnimalSound();
      stopWordAudio();
    };
  }, [activity?._id, questionIndex, memoryRound]);

  // Countdown for MISSING_OBJECT
  useEffect(() => {
    if (activity?.activityType !== 'MISSING_OBJECT' || missingStage !== 'MEMORIZING') return;
    const timer = setInterval(() => {
      setMissingTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          sfx.playPop();
          setMissingStage('GUESSING');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activity?.activityType, missingStage, questionIndex]);

  if (!activity || !activities.length) {
    return (
      <div className="rounded-3xl bg-slate-900 border border-white/10 p-8 text-center text-slate-300">
        <span className="text-4xl block mb-2">📚</span>
        <h2 className="text-xl font-bold text-white">Chưa có trò chơi cho buổi học</h2>
      </div>
    );
  }

  const roster = session.studentScores.filter((row) => !['ABSENT', 'EXCUSED'].includes(row.attendance || ''));

  const markAllAnswers = (result: 'CORRECT' | 'INCORRECT') => {
    const updated: Answers = {};
    roster.forEach((row) => {
      const student = row.student as User;
      const id = String(typeof row.student === 'string' ? row.student : student._id || (student as any).id || '');
      updated[id] = result;
    });
    onAnswers(updated);
    sfx.playSuccess();
  };

  const correctOption = question?.options?.find((opt) => opt.isCorrect) || question?.options?.[0];
  const targetWordText = useMemo(() => {
    if (!question) return '';
    return (
      question.metadata?.word ||
      question.metadata?.targetWord ||
      question.metadata?.speechTarget ||
      question.metadata?.object ||
      correctOption?.text ||
      question.correctAnswer ||
      question.promptText
    );
  }, [question, correctOption]);

  const targetVocabDetail = useMemo(() => {
    return vocabLookup.get(String(targetWordText).toLowerCase().trim());
  }, [vocabLookup, targetWordText]);

  const listen = async () => {
    if (!question) return;
    setError('');
    setIsAudioPlaying(true);
    try {
      if (activity.activityType === 'ANIMAL_SOUND') {
        const soundKey = String(
          question.metadata?.animal || question.options.find((option) => option.isCorrect)?.text || question.correctAnswer || ''
        );
        await playAnimalSound(soundKey);
      } else {
        stopAnimalSound();
        const targetText =
          activity.activityType === 'TRUE_FALSE'
            ? question.metadata?.displayedWord || targetWordText
            : targetWordText || question.options.find((opt) => opt.isCorrect)?.text || question.promptText;
        await playWordAudio(targetText, question.promptAudioUrl || targetVocabDetail?.audioUrl);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không phát được âm thanh.');
    } finally {
      setIsAudioPlaying(false);
    }
  };

  const handleSelectOption = (opt: { id: string; text?: string; isCorrect?: boolean }) => {
    setSelectedOptionId(opt.id);
    if (opt.text) {
      const cleanSpeech = opt.text.replace(/\s*\(.*?\)\s*/g, '').trim();
      void playWordAudio(cleanSpeech);
    }
    if (opt.isCorrect) {
      setFeedbackStatus('CORRECT');
      sfx.playCorrect();
      sfx.playStarFanfare();
      markAllAnswers('CORRECT');
    } else {
      setFeedbackStatus('WRONG');
      sfx.playGentleWrong();
    }
  };

  const handleMemoryCardClick = (card: MemoryCardItem) => {
    if (memoryProcessing || flippedCardIds.includes(card.id) || card.isFlipped || card.isMatched) return;
    sfx.playPop();
    if (card.text) void playWordAudio(card.text);

    const nextFlipped = [...flippedCardIds, card.id];
    setFlippedCardIds(nextFlipped);
    const nextDeck = memoryCards.map((c) => (nextFlipped.includes(c.id) ? { ...c, isFlipped: true } : c));
    setMemoryCards(nextDeck);

    if (nextFlipped.length === 2) {
      setMemoryProcessing(true);
      const [firstId, secondId] = nextFlipped;
      const firstCard = nextDeck.find((c) => c.id === firstId);
      const secondCard = nextDeck.find((c) => c.id === secondId);

      if (firstCard && secondCard && firstCard.pairId === secondCard.pairId) {
        setTimeout(() => {
          sfx.playCorrect();
          const matchedDeck = nextDeck.map((c) => (c.pairId === firstCard.pairId ? { ...c, isMatched: true } : c));
          setMemoryCards(matchedDeck);
          setFlippedCardIds([]);
          setMemoryProcessing(false);
          if (matchedDeck.every((c) => c.isMatched)) {
            sfx.playStarFanfare();
            setFeedbackStatus('CORRECT');
            markAllAnswers('CORRECT');
          }
        }, 400);
      } else {
        setTimeout(() => {
          sfx.playGentleWrong();
          setMemoryCards((prev) =>
            prev.map((c) => (c.id === firstId || c.id === secondId ? { ...c, isFlipped: false } : c))
          );
          setFlippedCardIds([]);
          setMemoryProcessing(false);
        }, 800);
      }
    }
  };

  const activityMetaLabel = (type: string, _idx?: number, title?: string) => {
    const map: Record<string, { icon: string; name: string }> = {
      LISTEN_CHOOSE: { icon: '🎧', name: 'Nghe & Chọn' },
      IMAGE_WORD_MATCH: { icon: '🔤', name: 'Nhìn Tranh Chọn Từ' },
      MATCHING: { icon: '🔗', name: 'Nối Cặp Tranh Từ' },
      MEMORY_CARD: { icon: '🃏', name: 'Lật Thẻ Trí Nhớ' },
      MEMORY: { icon: '🃏', name: 'Lật Thẻ Trí Nhớ' },
      COUNT_OBJECTS: { icon: '🔢', name: 'Đếm Số Lượng' },
      TRUE_FALSE: { icon: '👍', name: 'Đúng hay Sai' },
      FIND_OBJECT: { icon: '🔍', name: 'Tìm Đồ Vật' },
      TAP_PICTURE: { icon: '👆', name: 'Chạm Đúng Tranh' },
      COLOR_RECOGNITION: { icon: '🎨', name: 'Nhận Biết Màu' },
      MISSING_OBJECT: { icon: '🎩', name: 'Đồ Vật Biến Mất' },
      CLASSIFICATION: { icon: '🗂️', name: 'Phân Loại Nhóm' },
      DRAG_DROP: { icon: '📦', name: 'Đặt Vào Hộp' },
      LISTEN_REPEAT: { icon: '🎤', name: 'Nghe & Đọc Theo' },
      FEED_ANIMAL: { icon: '🐻', name: 'Cùng Gấu Koko' },
      BUBBLE_POP: { icon: '🫧', name: 'Đập Bong Bóng' },
      STAR_CATCHER: { icon: '⭐', name: 'Hứng Sao Từ Vựng' },
      ANIMAL_SOUND: { icon: '🐾', name: 'Tiếng Kêu Con Vật' },
      LUCKY_WHEEL: { icon: '🎡', name: 'Vòng Quay Koko' },
      MYSTERY_BOX: { icon: '🎁', name: 'Hộp Bí Mật' }
    };
    const found = map[type];
    return {
      icon: found?.icon || '🎮',
      shortName: found?.name || (title ? title.split(':')[0] : 'Trò chơi')
    };
  };

  const isMemoryMode = ['MEMORY', 'MEMORY_CARD'].includes(activity.activityType);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-12 lg:gap-3">
      {/* ── Left 8 Cols: Interactive Curriculum Game Stage ── */}
      <section className="flex min-h-0 flex-col justify-between overflow-y-auto rounded-3xl border-2 border-indigo-400/30 bg-gradient-to-b from-slate-900/95 to-slate-950 p-3 sm:p-4 text-white shadow-xl lg:col-span-8">
        {/* Top Bar: Mode Selector & Activity Meta */}
        <div className="flex flex-col gap-2 pb-2.5 border-b border-white/10 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                Trò chơi {activityIndex + 1}/{activities.length}
              </span>
              {question && !isMemoryMode && (
                <span className="px-2.5 py-0.5 rounded-full text-xs bg-amber-400/20 text-amber-300 border border-amber-400/30 font-black">
                  Câu {questionIndex + 1} / {activity.questions.length}
                </span>
              )}
              {isMemoryMode && (
                <span className="px-2.5 py-0.5 rounded-full text-xs bg-pink-500/20 text-pink-300 border border-pink-400/30 font-black">
                  Vòng {memoryRound + 1} / {memoryRoundCount} ({memoryCards.filter(c => c.isMatched).length / 2}/{memoryCards.length / 2} cặp)
                </span>
              )}
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5 truncate">
                {activity.activityType === 'LISTEN_CHOOSE' && <Headphones className="text-sky-400 shrink-0" size={16} />}
                {activity.activityType === 'IMAGE_WORD_MATCH' && <Puzzle className="text-amber-400 shrink-0" size={16} />}
                {activity.activityType === 'FEED_ANIMAL' && <Utensils className="text-emerald-400 shrink-0" size={16} />}
                <span className="truncate">{activityMetaLabel(activity.activityType, activityIndex, activity.title).shortName}</span>
              </h2>
            </div>
          </div>

          {/* Activity Selector Pills */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-800 p-1 rounded-2xl border border-white/10">
            {activities.map((item, index) => {
              const isCurrent = activityIndex === index;
              const { icon, shortName } = activityMetaLabel(item.activityType, index, item.title);
              return (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => {
                    setActivityIndex(index);
                    setQuestionIndex(0);
                    setMemoryRound(0);
                    sfx.playPop();
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm ring-1 ring-indigo-300/50'
                      : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>{icon}</span>
                  <span>{shortName}</span>
                  <span className="text-[10px] opacity-75">({item.questions?.length || 0})</span>
                </button>
              );
            })}
          </div>
        </div>

        {question ? (
          <>
            {/* Question Header & Audio Speaker */}
            <div className="my-2 flex flex-wrap items-center justify-between gap-2 bg-slate-800/40 px-3 py-2 rounded-2xl border border-white/5 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 flex items-center justify-center font-black text-xs shrink-0">
                  {isMemoryMode ? `V${memoryRound + 1}` : `Q${questionIndex + 1}`}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-white truncate">
                    {isMemoryMode
                      ? 'Lật 2 thẻ bất kỳ để ghép cặp Hình ảnh và Từ tiếng Anh trùng nhau!'
                      : activity.activityType === 'MISSING_OBJECT'
                      ? missingStage === 'MEMORIZING'
                        ? 'Bé hãy quan sát và nhớ kỹ các hình trên bàn nhé!'
                        : 'Úm ba la! Hình nào trên bàn vừa biến mất rồi?'
                      : question.promptText}
                  </h3>
                  {activity.instructions && (
                    <p className="text-[11px] text-slate-400 truncate">{activity.instructions}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {!isMemoryMode && (
                  <button
                    type="button"
                    className={`px-3.5 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                      isAudioPlaying
                        ? 'bg-amber-400 text-amber-950 animate-pulse'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                    onClick={() => void listen()}
                  >
                    <Volume2 size={15} />
                    <span>{activity.activityType === 'ANIMAL_SOUND' ? 'Nghe Tiếng Kêu' : 'Nghe Phát Âm'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setRevealed((v) => !v)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-xs cursor-pointer active:scale-95 border border-white/10"
                >
                  {revealed ? 'Ẩn đáp án' : 'Hiện đáp án'}
                </button>
              </div>
            </div>

            {/* ── MAIN INTERACTIVE STAGE BY ACTIVITY TYPE ── */}
            <div className="my-auto flex flex-col items-center justify-center py-1 w-full">
              {/* 1. LISTEN_CHOOSE / FIND_OBJECT / TAP_PICTURE / ANIMAL_SOUND */}
              {['LISTEN_CHOOSE', 'FIND_OBJECT', 'TAP_PICTURE', 'ANIMAL_SOUND'].includes(activity.activityType) && (
                <div className="flex flex-col items-center w-full">
                  <div className="flex items-center gap-2 mb-2.5">
                    <button
                      type="button"
                      onClick={() => void listen()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-md cursor-pointer active:scale-95"
                    >
                      <Volume2 size={18} />
                      <span>
                        {activity.activityType === 'FIND_OBJECT' || activity.activityType === 'TAP_PICTURE'
                          ? `🔍 Tìm hình: "${targetWordText}" ${targetVocabDetail?.vietnamese ? `(${targetVocabDetail.vietnamese})` : ''}`
                          : `🎧 Bấm nghe từ vựng & Chọn hình đúng`}
                      </span>
                    </button>
                  </div>

                  <div className={`grid ${question.options.length <= 2 ? 'grid-cols-2 max-w-xl' : question.options.length === 3 ? 'grid-cols-3 max-w-3xl' : 'grid-cols-2 sm:grid-cols-4 max-w-4xl'} gap-3 w-full`}>
                    {question.options.map((opt) => {
                      const isSelected = selectedOptionId === opt.id;
                      const isCorrect = Boolean(opt.isCorrect);
                      const optLookup = vocabLookup.get(String(opt.text || '').toLowerCase().trim());
                      const imgSrc = opt.imageUrl || optLookup?.imageUrl;
                      const viText = opt.vietnameseText || optLookup?.vietnamese;

                      let cardBorder = 'border-white/15 bg-white/5 hover:border-sky-400 hover:bg-white/10';
                      if (selectedOptionId) {
                        if (isCorrect) cardBorder = 'border-emerald-400 bg-emerald-500/20 ring-4 ring-emerald-400/40 scale-102';
                        else if (isSelected) cardBorder = 'border-rose-500 bg-rose-500/20 ring-4 ring-rose-400/40';
                        else cardBorder = 'border-white/5 bg-white/5 opacity-45';
                      } else if (revealed && isCorrect) {
                        cardBorder = 'border-emerald-400 bg-emerald-500/20 ring-2 ring-emerald-400';
                      }

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectOption(opt)}
                          className={`rounded-2xl border-2 p-3 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 relative group ${cardBorder}`}
                        >
                          <div className="w-20 h-20 sm:w-24 sm:h-24 mb-2 p-2 bg-white rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                            {imgSrc ? (
                              <img src={imgSrc} alt={opt.text || ''} className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-4xl">🎨</span>
                            )}
                          </div>
                          <span className="font-black text-sm sm:text-base text-white capitalize">{opt.text}</span>
                          {viText && (
                            <span className="text-[11px] text-slate-300 font-semibold">{viText}</span>
                          )}
                          {(revealed || (selectedOptionId && isCorrect)) && isCorrect && (
                            <span className="text-[11px] text-emerald-400 font-extrabold mt-0.5">✓ Đáp án đúng</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. IMAGE_WORD_MATCH & MATCHING: Look at the picture at top & choose the matching English word */}
              {['IMAGE_WORD_MATCH', 'MATCHING'].includes(activity.activityType) && (() => {
                const cleanTargetWord =
                  question.metadata?.word ||
                  correctOption?.text ||
                  question.correctAnswer ||
                  targetWordText;
                const lookupItem = vocabLookup.get(String(cleanTargetWord).toLowerCase().trim());
                const targetImage =
                  question.metadata?.imageUrl ||
                  question.metadata?.image ||
                  question.promptImageUrl ||
                  correctOption?.imageUrl ||
                  lookupItem?.imageUrl;

                return (
                  <div className="flex flex-col items-center w-full">
                    <p className="text-amber-300 text-xs sm:text-sm font-bold mb-2 text-center">
                      🔤 Bé quan sát bức tranh bên dưới và chọn thẻ từ tiếng Anh tương ứng:
                    </p>
                    {/* Target Picture Box */}
                    <div className="mb-3 flex items-center gap-4 rounded-2xl border-2 border-amber-400/60 bg-white/10 px-5 py-2.5">
                      <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl bg-white p-2 flex items-center justify-center border-2 border-amber-300 shrink-0">
                        {targetImage ? (
                          <img src={targetImage} alt={cleanTargetWord} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-5xl">🖼️</span>
                        )}
                      </div>
                      <div className="text-left">
                        <span className="text-[11px] uppercase tracking-wider font-black text-amber-300 block">
                          Tranh cần ghép từ:
                        </span>
                        {lookupItem?.vietnamese && (
                          <span className="text-sm font-extrabold text-white block mt-0.5">
                            Gợi ý nghĩa: {lookupItem.vietnamese}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => void playWordAudio(cleanTargetWord, question.promptAudioUrl || lookupItem?.audioUrl)}
                          className="mt-1.5 inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-3.5 py-1.5 text-xs cursor-pointer active:scale-95"
                        >
                          <Volume2 size={15} />
                          <span>Nghe gợi ý phát âm</span>
                        </button>
                      </div>
                    </div>

                    {/* Word Choice Cards */}
                    <div className={`grid ${question.options.length <= 2 ? 'grid-cols-2 max-w-xl' : question.options.length === 3 ? 'grid-cols-3 max-w-2xl' : 'grid-cols-2 sm:grid-cols-4 max-w-3xl'} gap-3 w-full`}>
                      {question.options.map((opt) => {
                        const isSelected = selectedOptionId === opt.id;
                        const isCorrect = Boolean(opt.isCorrect);
                        const optLookup = vocabLookup.get(String(opt.text || '').toLowerCase().trim());
                        const viLabel = opt.vietnameseText || optLookup?.vietnamese;
                        let border = 'border-white/20 bg-slate-800/90 hover:border-amber-400';
                        if (selectedOptionId) {
                          if (isCorrect) border = 'border-emerald-400 bg-emerald-500/25 ring-4 ring-emerald-400/50 scale-102';
                          else if (isSelected) border = 'border-rose-500 bg-rose-500/25 ring-4 ring-rose-400/40';
                        } else if (revealed && isCorrect) {
                          border = 'border-emerald-400 bg-emerald-500/20';
                        }

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectOption(opt)}
                            className={`rounded-2xl border-2 px-4 py-3.5 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 ${border}`}
                          >
                            <span className="font-black text-lg sm:text-2xl text-white capitalize tracking-wide">
                              {opt.text}
                            </span>
                            {viLabel && (
                              <span className="text-xs text-amber-300 font-bold mt-0.5">({viLabel})</span>
                            )}
                            {(revealed || (selectedOptionId && isCorrect)) && isCorrect && (
                              <span className="text-[11px] text-emerald-300 font-black mt-1">✓ Đúng rồi!</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* 3. MEMORY / MEMORY_CARD: Multi-round 2-card flip matching */}
              {isMemoryMode && (
                <div className="flex flex-col items-center w-full">
                  <div className="flex flex-wrap items-center justify-between gap-2 w-full max-w-4xl mb-2.5">
                    <p className="text-pink-300 text-xs sm:text-sm font-bold">
                      🃏 Mời bé chạm lật 2 thẻ để tìm cặp Hình ảnh &amp; Từ vựng trùng nhau:
                    </p>
                    <div className="flex items-center gap-1.5">
                      {memoryRoundCount > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            sfx.playPop();
                            setMemoryRound((r) => (r + 1) % memoryRoundCount);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/40 text-xs font-black text-pink-200 cursor-pointer"
                        >
                          <Sparkles size={12} /> Đổi bộ từ (Vòng {((memoryRound + 1) % memoryRoundCount) + 1})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => initMemoryDeck(activity, memoryRound)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-200 cursor-pointer"
                      >
                        <RotateCcw size={13} /> Xáo lại thẻ
                      </button>
                    </div>
                  </div>
                  <div className={`grid ${memoryCards.length <= 4 ? 'grid-cols-2 sm:grid-cols-4 max-w-2xl' : 'grid-cols-2 sm:grid-cols-4 max-w-3xl'} gap-2.5 w-full`}>
                    {memoryCards.map((card, cIdx) => {
                      const showFront = card.isFlipped || card.isMatched || revealed;
                      return (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => handleMemoryCardClick(card)}
                          disabled={showFront || memoryProcessing}
                          className={`h-28 sm:h-32 rounded-2xl border-2 p-2.5 flex flex-col items-center justify-center cursor-pointer transition-all relative ${
                            card.isMatched
                              ? 'border-emerald-400 bg-emerald-500/20 ring-2 ring-emerald-400'
                              : showFront
                              ? 'border-amber-400 bg-white text-slate-900 shadow-lg scale-102'
                              : 'border-indigo-400/50 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 hover:scale-103 text-white'
                          }`}
                        >
                          {showFront ? (
                            card.type === 'image' && card.imageUrl ? (
                              <div className="flex flex-col items-center">
                                <img src={card.imageUrl} alt={card.text} className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
                                {card.isMatched && (
                                  <span className="text-[11px] font-black text-emerald-300 mt-0.5 capitalize">{card.text}</span>
                                )}
                              </div>
                            ) : (
                              <div className="text-center px-1">
                                <span className={`text-base sm:text-xl font-black capitalize block leading-tight ${card.isMatched ? 'text-emerald-300' : 'text-slate-900'}`}>
                                  {card.text}
                                </span>
                                {card.vietnameseText && (
                                  <span className={`text-xs font-bold block mt-0.5 ${card.isMatched ? 'text-emerald-200' : 'text-indigo-600'}`}>
                                    {card.vietnameseText}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400 font-bold mt-1 block">🔊 Từ vựng</span>
                              </div>
                            )
                          ) : (
                            <div className="flex flex-col items-center">
                              <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-black text-xs mb-1">
                                {cIdx + 1}
                              </span>
                              <HelpCircle className="w-6 h-6 opacity-85" />
                              <span className="text-[10px] font-black uppercase mt-0.5">Lật thẻ</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. COUNT_OBJECTS: Tap objects to count aloud then pick number */}
              {activity.activityType === 'COUNT_OBJECTS' && (() => {
                const rawQuantity = Number(question.metadata?.quantity || parseInt(String(question.correctAnswer), 10) || 3);
                const displayCount = Math.max(1, Math.min(rawQuantity, 10));
                const objWord = question.metadata?.object || targetWordText || 'star';
                const objLookup = vocabLookup.get(String(objWord).toLowerCase().trim());
                const objectImage = question.metadata?.image || question.promptImageUrl || objLookup?.imageUrl;

                // Ensure strictly unique options matching displayCount
                const safeCountOptions = (() => {
                  const existing = question.options || [];
                  const texts = existing.map(o => parseInt(String(o.text), 10));
                  const hasUniqueValid =
                    existing.length >= 3 &&
                    new Set(texts).size === existing.length &&
                    texts.includes(displayCount);
                  if (hasUniqueValid) {
                    return existing.map(o => ({
                      ...o,
                      isCorrect: parseInt(String(o.text), 10) === displayCount
                    }));
                  }
                  const d1 = displayCount > 1 ? displayCount - 1 : displayCount + 2;
                  const d2 = displayCount < 10 ? displayCount + 1 : displayCount - 2;
                  const nums = [displayCount, d1, d2];
                  const shift = questionIndex % nums.length;
                  const rotated = [...nums.slice(shift), ...nums.slice(0, shift)];
                  return rotated.map((n, idx) => ({
                    id: `cnt_safe_${questionIndex}_${idx}`,
                    text: `${n} (${NUMBER_WORDS[n - 1]})`,
                    isCorrect: n === displayCount
                  }));
                })();

                const handleAutoCountAll = async () => {
                  if (isAutoCounting) return;
                  setIsAutoCounting(true);
                  setTappedIndices([]);
                  for (let i = 0; i < displayCount; i++) {
                    setTappedIndices((prev) => [...prev, i]);
                    sfx.playPop();
                    void playWordAudio(NUMBER_WORDS[i]);
                    await new Promise((r) => setTimeout(r, 650));
                  }
                  setIsAutoCounting(false);
                };

                return (
                  <div className="flex flex-col items-center w-full">
                    <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                      <p className="text-purple-300 text-xs sm:text-sm font-bold">
                        🔢 Chạm vào từng hình để đếm to tiếng Anh cùng bé ({tappedIndices.length}/{displayCount}):
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleAutoCountAll()}
                        disabled={isAutoCounting}
                        className="px-3 py-1 rounded-xl bg-purple-500/25 hover:bg-purple-500/40 border border-purple-400/40 text-purple-200 text-xs font-black cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        🔊 Đếm mẫu 1 ➔ {displayCount}
                      </button>
                      {tappedIndices.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setTappedIndices([])}
                          className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold cursor-pointer"
                        >
                          Đếm lại
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2.5 bg-white/5 border border-purple-400/30 rounded-2xl p-3 mb-3 w-full max-w-3xl">
                      {Array.from({ length: displayCount }).map((_, idx) => {
                        const isCounted = tappedIndices.includes(idx);
                        const orderNum = tappedIndices.indexOf(idx) + 1;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              if (isCounted) return;
                              sfx.playPop();
                              const next = [...tappedIndices, idx];
                              setTappedIndices(next);
                              if (next.length <= NUMBER_WORDS.length) {
                                void playWordAudio(NUMBER_WORDS[next.length - 1]);
                              }
                            }}
                            className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 p-2 flex items-center justify-center cursor-pointer transition-all ${
                              isCounted
                                ? 'border-emerald-400 bg-white scale-105 ring-2 ring-emerald-400'
                                : 'border-white/20 bg-white/90 hover:border-amber-400'
                            }`}
                          >
                            {objectImage ? (
                              <img src={objectImage} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-3xl">⭐</span>
                            )}
                            {isCounted && (
                              <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 text-white font-black text-xs flex items-center justify-center shadow">
                                {orderNum}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                      {safeCountOptions.map((opt) => {
                        const isSelected = selectedOptionId === opt.id;
                        const isCorrect = Boolean(opt.isCorrect);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectOption(opt)}
                            className={`px-6 py-3 rounded-2xl border-2 font-black text-lg sm:text-xl cursor-pointer transition-all active:scale-95 ${
                              (selectedOptionId && isCorrect) || (revealed && isCorrect)
                                ? 'border-emerald-400 bg-emerald-500 text-slate-950 scale-105'
                                : isSelected && !isCorrect
                                ? 'border-rose-400 bg-rose-500 text-white'
                                : 'border-purple-400/50 bg-purple-500/20 hover:bg-purple-500/30 text-white'
                            }`}
                          >
                            {opt.text}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* 5. TRUE_FALSE: Show picture & statement, choose True or False */}
              {activity.activityType === 'TRUE_FALSE' && (() => {
                const displayImg =
                  question.metadata?.image ||
                  question.promptImageUrl ||
                  targetVocabDetail?.imageUrl;
                return (
                  <div className="flex flex-col items-center w-full">
                    {displayImg && (
                      <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl bg-white p-2.5 border-4 border-amber-300 mb-2.5 flex items-center justify-center shadow-lg">
                        <img src={displayImg} alt="" className="w-full h-full object-contain" />
                      </div>
                    )}
                    {question.metadata?.statement && (
                      <p className="text-lg sm:text-2xl font-black text-amber-300 mb-3 text-center">
                        &ldquo;{question.metadata.statement}&rdquo;
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
                      {question.options.map((opt) => {
                        const isTrueBtn = opt.text?.toLowerCase().includes('true') || opt.text?.toLowerCase().includes('đúng');
                        const isSelected = selectedOptionId === opt.id;
                        const isCorrect = Boolean(opt.isCorrect);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectOption(opt)}
                            className={`py-3.5 px-5 rounded-2xl border-2 font-black text-base sm:text-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 ${
                              (selectedOptionId && isCorrect) || (revealed && isCorrect)
                                ? 'border-emerald-300 bg-emerald-500 text-slate-950 ring-4 ring-emerald-400/40'
                                : isSelected && !isCorrect
                                ? 'border-rose-300 bg-rose-600 text-white'
                                : isTrueBtn
                                ? 'border-emerald-400/50 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200'
                                : 'border-rose-400/50 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200'
                            }`}
                          >
                            {isTrueBtn ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
                            <span>{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* 6. COLOR_RECOGNITION: Show color swatch badge & choose matching item */}
              {activity.activityType === 'COLOR_RECOGNITION' && (() => {
                const rawColor = String(question.metadata?.targetColor || question.correctAnswer || '').toLowerCase().trim();
                const theme = COLOR_HEX_MAP[rawColor];
                const lookup = vocabLookup.get(rawColor);

                return (
                  <div className="flex flex-col items-center w-full">
                    {theme ? (
                      <div
                        className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-2xl border-2 mb-3 bg-slate-900"
                        style={{ borderColor: theme.border }}
                      >
                        <span
                          className="w-6 h-6 rounded-full border border-white/60 shrink-0"
                          style={{
                            background: theme.isRainbow
                              ? 'linear-gradient(135deg, #EF4444, #F59E0B, #10B981, #3B82F6, #A855F7)'
                              : theme.border
                          }}
                        />
                        <span className="text-lg font-black capitalize text-white">{rawColor}</span>
                        <span className="text-xs font-bold text-amber-300">({theme.labelVi})</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl border-2 border-amber-400/60 mb-3 bg-slate-900">
                        <span className="text-lg">🎨</span>
                        <span className="text-lg font-black capitalize text-amber-300">{rawColor}</span>
                        {lookup?.vietnamese && (
                          <span className="text-xs font-bold text-slate-300">({lookup.vietnamese})</span>
                        )}
                      </div>
                    )}

                    <div className={`grid ${question.options.length <= 3 ? 'grid-cols-3 max-w-3xl' : 'grid-cols-2 sm:grid-cols-4 max-w-4xl'} gap-3 w-full`}>
                      {question.options.map((opt) => {
                        const isSelected = selectedOptionId === opt.id;
                        const isCorrect = Boolean(opt.isCorrect);
                        const optLookup = vocabLookup.get(String(opt.text || '').toLowerCase().trim());
                        const imgSrc = opt.imageUrl || optLookup?.imageUrl;
                        const viLabel = opt.vietnameseText || optLookup?.vietnamese;

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectOption(opt)}
                            className={`rounded-2xl border-2 p-3 flex flex-col items-center justify-center cursor-pointer transition-all ${
                              (selectedOptionId && isCorrect) || (revealed && isCorrect)
                                ? 'border-emerald-400 bg-emerald-500/20 ring-4 ring-emerald-400/40'
                                : isSelected
                                ? 'border-rose-500 bg-rose-500/20'
                                : 'border-white/15 bg-white/5 hover:border-amber-400'
                            }`}
                          >
                            <div className="w-20 h-20 sm:w-24 sm:h-24 mb-2 p-2 bg-white rounded-xl flex items-center justify-center">
                              {imgSrc ? <img src={imgSrc} alt="" className="w-full h-full object-contain" /> : <span className="text-3xl">🎨</span>}
                            </div>
                            <span className="font-black text-sm sm:text-base text-white capitalize">{opt.text}</span>
                            {viLabel && <span className="text-[11px] text-slate-300">{viLabel}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* 7. MISSING_OBJECT: Observation tray with REAL ILLUSTRATIONS -> 1 item disappears -> guess which one */}
              {activity.activityType === 'MISSING_OBJECT' && (() => {
                const missingName = question.correctAnswer || question.metadata?.missingObject || '';
                const rawVisible: string[] = question.metadata?.visibleObjects || [];
                const visibleObjects = rawVisible.length > 0
                  ? rawVisible
                  : lessonVocabList
                      .filter(v => v.english.toLowerCase() !== missingName.toLowerCase())
                      .slice(0, 3)
                      .map(v => v.english);

                const allTrayNames = [...visibleObjects, missingName].filter(Boolean);
                // Deterministic rotation during memorizing so the missing item isn't always last
                const shift = questionIndex % Math.max(1, allTrayNames.length);
                const rotatedMemorizing = [...allTrayNames.slice(shift), ...allTrayNames.slice(0, shift)];

                const getTrayAsset = (wordName: string) => {
                  const key = String(wordName).toLowerCase().trim();
                  const fromVocab = vocabLookup.get(key);
                  const fromOpt = question.options.find(o => String(o.text || '').toLowerCase().trim() === key);
                  return {
                    english: fromVocab?.english || wordName,
                    vietnamese: fromVocab?.vietnamese || fromOpt?.vietnameseText || '',
                    imageUrl: fromVocab?.imageUrl || fromOpt?.imageUrl || (key === missingName.toLowerCase().trim() ? question.promptImageUrl : '') || ''
                  };
                };

                return (
                  <div className="flex flex-col items-center w-full">
                    <div className="flex flex-wrap items-center justify-between gap-2 w-full max-w-3xl mb-2.5">
                      {missingStage === 'MEMORIZING' ? (
                        <span className="text-xs sm:text-sm font-black text-purple-300 flex items-center gap-1.5">
                          <Eye size={16} /> Bé hãy quan sát và nhớ các hình trên bàn ({missingTimeLeft}s)...
                        </span>
                      ) : (
                        <span className="text-xs sm:text-sm font-black text-amber-300">
                          🎩 Úm ba la! Hình nào trên bàn vừa biến mất rồi?
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          sfx.playPop();
                          if (missingStage === 'MEMORIZING') {
                            setMissingStage('GUESSING');
                            setMissingTimeLeft(0);
                          } else {
                            setMissingStage('MEMORIZING');
                            setMissingTimeLeft(5);
                            setSelectedOptionId(null);
                            setFeedbackStatus(null);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-xs font-black text-amber-200 cursor-pointer flex items-center gap-1.5"
                      >
                        <Timer size={14} />
                        <span>{missingStage === 'MEMORIZING' ? '🎩 Giấu 1 hình ngay!' : '👁️ Cho bé quan sát lại'}</span>
                      </button>
                    </div>

                    {/* Visual Tray with real illustrations */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/5 border border-amber-400/30 rounded-2xl p-3 mb-3 w-full max-w-3xl">
                      {missingStage === 'MEMORIZING' ? (
                        rotatedMemorizing.map((item, idx) => {
                          const asset = getTrayAsset(item);
                          return (
                            <div key={idx} className="p-2.5 rounded-2xl bg-white/10 border border-purple-400/40 flex flex-col items-center text-center">
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white p-1.5 mb-1.5 flex items-center justify-center">
                                {asset.imageUrl ? (
                                  <img src={asset.imageUrl} alt={asset.english} className="w-full h-full object-contain" />
                                ) : (
                                  <span className="text-3xl">🎁</span>
                                )}
                              </div>
                              <span className="text-sm font-black text-white capitalize">{asset.english}</span>
                              {asset.vietnamese && <span className="text-[11px] text-purple-200">{asset.vietnamese}</span>}
                            </div>
                          );
                        })
                      ) : (
                        <>
                          {visibleObjects.map((item, idx) => {
                            const asset = getTrayAsset(item);
                            return (
                              <div key={idx} className="p-2.5 rounded-2xl bg-white/10 border border-white/15 flex flex-col items-center text-center">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white p-1.5 mb-1.5 flex items-center justify-center">
                                  {asset.imageUrl ? (
                                    <img src={asset.imageUrl} alt={asset.english} className="w-full h-full object-contain" />
                                  ) : (
                                    <span className="text-3xl">🎁</span>
                                  )}
                                </div>
                                <span className="text-sm font-black text-slate-200 capitalize">{asset.english}</span>
                                {asset.vietnamese && <span className="text-[11px] text-slate-400">{asset.vietnamese}</span>}
                              </div>
                            );
                          })}
                          <div className="p-2.5 rounded-2xl bg-amber-500/20 border-2 border-dashed border-amber-400 flex flex-col items-center justify-center text-center animate-pulse">
                            <span className="text-4xl block mb-1">❓</span>
                            <span className="text-xs font-black text-amber-300 uppercase">Hình nào biến mất?</span>
                          </div>
                        </>
                      )}
                    </div>

                    {missingStage === 'GUESSING' && (
                      <div className={`grid ${question.options.length <= 3 ? 'grid-cols-3 max-w-2xl' : 'grid-cols-2 sm:grid-cols-4 max-w-3xl'} gap-3 w-full`}>
                        {question.options.map((opt) => {
                          const isSelected = selectedOptionId === opt.id;
                          const isCorrect = Boolean(opt.isCorrect);
                          const asset = getTrayAsset(opt.text || '');
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleSelectOption(opt)}
                              className={`p-2.5 rounded-2xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 ${
                                (selectedOptionId && isCorrect) || (revealed && isCorrect)
                                  ? 'border-emerald-400 bg-emerald-500/25 ring-2 ring-emerald-400'
                                  : isSelected
                                  ? 'border-rose-500 bg-rose-500/30 text-white'
                                  : 'border-white/15 bg-white/5 hover:border-amber-400 text-white'
                              }`}
                            >
                              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white p-1.5 mb-1 flex items-center justify-center">
                                {asset.imageUrl ? (
                                  <img src={asset.imageUrl} alt={asset.english} className="w-full h-full object-contain" />
                                ) : (
                                  <span className="text-2xl">🎁</span>
                                )}
                              </div>
                              <span className="font-black text-sm capitalize text-white">{opt.text}</span>
                              {asset.vietnamese && <span className="text-[10px] text-amber-200">{asset.vietnamese}</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 8. CLASSIFICATION / DRAG_DROP: Sort or place the target item into the right category/box */}
              {['CLASSIFICATION', 'DRAG_DROP'].includes(activity.activityType) && (() => {
                const itemImg = question.promptImageUrl || correctOption?.imageUrl || targetVocabDetail?.imageUrl;
                const isDragDrop = activity.activityType === 'DRAG_DROP';

                return (
                  <div className="flex flex-col items-center w-full">
                    <div className="flex items-center gap-3.5 bg-white/10 border-2 border-dashed border-indigo-400/60 rounded-2xl px-5 py-3 mb-3">
                      {isDragDrop && !(selectedOptionId && feedbackStatus === 'CORRECT') ? (
                        <div className="w-16 h-16 rounded-xl bg-indigo-950/80 border-2 border-dashed border-indigo-300 flex items-center justify-center text-3xl">
                          📥
                        </div>
                      ) : itemImg ? (
                        <img src={itemImg} alt="" className="w-16 h-16 object-contain bg-white rounded-xl p-1.5 border-2 border-emerald-400" />
                      ) : (
                        <span className="text-3xl">📦</span>
                      )}
                      <div className="text-left">
                        <span className="text-[11px] font-black uppercase text-indigo-300 block">
                          {activity.activityType === 'CLASSIFICATION'
                            ? 'Phân loại vào nhóm đúng:'
                            : 'Hộp Đích — Chạm chọn hình đúng bên dưới để đặt vào hộp:'}
                        </span>
                        <span className="text-base sm:text-lg font-black text-white">{question.promptText}</span>
                      </div>
                    </div>

                    <div className={`grid ${question.options.length <= 3 ? 'grid-cols-1 sm:grid-cols-3 max-w-3xl' : 'grid-cols-2 sm:grid-cols-4 max-w-4xl'} gap-3 w-full`}>
                      {question.options.map((opt) => {
                        const isSelected = selectedOptionId === opt.id;
                        const isCorrect = Boolean(opt.isCorrect);
                        const optLookup = vocabLookup.get(String(opt.text || '').toLowerCase().trim());
                        const optImg = opt.imageUrl || optLookup?.imageUrl;
                        const optVi = opt.vietnameseText || optLookup?.vietnamese;

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectOption(opt)}
                            className={`rounded-2xl border-2 p-3.5 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 ${
                              (selectedOptionId && isCorrect) || (revealed && isCorrect)
                                ? 'border-emerald-400 bg-emerald-500/25 text-emerald-200 ring-2 ring-emerald-400'
                                : isSelected
                                ? 'border-rose-400 bg-rose-500/20 text-rose-200'
                                : 'border-indigo-400/50 bg-indigo-950/40 hover:bg-indigo-900/50 text-white'
                            }`}
                          >
                            {optImg ? (
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white p-1.5 mb-1.5 flex items-center justify-center">
                                <img src={optImg} alt={opt.text || ''} className="w-full h-full object-contain" />
                              </div>
                            ) : (
                              <span className="text-2xl mb-1">{activity.activityType === 'CLASSIFICATION' ? '🗂️' : '📥'}</span>
                            )}
                            <span className="font-black text-sm sm:text-base capitalize">{opt.text}</span>
                            {optVi && <span className="text-[11px] text-indigo-200">{optVi}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* 9. LISTEN_REPEAT: Listen to native pronunciation & practice with Koko */}
              {activity.activityType === 'LISTEN_REPEAT' && (() => {
                const repeatTarget = question.metadata?.speechTarget || question.correctAnswer || correctOption?.text || question.promptText;
                const lookup = vocabLookup.get(String(repeatTarget).toLowerCase().trim());
                const repeatImg = question.promptImageUrl || lookup?.imageUrl;
                const repeatVi = question.metadata?.vietnameseText || lookup?.vietnamese;

                return (
                  <div className="flex flex-col items-center w-full max-w-xl">
                    {repeatImg && (
                      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-white p-2 border-4 border-teal-400 mb-2 flex items-center justify-center">
                        <img src={repeatImg} alt={repeatTarget} className="w-full h-full object-contain" />
                      </div>
                    )}
                    <h4 className="text-2xl sm:text-4xl font-black text-amber-300 uppercase mb-0.5">{repeatTarget}</h4>
                    {repeatVi && <p className="text-sm font-bold text-teal-200 mb-2">({repeatVi})</p>}
                    <KokoSpeakingCoach
                      targetWord={repeatTarget}
                      audioUrl={question.promptAudioUrl || lookup?.audioUrl}
                      ageGroup={session.ageGroup}
                      contextKey={`${session._id}:act-repeat:${activity._id}:${questionIndex}`}
                      onCallStudent={
                        onSpotlightStudent && roster.length > 0
                          ? () => {
                              const rand = roster[Math.floor(Math.random() * roster.length)];
                              onSpotlightStudent(rand, repeatTarget);
                            }
                          : undefined
                      }
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFeedbackStatus('CORRECT');
                        markAllAnswers('CORRECT');
                      }}
                      className="mt-3 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm cursor-pointer"
                    >
                      ✓ Xác nhận cả lớp / bé đã đọc tốt
                    </button>
                  </div>
                );
              })()}

              {/* 10. FEED_ANIMAL: Context-aware Koko Bear helper */}
              {activity.activityType === 'FEED_ANIMAL' && (() => {
                const targetName = correctOption?.text || question.promptText || targetWordText;
                const isFood = FOOD_KEYWORDS.has(String(targetName).toLowerCase().trim());
                const targetVi = targetVocabDetail?.vietnamese;

                return (
                  <div className="flex flex-col items-center w-full">
                    <div className="flex items-center gap-4 p-3.5 bg-gradient-to-r from-amber-500/15 to-orange-500/10 rounded-2xl border border-amber-400/30 w-full max-w-xl mb-3">
                      <div className={`text-5xl sm:text-6xl transition-transform duration-500 ${isFeeding ? 'scale-125 animate-bounce' : ''}`}>
                        {fedSuccess ? (isFood ? '😋' : '🥰') : isFeeding ? '😮' : '🐻'}
                      </div>
                      <div className="text-left">
                        <p className="text-xs sm:text-sm font-black text-amber-300">
                          {fedSuccess
                            ? isFood
                              ? `Yum yum! Cảm ơn bé! Món "${targetName}" ngon tuyệt! 🎉`
                              : `Hoan hô! Gấu Koko nhận được "${targetName}" rồi! Cảm ơn bé! 🎉`
                            : isFeeding
                            ? isFood
                              ? 'Nham nham… Koko đang măm măm! 🍴'
                              : 'Tuyệt quá… Đang trao cho Gấu Koko! 🎁'
                            : isFood
                            ? `“Koko đói quá! Bé chạm chọn món ‘${targetName}’${targetVi ? ` (${targetVi})` : ''} cho Koko măm nhé!”`
                            : `“Bạn Gấu Koko đang cần ‘${targetName}’${targetVi ? ` (${targetVi})` : ''}! Bé chạm chọn đúng hình tặng Koko nhé!”`}
                        </p>
                      </div>
                    </div>
                    <div className={`grid ${question.options.length <= 3 ? 'grid-cols-3 max-w-2xl' : 'grid-cols-2 sm:grid-cols-4 max-w-3xl'} gap-3 w-full`}>
                      {question.options.map((opt) => {
                        const isCorrect = Boolean(opt.isCorrect);
                        const isChosen = selectedOptionId === opt.id;
                        const optLookup = vocabLookup.get(String(opt.text || '').toLowerCase().trim());
                        const imgSrc = opt.imageUrl || optLookup?.imageUrl;
                        const viLabel = opt.vietnameseText || optLookup?.vietnamese;

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={isFeeding}
                            onClick={() => {
                              setSelectedOptionId(opt.id);
                              if (opt.text) void playWordAudio(opt.text);
                              if (isCorrect) {
                                setIsFeeding(true);
                                setTimeout(() => {
                                  setIsFeeding(false);
                                  setFedSuccess(true);
                                  setFeedbackStatus('CORRECT');
                                  sfx.playStarFanfare();
                                  markAllAnswers('CORRECT');
                                }, 600);
                              } else {
                                setFeedbackStatus('WRONG');
                                sfx.playGentleWrong();
                              }
                            }}
                            className={`rounded-2xl border-2 p-3 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 ${
                              (isChosen && isCorrect) || (revealed && isCorrect)
                                ? 'border-emerald-400 bg-emerald-500/20 ring-2 ring-emerald-400'
                                : isChosen
                                ? 'border-rose-500 bg-rose-500/20'
                                : 'border-white/15 bg-white/5 hover:border-amber-400'
                            }`}
                          >
                            <div className="w-16 h-16 sm:w-20 sm:h-20 mb-1.5 p-1.5 bg-white rounded-xl flex items-center justify-center">
                              {imgSrc ? <img src={imgSrc} alt="" className="w-full h-full object-contain" /> : <span className="text-3xl">🍎</span>}
                            </div>
                            <span className="font-black text-sm text-white capitalize">{opt.text}</span>
                            {viLabel && <span className="text-[11px] text-slate-300">{viLabel}</span>}
                            <span className="text-[10px] text-amber-300 font-bold mt-0.5">
                              {isFood ? 'Chạm cho ăn 🍽️' : 'Chạm tặng Koko 🎁'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* 11. BUBBLE_POP: Glossy Floating Water Bubbles */}
              {activity.activityType === 'BUBBLE_POP' && (
                <div className="flex flex-col items-center w-full">
                  <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                    <p className="text-sky-300 text-xs sm:text-sm font-bold">
                      🫧 Chạm để đập bể quả bong bóng mang hình &ldquo;{targetWordText}&rdquo;
                      {targetVocabDetail?.vietnamese ? ` (${targetVocabDetail.vietnamese})` : ''}:
                    </p>
                    {poppedBubbleIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          sfx.playPop();
                          setPoppedBubbleIds([]);
                          setPoppedOptionId(null);
                          setSelectedOptionId(null);
                          setFeedbackStatus(null);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-xs font-black flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        <RotateCcw size={12} />
                        <span>Thổi lại bóng 🫧</span>
                      </button>
                    )}
                  </div>
                  <div className={`grid ${question.options.length <= 3 ? 'grid-cols-3 max-w-2xl' : 'grid-cols-2 sm:grid-cols-4 max-w-3xl'} gap-4 w-full justify-items-center`}>
                    {question.options.map((opt) => {
                      const isCorrect = Boolean(opt.isCorrect);
                      const isPopped = poppedBubbleIds.includes(opt.id) || poppedOptionId === opt.id;
                      const optLookup = vocabLookup.get(String(opt.text || '').toLowerCase().trim());
                      const imgSrc = opt.imageUrl || optLookup?.imageUrl;

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            sfx.playPop();
                            setPoppedBubbleIds((prev) => (prev.includes(opt.id) ? prev : [...prev, opt.id]));
                            setPoppedOptionId(opt.id);
                            handleSelectOption(opt);
                          }}
                          className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center p-3 cursor-pointer transition-all duration-300 ${
                            isPopped
                              ? isCorrect
                                ? 'border-3 border-dashed border-emerald-300 bg-emerald-500/25 ring-4 ring-emerald-400/50 scale-105'
                                : 'border-2 border-dashed border-sky-300/40 bg-white/5 scale-90 opacity-65'
                              : revealed && isCorrect
                              ? 'border-3 border-emerald-300 bg-emerald-500/30 ring-4 ring-emerald-400 scale-105'
                              : 'border-3 border-sky-200/80 bg-gradient-to-br from-sky-300/40 via-cyan-400/25 to-purple-500/40 shadow-[inset_-6px_-6px_16px_rgba(56,189,248,0.45),inset_6px_6px_14px_rgba(255,255,255,0.65)] hover:scale-105 active:scale-125'
                          }`}
                        >
                          {!isPopped && (
                            <span className="pointer-events-none absolute top-3 left-5 w-5 h-2.5 rounded-full bg-white/70 -rotate-30" />
                          )}

                          {isPopped ? (
                            <>
                              <span className="text-2xl sm:text-3xl mb-0.5 animate-bounce">
                                {isCorrect ? '🎉💥' : '💥💦'}
                              </span>
                              <span className={`font-black text-xs sm:text-sm capitalize ${isCorrect ? 'text-emerald-200' : 'text-slate-300 line-through'}`}>
                                {opt.text}
                              </span>
                              <span className="text-[10px] font-black uppercase tracking-wider text-sky-300">
                                {isCorrect ? 'Đúng rồi!' : 'Bụp! Đã bể'}
                              </span>
                            </>
                          ) : (
                            <>
                              {imgSrc ? (
                                <img src={imgSrc} alt="" className="w-12 h-12 sm:w-14 sm:h-14 object-contain mb-1 bg-white/90 rounded-full p-1" />
                              ) : (
                                <span className="text-2xl mb-1">🫧</span>
                              )}
                              <span className="font-black text-xs sm:text-sm text-white capitalize break-words leading-tight">{opt.text}</span>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 12. STAR_CATCHER: Night Sky Star Catching Basket Game */}
              {activity.activityType === 'STAR_CATCHER' && (
                <div className="flex flex-col items-center w-full">
                  <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                    <p className="text-amber-300 text-xs sm:text-sm font-bold">
                      ⭐ Chạm thu hoạch ngôi sao mang từ &ldquo;{targetWordText}&rdquo;
                      {targetVocabDetail?.vietnamese ? ` (${targetVocabDetail.vietnamese})` : ''} vào giỏ sao của Koko:
                    </p>
                  </div>

                  <div className={`grid ${question.options.length <= 3 ? 'grid-cols-3 max-w-2xl' : 'grid-cols-2 sm:grid-cols-4 max-w-3xl'} gap-4 w-full justify-items-center mb-3`}>
                    {question.options.map((opt) => {
                      const isCorrect = Boolean(opt.isCorrect);
                      const isCaught = selectedOptionId === opt.id;
                      const optLookup = vocabLookup.get(String(opt.text || '').toLowerCase().trim());
                      const imgSrc = opt.imageUrl || optLookup?.imageUrl;

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectOption(opt)}
                          className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl flex flex-col items-center justify-center p-3 cursor-pointer transition-all duration-300 ${
                            (isCaught && isCorrect) || (revealed && isCorrect)
                              ? 'border-3 border-emerald-300 bg-gradient-to-br from-emerald-500/40 to-teal-500/40 ring-4 ring-emerald-400 scale-105'
                              : isCaught && !isCorrect
                              ? 'border-2 border-rose-400 bg-rose-500/20 scale-95 opacity-60'
                              : 'border-2 border-amber-300/80 bg-gradient-to-b from-amber-400/30 via-yellow-500/20 to-orange-500/30 shadow-[0_0_24px_rgba(251,191,36,0.35)] hover:scale-105'
                          }`}
                        >
                          <span className="absolute -top-2.5 -right-2 text-xl">🌟</span>
                          {imgSrc ? (
                            <img src={imgSrc} alt="" className="w-12 h-12 sm:w-14 sm:h-14 object-contain mb-1 bg-white rounded-xl p-1" />
                          ) : (
                            <span className="text-3xl mb-1">⭐</span>
                          )}
                          <span className="font-black text-xs sm:text-sm text-white capitalize">{opt.text}</span>
                          {optLookup?.vietnamese && (
                            <span className="text-[10px] text-amber-200 font-bold">{optLookup.vietnamese}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Koko's Star Basket */}
                  <div className="px-6 py-2 rounded-2xl bg-amber-500/20 border-2 border-amber-400/50 text-amber-200 text-xs font-black flex items-center gap-2">
                    <span className="text-xl">🧺</span>
                    <span>
                      {feedbackStatus === 'CORRECT'
                        ? `🎉 Đã hứng được ngôi sao "${targetWordText}" vào giỏ của Koko!`
                        : 'Giỏ Hứng Sao Của Koko — Chạm chọn ngôi sao đúng ở trên!'}
                    </span>
                  </div>
                </div>
              )}

              {/* Feedback Banner */}
              {feedbackStatus === 'CORRECT' && (
                <div className="mt-2.5 flex items-center gap-2 text-emerald-300 font-black text-xs sm:text-sm bg-emerald-500/15 border border-emerald-400/40 px-4 py-2 rounded-2xl animate-fade-in">
                  <CheckCircle2 size={16} />
                  <span>Hoan hô! Đáp án hoàn toàn chính xác! Cô có thể bấm thưởng sao cho bé bên phải nhé! 🎉</span>
                </div>
              )}
              {feedbackStatus === 'WRONG' && (
                <div className="mt-2.5 flex items-center gap-2 text-rose-300 font-bold text-xs sm:text-sm bg-rose-500/15 border border-rose-400/40 px-4 py-2 rounded-2xl animate-fade-in">
                  <XCircle size={16} />
                  <span>Chưa đúng rồi! Bé nghe lại phát âm và thử chọn lại nhé!</span>
                </div>
              )}
              {error && (
                <p role="alert" className="mt-2 text-rose-300 font-bold text-xs bg-rose-500/20 px-3 py-1.5 rounded-xl border border-rose-400/30">
                  {error}
                </p>
              )}
            </div>

            {/* Bottom Navigation Bar */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2.5 shrink-0">
              {isMemoryMode ? (
                <>
                  <button
                    type="button"
                    disabled={memoryRound === 0}
                    onClick={() => {
                      setMemoryRound((r) => Math.max(0, r - 1));
                      sfx.playPop();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft size={15} /> Vòng trước
                  </button>

                  <button
                    type="button"
                    onClick={() => void onSave(activity._id, memoryRound, `Memory Round ${memoryRound + 1}`, answers)}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
                  >
                    <Save size={15} /> Lưu kết quả vòng thẻ
                  </button>

                  <button
                    type="button"
                    disabled={memoryRound >= memoryRoundCount - 1}
                    onClick={() => {
                      setMemoryRound((r) => Math.min(memoryRoundCount - 1, r + 1));
                      sfx.playPop();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                  >
                    Vòng tiếp <ChevronRight size={15} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={questionIndex === 0}
                    onClick={() => {
                      setQuestionIndex((i) => i - 1);
                      sfx.playPop();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft size={15} /> Câu trước
                  </button>

                  <button
                    type="button"
                    onClick={() => void onSave(activity._id, questionIndex, question.promptText, answers)}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
                  >
                    <Save size={15} /> Lưu kết quả câu hỏi
                  </button>

                  <button
                    type="button"
                    disabled={questionIndex >= activity.questions.length - 1}
                    onClick={() => {
                      setQuestionIndex((i) => i + 1);
                      sfx.playPop();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                  >
                    Câu sau <ChevronRight size={15} />
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-slate-400 my-auto">
            <p className="text-sm font-bold">Hoạt động này chưa có câu hỏi để trình chiếu.</p>
          </div>
        )}
      </section>

      {/* ── Right 4 Cols: Super-Compact Student Roster Sidebar ("Siêu gọn") ── */}
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-white/15 bg-slate-900/90 p-2.5 sm:p-3 text-white lg:col-span-4">
        <div className="flex items-center justify-between pb-1.5 border-b border-white/10 mb-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Award size={15} className="text-purple-400" />
            <h3 className="font-black text-xs sm:text-sm text-white">Danh sách học sinh ({roster.length})</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => markAllAnswers('CORRECT')}
              className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 text-[11px] font-black cursor-pointer active:scale-95"
            >
              ✓ Cả lớp đúng
            </button>
            <button
              type="button"
              onClick={() => {
                const correctIds = Object.entries(answers)
                  .filter(([_, res]) => res === 'CORRECT')
                  .map(([id]) => id);
                if (onAwardAllCorrect) {
                  onAwardAllCorrect(correctIds, 1);
                }
              }}
              className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-[11px] font-black flex items-center gap-0.5 cursor-pointer active:scale-95"
            >
              <Star size={11} className="fill-amber-400" /> Thưởng đúng
            </button>
          </div>
        </div>

        {/* Ultra-Compact Student Grid — 2 columns of single-line pills */}
        <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1 content-start pr-0.5">
          {roster.map((row) => {
            const student = row.student as User;
            const id = String(typeof row.student === 'string' ? row.student : student._id || (student as any).id || '');
            const sName = student.name || 'Học sinh';
            const currentAns = answers[id] || 'NOT_ANSWERED';

            return (
              <div
                key={id}
                className={`flex items-center justify-between gap-1 rounded-lg border px-2 py-1 transition-colors ${
                  currentAns === 'CORRECT'
                    ? 'border-emerald-400/80 bg-emerald-500/15'
                    : currentAns === 'INCORRECT'
                    ? 'border-rose-400/60 bg-rose-500/15'
                    : 'bg-white/5 border-white/10 hover:border-purple-400/40'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    const next =
                      currentAns === 'NOT_ANSWERED'
                        ? 'CORRECT'
                        : currentAns === 'CORRECT'
                        ? 'INCORRECT'
                        : 'NOT_ANSWERED';
                    onAnswers({ ...answers, [id]: next });
                    sfx.playPop();
                  }}
                  className="flex items-center gap-1 min-w-0 flex-1 text-left cursor-pointer"
                  title="Bấm tên bé để chuyển trạng thái: Đúng (✓) / Sai (✕)"
                >
                  <span
                    className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center shrink-0 ${
                      currentAns === 'CORRECT'
                        ? 'bg-emerald-500 text-slate-950'
                        : currentAns === 'INCORRECT'
                        ? 'bg-rose-500 text-white'
                        : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {currentAns === 'CORRECT' ? '✓' : currentAns === 'INCORRECT' ? '✕' : '•'}
                  </span>
                  <span className="text-xs shrink-0" role="img" aria-label={student.avatar}>
                    {getStudentEmoji(student.avatar)}
                  </span>
                  <span className="text-xs font-bold text-white truncate">{sName}</span>
                  <span className="text-[10px] text-amber-300 font-black shrink-0">⭐{row.stars}</span>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  {onAwardStudent && (
                    <button
                      type="button"
                      onClick={() => onAwardStudent(id, 1)}
                      className="px-1.5 py-0.5 rounded bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-[10px] cursor-pointer active:scale-95"
                      title="Thưởng +1 sao"
                    >
                      +1⭐
                    </button>
                  )}
                  {onSpotlightStudent && (
                    <button
                      type="button"
                      onClick={() => onSpotlightStudent(row, targetWordText)}
                      className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-sky-200 font-bold text-[10px] cursor-pointer"
                      title="Gọi bé trả lời"
                    >
                      Gọi
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
