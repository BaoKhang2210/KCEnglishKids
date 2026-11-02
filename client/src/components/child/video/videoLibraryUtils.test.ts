import { describe, it, expect } from 'vitest';
import {
  accessibleAgeTabsFor,
  accessibleLevelsFor,
  activeCueIndex,
  activeFilterCount,
  activityCounter,
  activitySummary,
  buildLessonExercises,
  comprehensionPrompt,
  countDubbedLessons,
  defaultVideoFilters,
  estimateSentenceCues,
  filterLessons,
  formatCueTimestamp,
  formatDuration,
  isAgeTabAllowed,
  isLevelTabAllowed,
  lessonVocabulary,
  levelsForAgeTab,
  pickStartEpisode,
  readLessonFilters,
  readLessonView,
  readVideoFilters,
  seriesMatchesFilters,
  splitCueWords,
  writeLessonFilters,
  writeVideoFilters,
  type VideoFilters
} from './videoLibraryUtils';
import type { VideoCue, VideoEpisodeSummary, VideoSeriesSummary } from '../../../types';

function series(overrides: Partial<VideoSeriesSummary> = {}): VideoSeriesSummary {
  return {
    _id: 's1',
    slug: 'l1-bat-and-friends-72-l1',
    title: 'Bat and Friends',
    subtitle: 'Động vật',
    description: 'Câu chuyện về chú dơi nhỏ',
    thumbnail: '/images/topics/animals.svg',
    level: 'L1',
    levelLabel: 'Level 1',
    topicCode: 'story',
    ageMin: 4,
    ageMax: 5,
    ageLabel: '4–5 tuổi',
    ageGroups: ['3-4', '4-5'],
    source: 'stored',
    sourceLabel: 'Video lưu trữ',
    hasDubbing: true,
    order: 1,
    episodeCount: 72,
    availableEpisodeCount: 6,
    completedEpisodes: 0,
    isFavorite: false,
    availableSkills: ['listen', 'read', 'speak'],
    firstEpisode: { episodeId: 'e1', number: 1, slug: 'tap-1', title: 'Hunting for Bugs' },
    progress: { percent: 0, completed: false, continue: null },
    ...overrides
  };
}

function filters(overrides: Partial<VideoFilters> = {}): VideoFilters {
  return { ...defaultVideoFilters('4-5'), ...overrides };
}

function lesson(
  number: number,
  title: string,
  options: { canDubbing?: boolean; completed?: boolean; watchedPercent?: number } = {}
): VideoEpisodeSummary {
  const completed = options.completed ?? false;
  return {
    _id: `e${number}`,
    number,
    slug: `bai-${number}`,
    title,
    source: 'stored',
    duration: 0,
    clipStart: 0,
    clipEnd: 0,
    dialogueStartSec: 0,
    canDubbing: options.canDubbing ?? true,
    availableSkills: ['listen'],
    progress: {
      episodeId: `e${number}`,
      availableSkills: ['listen'],
      skills: [],
      completed,
      percent: completed ? 100 : 0,
      watchedPercent: options.watchedPercent ?? (completed ? 100 : 0),
      lastPositionSec: 0,
      quiz: { answers: [], score: 0, total: 0, done: false },
      dubDone: false
    }
  };
}

describe('video level access', () => {
  it('shows the child level and every easier level, never a harder one', () => {
    expect(accessibleLevelsFor('3-4')).toEqual(['L1']);
    expect(accessibleLevelsFor('4-5')).toEqual(['L1', 'L2']);
    expect(accessibleLevelsFor('5-6')).toEqual(['L1', 'L2', 'L3']);
    expect(isLevelTabAllowed('4-5', 'L3')).toBe(false);
    expect(isLevelTabAllowed('5-6', 'L3')).toBe(true);
  });

  it('maps every age tab to its own cumulative levels', () => {
    expect(levelsForAgeTab('3-4')).toEqual(['L1']);
    expect(levelsForAgeTab('4-5')).toEqual(['L1', 'L2']);
    expect(levelsForAgeTab('5-6')).toEqual(['L1', 'L2', 'L3']);
  });

  it('shows the child age tab and every younger age tab', () => {
    expect(accessibleAgeTabsFor('3-4')).toEqual(['3-4']);
    expect(accessibleAgeTabsFor('4-5')).toEqual(['3-4', '4-5']);
    expect(accessibleAgeTabsFor('5-6')).toEqual(['3-4', '4-5', '5-6']);
    expect(isAgeTabAllowed('4-5', '5-6')).toBe(false);
    expect(isAgeTabAllowed('5-6', '5-6')).toBe(true);
  });

  it('opens the library on the child age group with every level of that group', () => {
    expect(defaultVideoFilters('3-4')).toMatchObject({ age: '3-4', level: '' });
    expect(defaultVideoFilters('4-5')).toMatchObject({ age: '4-5', level: '' });
    expect(defaultVideoFilters('5-6')).toMatchObject({ age: '5-6', level: '' });
  });
});

