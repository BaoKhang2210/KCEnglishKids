import { playWordAudio, sfx } from '../../utils/audio';

export type AudioPhrase =
  | 'touch_the'
  | 'where_is_the'
  | 'find_the'
  | 'pop_the'
  | 'get_the'
  | 'give_me_the'
  | 'then_the'
  | 'look_at_this'
  | 'great_job'
  | 'try_again'
  | 'lets_go'
  | 'feed_the'
  | 'open_the'
  | 'match_the';

const PHRASE_TEXT: Record<AudioPhrase, string> = {
  touch_the: 'Touch the',
  where_is_the: 'Where is the',
  find_the: 'Find the',
  pop_the: 'Pop the',
  get_the: 'Get the',
  give_me_the: 'Give me the',
  then_the: 'then the',
  look_at_this: 'Look at this!',
  great_job: 'Great job!',
  try_again: 'Try again!',
  lets_go: "Let's go!",
  feed_the: 'Feed the',
  open_the: 'Open the',
  match_the: 'Match the',
};

function speakText(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.88;
      utterance.pitch = 1.1;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    } catch {
      resolve();
    }
  });
}

/**
 * Speak the short command, then play the vocabulary clip (or TTS fallback).
 */
export async function playInstruction(
  phrase: AudioPhrase,
  targetWord: string,
  audioUrl?: string
): Promise<void> {
  const command = PHRASE_TEXT[phrase] || 'Touch the';
  try {
    await speakText(command);
    await playWordAudio(targetWord, audioUrl);
  } catch (err) {
    console.warn('[AudioPhrases] Error playing instruction:', err);
    try {
      await speakText(`${command} ${targetWord}`);
    } catch {}
  }
}

export function playPraiseAudio(): void {
  const praises = ['Great job!', 'Awesome!', 'Good job!', 'You did it!'];
  const text = praises[Math.floor(Math.random() * praises.length)];
  sfx.playCorrect();
  void speakText(text);
}

export function playEncouragementAudio(): void {
  const encouragements = ['Try again!', 'You can do it!', 'Almost!'];
  const text = encouragements[Math.floor(Math.random() * encouragements.length)];
  sfx.playGentleWrong();
  void speakText(text);
}
