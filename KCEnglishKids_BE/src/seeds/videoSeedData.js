/**
 * Exact catalogue extracted from the public Video Learning pages of
 * tienganhvui.com (70 series / 2,918 lessons). Only catalogue metadata and the
 * original playback source URLs are stored here; third-party thumbnails and
 * videos stay on their original hosts, and subtitle text is never copied.
 */
const CATALOG = require('./videoCatalog.json');

const CATALOG_VERSION = 3;

function parseAgeRange(targetAge) {
  const [min, max] = String(targetAge || '')
    .split('-')
    .map((value) => Number(value));
  return {
    ageMin: Number.isFinite(min) ? min : 3,
    ageMax: Number.isFinite(max) ? max : 6
  };
}

function seriesSource(course) {
  return course.sourceType === 'YouTube' ? 'youtube' : 'stored';
}

function youtubeThumbnail(videoId) {
  return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '';
}

const SERIES = CATALOG.series.map((course) => {
  const { ageMin, ageMax } = parseAgeRange(course.targetAge);
  const source = seriesSource(course);
  return {
    slug: course.code,
    title: course.titleVi || course.titleEn || course.code,
    titleEn: course.titleEn || '',
    subtitle: course.levelTitleVi || '',
    description: '',
    thumbnail: course.thumbnailUrl || '',
    level: course.level,
    levelTitle: course.levelTitleVi || '',
    targetAge: course.targetAge || '',
    ageMin,
    ageMax,
    topicCode: course.topicCode || '',
    difficultyLabel: course.difficultyLabel || '',
    source,
    hasDubbing: Boolean(course.hasDubbing),
    dubbingCount: Number(course.dubbingCount) || 0,
    episodeCount: Number(course.lessonCount) || course.lessons.length,
    activeLessonCount: Number(course.lessonCount) || course.lessons.length,
    order: Number(course.order) || 0,
    attribution: source === 'youtube' ? 'Video nhúng từ YouTube qua tienganhvui.com.' : '',
    episodes: course.lessons.map((lesson) => {
      const lessonSource = lesson.sourceType === 'YouTube' ? 'youtube' : 'stored';
      const startMs = Number(lesson.videoStartMs) || 0;
      const endMs = Number(lesson.videoEndMs) || 0;
      return {
        number: Number(lesson.order) || 0,
        slug: String(lesson.externalKey || '').toLowerCase(),
        lessonCode: lesson.externalKey || '',
        title: lesson.title || '',
        subtitle: course.levelTitleVi || '',
        source: lessonSource,
        videoUrl: lesson.videoUrl || '',
        youtubeId: lesson.youtubeVideoId || '',
        duration: Number(lesson.durationSeconds) || 0,
        videoStartMs: startMs,
        videoEndMs: endMs,
        clipStart: startMs > 0 ? startMs / 1000 : 0,
        clipEnd: endMs > startMs ? endMs / 1000 : 0,
        dialogueStartSec: 0,
        thumbnail:
          lessonSource === 'youtube'
            ? youtubeThumbnail(lesson.youtubeVideoId)
            : course.thumbnailUrl || '',
        captionCueCount: Number(lesson.captionCueCount) || 0,
        canReading: Boolean(lesson.canReading),
        canDubbing: Boolean(lesson.canDubbing),
        dubbingVideoUrl: lesson.dubbingVideoUrl || '',
        audioUrl: lesson.audioUrl || '',
        cueUrl: lesson.cueUrl || '',
        sourceChannelName: lesson.sourceChannelName || '',
        learningMode: lesson.learningMode || '',
        contentFormat: lesson.contentFormat || '',
        difficultyLabel: lesson.difficultyLabel || '',
        vocabulary: [],
        subtitles: [],
        quizzes: []
      };
    })
  };
});

module.exports = { CATALOG, CATALOG_VERSION, SERIES };
