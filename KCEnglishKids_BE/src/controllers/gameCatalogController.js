const { GameCatalogSetting, Lesson, ActivityResult } = require('../models');
const { validateCatalog, mergeCatalog, loadCatalog, assertLessonCoverage } = require('../services/gameCatalog');
const { audit } = require('../services/adminIntegrity');
const { fail } = require('../services/teacherRules');
const { usable } = require('../services/gameRules');

exports.get = async (_req, res, next) => {
  try {
    const [catalog, lessons] = await Promise.all([
      loadCatalog(),
      Lesson.find({ status: 'ACTIVE' })
        .select('title vietnameseTitle ageGroupCode vocabularyItems displayOrder')
        .populate('vocabularyItems')
        .lean()
    ]);
    res.json({
      success: true,
      data: {
        ...catalog,
        games: catalog.games.map(game => ({
          ...game,
          supportedLessons: lessons.filter(
            lesson => usable(game, lesson.vocabularyItems.filter(word => word.status === 'ACTIVE')).length >= game.minVocab
          ).length
        })),
        lessons: lessons.map(lesson => ({
          _id: lesson._id,
          title: lesson.vietnameseTitle || lesson.title,
          ageGroupCode: lesson.ageGroupCode
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.preview = async (req, res, next) => {
  try {
    if (!require('../services/teacherRules').validId(req.query.lessonId)) fail('Chọn bài học để xem trước.');
    const lesson = await Lesson.findOne({ _id: req.query.lessonId, status: 'ACTIVE' }).populate('vocabularyItems').lean();
    if (!lesson) fail('Bài học không còn hoạt động.', 404);
    res.json({ success: true, data: { ...lesson, vocabularyItems: lesson.vocabularyItems.filter(word => word.status === 'ACTIVE') } });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const games = validateCatalog(req.body.games);
    if (!Number.isInteger(req.body.revision) || req.body.revision < 0) fail('Thiếu phiên bản cấu hình. Hãy tải lại danh mục.');
    await assertLessonCoverage(mergeCatalog({ games }));
    let setting = await GameCatalogSetting.findOne({ key: 'STAGE3' });
    if ((setting?.__v ?? 0) !== req.body.revision) fail('Cấu hình vừa được thay đổi. Hãy tải lại trước khi lưu.', 409);
    try {
      if (!setting) setting = await GameCatalogSetting.create({ games, updatedBy: req.user._id, __v: 1 });
      else { setting.games = games; setting.updatedBy = req.user._id; await setting.save(); }
    } catch (error) {
      if (error.code === 11000 || error.name === 'VersionError') fail('Cấu hình vừa được thay đổi. Hãy tải lại trước khi lưu.', 409);
      throw error;
    }
    await audit(req, 'UPDATE_GAME_CATALOG', 'GameCatalogSetting', setting._id, { enabled: games.filter(game => game.enabled).map(game => game.gameId) });
    res.json({ success: true, data: { games: mergeCatalog(setting), revision: setting.__v, customized: true } });
  } catch (error) {
    next(error);
  }
};

exports.analytics = async (_req, res, next) => {
  try {
    const [overallAgg, recentPlays, topLessonsAgg] = await Promise.all([
      ActivityResult.aggregate([
        {
          $group: {
            _id: null,
            totalPlays: { $sum: 1 },
            avgScore: { $avg: '$score' },
            totalStars: { $sum: '$stars' },
            avgDuration: { $avg: '$duration' },
            threeStarCount: { $sum: { $cond: [{ $gte: ['$stars', 3] }, 1, 0] } }
          }
        }
      ]),
      ActivityResult.find()
        .populate('child', 'name avatar avatarUrl')
        .populate('lesson', 'title vietnameseTitle ageGroupCode')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      ActivityResult.aggregate([
        {
          $group: {
            _id: '$lesson',
            count: { $sum: 1 },
            avgScore: { $avg: '$score' },
            avgStars: { $avg: '$stars' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 6 }
      ])
    ]);

    const lessonIds = topLessonsAgg.map(item => item._id).filter(Boolean);
    const populatedLessons = await Lesson.find({ _id: { $in: lessonIds } })
      .select('title vietnameseTitle ageGroupCode')
      .lean();
    const lessonMap = new Map(populatedLessons.map(l => [String(l._id), l]));

    const topLessons = topLessonsAgg.map(item => {
      const lesson = lessonMap.get(String(item._id));
      return {
        lessonId: item._id,
        title: lesson?.vietnameseTitle || lesson?.title || 'Bài học',
        ageGroupCode: lesson?.ageGroupCode || '3-4',
        playCount: item.count,
        avgScore: Math.round(item.avgScore || 0),
        avgStars: Number((item.avgStars || 0).toFixed(1))
      };
    });

    const summary = overallAgg[0] || {
      totalPlays: 0,
      avgScore: 0,
      totalStars: 0,
      avgDuration: 0,
      threeStarCount: 0
    };

    const threeStarRate = summary.totalPlays > 0
      ? Math.round((summary.threeStarCount / summary.totalPlays) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalPlays: summary.totalPlays,
          avgScore: Math.round(summary.avgScore || 0),
          totalStars: summary.totalStars,
          threeStarCount: summary.threeStarCount,
          threeStarRate,
          avgDurationSec: Math.round(summary.avgDuration || 0)
        },
        recentPlays,
        topLessons
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.readiness = async (_req, res, next) => {
  try {
    const catalog = await loadCatalog();
    const lessons = await Lesson.find({ status: 'ACTIVE' })
      .select('title vietnameseTitle ageGroupCode bookNumber unitNumber displayOrder vocabularyItems')
      .populate('vocabularyItems')
      .sort({ ageGroupCode: 1, unitNumber: 1, displayOrder: 1 })
      .lean();

    const lessonReadiness = lessons.map(lesson => {
      const words = (lesson.vocabularyItems || []).filter(w => w && w.status === 'ACTIVE');
      const vocabCount = words.length;
      const hasImageCount = words.filter(w => Boolean(w.imageUrl)).length;
      const hasTransparentCount = words.filter(w => Boolean(w.isTransparent)).length;
      const hasAudioCount = words.filter(w => Boolean(w.audioUrl)).length;
      const supportedGames = catalog.games.filter(g => usable(g, words).length >= g.minVocab);

      const isFullyReady = vocabCount >= 4 && hasImageCount === vocabCount && hasAudioCount === vocabCount;

      return {
        _id: lesson._id,
        title: lesson.vietnameseTitle || lesson.title,
        englishTitle: lesson.title,
        ageGroupCode: lesson.ageGroupCode,
        unitNumber: lesson.unitNumber,
        displayOrder: lesson.displayOrder,
        vocabCount,
        hasImageCount,
        hasTransparentCount,
        hasAudioCount,
        supportedGamesCount: supportedGames.length,
        isFullyReady
      };
    });

    const totalLessons = lessonReadiness.length;
    const readyLessons = lessonReadiness.filter(l => l.isFullyReady).length;
    const readyRate = totalLessons > 0 ? Math.round((readyLessons / totalLessons) * 100) : 0;

    res.json({
      success: true,
      data: {
        overview: {
          totalLessons,
          readyLessons,
          readyRate,
          totalGames: catalog.games.length,
          enabledGames: catalog.games.filter(g => g.enabled).length
        },
        lessons: lessonReadiness
      }
    });
  } catch (error) {
    next(error);
  }
};
