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

// --- YouTube runtime captions ---------------------------------------------
// Product owner decision (2026-11): YouTube lesson pages display the official
// caption text of the very video being embedded, fetched at runtime below.
// The text is cached in memory only and is never written to the database,
// the seed, or any durable store.
const YT_WATCH_BYTES = 2 * 1024 * 1024;
const YT_BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Cookie: 'CONSENT=YES+1'
};

function extractJsonArray(text, marker) {
  const start = text.indexOf(marker);
  if (start < 0) return null;
  const open = text.indexOf('[', start + marker.length);
  if (open < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = open; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '[') depth += 1;
    else if (char === ']') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(open, index + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function normalizeYouTubeEvents(events) {
  const cues = [];
  for (const event of events) {
    const startMs = Number(event?.tStartMs);
    const durationMs = Number(event?.dDurationMs);
    if (!Number.isFinite(startMs) || !Number.isFinite(durationMs) || durationMs <= 0) continue;
    const text = String(
      Array.isArray(event?.segs) ? event.segs.map((seg) => seg?.utf8 || '').join('') : ''
    )
      .replace(/<[^>]*>/g, '')
      .replace(/[\r\n]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    // Auto-generated tracks append rolling windows; keep real sentence rows.
    if (!text || /^\[.*\]$/.test(text)) continue;
    cues.push({ start: startMs / 1000, end: (startMs + durationMs) / 1000, text });
  }
  return cues
    .sort((a, b) => a.start - b.start)
    .slice(0, MAX_CUES)
    .map((cue, index) => ({ idx: index + 1, start: cue.start, end: cue.end, text: cue.text }));
}

async function fetchYouTubeWatchHtml(videoId) {
  const hosts = ['https://www.youtube.com', 'https://m.youtube.com'];
  let lastError = null;
  for (let attempt = 0; attempt < hosts.length; attempt += 1) {
    try {
      const response = await fetch(`${hosts[attempt]}/watch?v=${videoId}&hl=en&gl=US`, {
        signal: AbortSignal.timeout(8000),
        headers: YT_BROWSER_HEADERS
      });
      if (response.ok) {
        const body = await response.text();
        if (body.length <= YT_WATCH_BYTES) return body;
        const error = new Error('YouTube watch page is too large.');
        error.statusCode = 502;
        throw error;
      }
      lastError = new Error(`YouTube watch page responded with ${response.status}.`);
      lastError.statusCode = 502;
      if (response.status !== 429 && response.status !== 403) break;
      // Rate limited: back off briefly before trying the next host.
      await new Promise((resolve) => setTimeout(resolve, 1200));
    } catch (error) {
      lastError = error;
      if (!error.statusCode) break;
    }
  }
  throw lastError || new Error('YouTube watch page is unreachable.');
}

async function fetchYouTubeCues(youtubeId) {
  const id = String(youtubeId || '').trim();
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) {
    const error = new Error('Invalid YouTube video id.');
    error.statusCode = 400;
    throw error;
  }
  const cacheKey = `yt:${id}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.cues;

  const watchBody = await fetchYouTubeWatchHtml(id);
  const tracks = extractJsonArray(watchBody, '"captionTracks"') || [];
  const track =
    tracks.find((item) => String(item?.languageCode || '').toLowerCase().startsWith('en')) ||
    tracks[0];
  if (!track?.baseUrl) {
    const error = new Error('This YouTube video does not expose captions.');
    error.statusCode = 404;
    throw error;
  }
  const captionUrl = String(track.baseUrl).startsWith('http')
    ? `${track.baseUrl}${track.baseUrl.includes('fmt=') ? '' : '&fmt=json3'}`
    : `https://www.youtube.com${track.baseUrl}${String(track.baseUrl).includes('fmt=') ? '' : '&fmt=json3'}`;
  const captionResponse = await fetch(captionUrl, {
    signal: AbortSignal.timeout(8000),
    headers: { ...YT_BROWSER_HEADERS, Accept: 'application/json' }
  });
  if (!captionResponse.ok) {
    const error = new Error(`YouTube captions responded with ${captionResponse.status}.`);
    error.statusCode = 502;
    throw error;
  }
  let payload;
  try {
    payload = await captionResponse.json();
  } catch {
    const error = new Error('YouTube captions are not valid JSON.');
    error.statusCode = 502;
    throw error;
  }
  const cues = normalizeYouTubeEvents(Array.isArray(payload?.events) ? payload.events : []);
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(cacheKey, { cues, expiresAt: Date.now() + CACHE_TTL_MS });
  return cues;
}

module.exports = {
  ALLOWED_CUE_HOSTS,
  isAllowedCueUrl,
  normalizeSourceCues,
  fetchSourceCues,
  fetchYouTubeCues
};
