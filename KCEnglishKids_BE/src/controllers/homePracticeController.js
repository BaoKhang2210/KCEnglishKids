const M = require('../models');
const practice = require('../services/homePractice');
const wrap = fn => async (req, res, next) => { try { await fn(req, res); } catch (error) { next(error); } };

exports.family = wrap(async (req, res) => {
  const child = await M.User.findById(req.params.childId);
  const catalog = await require('../services/gameCatalog').loadCatalog();
  const assignment = child ? await require('../services/teacherAssignments').currentForChild(child) : null;
  const homeReview = child ? await practice.getHomeReview(child) : null;
  res.json({
    success: true,
    data: {
      assignment,
      plan: homeReview?.approvedPlan || (child && !assignment ? await practice.familyCurrent(child) : null),
      gameIds: catalog.games.filter(game => game.enabled).map(game => game.id),
      homeReview
    }
  });
});

exports.complete = wrap(async (req, res) => {
  const child = await M.User.findById(req.params.childId);
  if (!child) return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin bé.' });
  const result = await practice.completeHomeReview(child, req.body?.lessonId);
  res.json({ success: true, data: result });
});
