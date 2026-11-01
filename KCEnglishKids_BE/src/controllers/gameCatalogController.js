const { GameCatalogSetting } = require('../models');
const { validateCatalog, mergeCatalog, loadCatalog, assertLessonCoverage } = require('../services/gameCatalog');
const { audit } = require('../services/adminIntegrity');
const { fail } = require('../services/teacherRules');
exports.get = async (_req, res, next) => {
  try { res.json({ success: true, data: await loadCatalog() }); } catch (error) { next(error); }
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
