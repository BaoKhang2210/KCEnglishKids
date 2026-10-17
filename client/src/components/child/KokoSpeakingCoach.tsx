import { Loader2, Mic, Square, Star, Volume2 } from 'lucide-react';
import { useSpeakingCoach } from '../../hooks/useSpeakingCoach';
import { KokoMascot } from './KokoMascot';
import type { AgeGroupCode } from '../../types';

interface Props {
  targetWord: string;
  audioUrl?: string;
  ageGroup?: AgeGroupCode;
  contextKey: string;
}

export function KokoSpeakingCoach(props: Props) {
  return <SpeakingPanel key={`${props.contextKey}:${props.targetWord}:${props.ageGroup || ''}`} {...props} />;
}

function SpeakingPanel({ targetWord, audioUrl, ageGroup }: Props) {
  const coach = useSpeakingCoach(targetWord, audioUrl, ageGroup);
  const busy = coach.status === 'listening' || coach.status === 'processing';
  const mood = coach.status === 'listening' ? 'listening' : coach.status === 'processing' ? 'thinking' : coach.feedback?.mascotState || 'happy';
  return (
    <section aria-label="Koko speaking practice" className="w-full rounded-3xl border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50 p-4 text-slate-800 shadow-sm motion-reduce:[&_*]:animate-none">
      <div className="flex flex-wrap items-center justify-center gap-4">
        <KokoMascot state={mood} size="sm" interactive={false} />
        <div className="min-w-0 flex-1 text-left">
          <p className="text-sm font-black">Say it with Koko</p>
          <p className="break-words text-lg font-black text-teal-800">{targetWord}</p>
          <p className="text-[11px] text-slate-500">Optional speaking practice · no reward balance changes</p>
        </div>
        <div className="flex items-start gap-3">
          <div className="text-center">
            <button type="button" onClick={coach.replay} aria-label="Listen to the example"
              className="grid h-14 w-14 place-items-center rounded-full border-b-4 border-sky-400 bg-sky-100 text-sky-800 active:translate-y-1 cursor-pointer">
              <Volume2 size={26} />
            </button>
            <span className="text-[10px] font-bold">Listen</span>
          </div>
          <div className="text-center">
            <button type="button" onClick={coach.toggle} aria-label={busy ? 'Stop speaking practice' : 'Start speaking practice'} aria-pressed={busy}
              className={`grid h-14 w-14 place-items-center rounded-full border-b-4 active:translate-y-1 cursor-pointer ${busy ? 'border-rose-600 bg-rose-500 text-white ring-4 ring-teal-200 motion-safe:animate-pulse' : 'border-teal-600 bg-teal-400 text-teal-950'}`}>
              {coach.status === 'processing' ? <Loader2 size={26} className="motion-safe:animate-spin" /> : busy ? <Square size={24} /> : <Mic size={26} />}
            </button>
            <span className="text-[10px] font-bold">{busy ? 'Stop' : 'Speak'}</span>
          </div>
        </div>
      </div>
      {coach.needsAcknowledgment && (
        <div role="dialog" aria-label="Microphone privacy acknowledgment" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs">
          <p className="font-bold">Please ask an adult before using the microphone.</p>
          <p className="mt-1">Your browser may send audio to its speech-recognition service. This app sends only recognized text to its own backend and does not store audio or transcripts. Recognition may need an internet connection.</p>
          <p className="mt-1">This session acknowledgment is not a production consent policy. You can always choose listen-and-repeat practice.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={coach.acknowledge} className="rounded-lg bg-teal-700 px-3 py-2 font-bold text-white cursor-pointer">Adult: I understand — start</button>
            <button type="button" onClick={coach.cancel} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-bold cursor-pointer">Listen only</button>
          </div>
        </div>
      )}
      <div aria-live="polite" aria-atomic="true" className="text-center">
        {busy && <p className="mt-2 text-sm font-semibold">{coach.status === 'listening' ? 'Listening… say the words when you are ready.' : 'Matching the recognized words…'}</p>}
        {coach.message && <p className="mt-3 rounded-xl bg-amber-50 p-2 text-xs text-amber-900">{coach.message}</p>}
        {coach.feedback && <div className="mt-3 rounded-2xl bg-white p-3">
          {coach.feedback.evaluated && <div className="flex justify-center gap-1" aria-label={`${coach.feedback.displayStars} practice stars, display only`}>
            {Array.from({ length: coach.feedback.displayStars }, (_, index) => <Star key={index} className="h-7 w-7 fill-amber-400 text-amber-500 motion-safe:animate-pop-in" />)}
          </div>}
          <p className="mt-1 text-sm font-bold">{coach.feedback.kokoSpeech}</p>
          <p className="mt-1 text-xs text-slate-600">{coach.feedback.practiceTip}</p>
          {coach.feedback.score != null && <p className="mt-2 text-[11px] text-slate-500">Approximate transcript match: {coach.feedback.score}% — not a pronunciation assessment.</p>}
        </div>}
      </div>
    </section>
  );
}
