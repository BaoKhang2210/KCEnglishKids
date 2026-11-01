/* Public learning artwork only. Never intercept authentication, API data or private evidence. */
const CACHE = 'kc-public-learning-art-v1';
const allowed = value => {
  try { const url = new URL(value, self.location.origin); return url.origin === self.location.origin && ['/images/', '/audio/'].some(prefix => url.pathname.startsWith(prefix)); } catch { return false; }
};
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !allowed(event.request.url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE), saved = await cache.match(event.request);
    if (saved) return saved;
    return fetch(event.request);
  })());
});
self.addEventListener('message', event => {
  const port = event.ports[0];
  if (!port || event.data?.type !== 'CACHE_LEARNING_ASSETS') return;
  const urls = [...new Set(event.data.urls || [])];
  if (urls.length > 120 || urls.some(url => typeof url !== 'string' || !allowed(url))) return port.postMessage({error:'Danh sách học liệu không hợp lệ.'});
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);let done = 0;
      for (const url of urls) {
        const response = await fetch(url,{cache:'reload'});
        if (!response.ok || !allowed(response.url) || !/^(image|audio)\//.test(response.headers.get('Content-Type') || '')) throw Error('Chưa tải đủ học liệu. Hãy kiểm tra kết nối và thử lại.');
        await cache.put(url,response);port.postMessage({done:++done,total:urls.length});
      }
      port.postMessage({complete:true,total:urls.length});
    } catch(error) { port.postMessage({error:error.message || 'Chưa tải được học liệu.'}); }
  })());
});