describe('video filter URL round-trip', () => {
  it('falls back to the child age group when the URL asks for an older group', () => {
    const params = new URLSearchParams('tab=videos&vage=5-6&vlevel=L3&vsource=stored&vdub=yes&vfav=1&vq=bat');
    const parsed = readVideoFilters(params, '3-4');
    expect(parsed.age).toBe('3-4');
    expect(parsed.level).toBe('');
    expect(parsed.source).toBe('stored');
    expect(parsed.dubbing).toBe('yes');
    expect(parsed.favorite).toBe(true);
    expect(parsed.search).toBe('bat');
  });

  it('keeps a level only when it belongs to the selected age group', () => {
    expect(readVideoFilters(new URLSearchParams('vage=4-5&vlevel=L3'), '5-6').level).toBe('');
    expect(readVideoFilters(new URLSearchParams('vage=4-5&vlevel=L2'), '5-6')).toEqual({
      ...defaultVideoFilters('5-6'),
      age: '4-5',
      level: 'L2'
    });
  });

  it('ignores unknown values and writes a clean query string', () => {
    const parsed = readVideoFilters(new URLSearchParams('vage=9-10&vlevel=L9&vsource=tiktok&vdub=maybe'), '4-5');
    expect(parsed).toEqual(defaultVideoFilters('4-5'));

    const query = writeVideoFilters(new URLSearchParams('tab=topics&vage=5-6'), {
      age: '4-5',
      level: 'L2',
      source: '',
      dubbing: 'all',
      favorite: false,
      search: '  farm  '
    });
    expect(query.get('tab')).toBe('videos');
    expect(query.get('vage')).toBe('4-5');
    expect(query.get('vlevel')).toBe('L2');
    expect(query.get('vq')).toBe('farm');
    expect(query.has('vsource')).toBe(false);
    expect(query.has('vfav')).toBe(false);

    const cleared = writeVideoFilters(new URLSearchParams('vlevel=L2'), defaultVideoFilters('3-4'));
    expect(cleared.get('vage')).toBe('3-4');
    expect(cleared.has('vlevel')).toBe(false);
  });
});

describe('series filtering', () => {
  const item = series();

  it('matches the age group and the selected level', () => {
    expect(seriesMatchesFilters(item, filters({ age: '3-4' }))).toBe(true);
    expect(seriesMatchesFilters(item, filters({ age: '5-6' }))).toBe(true);
    expect(seriesMatchesFilters(item, filters({ level: 'L1' }))).toBe(true);
    expect(seriesMatchesFilters(item, filters({ level: 'L2' }))).toBe(false);
    expect(seriesMatchesFilters(series({ level: 'L3' }), filters({ age: '4-5' }))).toBe(false);
  });

  it('combines source, dubbing, favorite and search', () => {
    expect(seriesMatchesFilters(item, filters({ level: 'L1', source: 'youtube' }))).toBe(false);
    expect(seriesMatchesFilters(item, filters({ level: 'L1', dubbing: 'no' }))).toBe(false);
    expect(seriesMatchesFilters(item, filters({ level: 'L1', favorite: true }))).toBe(false);
    expect(seriesMatchesFilters(item, filters({ level: 'L1', search: 'dơi' }))).toBe(true);
    expect(seriesMatchesFilters(item, filters({ level: 'L1', search: 'bat' }))).toBe(true);
    expect(seriesMatchesFilters(item, filters({ level: 'L1', search: 'câu chuyện' }))).toBe(true);
    expect(seriesMatchesFilters(item, filters({ level: 'L1', search: 'farm' }))).toBe(false);
  });

  it('counts only the narrowed filters, not the level tab', () => {
    expect(activeFilterCount(filters({ level: 'L1' }))).toBe(0);
    expect(activeFilterCount(filters({ level: 'L1', favorite: true, dubbing: 'yes' }))).toBe(2);
  });
});

