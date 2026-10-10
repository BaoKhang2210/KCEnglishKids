/**
 * Cấu hình hằng số thời gian và kịch bản cho chế độ "Koko dẫn dắt"
 * Thiết kế chuẩn UX cho trẻ mầm non 3-4 tuổi
 */

export const KOKO_FLASHCARD_CONFIG = {
  /** Thời gian chờ sau khi thẻ nảy vào để Koko phát âm từ (ms) */
  KOKO_WORD_DELAY_MS: 300,

  /** Thời gian chờ sau khi phát âm xong để Koko mời bé "nói theo" (ms) */
  PROMPT_SAY_DELAY_MS: 2000,

  /** Thời gian tối đa chờ bé tương tác micro hoặc chạm (ms) */
  SPEAK_WAIT_MS: 6000,

  /** Thời lượng ghi âm mô phỏng lắng nghe bé nói (ms) */
  RECORD_MAX_MS: 4000,

  /** Thời lượng hiển thị hiệu ứng khen ngợi và sao lấp lánh (ms) */
  PRAISE_MS: 1500,

  /** Thời gian chờ trước khi tự động chuyển sang thẻ tiếp theo (ms) */
  AUTO_ADVANCE_DELAY_MS: 4000,

  /** Số thẻ liên tiếp bé hoàn toàn không tương tác trước khi Koko "đi ngủ" */
  PASSIVE_CARDS_BEFORE_SLEEP: 2,
} as const;

/** Danh sách lời khen xoay vòng tích cực (không lặp liên tiếp) */
export const PRAISE_PHRASES = [
  'Bé giỏi quá! 🌟',
  'Tuyệt vời lắm! ✨',
  'Phát âm hay quá! 🎉',
  'Bé siêu thật đấy! 👏',
  'Koko khen bé nhé! 🐻',
] as const;

/** Lời mời nói theo xoay vòng */
export const PROMPT_PHRASES = [
  'Bé nói cùng Koko nhé! 🎤',
  'Đến lượt bé nào! 🗣️',
  'Cùng đọc to nhé! ✨',
] as const;
