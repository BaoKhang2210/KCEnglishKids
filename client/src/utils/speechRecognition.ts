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

export class ChildSpeechEngine {
  private recognition: any = null;
  private isListening: boolean = false;
  private currentTimeout: any = null;

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'en-US'; // English US
        this.recognition.continuous = false; // Stop after utterance
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 5; // Look at top 5 phonetic alternatives
      } catch (e) {
        this.recognition = null;
      }
    }
  }

  /**
   * Check if speech recognition is available in current browser
   */
  public isAvailable(): boolean {
    return !!this.recognition;
  }

  /**
   * Stop active listening session
   */
  public stop() {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    if (this.recognition && this.isListening) {
      try {
        this.recognition.abort();
      } catch (e) {}
    }
    this.isListening = false;
  }

  /**
   * Listen to the child's microphone and verify against target word
   */
  public listenAndVerify(targetWord: string, timeoutMs: number = 5000): Promise<SpeechRecognitionResult> {
    return new Promise((resolve) => {
      if (!this.recognition) {
        return resolve({
          success: false,
          isMatch: false,
          spokenText: '',
          targetWord,
          confidence: 0,
          error: 'unsupported',
          message: 'Trình duyệt chưa hỗ trợ micro nhận diện giọng nói.'
        });
      }

      this.stop(); // Stop any leftover sessions
      this.isListening = true;

      let resolved = false;

      const finish = (result: SpeechRecognitionResult) => {
        if (resolved) return;
        resolved = true;
        this.stop();
        resolve(result);
      };

      // Safety timeout if user stays quiet
      this.currentTimeout = setTimeout(() => {
        finish({
          success: false,
          isMatch: false,
          spokenText: '',
          targetWord,
          confidence: 0,
          error: 'no-speech',
          message: 'Cô chưa nghe rõ tiếng bé, bé thử đọc to lại nhé! 🐻'
        });
      }, timeoutMs);

      this.recognition.onresult = (event: any) => {
        if (resolved) return;

        const results = event.results?.[0];
        if (!results || results.length === 0) {
          return finish({
            success: false,
            isMatch: false,
            spokenText: '',
            targetWord,
            confidence: 0,
            error: 'no-speech',
            message: 'Cô chưa nghe rõ tiếng bé, bé thử lại nhé!'
          });
        }

        let bestMatched = false;
        let bestTranscript = results[0].transcript || '';
        let highestConfidence = results[0].confidence || 0.9;

        // Inspect all alternatives provided by SpeechRecognition
        for (let i = 0; i < results.length; i++) {
          const altText = results[i].transcript || '';
          if (isKidPronunciationMatch(altText, targetWord)) {
            bestMatched = true;
            bestTranscript = altText;
            highestConfidence = Math.max(highestConfidence, results[i].confidence || 0.95);
            break;
          }
        }

        if (bestMatched) {
          finish({
            success: true,
            isMatch: true,
            spokenText: bestTranscript,
            targetWord,
            confidence: highestConfidence,
            message: `Bé đọc rất chuẩn: "${bestTranscript}" ⭐🎉`
          });
        } else {
          finish({
            success: true,
            isMatch: false,
            spokenText: bestTranscript,
            targetWord,
            confidence: highestConfidence,
            message: `Bé vừa đọc là "${bestTranscript}". Bé thử lại to rõ hơn nhé! 💪`
          });
        }
      };

      this.recognition.onerror = (event: any) => {
        if (resolved) return;
        const errType = event.error;

        if (errType === 'not-allowed' || errType === 'permission-denied') {
          finish({
            success: false,
            isMatch: false,
            spokenText: '',
            targetWord,
            confidence: 0,
            error: 'not-allowed',
            message: 'Bé hoặc bố mẹ cho phép ứng dụng sử dụng micro trên trình duyệt nhé! 🎙️'
          });
        } else if (errType === 'no-speech') {
          finish({
            success: false,
            isMatch: false,
            spokenText: '',
            targetWord,
            confidence: 0,
            error: 'no-speech',
            message: 'Cô chưa nghe rõ tiếng bé, bé bấm mic và đọc to lại nhé! 🐻'
          });
        } else {
          finish({
            success: false,
            isMatch: false,
            spokenText: '',
            targetWord,
            confidence: 0,
            error: errType || 'unknown',
            message: 'Có chút gián đoạn khi thu âm, bé thử lại nhé!'
          });
        }
      };

      try {
        this.recognition.start();
      } catch (err: any) {
        finish({
          success: false,
          isMatch: false,
          spokenText: '',
          targetWord,
          confidence: 0,
          error: 'aborted',
          message: 'Bé hãy bấm mic lại để cô nghe nhé!'
        });
      }
    });
  }
}

export const childSpeechEngine = new ChildSpeechEngine();
