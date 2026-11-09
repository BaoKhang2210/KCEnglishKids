const { User, CurriculumUnit, Lesson, Progress, UnitCompletion, Activity, ActivityResult } = require('../models');
const { calculateLessonStars } = require('./starService');
const { completedStageCount, REQUIRED_STAGE3_GAMES: STAGE3_GAME_COUNT } = require('./stageStarPolicy');

const STARS_PER_UNIT = 5;
const REQUIRED_STAGE3_GAMES = STAGE3_GAME_COUNT;

const numeric = (value) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;

function resolveLessonStars(progress, activityRating) {
  if (!progress) return 0;
  const source = progress.completionSnapshot?.source;
  const stageBased = source === 'STAGES' || progress.stage1Completed || progress.stage2Completed || progress.stage3Completed || (progress.stage3Games || []).length > 0;
  if (stageBased) {
    // Keep historical totals visible; stage completion is the sole source for new stars.
    return Math.min(3, Math.max(numeric(progress.stars), completedStageCount(progress)));
  }
  const stars = source === 'CURRENT_ACTIVITIES' || source === 'LEGACY_PROGRESS'
    ? Math.max(numeric(progress.stars), activityRating?.completed ? numeric(activityRating.stars) : 0)
    : progress.completed ? numeric(progress.stars) : 0;
  return Math.min(3, Math.floor(stars));
}

function buildUnitLedgerRow(unit, lessonRows, grant, completed, unlocked, title = `Unit ${unit.unitNumber}`) {
  const effectiveLessons = unlocked ? lessonRows : lessonRows.map(lesson => ({
    ...lesson,
    stars: 0,
    ...(lesson.stages ? { stages: { ...lesson.stages, stage2: { ...lesson.stages.stage2, stars: 0 } } } : {})
  }));
  const recordedBonus = (grant?.rewards || []).filter(reward => reward.type === 'STAR').reduce((sum, reward) => sum + numeric(reward.amount), 0);
  const bonusStars = completed && unlocked && grant ? Math.min(STARS_PER_UNIT, recordedBonus || STARS_PER_UNIT) : 0;
  const lessonStars = effectiveLessons.reduce((sum, lesson) => sum + lesson.stars, 0);
  return {
    id: String(unit._id),
    bookNumber: unit.bookNumber,
    unitNumber: unit.unitNumber,
    title,
    icon: unit.icon || null,
    unlocked,
    completed,
    stars: lessonStars + bonusStars,
    lessonStars,
    bonusStars,
    bonusReceived: bonusStars > 0,
    maxStars: effectiveLessons.length * 3 + STARS_PER_UNIT,
    completedLessons: effectiveLessons.filter(lesson => lesson.completed).length,
    totalLessons: effectiveLessons.length,
    lessons: effectiveLessons
  };
}

function summarizeStarLedger(units) {
  return {
    totalStars: units.reduce((sum, unit) => sum + unit.stars, 0),
    maxStars: units.reduce((sum, unit) => sum + unit.maxStars, 0),
    completedUnits: units.filter(unit => unit.completed).length,
    completedLessons: units.reduce((sum, unit) => sum + unit.completedLessons, 0),
    units
  };
}

/**
 * Builds the current, active curriculum's auditable star tree directly from
 * its source records. Chests/stickers are deliberately not part of this ledger.
 */
