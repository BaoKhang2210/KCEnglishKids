import { VOCAB_LEARNING_CONFIG, type WordLearningState } from '../config/vocabLearningConfig';
import type { WordMasteryDetail } from './vocabMasteryService';

export interface VocabProgressSnapshot {
  _id: string;
  vocabId: string;
  english: string;
  vietnamese: string;
  pronunciation?: string;
  imageUrl?: string;
  audioUrl?: string;
  exampleSentence?: string;
  exampleSentenceVietnamese?: string;
  category?: string;
  topicName?: string;
  source?: 'JOURNEY' | 'TOPIC';
  
  // Trạng thái tính toán duy nhất (Single Source of Truth)
  state: WordLearningState;

  // Dữ liệu sự kiện & theo dõi
  rememberCount: number;
  reviewCount: number;
  gamesPlayedCount: number;
  gamesCorrectCount: number;
  lastPracticedAt: number;
  lastSuccessAt?: number;
  successDays?: string[]; // Danh sách YYYY-MM-DD
  reviewStage?: number;   // Bậc khoảng cách hiện tại (0, 1, 2, 3...)
  reviewReason?: 'due' | 'failed' | 'override';
  parentOverride?: 'mastered' | 'review' | null;
}

export interface VocabSummary {
  learned: number;   // learned = learning + mastered + review
  learning: number;
  mastered: number;
  review: number;
  words: VocabProgressSnapshot[];
}

/**
 * Hàm làm sạch định dạng phiên âm để luôn chỉ hiển thị đúng MỘT cặp gạch chéo: /peɪnt/
 */
export function formatPronunciation(raw?: string): string {
  if (!raw) return '';
  const cleaned = raw.replace(/^\/+|\/+$/g, '').trim();
  return cleaned ? `/${cleaned}/` : '';
}

/**
 * Trả về chuỗi ngày địa phương dạng YYYY-MM-DD
 */
export function getLocalDateString(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Hàm thuần tính toán trạng thái từ vựng: deriveState
 * Đảm bảo 100% không bao giờ một từ rơi vào 2 trạng thái khác nhau.
 */
export function deriveWordState(
  item: Partial<WordMasteryDetail> & {
    parentOverride?: 'mastered' | 'review' | null;
    successDays?: string[];
    lastSuccessAt?: number;
    reviewStage?: number;
    lastResult?: 'correct' | 'wrong' | 'assisted';
  },
  nowTimestamp: number = Date.now(),
  config = VOCAB_LEARNING_CONFIG
): { state: WordLearningState; reason?: 'due' | 'failed' | 'override' } {
  // 1. Phụ huynh ghi đè (ưu tiên cao nhất nếu có)
  if (item.parentOverride === 'mastered') {
    return { state: 'mastered', reason: 'override' };
  }
  if (item.parentOverride === 'review') {
    return { state: 'review', reason: 'override' };
  }

  // 2. Kiểm tra nếu lần làm bài gần nhất bị sai hoặc cần gợi ý
  if (item.lastResult === 'wrong') {
    return { state: 'review', reason: 'failed' };
  }
  if (item.lastResult === 'assisted' && !config.ASSISTED_COUNTS_AS_SUCCESS) {
    return { state: 'review', reason: 'failed' };
  }

  // 3. Đánh giá trạng thái Mastered
  const correctCount = (item.rememberCount || 0) + (item.gamesCorrectCount || 0);
  const distinctDays = item.successDays ? item.successDays.length : (correctCount >= 2 ? 2 : 1);
  const isMasteredLegacy = item.status === 'MASTERED';

  // Điều kiện Mastered: hoặc theo luật mới (đủ số lần và đủ số ngày), hoặc đã được đánh dấu Mastered từ legacy
  const meetsMastery =
    isMasteredLegacy ||
    (correctCount >= config.MASTER_SUCCESSES && distinctDays >= config.MASTER_MIN_DAYS);

  if (meetsMastery) {
    // 4. Nếu đã đạt Mastered, kiểm tra xem đã đến hạn ôn lại (Spaced Repetition) chưa
    const lastSuccess = item.lastSuccessAt || item.lastPracticedAt || nowTimestamp;
    const daysSinceSuccess = Math.floor((nowTimestamp - lastSuccess) / (24 * 60 * 60 * 1000));
    
    const stage = item.reviewStage || 0;
    const intervalDays = config.REVIEW_INTERVALS_DAYS[Math.min(stage, config.REVIEW_INTERVALS_DAYS.length - 1)];

    if (daysSinceSuccess >= intervalDays) {
      return { state: 'review', reason: 'due' };
    }

    // Nếu thẻ legacy có reviewCount > 0 và status là REVIEW
    if (item.status === 'REVIEW' && !isMasteredLegacy) {
      return { state: 'review', reason: 'failed' };
    }

    return { state: 'mastered' };
  }

  // 5. Nếu item status rõ ràng là REVIEW từ legacy
  if (item.status === 'REVIEW') {
    return { state: 'review', reason: 'failed' };
  }

  // 6. Còn lại là Đang học (Learning)
  return { state: 'learning' };
}
