import { buildReviewSession } from '../services/reviewSessionBuilder';
import { VOCAB_LEARNING_CONFIG } from '../config/vocabLearningConfig';
import type { WordMasteryDetail } from '../services/vocabMasteryService';

export function runReviewSessionBuilderTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
      console.log(`[PASS] ${msg}`);
    } else {
      failed++;
      console.error(`[FAIL] ${msg}`);
    }
  }

  const mockWords: (WordMasteryDetail & { state: 'learning' | 'mastered' | 'review' })[] = [
    { _id: '1', vocabId: '1', english: 'cat', vietnamese: 'con mèo', status: 'REVIEW', rememberCount: 2, reviewCount: 1, gamesPlayedCount: 0, gamesCorrectCount: 0, lastPracticedAt: 1000, masteryScore: 50, source: 'JOURNEY', state: 'review' },
    { _id: '2', vocabId: '2', english: 'dog', vietnamese: 'con chó', status: 'REVIEW', rememberCount: 1, reviewCount: 2, gamesPlayedCount: 0, gamesCorrectCount: 0, lastPracticedAt: 2000, masteryScore: 50, source: 'JOURNEY', state: 'review' },
    { _id: '3', vocabId: '3', english: 'apple', vietnamese: 'quả táo', status: 'LEARNING', rememberCount: 2, reviewCount: 0, gamesPlayedCount: 0, gamesCorrectCount: 0, lastPracticedAt: 3000, masteryScore: 60, source: 'JOURNEY', state: 'learning' },
    { _id: '4', vocabId: '4', english: 'car', vietnamese: 'xe hơi', status: 'LEARNING', rememberCount: 1, reviewCount: 0, gamesPlayedCount: 0, gamesCorrectCount: 0, lastPracticedAt: 4000, masteryScore: 50, source: 'JOURNEY', state: 'learning' },
    { _id: '5', vocabId: '5', english: 'bird', vietnamese: 'con chim', status: 'MASTERED', rememberCount: 4, reviewCount: 0, gamesPlayedCount: 0, gamesCorrectCount: 0, lastPracticedAt: 5000, masteryScore: 90, source: 'JOURNEY', state: 'mastered' },
    { _id: '6', vocabId: '6', english: 'fish', vietnamese: 'con cá', status: 'MASTERED', rememberCount: 5, reviewCount: 0, gamesPlayedCount: 0, gamesCorrectCount: 0, lastPracticedAt: 6000, masteryScore: 95, source: 'JOURNEY', state: 'mastered' },
    { _id: '7', vocabId: '7', english: 'sun', vietnamese: 'mặt trời', status: 'MASTERED', rememberCount: 6, reviewCount: 0, gamesPlayedCount: 0, gamesCorrectCount: 0, lastPracticedAt: 7000, masteryScore: 98, source: 'JOURNEY', state: 'mastered' },
    { _id: '8', vocabId: '8', english: 'star', vietnamese: 'ngôi sao', status: 'MASTERED', rememberCount: 7, reviewCount: 0, gamesPlayedCount: 0, gamesCorrectCount: 0, lastPracticedAt: 8000, masteryScore: 99, source: 'JOURNEY', state: 'mastered' },
  ];

  // Test 1: Đảm bảo đúng số lượng câu hỏi tối đa
  const session = buildReviewSession(mockWords, 'all', Date.now(), VOCAB_LEARNING_CONFIG, 42);
  assert(session.items.length === 4, 'Review session generates exactly 4 questions');

  // Test 2: Kiểm tra Quota (Tối đa 2 review, tối đa 2 learning)
  const targetStates = session.items.map(i => i.targetWord.state);
  const reviewCount = targetStates.filter(s => s === 'review').length;
  const learningCount = targetStates.filter(s => s === 'learning').length;
  assert(reviewCount <= 2, 'Quota respected: review count <= 2');
  assert(learningCount <= 2, 'Quota respected: learning count <= 2');

  // Test 3: Câu đầu tiên có đúng 2 lựa chọn (SESSION_OPTIONS_FIRST)
  assert(session.items[0].options.length === 2, 'First question has exactly 2 options');

  // Test 4: Các câu tiếp theo có tối đa 3 lựa chọn (SESSION_OPTIONS_MAX)
  const laterCounts = session.items.slice(1).map(i => i.options.length);
  assert(laterCounts.every(c => c <= 3 && c >= 2), 'Later questions have 2-3 options');

  // Test 5: Không lặp y hệt bộ lựa chọn ở hai câu liên tiếp
  let consecutiveSame = false;
  for (let i = 1; i < session.items.length; i++) {
    const prev = session.items[i - 1].options.map(o => o._id).sort().join(',');
    const curr = session.items[i].options.map(o => o._id).sort().join(',');
    if (prev === curr) consecutiveSame = true;
  }
  assert(!consecutiveSame, 'No two consecutive questions have identical option sets');

  // Test 6: Đáp án đúng luôn có mặt trong danh sách options của mỗi câu
  const allHaveCorrect = session.items.every(i =>
    i.options.some(o => o._id === i.targetWord._id && o.isCorrect)
  );
  assert(allHaveCorrect, 'Every question contains its correct target word option');

  console.log(`\n=== REVIEW SESSION TESTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  return { passed, failed };
}

runReviewSessionBuilderTests();
