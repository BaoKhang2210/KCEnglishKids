const { GameCatalogSetting, Lesson } = require('../models');
const { validateCatalog, mergeCatalog, loadCatalog, assertLessonCoverage } = require('../services/gameCatalog');
const { audit } = require('../services/adminIntegrity');
const { fail } = require('../services/teacherRules');
const { usable } = require('../services/gameRules');
exports.get = async (_req, res, next) => {
  try {
    const [catalog, lessons] = await Promise.all([loadCatalog(), Lesson.find({ status: 'ACTIVE' }).select('title vietnameseTitle ageGroupCode vocabularyItems displayOrder').populate('vocabularyItems').lean()]);
    res.json({ success: true, data: { ...catalog, games: catalog.games.map(game => ({ ...game, supportedLessons: lessons.filter(lesson => usable(game, lesson.vocabularyItems.filter(word => word.status === 'ACTIVE')).length >= game.minVocab).length })),
      lessons: lessons.map(lesson => ({ _id: lesson._id, title: lesson.vietnameseTitle || lesson.title, ageGroupCode: lesson.ageGroupCode })) } });
  } catch (error) { next(error); }
};
exports.preview = async (req, res, next) => {
  try {
    if (!require('../services/teacherRules').validId(req.query.lessonId)) fail('Chọn bài học để xem trước.');
    const lesson = await Lesson.findOne({ _id: req.query.lessonId, status: 'ACTIVE' }).populate('vocabularyItems').lean();
    if (!lesson) fail('Bài học không còn hoạt động.', 404);
    res.json({ success: true, data: { ...lesson, vocabularyItems: lesson.vocabularyItems.filter(word => word.status === 'ACTIVE') } });
  } catch (error) { next(error); }
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
  } catch (error) { next(error); }
};
