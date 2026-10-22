import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { KokoMascot } from '../KokoMascot';

interface LockedStageDialogProps {
  currentStage: 1 | 2 | 3;
  onContinue: () => void;
  onClose: () => void;
}

export const LockedStageDialog: React.FC<LockedStageDialogProps> = ({
  currentStage, onContinue, onClose,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const spokenRef = useRef(false);
  const message = `Học xong Chặng ${currentStage} rồi mình chơi tiếp nhé!`;

  const speak = () => {
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const voices = window.speechSynthesis.getVoices();
      const vietnameseVoice = voices.find((voice) => voice.lang.toLowerCase() === 'vi-vn')
        || voices.find((voice) => voice.lang.toLowerCase().startsWith('vi'));
      // Avoid letting browsers silently read Vietnamese with an English voice.
      if (!vietnameseVoice || spokenRef.current) return;
      spokenRef.current = true;
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.voice = vietnameseVoice;
      utterance.lang = vietnameseVoice.lang;
      utterance.rate = 0.82;
      utterance.pitch = 1.08;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech synthesis may be unavailable or blocked by the browser.
    }
  };

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab' && dialogRef.current) {
        const items = dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])');
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    const timer = window.setTimeout(speak, 100);
    const onVoicesChanged = () => speak();
    if ('speechSynthesis' in window) window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(timer);
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
          window.speechSynthesis.cancel();
        }
      } catch { /* unavailable */ }
    };
  }, [message, onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm motion-safe:animate-[locked-backdrop-in_250ms_ease-out_both]"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="locked-stage-title"
        className="relative max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-[2rem] border-4 border-amber-200 bg-gradient-to-b from-amber-50 via-white to-sky-50 p-5 text-center shadow-2xl motion-safe:animate-[locked-card-in_250ms_ease-out_both] sm:p-7">
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Đóng thông báo" className="absolute right-3 top-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-amber-100 focus-visible:outline-4 focus-visible:outline-amber-400">
          <X size={28} strokeWidth={3} />
        </button>

        <div className="pt-5"><KokoMascot state="happy" size="lg" interactive={false} /></div>
        <h2 id="locked-stage-title" className="mx-auto mt-3 max-w-md text-2xl font-black leading-snug text-slate-900 sm:text-3xl">
          Học xong <span className="text-sky-700">Chặng {currentStage}</span> rồi mình chơi tiếp nhé!
        </h2>

        <div className="flex justify-center">
          <button type="button" onClick={onContinue} className="min-h-14 w-full rounded-2xl border-b-4 border-amber-700 bg-amber-400 px-4 py-3 text-lg font-black text-amber-950 shadow-lg transition hover:bg-amber-300 active:translate-y-0.5 active:border-b-2 focus-visible:outline-4 focus-visible:outline-amber-500 sm:text-xl">
            Học tiếp Chặng {currentStage} <span aria-hidden>🌟</span>
          </button>
        </div>
      </div>
      <style>{`@keyframes locked-backdrop-in{from{opacity:0}to{opacity:1}}@keyframes locked-card-in{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}@media(prefers-reduced-motion:reduce){.motion-safe\\:animate-\\[locked-backdrop-in_250ms_ease-out_both\\],.motion-safe\\:animate-\\[locked-card-in_250ms_ease-out_both\\]{animation:none!important}}`}</style>
    </div>
  );
};
