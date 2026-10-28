const { Lesson, Activity, Vocabulary, ActivityResult, CurriculumUnit, Progress } = require('../models');
const { calculateLessonStars } = require('../services/starService');

// @desc    Get structured Curriculum Path (Units & Lessons for child's age group)
// @route   GET /api/lessons/curriculum-path
// @access  Public / Child
const getCurriculumPath = async (req, res, next) => {
  try {
    const ageGroup = req.query.ageGroup || (req.user && req.user.ageGroupCode) || '3-4';
    const childId = (req.user && req.user.role === 'CHILD') ? req.user._id : req.query.childId;

    // 1. Find the 9 Units for this age group
    const units = await CurriculumUnit.find({ ageGroupCode: ageGroup, status: 'ACTIVE' })
      .sort({ unitNumber: 1 })
      .lean();

    const unitIds = units.map(u => u._id);

    // 2. Find lessons for these units
    const lessons = await Lesson.find({ curriculumUnits: { $in: unitIds }, status: 'ACTIVE' })
      .populate('topic', 'englishName vietnameseName colorCode icon slug imageUrl')
      .populate('vocabularyItems', 'english vietnamese pronunciation imageUrl audioUrl animationUrl isTransparent visualType wordType')
      .sort({ displayOrder: 1, lessonNumber: 1 })
      .lean();

    // 3. If childId provided, get progress & activity results
    const progressMap = new Map();
    if (childId) {
      const progressDocs = await Progress.find({ child: childId });
      progressDocs.forEach(p => {
        if (p.lesson) {
          progressMap.set(p.lesson.toString(), {
            completed: p.completed,
            stars: p.completed ? (p.stars || 0) : 0,
            highestScore: p.highestScore || 0
          });
        }
      });

      // ActivityResult scores help show the best game score, but never provide
      // Lesson stars: those are calculated once across every active activity
      // and persisted in Progress by learningService.
      // §4.11: "lesson completed" is owned by Progress.completed (set when ALL
      // lesson activities are done) — never inferred from ar.stars > 0.
      const lessonIds = lessons.map(l => l._id);
      const [activeActivities, activityResults] = await Promise.all([
        Activity.find({ lesson: { $in: lessonIds }, status: 'ACTIVE' })
          .select('_id lesson questions questionCount pointsPerQuestion')
          .lean(),
        ActivityResult.find({
        child: childId,
        lesson: { $in: lessonIds },
        completed: true
        }).select('lesson activity score').lean()
      ]);
      const activitiesByLesson = new Map();
      const resultsByLesson = new Map();
      activeActivities.forEach(activity => {
        const key = activity.lesson.toString();
        if (!activitiesByLesson.has(key)) activitiesByLesson.set(key, []);
        activitiesByLesson.get(key).push(activity);
      });
      activityResults.forEach(result => {
        const key = result.lesson.toString();
        if (!resultsByLesson.has(key)) resultsByLesson.set(key, []);
        resultsByLesson.get(key).push(result);
      });
      activityResults.forEach(ar => {
        const lid = ar.lesson.toString();
        const existing = progressMap.get(lid);
        const currentStars = existing ? existing.stars : 0;
        const isCompleted = Boolean(existing && existing.completed);
        progressMap.set(lid, {
          completed: isCompleted,
          stars: currentStars,
          highestScore: existing ? Math.max(existing.highestScore, ar.score || 0) : (ar.score || 0)
        });
      });

      // Existing Progress records may contain the old best-single-activity
      // rating. Derive completed Lesson stars from activity results instead.
      progressMap.forEach((progress, lessonId) => {
        if (!progress.completed) return;
        const rating = calculateLessonStars(
          activitiesByLesson.get(lessonId) || [],
          resultsByLesson.get(lessonId) || []
        );
        if (rating.completed) progress.stars = rating.stars;
      });
    }

    // 4. Group lessons by unit
    const lessonsByUnit = {};
    lessons.forEach(l => {
      (l.curriculumUnits || []).forEach(unitRef => {
        const uid = unitRef.toString();
        if (!lessonsByUnit[uid]) lessonsByUnit[uid] = [];
        const prog = progressMap.get(l._id.toString()) || { completed: false, stars: 0 };
        lessonsByUnit[uid].push({
          ...l,
          completed: prog.completed,
          stars: prog.stars
        });
      });
    });

    const curriculumPath = units.map(unit => {
      const unitLessons = lessonsByUnit[unit._id.toString()] || [];
      const unitTopic = unitLessons[0]?.topic || null;
      const completedLessons = unitLessons.filter(l => l.completed).length;
      const totalUnitStars = unitLessons.reduce((sum, l) => sum + (l.stars || 0), 0);

      return {
        _id: unit._id,
        unitNumber: unit.unitNumber,
        bigQuestion: unit.bigQuestion,
        storyTitle: unit.storyTitle,
        topic: unitTopic,
        topicSlug: unitTopic?.slug || 'school',
        topicName: unitTopic?.englishName || `Unit ${unit.unitNumber}`,
        topicVietnameseName: unitTopic?.vietnameseName || '',
        topicIcon: unitTopic?.icon || '🎒',
        topicColor: unitTopic?.colorCode || '#F59E0B',
        lessons: unitLessons,
        totalLessons: unitLessons.length,
        completedLessons,
        totalUnitStars,
        isCompleted: unitLessons.length > 0 && completedLessons === unitLessons.length
      };
    });

    res.status(200).json({
      success: true,
      ageGroupCode: ageGroup,
      count: curriculumPath.length,
      data: curriculumPath
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single lesson by ID
// @route   GET /api/lessons/:id
// @access  Public / Child
const getLessonById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const childId = (req.user && req.user.role === 'CHILD') ? req.user._id : req.query.childId;

    const lesson = await Lesson.findOne({ _id: id, status: 'ACTIVE' })
      .populate('topic', 'englishName vietnameseName colorCode icon slug imageUrl')
      .populate('curriculumUnits', 'unitNumber bigQuestion storyTitle')
      .populate('vocabularyItems', 'english vietnamese pronunciation imageUrl audioUrl animationUrl isTransparent visualType wordType exampleSentence exampleSentenceVietnamese')
      .populate({ path: 'languageContents', select: 'contentType english vietnamese pronunciation difficulty imageMedia', match: { status: 'ACTIVE' }, populate: { path: 'imageMedia', select: 'url altText' } });

    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found.' });
    }

    const activities = await Activity.find({ lesson: lesson._id, status: 'ACTIVE' })
      .select('title vietnameseTitle activityType difficulty questionCount pointsPerQuestion order')
      .sort({ order: 1 });

    let childResults = [];
    if (childId) {
      childResults = await ActivityResult.find({ child: childId, lesson: lesson._id });
    }

    const resultMap = new Map();
    childResults.forEach(r => {
      const actId = r.activity.toString();
      const existing = resultMap.get(actId);
      if (!existing || r.stars > existing.stars) {
        resultMap.set(actId, r);
      }
    });

    const enrichedActivities = activities.map(act => {
      const res = resultMap.get(act._id.toString());
      return {
        ...act.toObject(),
        completed: Boolean(res && res.completed),
        stars: res ? res.stars : 0,
        score: res ? res.score : 0
      };
    });

    // Determine resume activity: first incomplete activity, or the first one if all done or none started
    const nextIncomplete = enrichedActivities.find(a => !a.completed);
    const resumeActivity = nextIncomplete || enrichedActivities[0] || null;

    res.status(200).json({
      success: true,
      data: {
        ...lesson.toObject(),
        activities: enrichedActivities,
        resumeActivityId: resumeActivity ? resumeActivity._id : null,
        resumeActivityTitle: resumeActivity ? resumeActivity.title : null
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get activities for a lesson
// @route   GET /api/lessons/:id/activities
// @access  Public / Child
const getLessonActivities = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!await Lesson.exists({ _id: id, status: 'ACTIVE' })) return res.status(404).json({ success: false, message: 'Lesson not found.' });

    const activities = await Activity.find({ lesson: id, status: 'ACTIVE' })
      .sort({ order: 1 });

    res.status(200).json({
      success: true,
      count: activities.length,
      data: activities
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCurriculumPath,
  getLessonById,
  getLessonActivities
};
