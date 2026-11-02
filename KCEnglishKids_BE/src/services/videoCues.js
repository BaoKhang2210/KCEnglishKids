const ALLOWED_CUE_HOSTS = new Set(['media.tienganhvui.com']);
const MAX_CUES = 500;
const MAX_BYTES = 512 * 1024;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_LIMIT = 120;

const cache = new Map();

function isAllowedCueUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' && ALLOWED_CUE_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function normalizeSourceCues(payload) {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.cues)
      ? payload.cues
      : Array.isArray(payload?.data)
        ? payload.data
        : [];
  return list
    .map((raw) => {
      const start = Number(raw?.start ?? raw?.startTime ?? raw?.from);
      const end = Number(raw?.end ?? raw?.endTime ?? raw?.to);
      const text = String(raw?.en ?? raw?.text ?? raw?.content ?? raw?.sentence ?? '').trim();
      const translationVi = String(raw?.vi ?? raw?.translationVi ?? raw?.translation ?? '').trim();
      return { start, end, text, translationVi };
    })
    .filter(
      (cue) =>
        Number.isFinite(cue.start) &&
        Number.isFinite(cue.end) &&
        cue.end > cue.start &&
        cue.start >= 0 &&
        cue.text.length > 0
    )
    .sort((a, b) => a.start - b.start)
    .slice(0, MAX_CUES)
    .map((cue, index) => ({
      idx: index + 1,
      start: cue.start,
      end: cue.end,
      text: cue.text,
      ...(cue.translationVi ? { translationVi: cue.translationVi } : {})
    }));
}

/**
 * Cue text is fetched at runtime from the licensed source asset and cached in
 * memory only; it is never copied into the seed or the database.
 */
async function fetchSourceCues(cueUrl) {
  if (!isAllowedCueUrl(cueUrl)) {
    const error = new Error('Unsupported cue source.');
    error.statusCode = 400;
    throw error;
  }
  const cached = cache.get(cueUrl);
  if (cached && cached.expiresAt > Date.now()) return cached.cues;

  const response = await fetch(cueUrl, {
    signal: AbortSignal.timeout(8000),
    headers: { Accept: 'application/json,text/plain;q=0.8' }
  });
  if (!response.ok) {
    const error = new Error(`Cue source responded with ${response.status}.`);
    error.statusCode = 502;
    throw error;
  }
  const declaredSize = Number(response.headers.get('content-length')) || 0;
  if (declaredSize > MAX_BYTES) {
    const error = new Error('Cue source payload is too large.');
    error.statusCode = 502;
    throw error;
  }
  const body = await response.text();
  if (body.length > MAX_BYTES) {
    const error = new Error('Cue source payload is too large.');
    error.statusCode = 502;
    throw error;
  }
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    const error = new Error('Cue source is not valid JSON.');
    error.statusCode = 502;
    throw error;
  }
  const cues = normalizeSourceCues(payload);
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(cueUrl, { cues, expiresAt: Date.now() + CACHE_TTL_MS });
  return cues;
}

module.exports = {
  ALLOWED_CUE_HOSTS,
  isAllowedCueUrl,
  normalizeSourceCues,
  fetchSourceCues
};
