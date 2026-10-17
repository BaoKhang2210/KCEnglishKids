/**
 * Real Speech Recognition Engine using Web Speech API (webkitSpeechRecognition)
 * Tailored for preschool children (ages 3–6) learning English:
 *  - en-US speech recognition with alternative hypotheses
 *  - Kid-tolerant fuzzy matching (tolerant to articles "a/an/the", minor phoneme slips)
 *  - Clear feedback states: 'idle' | 'listening' | 'success' | 'retry' | 'unsupported' | 'permission_denied'
 */

export interface SpeechRecognitionResult {
  success: boolean;
  isMatch: boolean;
  spokenText: string;
  targetWord: string;
  confidence: number;
  error?: 'no-speech' | 'not-allowed' | 'unsupported' | 'network' | 'aborted' | 'unknown';
  message: string;
}

// Calculate Levenshtein distance between two strings
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Clean and normalize text: lowercase, strip punctuation and common filler articles
function cleanSpokenText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, '')
    .trim();
}

/**
 * Kid-friendly fuzzy word matcher:
 * Returns true if spokenText reasonably matches targetWord
 */
export function isKidPronunciationMatch(spokenText: string, targetWord: string): boolean {
  const cleanSpoken = cleanSpokenText(spokenText);
  const cleanTarget = cleanSpokenText(targetWord);

  if (!cleanSpoken || !cleanTarget) return false;

  // 1. Exact match
  if (cleanSpoken === cleanTarget) return true;

  // 2. Substring or contains target word (e.g. kid says "a cat", "the apple", "look dog", "cat!")
  const tokens = cleanSpoken.split(/\s+/);
  if (tokens.includes(cleanTarget)) return true;
  if (cleanSpoken.includes(cleanTarget)) return true;

  // 3. Reverse containment (e.g. target is phrase "pet animals", kid says "animals")
  if (cleanTarget.includes(cleanSpoken) && cleanSpoken.length >= 3) return true;

  // 4. Levenshtein distance tolerance for young kids (e.g. "kat" vs "cat", "aple" vs "apple")
  for (const token of tokens) {
    const dist = levenshteinDistance(token, cleanTarget);
    const maxLen = Math.max(token.length, cleanTarget.length);

    if (cleanTarget.length <= 4 && dist <= 1) return true;
    if (cleanTarget.length > 4 && (dist <= 2 || (maxLen - dist) / maxLen >= 0.7)) return true;
  }

  return false;
}

export interface SpeechCaptureResult {
  success: boolean;
  spokenText: string;
  confidence: number;
  error?: SpeechRecognitionResult['error'];
  message: string;
}

interface BrowserRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results?: ArrayLike<ArrayLike<{ transcript: string; confidence?: number }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
}

type RecognitionConstructor = new () => BrowserRecognition;
const recognitionConstructor = (): RecognitionConstructor | undefined => {
  if (typeof window === 'undefined') return undefined;
  const browser = window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return browser.SpeechRecognition || browser.webkitSpeechRecognition;
};

export class ChildSpeechEngine {
  private cancelActive: (() => void) | null = null;

  public isAvailable(): boolean {
    return Boolean(recognitionConstructor());
  }

  public stop() {
    this.cancelActive?.();
  }

  // Each attempt owns its recognizer, listeners, timeout, and promise resolution.
  public listen(timeoutMs = 5000): Promise<SpeechCaptureResult> {
    this.stop();
    return new Promise(resolve => {
      let recognition: BrowserRecognition | null = null;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let settled = false;
      const finish = (result: SpeechCaptureResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.cancelActive = null;
        if (recognition) {
          recognition.onresult = null;
          recognition.onerror = null;
          recognition.onend = null;
          try { recognition.abort(); } catch { /* Some browsers have already stopped. */ }
        }
        resolve(result);
      };
      const fail = (error: NonNullable<SpeechCaptureResult['error']>, message: string) =>
        finish({ success: false, spokenText: '', confidence: 0, error, message });
      const Constructor = recognitionConstructor();
      if (!Constructor) return fail('unsupported', 'Speech recognition is unavailable. Listen and repeat with Koko instead.');
      this.cancelActive = () => fail('aborted', 'Listening stopped.');
      try {
        recognition = new Constructor();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.onresult = event => {
          const top = event.results?.[0]?.[0];
          const spokenText = top?.transcript?.trim() || '';
          if (!spokenText) return fail('no-speech', 'No words were heard. Try again when you are ready.');
          finish({ success: true, spokenText, confidence: top?.confidence ?? 0, message: 'Words captured.' });
        };
        recognition.onend = () => fail('no-speech', 'No words were heard. Try again when you are ready.');
        recognition.onerror = event => {
          if (['not-allowed', 'permission-denied', 'service-not-allowed'].includes(event.error)) {
            fail('not-allowed', 'Ask an adult to check microphone permission, or listen and repeat instead.');
          } else if (event.error === 'no-speech') {
            fail('no-speech', 'No words were heard. Try again when you are ready.');
          } else if (event.error === 'network') {
            fail('network', 'Speech recognition lost its connection. You can still listen and repeat.');
          } else if (event.error === 'aborted') {
            fail('aborted', 'Listening stopped.');
          } else {
            fail('unknown', 'The microphone is unavailable. Try again or listen and repeat.');
          }
        };
        timer = setTimeout(() => fail('no-speech', 'No words were heard. Try again when you are ready.'), Math.max(1000, Math.min(timeoutMs, 15000)));
        recognition.start();
      } catch {
        fail('unknown', 'Could not start the microphone. Try again or listen and repeat.');
      }
    });
  }

  // Compatibility for existing callers; new coaching uses listen() and server feedback.
  public async listenAndVerify(targetWord: string, timeoutMs = 5000): Promise<SpeechRecognitionResult> {
    const result = await this.listen(timeoutMs);
    const isMatch = result.success && isKidPronunciationMatch(result.spokenText, targetWord);
    return {
      ...result, targetWord, isMatch,
      message: result.success ? (isMatch ? 'The recognized words match. Well done!' : 'Let’s listen and try again together.') : result.message
    };
  }
}

export const childSpeechEngine = new ChildSpeechEngine();
