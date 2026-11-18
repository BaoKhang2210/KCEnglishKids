import { Loader2, Mic, Sparkles, Square, Star, Volume2 } from 'lucide-react';
import { useSpeakingCoach } from '../../hooks/useSpeakingCoach';
import { KokoMascot } from './KokoMascot';
import type { AgeGroupCode } from '../../types';

interface Props {
  targetWord: string;
  audioUrl?: string;
  ageGroup?: AgeGroupCode;
  contextKey: string;
  compact?: boolean;
  onCallStudent?: () => void;
  callStudentLabel?: string;
}

export function KokoSpeakingCoach(props: Props) {
  return <SpeakingPanel key={`${props.contextKey}:${props.targetWord}:${props.ageGroup || ''}`} {...props} />;
}

function SpeakingPanel({ targetWord, audioUrl, ageGroup, onCallStudent, callStudentLabel = 'Gọi bé đọc' }: Props) {
  const coach = useSpeakingCoach(targetWord, audioUrl, ageGroup);
  const busy = coach.status === 'listening' || coach.status === 'processing';
  const mood = coach.status === 'listening' ? 'listening' : coach.status === 'processing' ? 'thinking' : coach.feedback?.mascotState || 'happy';

  return (
    <section aria-label="Koko speaking practice" className="w-full rounded-2xl border-2 border-teal-200 bg-gradient-to-r from-white via-teal-50/70 to-emerald-50/50 px-4 py-2.5 sm:py-3 text-slate-800 shadow-sm motion-reduce:[&_*]:animate-none">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 w-full">
        {/* Mascot & Target text evenly distributed */}
        <div className="flex items-center gap-3 min-w-0 flex-1 w-full sm:w-auto">
          <div className="shrink-0">
            <KokoMascot state={mood} size="sm" interactive={false} />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-teal-800/80">Say it with Koko</p>
            <p className="break-words text-sm sm:text-base md:text-lg font-black text-slate-900 leading-snug">{targetWord}</p>
          </div>
        </div>

        {/* Action buttons nicely aligned on the right */}
        <div className="flex items-center justify-end gap-2.5 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={coach.replay}
            aria-label="Listen to the example"
            className="flex items-center gap-2 rounded-xl border-b-2 border-sky-400 bg-sky-100 hover:bg-sky-200 px-3.5 py-2 text-xs sm:text-sm font-black text-sky-900 active:translate-y-0.5 cursor-pointer transition-all"
          >
            <Volume2 size={18} className="text-sky-700" />
            <span>Nghe</span>
          </button>

          {onCallStudent ? (
            <button
              type="button"
              onClick={onCallStudent}
              className="flex items-center gap-2 rounded-xl border-b-2 border-amber-600 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 px-4 py-2 text-xs sm:text-sm font-black text-amber-950 active:translate-y-0.5 cursor-pointer transition-all shadow-xs"
            >
              <Sparkles size={16} className="text-amber-950" />
              <span>{callStudentLabel}</span>
            </button>
          ) : (
            <div className="text-center">
              <button
                type="button"
                onClick={coach.toggle}
                aria-label={busy ? 'Stop speaking practice' : 'Start speaking practice'}
                aria-pressed={busy}
                className={`grid h-10 w-10 place-items-center rounded-full border-b-2 active:translate-y-1 cursor-pointer ${
                  busy
                    ? 'border-rose-600 bg-rose-500 text-white ring-4 ring-teal-200 motion-safe:animate-pulse'
                    : 'border-teal-600 bg-teal-400 text-teal-950'
                }`}
              >
                {coach.status === 'processing' ? <Loader2 size={20} className="motion-safe:animate-spin" /> : busy ? <Square size={18} /> : <Mic size={20} />}
              </button>
              <span className="text-[10px] font-bold">{busy ? 'Dừng' : 'Đọc thử'}</span>
            </div>
          )}
        </div>
      </div>
      {coach.needsAcknowledgment && (
        <div role="dialog" aria-label="Microphone privacy acknowledgment" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs">
          <p className="font-bold">Please ask an adult before using the microphone.</p>
          <p className="mt-1">Trình duyệt có thể gửi âm thanh tới dịch vụ nhận diện giọng nói của trình duyệt. Ứng dụng chỉ gửi phần chữ đã nhận diện về máy chủ để so khớp từ, không lưu âm thanh hoặc bản chép lời.</p>
          <p className="mt-1">Có thể chọn chỉ nghe mẫu và nhắc lại bất cứ lúc nào.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={coach.acknowledge} className="rounded-lg bg-teal-700 px-3 py-2 font-bold text-white cursor-pointer">Adult: I understand — start</button>
            <button type="button" onClick={coach.cancel} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-bold cursor-pointer">Listen only</button>
          </div>
        </div>
      )}
      <div aria-live="polite" aria-atomic="true" className="text-center">
        {busy && <p className="mt-2 text-sm font-semibold">{coach.status === 'listening' ? 'Listening… say the words when you are ready.' : 'Matching the recognized words…'}</p>}
        {coach.message && <p className="mt-3 rounded-xl bg-amber-50 p-2 text-xs text-amber-900">{coach.message}</p>}
        {coach.feedback && (
          <div className="mt-3 rounded-2xl bg-white p-3">
            {coach.feedback.evaluated && (
              <div className="flex justify-center gap-1" aria-label={`${coach.feedback.displayStars} practice stars, display only`}>
                {Array.from({ length: coach.feedback.displayStars }, (_, index) => (
                  <Star key={index} className="h-7 w-7 fill-amber-400 text-amber-500 motion-safe:animate-pop-in" />
                ))}
              </div>
            )}
            <p className="mt-1 text-sm font-bold">{coach.feedback.kokoSpeech}</p>
            <p className="mt-1 text-xs text-slate-600">{coach.feedback.practiceTip}</p>
            {coach.feedback.score != null && (
              <p className="mt-2 text-[11px] text-slate-500">{`Độ khớp từ nhận diện: ${coach.feedback.score}%. Chế độ này chỉ so phần chữ, chưa đánh giá âm vị.`}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
