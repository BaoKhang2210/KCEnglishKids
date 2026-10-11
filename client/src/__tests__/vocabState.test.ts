import { deriveWordState, formatPronunciation } from '../services/vocabStateSelector';
import { VOCAB_LEARNING_CONFIG } from '../config/vocabLearningConfig';

/**
 * Suite kiểm thử đơn vị độc lập cho hệ thống Vocab State:
 * 1. Bất biến toán học: learned = learning + mastered + review
 * 2. Cơ chế Spaced Repetition (Đồng hồ giả - Fake Timer)
 * 3. Chuẩn hóa format phiên âm (chỉ 1 cặp gạch chéo)
 * 4. Quyền ghi đè của Phụ huynh (Parent Override)
 */
export function runVocabStateUnitTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
      console.log(`[PASS] ${testName}`);
    } else {
      failed++;
      errors.push(testName);
      console.error(`[FAIL] ${testName}`);
    }
  }

  // --- Test 1: Chuẩn hóa phiên âm ---
  assert(formatPronunciation('//peɪnt//') === '/peɪnt/', 'formatPronunciation handles double slashes');
  assert(formatPronunciation('/kæt/') === '/kæt/', 'formatPronunciation handles standard single slashes');
  assert(formatPronunciation('dɒɡ') === '/dɒɡ/', 'formatPronunciation wraps raw word without slashes');
  assert(formatPronunciation('') === '', 'formatPronunciation returns empty for empty input');

  // --- Test 2: Bất biến toán học và phân nhóm ---
  const mockVocabs = [
    { _id: '1', vocabId: '1', status: 'MASTERED' as const, rememberCount: 3, reviewCount: 0 },
    { _id: '2', vocabId: '2', status: 'REVIEW' as const, rememberCount: 0, reviewCount: 2 },
    { _id: '3', vocabId: '3', status: 'LEARNING' as const, rememberCount: 1, reviewCount: 0 },
    { _id: '4', vocabId: '4', status: 'LEARNING' as const, rememberCount: 0, reviewCount: 0 },
    { _id: '5', vocabId: '5', status: 'MASTERED' as const, rememberCount: 5, reviewCount: 0 },
  ];

  const now = 1700000000000;
  const states = mockVocabs.map(v => deriveWordState(v, now).state);
  const masteredCount = states.filter(s => s === 'mastered').length;
  const reviewCount = states.filter(s => s === 'review').length;
  const learningCount = states.filter(s => s === 'learning').length;

  assert(
    masteredCount + reviewCount + learningCount === mockVocabs.length,
    'Math Invariant: learned === learning + mastered + review'
  );
  assert(masteredCount === 2, 'Correct initial mastered count');
  assert(reviewCount === 1, 'Correct initial review count');
  assert(learningCount === 2, 'Correct initial learning count');

  // --- Test 3: Đồng hồ giả (Fake Timer / Spaced Repetition) ---
  const dayMs = 24 * 60 * 60 * 1000;
  const t0 = 1700000000000; // Thời điểm học xong
  const masteredWord = {
    _id: 'm1',
    vocabId: 'm1',
    status: 'MASTERED' as const,
    rememberCount: 3,
    reviewCount: 1,
    lastPracticedAt: t0,
    lastSuccessAt: t0,
    reviewStage: 0, // Interval = 1 day
  };

  // Ngay sau khi học (t0 + 1 giờ): phải là mastered
  const stateAt1h = deriveWordState(masteredWord, t0 + 3600 * 1000).state;
  assert(stateAt1h === 'mastered', 'Fake Timer: 1h after practice is still mastered');

  // Sau 1 ngày (t0 + 25 giờ): đến hạn ôn lại -> review
  const stateAt25h = deriveWordState(masteredWord, t0 + 25 * 3600 * 1000).state;
  assert(stateAt25h === 'review', 'Fake Timer: 25h after practice becomes review (due)');

  // --- Test 4: Phụ huynh ghi đè (Parent Override) ---
  const overriddenToMastered = deriveWordState(
    { ...masteredWord, parentOverride: 'mastered' },
    t0 + 25 * 3600 * 1000
  );
  assert(overriddenToMastered.state === 'mastered', 'Parent override forces state to mastered');

  const overriddenToReview = deriveWordState(
    { _id: 'l1', status: 'LEARNING' as const, parentOverride: 'review' },
    t0
  );
  assert(overriddenToReview.state === 'review', 'Parent override forces state to review');

  console.log(`\n=== VOCAB UNIT TESTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  return { passed, failed, errors };
}

// Chạy trực tiếp khi execute bằng tsx/node
runVocabStateUnitTests();