describe('duration formatting', () => {
  it('renders m:ss and clamps invalid values', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65.4)).toBe('1:05');
    expect(formatDuration(-4)).toBe('0:00');
  });
});

describe('series lesson filters', () => {
  const lessons = [
    lesson(1, 'Hunting for Bugs'),
    lesson(2, 'Lost in the Rain', { canDubbing: false, watchedPercent: 25 }),
    lesson(3, 'The Red Barn')
  ];

  it('searches titles without case sensitivity and filters dubbed lessons', () => {
    expect(filterLessons(lessons, { keyword: 'RAIN', dubbingOnly: false }).map((item) => item.number)).toEqual([2]);
    expect(filterLessons(lessons, { keyword: '', dubbingOnly: true }).map((item) => item.number)).toEqual([1, 3]);
    expect(filterLessons(lessons, { keyword: 'barn', dubbingOnly: true }).map((item) => item.number)).toEqual([3]);
    expect(filterLessons(lessons, { keyword: 'nope', dubbingOnly: false })).toEqual([]);
  });

  it('keeps the all/dubbed counts and URL state in sync', () => {
    expect(countDubbedLessons(lessons)).toBe(2);
    const params = writeLessonFilters(
      new URLSearchParams('q=cu&view=card'),
      { keyword: '  rain  ', dubbingOnly: true },
      'card'
    );
    expect(params.get('q')).toBe('rain');
    expect(params.get('type')).toBe('dubbed');
    expect(params.get('view')).toBe('card');
    expect(readLessonFilters(params)).toEqual({ keyword: 'rain', dubbingOnly: true });
    expect(readLessonView(params)).toBe('card');
    expect(readLessonView(new URLSearchParams('view=weird'))).toBe('table');
  });
});

describe('start lesson selection', () => {
  const lessons = [lesson(1, 'One', { completed: true }), lesson(2, 'Two'), lesson(3, 'Three')];

  it('resumes the continue target before the first unfinished lesson', () => {
    expect(pickStartEpisode(lessons, { episodeId: 'e3' })?.number).toBe(3);
  });

  it('falls back to the first unfinished lesson, then the first lesson', () => {
    expect(pickStartEpisode(lessons, null)?.number).toBe(2);
    expect(
      pickStartEpisode([lesson(1, 'One', { completed: true }), lesson(2, 'Two', { completed: true })], null)?.number
    ).toBe(1);
    expect(pickStartEpisode([], null)).toBeNull();
  });
});

function cue(idx: number, text: string, start = idx * 10, end = idx * 10 + 4): VideoCue {
  return { idx, start, end, text };
}

describe('lesson activity counter', () => {
  it('reads the four-part counter and falls back to the activity list', () => {
    expect(
      activitySummary({
        ...lesson(1, 'One').progress,
        activities: [
          { key: 'listen', label: 'Xem video', done: true },
          { key: 'read', label: 'Đọc phụ đề', done: true },
          { key: 'speak', label: 'Luyện nói', done: false },
          { key: 'dub', label: 'Lồng tiếng', done: false }
        ],
        activityDone: 2,
        activityTotal: 4
      })
    ).toEqual({ done: 2, total: 4, percent: 50 });
    expect(activityCounter(null)).toBe('—');
    expect(activitySummary(lesson(1, 'One').progress)).toEqual({ done: 0, total: 0, percent: 0 });
  });
});

