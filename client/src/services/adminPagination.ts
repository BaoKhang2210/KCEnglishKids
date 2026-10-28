/** Fetch every server page instead of silently increasing a capped limit. */
export async function fetchAllPages<T>(fetchPage: (page: number) => Promise<{ data: T[]; pages?: number }>): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const response = await fetchPage(page);
    items.push(...response.data);
    if (page >= (response.pages || 1)) return items;
  }
}