async function computeStarLedger(childId) {
  const child = await User.findById(childId).select('ageGroupCode role status').lean();
  if (!child || child.role !== 'CHILD' || child.status !== 'ACTIVE') {
    // Internal reward maintenance paths also call this service for users that
    // are not children. HTTP callers authorize child access before reaching it.
    return summarizeStarLedger([]);
  }

  const units = await CurriculumUnit.find({ ageGroupCode: child.ageGroupCode, status: 'ACTIVE' })
    .sort({ bookNumber: 1, unitNumber: 1, displayOrder: 1 }).lean();
  const unitIds = units.map(unit => unit._id);
  const lessons = unitIds.length
    ? await Lesson.find({ ageGroupCode: child.ageGroupCode, curriculumUnits: { $in: unitIds }, status: 'ACTIVE' })
      .populate('topic', 'englishName')
      .sort({ displayOrder: 1, lessonNumber: 1, createdAt: 1 }).lean()
    : [];
  const lessonIds = lessons.map(lesson => lesson._id);
  const [progressDocs, unitCompletions, activities] = await Promise.all([
    lessonIds.length ? Progress.find({ child: childId, lesson: { $in: lessonIds } }).lean() : [],
    unitIds.length ? UnitCompletion.find({ child: childId, unit: { $in: unitIds } }).lean() : [],
    lessonIds.length ? Activity.find({ lesson: { $in: lessonIds }, status: 'ACTIVE' }).select('_id lesson questions questionCount pointsPerQuestion').lean() : []
  ]);
  const activityIds = activities.map(activity => activity._id);
  const activityResults = activityIds.length
    ? await ActivityResult.find({ child: childId, activity: { $in: activityIds }, completed: true }).select('lesson activity score').lean()
    : [];

  const progressByLesson = new Map(progressDocs.map(row => [String(row.lesson), row]));
  const completionByUnit = new Map(unitCompletions.map(row => [String(row.unit), row]));
  const activitiesByLesson = new Map();
  for (const activity of activities) {
    const key = String(activity.lesson);
    activitiesByLesson.set(key, [...(activitiesByLesson.get(key) || []), activity]);
  }
  const resultsByLesson = new Map();
  for (const result of activityResults) {
    const key = String(result.lesson);
    resultsByLesson.set(key, [...(resultsByLesson.get(key) || []), result]);
  }
  const lessonsByUnit = new Map();
  for (const lesson of lessons) {
    for (const unitId of lesson.curriculumUnits || []) {
      const key = String(unitId);
      lessonsByUnit.set(key, [...(lessonsByUnit.get(key) || []), lesson]);
    }
  }

  const rows = [];
  let previousUnitCompleted = true;
  for (const unit of units) {
    const unitLessons = lessonsByUnit.get(String(unit._id)) || [];
    let previousLessonCompleted = true;
    const lessonRows = unitLessons.map((lesson, lessonIndex) => {
      const progress = progressByLesson.get(String(lesson._id));
      const stage1Completed = !!progress?.stage1Completed;
      const stage2Completed = !!progress?.stage2Completed;
      const completedGames = [...new Set(progress?.stage3Games || [])];
      const stage3Completed = !!progress?.stage3Completed || completedGames.length >= REQUIRED_STAGE3_GAMES;
      const completed = !!progress?.completed || (stage1Completed && stage2Completed && stage3Completed);
      const source = progress?.completionSnapshot?.source;
      // Old activity lessons are rated once from best scores; they never stack
      // with a stage score for the same lesson.
      const rating = calculateLessonStars(activitiesByLesson.get(String(lesson._id)) || [], resultsByLesson.get(String(lesson._id)) || []);
      const stars = resolveLessonStars(progress, rating);
      // A previously completed lesson stays available for review even if an
      // earlier lesson is incomplete (for example, after curriculum reordering).
      const lessonUnlocked = previousUnitCompleted && (previousLessonCompleted || completed);
      const row = {
        id: String(lesson._id),
        lessonNumber: lessonIndex + 1,
        title: lesson.vietnameseTitle || lesson.title,
        stars,
        maxStars: 3,
        completed,
        unlocked: lessonUnlocked,
        source: source === 'CURRENT_ACTIVITIES' || source === 'LEGACY_PROGRESS' ? 'ACTIVITIES' : 'STAGE2',
        stages: {
          stage1: { completed: stage1Completed, stars: stage1Completed ? 1 : 0, unlocked: lessonUnlocked },
          stage2: { completed: stage2Completed, stars: stage2Completed ? 1 : 0, unlocked: lessonUnlocked && (stage1Completed || completed) },
          stage3: { completed: stage3Completed, stars: stage3Completed ? 1 : 0, completedGames: completedGames.length, requiredGames: REQUIRED_STAGE3_GAMES, unlocked: lessonUnlocked && (stage2Completed || completed) }
        }
      };
      previousLessonCompleted = completed;
      return row;
    });
    const unlocked = previousUnitCompleted;
    const currentLessonRows = unlocked ? lessonRows : lessonRows.map(lesson => ({
      ...lesson,
      stars: 0,
      stages: { ...lesson.stages, stage2: { ...lesson.stages.stage2, stars: 0 } }
    }));
    const completed = unlocked && currentLessonRows.length > 0 && currentLessonRows.every(lesson => lesson.completed);
    const grant = completionByUnit.get(String(unit._id));
    rows.push(buildUnitLedgerRow(unit, currentLessonRows, grant, completed, unlocked, unitLessons[0]?.topic?.englishName || `Unit ${unit.unitNumber}`));
    previousUnitCompleted = completed;
  }

  return summarizeStarLedger(rows);
}

module.exports = { STARS_PER_UNIT, REQUIRED_STAGE3_GAMES, resolveLessonStars, buildUnitLedgerRow, summarizeStarLedger, computeStarLedger };
