/**
 * §1.4 — Shared terminology chốt toàn app:
 *  - "Unit"  giữ nguyên tiếng Anh.
 *  - "Lesson" thay cho "bài / bài học" ở mọi nhãn đếm và tiêu đề cấp 2.
 * Import từ đây thay vì copy-paste chuỗi ở từng component.
 */

export type BadgeReqType = 'lesson' | 'unit' | 'star' | 'perfectLesson' | 'openedChest';

export const UNIT_LABEL = 'Unit';
export const LESSON_LABEL = 'Lesson';
export const LESSON_LABEL_PLURAL = 'Lesson';

/** Short suffix in badge progress, e.g. "2/3 Unit". */
export const getReqUnitLabel = (reqType: string): string => {
  if (reqType === 'star') return '⭐';
  if (reqType === 'unit') return UNIT_LABEL;
  if (reqType === 'perfectLesson') return 'Lesson 3 sao';
  if (reqType === 'openedChest') return 'rương đã mở';
  return LESSON_LABEL;
};

/** Full requirement line in the badge showcase modal. */
export const getReqFullLabel = (reqType: string, requirement: number): string => {
  if (reqType === 'star') return `${requirement} Ngôi sao vàng ⭐`;
  if (reqType === 'unit') return `${requirement} Unit – Lesson 🎒`;
  if (reqType === 'perfectLesson') return `${requirement} Lesson đạt 3 sao 🌟`;
  if (reqType === 'openedChest') return `Mở ${requirement} rương quà 🎁`;
  return `${requirement} ${LESSON_LABEL} đã hoàn thành 📚`;
};

/** e.g. "3 / 5 Lesson đã xong" */
export const lessonsDoneLabel = (done: number, total: number): string =>
  `${done} / ${total} ${LESSON_LABEL} đã xong`;

/** e.g. "Unit 2: My School" */
export const unitTitleLabel = (unitNumber: number, title?: string): string =>
  `${UNIT_LABEL} ${unitNumber}: ${title || LESSON_LABEL}`;

/** Short, picture-led labels used by the Stage 3 arcade hub. */
export const GAME_LABELS: Record<string, string> = {
  LISTEN_CHOOSE: 'Nghe chọn',
  COLOR_RECOGNITION: 'Tìm màu',
  TAP_PICTURE: 'Chạm hình',
  BUBBLE_POP: 'Bong bóng',
  ANIMAL_SOUND: 'Nghe thú',
  IMAGE_WORD_MATCH: 'Ghép hình',
  COUNT_OBJECTS: 'Đếm hình',
  MISSING_OBJECT: 'Tìm đồ',
  MEMORY_CARD: 'Lật thẻ',
  STAR_CATCHER: 'Hứng sao',
  FEED_ANIMAL: 'Cho ăn',
  TRUE_FALSE: 'Đúng sai',
  DRAG_DROP: 'Kéo thả',
  FIND_OBJECT: 'Tìm đồ',
  CLASSIFICATION: 'Phân loại',
  LISTEN_REPEAT: 'Nghe chọn',
  MATCHING: 'Ghép cặp',
  MEMORY: 'Ghi nhớ',
  tap_pop: 'Chạm & Bùng',
  find_match: 'Tìm & Ghép',
  build_make: 'Ghép & Làm',
};

/** Parent-facing instructions stay local so the lesson API contract is unchanged. */
export const GAME_INSTRUCTIONS: Record<string, string> = {
  LISTEN_CHOOSE: 'Bé nghe từ vựng rồi chạm vào hình đúng.',
  COLOR_RECOGNITION: 'Bé nghe tên màu rồi tìm đồ vật có màu đó.',
  TAP_PICTURE: 'Bé nghe gợi ý rồi chạm vào hình phù hợp.',
  BUBBLE_POP: 'Bé nghe từ và chạm vào bong bóng có hình đúng.',
  ANIMAL_SOUND: 'Bé nghe âm thanh rồi tìm con vật tương ứng.',
  IMAGE_WORD_MATCH: 'Bé xem hình và chọn từ hoặc hình tương ứng.',
  COUNT_OBJECTS: 'Bé đếm các hình rồi chọn số lượng phù hợp.',
  MISSING_OBJECT: 'Bé ghi nhớ các hình rồi tìm đồ vật bị thiếu.',
  MEMORY_CARD: 'Bé lật thẻ để tìm các cặp hình giống nhau.',
  STAR_CATCHER: 'Bé nghe từ và chọn ngôi sao có hình tương ứng.',
  FEED_ANIMAL: 'Bé chọn món ăn phù hợp để cho con vật ăn.',
  TRUE_FALSE: 'Bé xem hình rồi chọn câu trả lời đúng hoặc sai.',
  DRAG_DROP: 'Bé chọn đồ vật phù hợp với gợi ý.',
  FIND_OBJECT: 'Bé nghe tên đồ vật rồi tìm đúng hình.',
  CLASSIFICATION: 'Bé chọn nhóm phù hợp với đồ vật hoặc con vật.',
  LISTEN_REPEAT: 'Bé nghe từ vựng rồi chọn hình tương ứng.',
  MATCHING: 'Bé ghép các hình hoặc từ có liên quan.',
  MEMORY: 'Bé ghi nhớ hình ảnh rồi chọn đáp án đúng.',
  tap_pop: 'Bé nghe từ rồi chạm vào hình đúng đang chuyển động.',
  find_match: 'Bé tìm, lật hoặc kéo thả để ghép đúng hình.',
  build_make: 'Bé ghép mảnh hoặc đưa đồ đúng cho Koko.',
};

export const getGameLabel = (activityType?: string): string =>
  (activityType && GAME_LABELS[activityType]) || 'Trò chơi';

export const getGameInstructions = (activityType?: string): string =>
  (activityType && GAME_INSTRUCTIONS[activityType]) || 'Bé chọn hình phù hợp với gợi ý.';
