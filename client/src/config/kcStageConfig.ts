/**
 * Configuration & UX Constants for 3-4yo Preschool Lesson Flow & TPR Practice
 */
export const STAGE_CONFIG = {
  // Navigation & Stepper: Enabled for completed stages & current stage
  STEPPER_INTERACTIVE: true,

  // Round breakdown for Stage 2 (TPR Practice)
  WORDS_PER_ROUND: 4,

  // Feedback & Delay timings (ms)
  MAX_ATTEMPTS: 3,
  HINT_DELAY_EARLY_MS: 3000,
  HINT_DELAY_LATE_MS: 6000,
  IDLE_PROMPT_MS: 9000,
  MAX_IDLE_PROMPTS: 2,
  FEEDBACK_LOCK_MS: 1200,
  SPEAK_WAIT_MS: 6000,
  RECORD_MAX_MS: 4000,

  // UI Minimum Sizing Tokens (for 3-4yo preschoolers)
  SIZES: {
    TOPBAR_HEIGHT: 'clamp(60px, 9dvh, 72px)',
    ICON_BUTTON_MIN: '56px',
    STEPPER_HEIGHT: '56px',
    STEPPER_ICON: '32px',
    ACTION_BUTTON_MIN: '72px',
    KOKO_STAGE3: '96px',
    KOKO_DEFAULT: '76px',
    GAME_CARD_STAR: '40px',
  },

  // UI Theme Accent per Stage
  STAGE_THEMES: {
    1: {
      name: 'Khám phá',
      icon: '📖',
      color: 'amber',
      accentBg: 'bg-amber-400',
      accentText: 'text-amber-950',
      border: 'border-amber-400',
    },
    2: {
      name: 'Luyện tập',
      icon: '🎯',
      color: 'teal',
      accentBg: 'bg-teal-400',
      accentText: 'text-teal-950',
      border: 'border-teal-400',
    },
    3: {
      name: 'Trò chơi',
      icon: '🎮',
      color: 'purple',
      accentBg: 'bg-purple-500',
      accentText: 'text-white',
      border: 'border-purple-500',
    },
  },
} as const;

export const KOKO_PRAISE_ROTATION = [
  'Bé giỏi quá! 🌟',
  'Tuyệt vời luôn! 🎉',
  'Đúng rồi, siêu quá! ✨',
  'Koko khen bé nhé! 💖',
];

export const KOKO_TRY_AGAIN_ROTATION = [
  'Thử lại nhé bé! 🐾',
  'Bé nhìn kỹ xem nào! 👀',
  'Cố lên, bé làm được mà! ✨',
];
