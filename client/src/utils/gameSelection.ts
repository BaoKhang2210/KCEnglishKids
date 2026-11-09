// Shared game selection algorithm. Catalog order sets priorities within each
// family; lesson position rotates them so saving settings cannot flatten variety.
export function selectGames<T extends { id: string; category: string; enabled?: boolean }>(
  catalog: T[],
  eligibleIds: string[],
  unit: number = 1,
  lesson: number = 1
): T[] {
  const eligible = new Set(eligibleIds);
  const pool = catalog.filter(game => game.enabled !== false && eligible.has(game.id));
  const round = (Math.max(1, Number(unit) || 1) - 1) * 4 + Math.max(1, Number(lesson) || 1) - 1;
  const chosen: T[] = [];
  for (const [category, count] of [['tap_pop', 2], ['find_match', 1], ['build_make', 1]] as const) {
    const family = pool.filter(game => game.category === category);
    for (let i = 0; i < Math.min(count, family.length); i++) chosen.push(family[(round + i) % family.length]);
  }
  for (const game of pool) if (chosen.length < 4 && !chosen.some(item => item.id === game.id)) chosen.push(game);
  return chosen;
}

