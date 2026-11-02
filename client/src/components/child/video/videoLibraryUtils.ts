import videoConfig from '../../../../../shared/videoLearning.json';
import type {
  AgeGroupCode,
  VideoCue,
  VideoEpisodeProgress,
  VideoEpisodeSummary,
  VideoLevel,
  VideoLevelMeta,
  VideoSeriesSummary,
  VideoSkillKey,
  VideoSource,
  VideoVocabulary
} from '../../../types';

export const VIDEO_AGE_ORDER = videoConfig.ageOrder as AgeGroupCode[];
export const VIDEO_LEVELS = videoConfig.levels as VideoLevel[];
export const VIDEO_SOURCES = videoConfig.sources as VideoSource[];
export const VIDEO_LEVEL_META = videoConfig.levelMeta as Record<VideoLevel, VideoLevelMeta>;
export const VIDEO_AGE_LEVELS = videoConfig.ageLevels as Record<AgeGroupCode, VideoLevel[]>;
export const VIDEO_SOURCE_META = videoConfig.sourceMeta as Record<VideoSource, { label: string; short: string }>;

/** The three child age groups shown in the video library. */
export const VIDEO_AGE_META: Record<AgeGroupCode, { label: string; title: string; blurb: string }> = {
  '3-4': {
    label: '3–4 tuổi',
    title: 'Làm quen video',
    blurb: 'Video ngắn, câu đơn giản và nhiều hình ảnh để bé làm quen với tiếng Anh.'
  },
  '4-5': {
    label: '4–5 tuổi',
    title: 'Nghe & bắt chước',
    blurb: 'Bài hát, hội thoại ngắn và phụ đề từng câu giúp bé nghe rồi nói theo.'
  },
  '5-6': {
    label: '5–6 tuổi',
    title: 'Nghe hiểu & kể lại',
    blurb: 'Câu chuyện ngắn, câu đơn và mẫu âm để bé nghe hiểu rồi kể lại.'
  }
};

export const VIDEO_SKILL_META: Record<VideoSkillKey, { label: string; short: string }> = {
  listen: { label: 'Xem video', short: 'Xem' },
  read: { label: 'Nghe từng câu', short: 'Nghe' },
  speak: { label: 'Nói theo', short: 'Nói' },
  quiz: { label: 'Chơi trò chơi', short: 'Chơi' },
  dub: { label: 'Lồng tiếng', short: 'Lồng tiếng' }
};

/** Topic codes come from the source catalogue, so labels stay stable. */
export const VIDEO_TOPIC_LABELS: Record<string, string> = {
  story: 'Câu chuyện',
  songs_rhymes: 'Bài hát & vần điệu',
  phonics: 'Phonics',
  vocabulary: 'Từ vựng',
  conversation: 'Hội thoại',
  reading: 'Đọc',
  grammar: 'Ngữ pháp'
};

export function topicLabel(topicCode?: string): string {
  if (!topicCode) return '';
  return VIDEO_TOPIC_LABELS[topicCode] || topicCode;
}

export interface VideoFilters {
  age: AgeGroupCode;
  level: VideoLevel | '';
  source: VideoSource | '';
  dubbing: 'all' | 'yes' | 'no';
  favorite: boolean;
  search: string;
}

/** The child browses their own age group and every younger one, never an older one. */
export function accessibleAgeTabsFor(childAge: AgeGroupCode): AgeGroupCode[] {
  const rank = VIDEO_AGE_ORDER.indexOf(childAge);
  if (rank < 0) return [...VIDEO_AGE_ORDER];
  return VIDEO_AGE_ORDER.slice(0, rank + 1);
}

export function isAgeTabAllowed(childAge: AgeGroupCode, age: AgeGroupCode): boolean {
  return accessibleAgeTabsFor(childAge).includes(age);
}

/** The child sees their own level and every easier one, never a harder level. */
export function levelsForAgeTab(age: AgeGroupCode): VideoLevel[] {
  return [...new Set(VIDEO_AGE_LEVELS[age] || [])];
}

export function accessibleLevelsFor(childAge: AgeGroupCode): VideoLevel[] {
  const rank = VIDEO_AGE_ORDER.indexOf(childAge);
  if (rank < 0) return [...VIDEO_LEVELS];
  const levels = VIDEO_AGE_ORDER.slice(0, rank + 1).flatMap((age) => levelsForAgeTab(age));
  return [...new Set(levels)];
}

