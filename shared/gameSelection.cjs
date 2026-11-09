// Shared by the API and the browser. Catalog order sets priorities within each
// family; lesson position rotates them so saving settings cannot flatten variety.
function selectGames(catalog, eligibleIds, unit = 1, lesson = 1) {
  const eligible = new Set(eligibleIds);
  const pool = catalog.filter(game => game.enabled !== false && eligible.has(game.id));
  const round = (Math.max(1, Number(unit) || 1) - 1) * 4 + Math.max(1, Number(lesson) || 1) - 1;
  const chosen = [];
  for (const [category, count] of [['tap_pop', 2], ['find_match', 1], ['build_make', 1]]) {
    const family = pool.filter(game => game.category === category);
    for (let i = 0; i < Math.min(count, family.length); i++) chosen.push(family[(round + i) % family.length]);
  }
  for (const game of pool) if (chosen.length < 4 && !chosen.some(item => item.id === game.id)) chosen.push(game);
  return chosen;
}
module.exports = { selectGames };
