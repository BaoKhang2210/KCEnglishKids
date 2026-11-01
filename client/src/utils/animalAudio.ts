import { stopWordAudio } from './audio';

export const animalRecordings: Record<string, string> = {
  dog: '/audio/animals/dog.wav', cat: '/audio/animals/cat.ogg',
  cow: '/audio/animals/cow.ogg', duck: '/audio/animals/duck.ogg',
  sheep: '/audio/animals/sheep.ogg', pig: '/audio/animals/pig.ogg',
  bird: '/audio/animals/bird.mp3', lion: '/audio/animals/lion.ogg',
  monkey: '/audio/animals/monkey.mp3'
};
let playing: HTMLAudioElement | null = null;
let cancelPlayback: (() => void) | null = null;

export function stopAnimalSound() {
  cancelPlayback?.();
  cancelPlayback = null;
  if (playing) { playing.pause(); playing.currentTime = 0; playing = null; }
}

/** Animal calls are recordings, never vocabulary pronunciation or TTS. */
export function playAnimalSound(animal: string): Promise<void> {
  stopAnimalSound();
  stopWordAudio();
  const source = animalRecordings[animal.toLowerCase().trim()];
  if (!source) return Promise.reject(new Error('Chưa có bản ghi tiếng kêu cho con vật này.'));
  const clip = new Audio(source);
  clip.volume = 0.65;
  playing = clip;
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout>;
    const finish = (error?: Error) => {
      clearTimeout(timer);
      clip.onended = null; clip.onerror = null;
      clip.pause();
      if (playing === clip) { playing = null; cancelPlayback = null; }
      error ? reject(error) : resolve();
    };
    cancelPlayback = () => finish();
    clip.onended = () => finish();
    clip.onerror = () => finish(new Error('Không tải được bản ghi tiếng kêu.'));
    timer = setTimeout(() => finish(), 10000);
    void clip.play().catch(() => finish(new Error('Không phát được âm thanh. Hãy bấm nghe lại.')));
  });
}
