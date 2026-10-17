import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { aiApi } from '../services/api';
import { ChildSpeechEngine } from '../utils/speechRecognition';
import { playWordAudio, stopWordAudio, sfx } from '../utils/audio';
import type { AgeGroupCode, SpeakingFeedback } from '../types';

const ACK_KEY = 'kc_speaking_privacy_ack_v1';

export function useSpeakingCoach(targetWord: string, audioUrl?: string, ageGroup?: AgeGroupCode) {
  const engine = useRef(new ChildSpeechEngine());
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const acknowledged = useRef(false);
  const active = useRef(false);
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'done'>('idle');
  const [feedback, setFeedback] = useState<SpeakingFeedback | null>(null);
  const [message, setMessage] = useState('');
  const [needsAcknowledgment, setNeedsAcknowledgment] = useState(false);

  useEffect(() => {
    const capture = engine.current;
    return () => {
      generation.current++;
      capture.stop();
      request.current?.abort();
      stopWordAudio();
    };
  }, []);

  const cancel = () => {
    generation.current++;
    engine.current.stop();
    request.current?.abort();
    active.current = false;
    setStatus('idle');
    setFeedback(null);
    setMessage('');
    setNeedsAcknowledgment(false);
  };

  const start = async () => {
    const attempt = ++generation.current;
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    active.current = true;
    stopWordAudio();
    setFeedback(null);
    setMessage('');
    setStatus('listening');
    try {
      const capture = await engine.current.listen(8000);
      if (attempt !== generation.current) return;
      if (!capture.success) {
        setMessage(capture.error === 'aborted' ? '' : capture.message);
        setStatus('idle');
        return;
      }
      setStatus('processing');
      const response = await aiApi.evaluatePronunciation({ targetWord, spokenTranscript: capture.spokenText, ageGroup }, controller.signal);
      if (attempt !== generation.current || controller.signal.aborted) return;
      setFeedback(response.data);
      setStatus('done');
      if (response.data.displayStars === 3) {
        sfx.playStarFanfare();
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          void confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 }, disableForReducedMotion: true });
        }
      } else if (response.data.evaluated) sfx.playPop();
      void playWordAudio(response.data.kokoEnglishCheer);
    } catch (error) {
      if (attempt !== generation.current || controller.signal.aborted) return;
      setStatus('idle');
      setMessage(error instanceof Error && error.name !== 'AbortError'
        ? `${error.message} You can still listen and repeat.`
        : 'Feedback is unavailable right now. Listen and repeat with Koko instead.');
    } finally {
      if (attempt === generation.current) active.current = false;
    }
  };

  const toggle = () => {
    if (active.current || needsAcknowledgment) { cancel(); return; }
    if (!engine.current.isAvailable()) {
      setFeedback(null);
      setMessage('Speech recognition is unavailable in this browser. Listen and repeat with Koko instead.');
      return;
    }
    try { acknowledged.current ||= sessionStorage.getItem(ACK_KEY) === 'yes'; } catch { /* Acknowledgment still works without storage. */ }
    if (!acknowledged.current) { setNeedsAcknowledgment(true); return; }
    void start();
  };

  const acknowledge = () => {
    acknowledged.current = true;
    try { sessionStorage.setItem(ACK_KEY, 'yes'); } catch { /* Keep acknowledgment in memory for this panel. */ }
    setNeedsAcknowledgment(false);
    void start();
  };

  const replay = () => {
    cancel();
    void playWordAudio(targetWord, audioUrl);
  };

  return { status, feedback, message, needsAcknowledgment, toggle, cancel, acknowledge, replay };
}
