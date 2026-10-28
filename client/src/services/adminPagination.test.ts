import { expect, it } from 'vitest';
import { fetchAllPages } from './adminPagination';
it('loads every capped server page without dropping rows after 100', async () => {
  const calls: number[] = [];
  const rows = await fetchAllPages(async page => {
    calls.push(page);
    return { data: Array.from({ length: page === 3 ? 13 : 100 }, (_, index) => (page - 1) * 100 + index), pages: 3 };
  });
  expect(rows).toHaveLength(213);
  expect(calls).toEqual([1, 2, 3]);
});
it('propagates a failed page so exports never claim partial data is complete', async () => {
  await expect(fetchAllPages(async page => { if (page === 2) throw new Error('offline'); return { data: [1], pages: 3 }; })).rejects.toThrow('offline');
});
