/* Temporary debug: inspect captionTracks and caption URL responses. */
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

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Cookie: 'CONSENT=YES+1'
};

(async () => {
  const res = await fetch('https://www.youtube.com/watch?v=h3C47MHwZXI&hl=en', {
    headers: HEADERS,
    redirect: 'follow'
  });
  console.log('watch status', res.status);
  const html = await res.text();
  const idx = html.indexOf('captionTracks');
  console.log('marker at', idx);
  const tracks = extractJsonArray(html, '"captionTracks":');
  console.log('extractor found', tracks ? tracks.length : 'null');
  console.log(
    'tracks:',
    tracks.map((t) => ({ lang: t.languageCode, kind: t.kind, url: t.baseUrl.slice(0, 100) }))
  );

  // Pull the public Innertube key/client version from the page config,
  // then call youtubei/v1/player to get caption baseUrls.
  const apiKey = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
  const clientVersion = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1];
  console.log('apiKey:', apiKey, 'clientVersion:', clientVersion);

  for (const clientName of ['WEB', 'ANDROID']) {
    const body = {
      context: {
        client: {
          clientName,
          clientVersion: clientVersion || '2.20241101.00.00',
          ...(clientName === 'ANDROID'
            ? { androidSdkVersion: 30, hl: 'en', gl: 'US' }
            : { hl: 'en', gl: 'US' })
        }
      },
      videoId: 'h3C47MHwZXI'
    };
    const pr = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
      method: 'POST',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    console.log(clientName, 'player status', pr.status);
    const pdata = await pr.json().catch(() => null);
    console.log(clientName, 'playability:', pdata?.playabilityStatus?.status, pdata?.playabilityStatus?.reason);
    console.log(clientName, 'top keys:', pdata ? Object.keys(pdata).slice(0, 20).join(',') : 'null');
    const tracks2 =
      pdata?.captions?.playerCaptionsTracklistRenderer?.captionTracks ||
      pdata?.captions?.playerCaptionsTracklistRenderer?.captionTracksData?.map((t) => t.track) ||
      [];
    console.log(clientName, 'tracks:', tracks2.length);
    if (tracks2.length > 0) {
      const t2 = tracks2.find((t) => String(t.languageCode || '').startsWith('en')) || tracks2[0];
      const url = t2.baseUrl + (t2.baseUrl.includes('fmt=') ? '' : '&fmt=json3');
      const r3 = await fetch(url, { headers: HEADERS });
      const body3 = await r3.text();
      console.log(
        `${clientName} caption fetch: status=${r3.status} len=${body3.length}`
      );
      if (body3.length > 0) console.log('head:', body3.slice(0, 300).replace(/\n/g, ' '));
    }
  }
})().catch((e) => console.log('ERR', e.message));