describe('sentence playback helpers', () => {
  const cues = [cue(1, 'Bat woke up.', 18, 20), cue(2, 'He flew out of his cave.', 24, 26)];

  it('finds the active sentence inside its exact time range', () => {
    expect(activeCueIndex(cues, 17.9)).toBe(-1);
    expect(activeCueIndex(cues, 18)).toBe(0);
    expect(activeCueIndex(cues, 20)).toBe(-1);
    expect(activeCueIndex(cues, 25)).toBe(1);
  });

  it('builds seven exercises from rich cues and only the open question from thin cues', () => {
    const many = Array.from({ length: 18 }, (_, index) =>
      cue(index + 1, `Sentence number ${index + 1} for the lesson.`, index * 5, index * 5 + 4)
    );
    const exercises = buildLessonExercises('Hunting for Bugs', many);
    expect(exercises).toHaveLength(7);
    expect(exercises[0].kind).toBe('open');
    const choices = exercises.filter((exercise) => exercise.kind === 'choice');
    expect(choices).toHaveLength(6);
    choices.forEach((exercise) => {
      if (exercise.kind !== 'choice') return;
      expect(exercise.options).toHaveLength(3);
      expect(exercise.options.filter((option) => option.correct)).toHaveLength(1);
      expect(new Set(exercise.options.map((option) => option.text)).size).toBe(3);
    });
    expect(new Set(choices.map((exercise) => exercise.id)).size).toBe(6);
    expect(buildLessonExercises('Short', cues.slice(0, 1))).toHaveLength(1);
  });
});

describe('youtube sentence markers', () => {
  it('spreads the source caption count across the playable clip', () => {
    const cues = estimateSentenceCues(4, 10, 20);
    expect(cues).toHaveLength(4);
    expect(cues[0]).toMatchObject({ idx: 1, start: 10, end: 12.5, text: '' });
    expect(cues[3].end).toBe(20);
    expect(cues.every((cue) => cue.end > cue.start)).toBe(true);
    expect(cues.map((cue) => cue.idx)).toEqual([1, 2, 3, 4]);
  });

  it('keeps every marker inside the clip for a real song length', () => {
    const cues = estimateSentenceCues(69, 9.22, 152.66);
    expect(cues).toHaveLength(69);
    expect(cues[0].start).toBe(9.22);
    expect(cues[68].end).toBeCloseTo(152.66, 2);
    expect(cues.every((cue) => cue.start >= 9.22 && cue.end <= 152.66)).toBe(true);
  });

  it('returns nothing without a usable span', () => {
    expect(estimateSentenceCues(0, 0, 10)).toEqual([]);
    expect(estimateSentenceCues(69, 20, 20)).toEqual([]);
    expect(estimateSentenceCues(69, 30, 10)).toEqual([]);
    expect(estimateSentenceCues(Number.NaN, 0, 10)).toEqual([]);
  });
});

describe('subtitle reader helpers', () => {
  it('prints source timestamps as two-digit minutes and seconds', () => {
    expect(formatCueTimestamp(0)).toBe('00:00');
    expect(formatCueTimestamp(18)).toBe('00:18');
    expect(formatCueTimestamp(64)).toBe('01:04');
    expect(formatCueTimestamp(119)).toBe('01:59');
    expect(formatCueTimestamp(-3)).toBe('00:00');
  });

  it('splits a sentence into clickable words and keeps punctuation', () => {
    const tokens = splitCueWords("Where is home? Bat said.");
    expect(tokens.filter((token) => token.word).map((token) => token.text)).toEqual([
      'Where',
      'is',
      'home',
      'Bat',
      'said'
    ]);
    expect(tokens.map((token) => token.text).join('')).toBe("Where is home? Bat said.");
    expect(splitCueWords("It's time to go home and sleep.").filter((token) => token.word)[0].text).toBe("It's");
    expect(splitCueWords('')).toEqual([]);
  });
});

describe('lesson vocabulary and comprehension', () => {
  const base = lesson(1, 'Hunting for Bugs');

  it('uses the documented lesson vocabulary only as a fallback', () => {
    expect(lessonVocabulary({ ...base, lessonCode: 'r2-l1-bat-and-friends-72-l1-001' })).toHaveLength(10);
    expect(lessonVocabulary({ ...base, slug: 'r2-l1-bat-and-friends-72-l1-001' })).toHaveLength(10);
    expect(lessonVocabulary({ ...base, vocabulary: [{ word: 'bat', meaningVi: 'Con dơi' }] })).toEqual([
      { word: 'bat', meaningVi: 'Con dơi' }
    ]);
    expect(lessonVocabulary({ ...base, lessonCode: 'other' })).toEqual([]);
  });

  it('names the current lesson in the comprehension prompt', () => {
    expect(comprehensionPrompt('Hunting for Bugs')).toContain('Hunting for Bugs');
  });
});
