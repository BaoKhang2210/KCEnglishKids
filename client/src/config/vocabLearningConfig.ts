/**
 * Cấu hình hệ thống theo dõi và ôn tập từ vựng cho trẻ mầm non (3-5 tuổi).
 * Dễ dàng tinh chỉnh các mốc thời gian và ngưỡng đánh giá.
 */
export const VOCAB_LEARNING_CONFIG = {
  /** Số lần nhận diện đúng tối thiểu để đạt trạng thái 'mastered' */
  MASTER_SUCCESSES: 3,

  /** Số ngày khác nhau tối thiểu có luyện tập thành công */
  MASTER_MIN_DAYS: 2,

  /**
   * Khoảng cách ngày ôn tập lặp lại ngắt quãng (Spaced Repetition intervals)
   * Vòng 1: sau 1 ngày, Vòng 2: sau 3 ngày, Vòng 3: sau 7 ngày, Vòng 4: sau 14 ngày
   */
  REVIEW_INTERVALS_DAYS: [1, 3, 7, 14],

  /** Số lượng từ tối đa trong một phiên chơi "Ôn từ" của bé */
  REVIEW_SESSION_WORDS: 4,

  /** Số từ cần ôn tối đa trong một phiên */
  SESSION_MAX_REVIEW: 2,

  /** Số từ đang học tối đa trong một phiên */
  SESSION_MAX_LEARNING: 2,

  /** Số lượng lựa chọn ở câu đầu tiên (cho trẻ 3-4 tuổi làm quen) */
  SESSION_OPTIONS_FIRST: 2,

  /** Số lượng lựa chọn tối đa ở các câu tiếp theo */
  SESSION_OPTIONS_MAX: 3,

  /** Số lượng từ tối thiểu trong pool để làm phương án nhiễu */
  MIN_POOL_FOR_DISTRACTORS: 6,

  /** Ngưỡng thời gian nhìn thẻ (ms) để tính là đã gặp từ lần đầu */
  SEEN_MIN_MS: 2000,

  /** Ngưỡng số từ tối đa hiển thị lưới phẳng ở Album bé (trên mức này chia luống vườn) */
  FLAT_GRID_MAX: 24,

  /** Số từ khát tối đa hiển thị ở hàng đầu của vườn */
  MAX_THIRSTY_AT_ONCE: 4,

  /** Trợ giúp/gợi ý có được tính là thành công hoàn toàn hay không */
  ASSISTED_COUNTS_AS_SUCCESS: false,
} as const;

export type WordLearningState = 'learning' | 'mastered' | 'review';
