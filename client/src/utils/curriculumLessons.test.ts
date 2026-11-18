import { expect, it } from 'vitest';
import { bilingualLessonTitle, compareLessons, lessonPosition } from './curriculumLessons';

it('orders the curriculum numerically by age/book, unit and lesson', () => {
  const keys = ['B2_U1_L1', 'B1_U9_L4', 'B1_U2_L1', 'B1_U1_L2', 'B1_U1_L1'];
  expect(keys.map(key => ({ key })).sort(compareLessons).map(l => l.key)).toEqual([
    'B1_U1_L1', 'B1_U1_L2', 'B1_U2_L1', 'B1_U9_L4', 'B2_U1_L1',
  ]);
});

it('resolves raw and populated curriculum references when keys are missing', () => {
  const unit = { _id: 'u2', bookNumber: 2, unitNumber: 2 };
  const lesson = { curriculumUnits: ['u2'], displayOrder: 3, ageGroupCode: '4-5' };
  expect(lessonPosition(lesson, [unit])).toEqual({ book: 2, unit: 2, lesson: 3 });
  expect(lessonPosition({ ...lesson, curriculumUnits: [unit] })).toEqual({ book: 2, unit: 2, lesson: 3 });
  expect(bilingualLessonTitle({ title: 'School', vietnameseTitle: 'Trường học' })).toBe('School (Trường học)');
});
