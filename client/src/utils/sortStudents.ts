/**
 * §1.1.1 — Vietnamese-aware student name ordering.
 *
 * Two problems with the default sort:
 *  1. `sort({ name: 1 })` in Mongo orders by code point → accented names
 *     (Ánh, Ể, Ộ, Đức…) get pushed to the end, breaking the A-Z feel.
 *  2. Vietnamese name order puts the GIVEN name (last word) first:
 *     Nguyễn Văn **An** < Trần Văn **Bình** — even though "Nguyễn" > "Trần"
 *     by family name.
 *
 * Strategy: primary key = last word (given name), tie-break = full name.
 */

/** Last word of a Vietnamese name = the given/personal name. */
export const givenNameVi = (name: string): string => {
  const parts = String(name || '').trim().split(/\s+/);
  return parts[parts.length - 1] || '';
};

const cmpVi = (a: string, b: string) =>
  a.localeCompare(b, 'vi', { sensitivity: 'base' });

/** Compare two entities by Vietnamese name (given name first). */
export const byNameVi = (a: { name: string }, b: { name: string }): number => {
  const byGiven = cmpVi(givenNameVi(a.name), givenNameVi(b.name));
  return byGiven !== 0 ? byGiven : cmpVi(String(a.name || ''), String(b.name || ''));
};

/** Sort a copy of the list by Vietnamese name — never mutates the input. */
export const sortByNameVi = <T extends { name: string }>(list: T[]): T[] =>
  [...list].sort(byNameVi);