export function isLevelTabAllowed(childAge: AgeGroupCode, level: VideoLevel): boolean {
  return accessibleLevelsFor(childAge).includes(level);
}

export function defaultLevelForAge(childAge: AgeGroupCode): VideoLevel {
  const levels = accessibleLevelsFor(childAge);
  return levels[levels.length - 1] || VIDEO_LEVELS[0];
}

export function defaultVideoFilters(childAge: AgeGroupCode): VideoFilters {
  return {
    age: childAge,
    level: '',
    source: '',
    dubbing: 'all',
    favorite: false,
    search: ''
  };
}

export function readVideoFilters(params: URLSearchParams, childAge: AgeGroupCode): VideoFilters {
  const fallback = defaultVideoFilters(childAge);
  const requestedAge = params.get('vage') as AgeGroupCode | null;
  const age =
    requestedAge && VIDEO_AGE_ORDER.includes(requestedAge) && isAgeTabAllowed(childAge, requestedAge)
      ? requestedAge
      : fallback.age;
  const requestedLevel = params.get('vlevel') as VideoLevel | null;
  const level =
    requestedLevel && VIDEO_LEVELS.includes(requestedLevel) && levelsForAgeTab(age).includes(requestedLevel)
      ? requestedLevel
      : '';
  const source = params.get('vsource') as VideoSource | null;
  const dubbing = params.get('vdub');
  return {
    age,
    level,
    source: source && VIDEO_SOURCES.includes(source) ? source : '',
    dubbing: dubbing === 'yes' || dubbing === 'no' ? dubbing : 'all',
    favorite: params.get('vfav') === '1',
    search: (params.get('vq') || '').slice(0, 80)
  };
}

export function writeVideoFilters(params: URLSearchParams, filters: VideoFilters): URLSearchParams {
  const next = new URLSearchParams(params);
  next.set('tab', 'videos');
  next.set('vage', filters.age);
  if (filters.level) next.set('vlevel', filters.level); else next.delete('vlevel');
  if (filters.source) next.set('vsource', filters.source); else next.delete('vsource');
  if (filters.dubbing !== 'all') next.set('vdub', filters.dubbing); else next.delete('vdub');
  if (filters.favorite) next.set('vfav', '1'); else next.delete('vfav');
  if (filters.search.trim()) next.set('vq', filters.search.trim()); else next.delete('vq');
  return next;
}

export function seriesMatchesFilters(series: VideoSeriesSummary, filters: VideoFilters): boolean {
  if (!levelsForAgeTab(filters.age).includes(series.level)) return false;
  if (filters.level && series.level !== filters.level) return false;
  if (filters.source && series.source !== filters.source) return false;
  if (filters.dubbing === 'yes' && !series.hasDubbing) return false;
  if (filters.dubbing === 'no' && series.hasDubbing) return false;
  if (filters.favorite && !series.isFavorite) return false;
  if (filters.search.trim()) {
    const term = filters.search.trim().toLowerCase();
    const haystack = [
      series.title,
      series.titleEn,
      series.subtitle,
      series.description,
      series.levelTitle,
      series.targetAge,
      topicLabel(series.topicCode)
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(term)) return false;
  }
  return true;
}

export function activeFilterCount(filters: VideoFilters): number {
  return (
    (filters.source ? 1 : 0) +
    (filters.dubbing !== 'all' ? 1 : 0) +
    (filters.favorite ? 1 : 0)
  );
}

// ─── Series-detail page (lesson list) ───────────────────────────────────────
export type LessonViewMode = 'table' | 'card';

export interface LessonFilters {
  keyword: string;
  dubbingOnly: boolean;
}

export function readLessonFilters(params: URLSearchParams): LessonFilters {
  return {
    keyword: (params.get('q') || '').slice(0, 80),
    dubbingOnly: params.get('type') === 'dubbed'
  };
}

export function readLessonView(params: URLSearchParams): LessonViewMode {
  return params.get('view') === 'card' ? 'card' : 'table';
}

export function writeLessonFilters(
  params: URLSearchParams,
  filters: LessonFilters,
  view: LessonViewMode
): URLSearchParams {
  const next = new URLSearchParams(params);
  const keyword = filters.keyword.trim();
  if (keyword) next.set('q', keyword);
  else next.delete('q');
  if (filters.dubbingOnly) next.set('type', 'dubbed');
  else next.delete('type');
  next.set('view', view);
  return next;
}

