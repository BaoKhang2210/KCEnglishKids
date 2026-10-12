/**
 * §1.4 — Shared terminology chốt toàn app:
 *  - "Unit"  giữ nguyên tiếng Anh.
 *  - "Lesson" thay cho "bài / bài học" ở mọi nhãn đếm và tiêu đề cấp 2.
 * Import từ đây thay vì copy-paste chuỗi ở từng component.
 */

export type BadgeReqType = 'lesson' | 'unit' | 'star';

export const UNIT_LABEL = 'Unit';
export const LESSON_LABEL = 'Lesson';
export const LESSON_LABEL_PLURAL = 'Lesson';

/** Short suffix in badge progress, e.g. "2/3 Unit". */
export const getReqUnitLabel = (reqType: string): string => {
  if (reqType === 'star') return '⭐';
  if (reqType === 'unit') return UNIT_LABEL;
  return LESSON_LABEL;
};

/** Full requirement line in the badge showcase modal. */
export const getReqFullLabel = (reqType: string, requirement: number): string => {
  if (reqType === 'star') return `${requirement} Ngôi sao vàng ⭐`;
  if (reqType === 'unit') return `${requirement} Unit – Lesson 🎒`;
  return `${requirement} ${LESSON_LABEL} đã hoàn thành 📚`;
};

/** e.g. "3 / 5 Lesson đã xong" */
export const lessonsDoneLabel = (done: number, total: number): string =>
  `${done} / ${total} ${LESSON_LABEL} đã xong`;

/** e.g. "Unit 2: My School" */
export const unitTitleLabel = (unitNumber: number, title?: string): string =>
  `${UNIT_LABEL} ${unitNumber}: ${title || LESSON_LABEL}`;
