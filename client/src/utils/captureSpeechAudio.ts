/** Capture a short attempt, convert it locally to mono PCM WAV, and release the
 * microphone on every exit. The buffer lives only for this request. */
export async function captureSpeechAudio(signal: AbortSignal): Promise<{ audioBase64: string; mimeType: string }> {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Trình duyệt chưa hỗ trợ ghi âm. Bé có thể nghe mẫu hoặc dùng nhận diện từ.');
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const release = () => stream.getTracks().forEach(track => track.stop());
  let recorder: MediaRecorder;
  try { recorder = new MediaRecorder(stream); } catch (error) { release(); throw error; }
  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      const chunks: BlobPart[] = [];
      let timer: ReturnType<typeof setTimeout>;
      const cancel = () => { if (recorder.state !== 'inactive') recorder.stop(); };
      const cleanup = () => { clearTimeout(timer); signal.removeEventListener('abort', cancel); release(); };
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        cleanup();
        if (signal.aborted) reject(new DOMException('Cancelled', 'AbortError'));
        else resolve(new Blob(chunks, { type: recorder.mimeType }));
      };
      recorder.onerror = () => { cleanup(); reject(new Error('Chưa ghi được âm thanh. Hãy thử lại.')); };
      signal.addEventListener('abort', cancel, { once: true });
      if (signal.aborted) { cleanup(); reject(new DOMException('Cancelled', 'AbortError')); return; }
      try { recorder.start(); timer = setTimeout(cancel, 6000); } catch (error) { cleanup(); reject(error); }
    });
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    const context = new AudioContext();
    let decoded: AudioBuffer;
    try { decoded = await context.decodeAudioData(await blob.arrayBuffer()); } finally { await context.close(); }
    // Six seconds at 16 kHz is under 200 KB, well below the request limit.
    const frames = Math.min(Math.ceil(decoded.duration * 16000), 16000 * 8);
    const offline = new OfflineAudioContext(1, frames, 16000);
    const source = offline.createBufferSource(); source.buffer = decoded; source.connect(offline.destination); source.start();
    const mono = (await offline.startRendering()).getChannelData(0);
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    const buffer = new ArrayBuffer(44 + mono.length * 2), view = new DataView(buffer);
    const write = (offset: number, value: string) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
    write(0, 'RIFF'); view.setUint32(4, 36 + mono.length * 2, true); write(8, 'WAVE'); write(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    write(36, 'data'); view.setUint32(40, mono.length * 2, true);
    mono.forEach((sample, index) => { const bounded = Math.max(-1, Math.min(1, sample)); view.setInt16(44 + index * 2, bounded * (bounded < 0 ? 32768 : 32767), true); });
    let binary = ''; const bytes = new Uint8Array(buffer);
    for (let index = 0; index < bytes.length; index += 8192) binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
    return { audioBase64: btoa(binary), mimeType: 'audio/wav' };
  } finally { if (recorder.state !== 'inactive') recorder.stop(); release(); }
}
