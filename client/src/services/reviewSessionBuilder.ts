import { VOCAB_LEARNING_CONFIG, type WordLearningState } from '../config/vocabLearningConfig';
import type { WordMasteryDetail } from './vocabMasteryService';

export interface ReviewSessionItem {
  targetWord: WordMasteryDetail & { state: WordLearningState };
  options: (WordMasteryDetail & { isCorrect: boolean })[];
}

export interface ReviewSessionPlan {
  items: ReviewSessionItem[];
  scope: string;
}

/**
 * Pseudo-random generator with optional seed for deterministic testing
 */
function createPrng(seed?: number) {
  let s = seed !== undefined ? seed : Math.floor(Math.random() * 1000000);
  return function next() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * Hàm thuần buildReviewSession
 * 1. Chọn từ đích theo quota (tối đa 2 review, tối đa 2 learning, bù bằng mastered).
 * 2. Câu đầu và câu cuối ưu tiên từ "dễ" (thành công nhiều nhất) để bé khởi đầu và kết thúc bằng nụ cười.
 * 3. Mỗi câu có 2-3 lựa chọn (câu đầu 2, các câu sau tối đa 3).
 * 4. Lựa chọn nhiễu lấy từ kho từ ĐÃ GẶP của bé (hoặc fallback), không lặp y hệt bộ lựa chọn ở hai câu liên tiếp.
 * 5. Tối đa 1 từ đích khác của cùng phiên làm nhiễu.
 */
export function buildReviewSession(
  allWords: (WordMasteryDetail & { state: WordLearningState })[],
  scope: string = 'all',
  _now: number = Date.now(),
  config = VOCAB_LEARNING_CONFIG,
  seed?: number
): ReviewSessionPlan {
  const prng = createPrng(seed);

  // 1. Lọc theo phạm vi (scope)
  let inScope = allWords.filter(w => {
    if (scope === 'all') return true;
    if (scope.startsWith('word:')) {
      const targetId = scope.slice(5);
      return w.vocabId === targetId || w._id === targetId;
    }
    if (scope.startsWith('topic:')) {
      const topicSlug = scope.slice(6);
      return (w as any).topicSlug === topicSlug || w.topicName === topicSlug || (w as any).category === topicSlug;
    }
    if (scope.startsWith('lesson:')) {
      const lessonKey = scope.slice(7);
      return (w as any).lessonKey === lessonKey || (w as any).sourceId === lessonKey;
    }
    return true;
  });

  // Nếu phạm vi quá nhỏ (< 2 từ) và không phải là đích danh 1 từ: mở rộng sang 'all'
  if (inScope.length < 2 && !scope.startsWith('word:')) {
    inScope = [...allWords];
  }

  // 2. Phân loại từ đích
  const reviewPool = inScope.filter(w => w.state === 'review')
    .sort((a, b) => a.lastPracticedAt - b.lastPracticedAt); // Khát lâu nhất lên trước
  
  const learningPool = inScope.filter(w => w.state === 'learning')
    .sort((a, b) => (b.rememberCount || 0) - (a.rememberCount || 0)); // Gần thuộc nhất

  const masteredPool = inScope.filter(w => w.state === 'mastered')
    .sort((a, b) => b.lastPracticedAt - a.lastPracticedAt);

  // Áp dụng quota
  let chosenTargets: (WordMasteryDetail & { state: WordLearningState })[] = [];

  if (scope.startsWith('word:')) {
    // Nếu chỉ định word: từ đó luôn đứng đầu
    const targetWord = inScope[0] || allWords[0];
    if (targetWord) chosenTargets.push(targetWord);
  }

  // Lấy tối đa SESSION_MAX_REVIEW từ khát
  const pickedReview = reviewPool
    .filter(w => !chosenTargets.some(c => c._id === w._id))
    .slice(0, config.SESSION_MAX_REVIEW);
  chosenTargets.push(...pickedReview);

  // Lấy tối đa SESSION_MAX_LEARNING từ đang học
  const pickedLearning = learningPool
    .filter(w => !chosenTargets.some(c => c._id === w._id))
    .slice(0, config.SESSION_MAX_LEARNING);
  chosenTargets.push(...pickedLearning);

  // Bù bằng từ đã thuộc nếu chưa đủ REVIEW_SESSION_WORDS
  const remainingCount = config.REVIEW_SESSION_WORDS - chosenTargets.length;
  if (remainingCount > 0) {
    const pickedMastered = masteredPool
      .filter(w => !chosenTargets.some(c => c._id === w._id))
      .slice(0, remainingCount);
    chosenTargets.push(...pickedMastered);
  }

  // Nếu vẫn chưa đủ, lấy thêm từ bất kỳ còn lại
  if (chosenTargets.length < Math.min(config.REVIEW_SESSION_WORDS, inScope.length)) {
    const pool = [...inScope].filter(w => !chosenTargets.some(c => c._id === w._id));
    chosenTargets.push(...pool.slice(0, config.REVIEW_SESSION_WORDS - chosenTargets.length));
  }

  // 3. Sắp xếp thứ tự câu hỏi: Câu đầu và câu cuối là từ "dễ" (thành công nhiều nhất), từ khát ở giữa
  if (chosenTargets.length >= 3) {
    const sortedByEase = [...chosenTargets].sort(
      (a, b) => ((b.rememberCount || 0) + (b.gamesCorrectCount || 0)) - ((a.rememberCount || 0) + (a.gamesCorrectCount || 0))
    );
    const easiest1 = sortedByEase[0];
    const easiest2 = sortedByEase[1];
    const others = chosenTargets.filter(w => w._id !== easiest1._id && w._id !== easiest2._id);

    chosenTargets = [easiest1, ...others, easiest2];
  }

  // 4. Sinh các lựa chọn (options) cho từng câu
  const items: ReviewSessionItem[] = [];
  let previousOptionIds: string[] = [];

  const targetIds = new Set(chosenTargets.map(t => t._id));

  // Pool nhiễu từ kho từ đã gặp
  const distractorPool = allWords.filter(w => !targetIds.has(w._id));

  chosenTargets.forEach((target, qIdx) => {
    // Câu đầu 2 lựa chọn, các câu sau 3 lựa chọn
    const numOptions = qIdx === 0 ? config.SESSION_OPTIONS_FIRST : config.SESSION_OPTIONS_MAX;

    // Chọn tối đa 1 từ đích khác của cùng phiên làm nhiễu
    const otherTargets = chosenTargets.filter(t => t._id !== target._id);
    const availableDistractors = [...distractorPool];

    // Lựa chọn các ứng viên nhiễu
    const chosenDistractors: WordMasteryDetail[] = [];

    // Thêm 1 từ đích khác nếu có
    if (otherTargets.length > 0 && prng() > 0.4) {
      const randomTargetIndex = Math.floor(prng() * otherTargets.length);
      chosenDistractors.push(otherTargets[randomTargetIndex]);
    }

    // Xáo trộn distractorPool
    const shuffledPool = [...availableDistractors].sort(() => prng() - 0.5);

    for (const d of shuffledPool) {
      if (chosenDistractors.length >= numOptions - 1) break;
      if (!chosenDistractors.some(c => c._id === d._id)) {
        chosenDistractors.push(d);
      }
    }

    // Nếu kho nhiễu vẫn thiếu, lấy tạm từ các từ khác trong allWords
    if (chosenDistractors.length < numOptions - 1) {
      for (const d of allWords) {
        if (chosenDistractors.length >= numOptions - 1) break;
        if (d._id !== target._id && !chosenDistractors.some(c => c._id === d._id)) {
          chosenDistractors.push(d);
        }
      }
    }

    // Đóng gói danh sách lựa chọn
    let questionOptions = [
      { ...target, isCorrect: true },
      ...chosenDistractors.map(d => ({ ...d, isCorrect: false })),
    ];

    // Xáo trộn vị trí đáp án
    questionOptions.sort(() => prng() - 0.5);

    // Kiểm tra không lặp y hệt bộ lựa chọn của câu trước
    const currentOptionIds = questionOptions.map(o => o._id).sort().join(',');
    const prevSortedIds = [...previousOptionIds].sort().join(',');

    if (currentOptionIds === prevSortedIds && questionOptions.length > 2) {
      // Đảo vị trí hoặc đổi một phương án nếu có
      questionOptions = [questionOptions[1], questionOptions[0], ...questionOptions.slice(2)];
    }

    previousOptionIds = questionOptions.map(o => o._id);

    items.push({
      targetWord: target,
      options: questionOptions,
    });
  });

  return { items, scope };
}
