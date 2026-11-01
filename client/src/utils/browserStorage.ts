// Authentication/UI caches may fall back to memory when storage is blocked.
// Durable learning submissions deliberately use native storage and report failure.
const memory = new Map<string,string>();
export const browserStorage = {
  getItem(key:string): string|null { try { return localStorage.getItem(key); } catch { return memory.get(key) || null; } },
  setItem(key:string,value:string) { memory.set(key,value); try { localStorage.setItem(key,value); } catch { /* session memory */ } },
  removeItem(key:string) { memory.delete(key); try { localStorage.removeItem(key); } catch { /* session memory */ } },
};
