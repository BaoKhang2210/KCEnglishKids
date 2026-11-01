const rules = require('../../../shared/learningGames.json');
const { GameCatalogSetting, Lesson, Vocabulary } = require('../models');
const { availableGames } = require('./gameRules');
const { fail } = require('./teacherRules');

function validateCatalog(games) {
  if (!Array.isArray(games) || games.length !== rules.length || new Set(games.map(game => game?.gameId)).size !== rules.length) fail('Danh mục phải có đầy đủ 12 trò chơi, mỗi trò một lần.');
  for (const game of games) {
    if (!rules.some(rule => rule.id === game.gameId) || typeof game.enabled !== 'boolean' || !Number.isInteger(game.displayOrder) || game.displayOrder < 0 || game.displayOrder >= rules.length) fail('Cấu hình trò chơi không hợp lệ.');
  }
  if (new Set(games.map(game => game.displayOrder)).size !== rules.length) fail('Thứ tự trò chơi không được trùng.');
  if (games.filter(game => game.enabled).length < 2) fail('Cần bật ít nhất hai trò chơi để bé hoàn thành chặng 3.');
  return games.map(({ gameId, enabled, displayOrder }) => ({ gameId, enabled, displayOrder }));
}
function mergeCatalog(settings) {
  return rules.map((rule, index) => {
    const setting = settings?.games?.find(game => game.gameId === rule.id);
    return { ...rule, enabled: setting?.enabled ?? true, displayOrder: setting?.displayOrder ?? index };
  }).sort((a, b) => a.displayOrder - b.displayOrder);
}
async function loadCatalog() {
  const settings = await GameCatalogSetting.findOne({ key: 'STAGE3' }).lean();
  return { revision: settings?.__v ?? 0, customized: Boolean(settings), games: mergeCatalog(settings) };
}
async function configuredGames(words, unit, lesson) {
  const catalog = await loadCatalog();
  return availableGames(words, unit, lesson, catalog.customized ? catalog.games : undefined);
}
async function assertLessonCoverage(games) {
  const [lessons, vocabulary] = await Promise.all([
    Lesson.find({ status: 'ACTIVE' }).select('title vocabularyItems').lean(),
    Vocabulary.find({ status: 'ACTIVE' }).select('english wordType category imageUrl isTransparent').lean()
  ]);
  const words = new Map(vocabulary.map(word => [String(word._id), word]));
  const blocked = lessons.filter(lesson => availableGames((lesson.vocabularyItems || []).map(id => words.get(String(id))).filter(Boolean), 1, 1, games).length < 2);
  if (blocked.length) fail(`Cấu hình khiến ${blocked.length} bài học không còn đủ hai trò chơi phù hợp. Ví dụ: ${blocked.slice(0, 3).map(lesson => lesson.title).join(', ')}. Hãy bật thêm trò chơi.`, 409);
}
module.exports = { validateCatalog, mergeCatalog, loadCatalog, configuredGames, assertLessonCoverage };