export function filterLessons<T extends { title: string; canDubbing?: boolean }>(
  lessons: T[],
  filters: LessonFilters
): T[] {
  const term = filters.keyword.trim().toLowerCase();
  return lessons.filter((lesson) => {
    if (filters.dubbingOnly && !lesson.canDubbing) return false;
    if (!term) return true;
    return lesson.title.toLowerCase().includes(term);
  });
}

export function countDubbedLessons(lessons: Array<{ canDubbing?: boolean }>): number {
  return lessons.filter((lesson) => Boolean(lesson.canDubbing)).length;
}

/** Source Start Learning opens lesson 1; we resume the first unfinished lesson. */
export function pickStartEpisode(
  episodes: VideoEpisodeSummary[],
  continueTarget: { episodeId: string } | null
): VideoEpisodeSummary | null {
  if (continueTarget) {
    const target = episodes.find((episode) => episode._id === continueTarget.episodeId);
    if (target) return target;
  }
  return episodes.find((episode) => !episode.progress.completed) || episodes[0] || null;
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function formatClock(seconds: number): string {
  return formatDuration(seconds);
}

/** The source catalogue has no duration for stored lessons; never show 0:00. */
export function durationLabel(seconds: number): string {
  return Number(seconds) > 0 ? formatDuration(seconds) : 'Chưa rõ thời lượng';
}

export function sourceLabel(source: VideoSource): string {
  return VIDEO_SOURCE_META[source]?.label || source;
}

// ─── Lesson player (the four-part counter, transcript and exercises) ───────
export interface VideoActivitySummary {
  done: number;
  total: number;
  percent: number;
}

export function activitySummary(progress?: VideoEpisodeProgress | null): VideoActivitySummary {
  const total = Number(progress?.activityTotal) || progress?.activities?.length || 0;
  const done = Number(progress?.activityDone) || progress?.activities?.filter((activity) => activity.done).length || 0;
  return { done, total, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
}

export function activityCounter(progress?: VideoEpisodeProgress | null): string {
  const summary = activitySummary(progress);
  return summary.total > 0 ? `${summary.done}/${summary.total}` : '—';
}

export function activeCueIndex(cues: VideoCue[], currentTime: number): number {
  return cues.findIndex((cue) => cue.start <= currentTime + 0.05 && currentTime < cue.end);
}

/** Source subtitle rows print MM:SS, always with two digits. */
export function formatCueTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const roundCueTime = (value: number) => Math.round(value * 100) / 100;

/**
 * YouTube lessons expose the source caption count but no licensed caption text,
 * so the watch page builds evenly spaced sentence markers across the playable
 * clip. Each marker only seeks/stops the embedded video; the words stay in
 * YouTube's own captions. Returns nothing when the clip has no usable span.
 */
export function estimateSentenceCues(count: number, startSec: number, endSec: number): VideoCue[] {
  const total = Math.max(0, Math.floor(Number(count) || 0));
  const start = Math.max(0, Number(startSec) || 0);
  const end = Number(endSec) || 0;
  if (total === 0 || !(end > start)) return [];
  const span = end - start;
  return Array.from({ length: total }, (_, index) => {
    const cueStart = roundCueTime(start + (span * index) / total);
    const cueEnd = roundCueTime(start + (span * (index + 1)) / total);
    return {
      idx: index + 1,
      start: cueStart,
      end: cueEnd > cueStart ? cueEnd : roundCueTime(cueStart + 0.01),
      text: ''
    };
  });
}

export interface VideoCueToken {
  text: string;
  word: boolean;
}

/** Split a sentence into clickable words while keeping punctuation in place. */
export function splitCueWords(text: string): VideoCueToken[] {
  const value = String(text || '');
  const tokens: VideoCueToken[] = [];
  const pattern = /[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*/g;
  let lastIndex = 0;
  let match = pattern.exec(value);
  while (match) {
    if (match.index > lastIndex) tokens.push({ text: value.slice(lastIndex, match.index), word: false });
    tokens.push({ text: match[0], word: true });
    lastIndex = match.index + match[0].length;
    match = pattern.exec(value);
  }
  if (lastIndex < value.length) tokens.push({ text: value.slice(lastIndex), word: false });
  return tokens;
}

/** The five objectives shown on every source lesson page. */
export const VIDEO_LESSON_OBJECTIVES = [
  'Xem video và theo dõi phụ đề từng câu.',
  'Đọc theo lời thoại trong video.',
  'Luyện nói qua studio luyện nói.',
  'Quan sát bối cảnh câu chuyện và cách nhân vật dùng tiếng Anh.',
  'Nhận biết từ vựng và bắt chước phát âm.'
];

/** Skills listed beside the objectives on the source subtitle page. */
export const VIDEO_LESSON_SKILLS = [
  { title: 'Nghe', description: 'Nghe video và theo dõi từng câu.' },
  { title: 'Đọc', description: 'Đọc theo lời thoại trong phụ đề.' },
  { title: 'Từ vựng', description: 'Nhận biết từ xuất hiện trong câu chuyện.' },
  { title: 'Phát âm', description: 'Nghe và bắt chước từng từ.' },
  { title: 'Nói', description: 'Luyện nói qua studio nói và lồng tiếng.' }
];

/**
 * Ten words documented on the source lesson page for Hunting for Bugs. They are
 * only a display fallback; stored episode vocabulary always wins.
 */
const SOURCE_LESSON_VOCABULARY: Record<string, VideoVocabulary[]> = {
  'r2-l1-bat-and-friends-72-l1-001': [
    { word: 'flew', meaningVi: 'Bay' },
    { word: 'bat', meaningVi: 'Con dơi' },
    { word: 'bugs', meaningVi: 'Những con bọ' },
    { word: 'ate', meaningVi: 'Đã ăn' },
    { word: 'home', meaningVi: 'Nhà' },
    { word: 'big', meaningVi: 'To, lớn' },
    { word: 'came', meaningVi: 'Đã đến' },
    { word: 'found', meaningVi: 'Đã tìm thấy' },
    { word: 'over', meaningVi: 'Phía trên, qua' },
    { word: 'said', meaningVi: 'Đã nói' }
  ]
};

export function lessonVocabulary(episode: VideoEpisodeSummary): VideoVocabulary[] {
  if (Array.isArray(episode.vocabulary) && episode.vocabulary.length > 0) return episode.vocabulary;
  return SOURCE_LESSON_VOCABULARY[episode.lessonCode || ''] || SOURCE_LESSON_VOCABULARY[episode.slug] || [];
}

export function comprehensionPrompt(title: string): string {
  return `Bé hãy tự lặp lại 2 câu tiếng Anh mà mình yêu thích nhất trong bài “${title}”.`;
}

export interface VideoOpenExercise {
  kind: 'open';
  id: 'open';
  prompt: string;
}

export interface VideoChoiceExercise {
  kind: 'choice';
  id: string;
  prompt: string;
  cue: VideoCue;
  options: Array<{ text: string; correct: boolean }>;
}

export type VideoExercise = VideoOpenExercise | VideoChoiceExercise;

/**
 * The source page shows seven exercises: one open question plus six listening
 * choices derived deterministically from the licensed cues.
 */
export function buildLessonExercises(
  title: string,
  cues: VideoCue[],
  maxChoices = 6
): VideoExercise[] {
  const open: VideoOpenExercise = { kind: 'open', id: 'open', prompt: comprehensionPrompt(title) };
  const usable = cues.filter((cue) => Boolean(cue.text?.trim())).sort((a, b) => a.start - b.start);
  if (usable.length < 3) return [open];

  const count = Math.min(maxChoices, usable.length);
  const chosen: VideoCue[] = [];
  for (let index = 0; index < count; index += 1) {
    const cue = usable[Math.floor((index * usable.length) / count)];
    if (cue && !chosen.some((item) => item.idx === cue.idx)) chosen.push(cue);
  }

  const choices = chosen.map((cue, index) => {
    const others = usable.filter((item) => item.text !== cue.text);
    const decoys = [...others.slice(index + 1), ...others.slice(0, index + 1)].slice(0, 2);
    const options = [
      { text: cue.text, correct: true },
      ...decoys.map((decoy) => ({ text: decoy.text, correct: false }))
    ];
    const rotate = options.length > 0 ? index % options.length : 0;
    return {
      kind: 'choice' as const,
      id: `choice-${index + 1}`,
      prompt: 'Con vừa nghe câu nào?',
      cue,
      options: [...options.slice(rotate), ...options.slice(0, rotate)]
    };
  });

  return [open, ...choices];
}
