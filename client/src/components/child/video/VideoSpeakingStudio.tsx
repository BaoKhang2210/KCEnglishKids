import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Mic, Play, Square, Volume2 } from 'lucide-react';
import type { VideoCue } from '../../../types';
import { playWordAudio, sfx, stopWordAudio } from '../../../utils/audio';
import { formatCueTimestamp, splitCueWords } from './videoLibraryUtils';

interface VideoSpeakingStudioProps {
  cues: VideoCue[];
  showTranslation?: boolean;
  doneIdx?: number[];
  onSpeakCue: (cue: VideoCue) => void;
  /** YouTube sentences have no stored text, so the sample comes from the video. */
  onPlaySample?: (cue: VideoCue) => void;
}

export const VideoSpeakingStudio: React.FC<VideoSpeakingStudioProps> = ({
  cues,
  showTranslation = false,
  doneIdx = [],
  onSpeakCue,
  onPlaySample
}) => {
  // Speaking always opens at the first sentence, never at the last watched cue.
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [localDone, setLocalDone] = useState<number[]>([]);
  const [recordingIdx, setRecordingIdx] = useState<number | null>(null);
  const [recordings, setRecordings] = useState<Record<number, string>>({});
  const [error, setError] = useState('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingsRef = useRef(recordings);

  useEffect(() => {
    recordingsRef.current = recordings;
  }, [recordings]);

  const doneSet = new Set<number>([...doneIdx, ...localDone]);
  const doneCount = cues.filter((cue) => doneSet.has(cue.idx)).length;
  const safeIndex = Math.min(Math.max(selectedIndex, 0), Math.max(cues.length - 1, 0));
  const activeCue = cues[safeIndex] || null;
  const done = activeCue ? doneSet.has(activeCue.idx) : false;
  const recordingUrl = activeCue ? recordings[activeCue.idx] : undefined;
  const isRecording = recordingIdx !== null && recordingIdx === safeIndex;

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  useEffect(() => {
    const playback = audioRef.current;
    return () => {
      try {
        const recorder = recorderRef.current;
        if (recorder?.state === 'recording') recorder.stop();
      } catch {
        // Recorder may already be stopped.
      }
      stopTracks();
      stopWordAudio();
      try {
        playback?.pause();
      } catch {
        // The element may already be gone.
      }
      Object.values(recordingsRef.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [stopTracks]);

  const startRecording = async (cue: VideoCue, index: number) => {
    if (recordingIdx !== null) return;
    setError('');
    stopWordAudio();
    try {
      audioRef.current?.pause();
    } catch {
      // Ignore playback errors.
    }
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        setError('Thiết bị này chưa hỗ trợ ghi âm.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        chunksRef.current = [];
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          setRecordings((current) => {
            const previous = current[cue.idx];
            if (previous) URL.revokeObjectURL(previous);
            return { ...current, [cue.idx]: url };
          });
        }
        setRecordingIdx(null);
        stopTracks();
      };
      recorder.onerror = () => {
        setError('Chưa ghi âm được. Bé thử lại nhé.');
        setRecordingIdx(null);
        stopTracks();
      };
      recorder.start();
      setRecordingIdx(index);
    } catch {
      setError('Con cần cho phép dùng micro để luyện nói.');
      stopTracks();
    }
  };

  const stopRecording = () => {
    try {
      recorderRef.current?.stop();
    } catch {
      stopTracks();
      setRecordingIdx(null);
    }
  };

  const playRecording = (url: string) => {
    if (!audioRef.current) return;
    stopWordAudio();
    audioRef.current.src = url;
    void audioRef.current.play().catch(() => setError('Chưa phát lại được bản ghi.'));
  };

  const goTo = (target: number) => {
    const next = Math.min(Math.max(target, 0), Math.max(cues.length - 1, 0));
    if (next === safeIndex) return;
    if (recordingIdx !== null) stopRecording();
    stopWordAudio();
    try {
      audioRef.current?.pause();
    } catch {
      // Ignore playback errors.
    }
    setError('');
    setSelectedIndex(next);
  };

  const markDone = () => {
    if (!activeCue || done || isRecording) return;
    setLocalDone((current) => (current.includes(activeCue.idx) ? current : [...current, activeCue.idx]));
    sfx.playSpeakingBravo();
    onSpeakCue(activeCue);
  };

  return (
    <section
      aria-labelledby="video-speaking-heading"
      className={`flex h-full min-h-0 flex-1 flex-col rounded-2xl border-2 bg-white px-3 py-4 shadow-sm transition-colors sm:px-6 sm:py-5 ${
        done ? 'border-emerald-300' : 'border-slate-100'
      }`}
    >
      <h2 id="video-speaking-heading" className="sr-only">
        Luyện nói
      </h2>
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-full flex-col items-center justify-center py-2 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-[12px] font-black uppercase tracking-[0.16em] text-sky-600">
              Câu {safeIndex + 1} / {cues.length}
            </span>
            {done && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Đã nói xong
              </span>
            )}
          </div>

          {activeCue ? (
            <>
              <div
                className={`mt-4 w-full max-w-3xl rounded-2xl px-4 py-3 transition-colors ${
                  done ? 'bg-emerald-50' : ''
                }`}
              >
                {activeCue.text ? (
                  <div>
                    <p className="text-[22px] font-black leading-snug text-slate-900 sm:text-[28px]">
                      “
                      {splitCueWords(activeCue.text).map((token, tokenIdx) =>
                        token.word ? (
                          <button
                            key={`${activeCue.idx}-${tokenIdx}`}
                            type="button"
                            onClick={() => void playWordAudio(token.text)}
                            aria-label={`Nghe từ ${token.text}`}
                            className="rounded px-0.5 text-inherit underline-offset-2 hover:bg-sky-100 hover:text-sky-900 cursor-pointer"
                          >
                            {token.text}
                          </button>
                        ) : (
                          <span key={`${activeCue.idx}-${tokenIdx}`}>{token.text}</span>
                        )
                      )}
                      ”
                    </p>
                    <p className="mt-1 text-[12px] font-black tabular-nums text-slate-400">
                      {formatCueTimestamp(activeCue.start)} – {formatCueTimestamp(activeCue.end)}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-[24px] font-black leading-snug text-slate-900 sm:text-[30px]">
                      Câu {activeCue.idx}
                    </p>
                    <p className="mt-1 text-[13px] font-black tabular-nums text-slate-500">
                      {formatCueTimestamp(activeCue.start)} – {formatCueTimestamp(activeCue.end)}
                    </p>
                    <p className="mt-1 text-[12px] font-bold leading-relaxed text-slate-500">
                      Xem lời trên video (bật CC) rồi nói lại thật to nhé!
                    </p>
                  </div>
                )}
                {showTranslation && activeCue.translationVi && (
                  <p className="mt-2 text-[14px] font-bold leading-relaxed text-slate-500 sm:text-[15px]">
                    {activeCue.translationVi}
                  </p>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {onPlaySample && (
                  <button
                    type="button"
                    onClick={() => onPlaySample(activeCue)}
                    disabled={isRecording}
                    className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-sky-600 px-4 text-[13px] font-black text-white shadow-sm transition-colors hover:bg-sky-700 disabled:opacity-50 cursor-pointer sm:text-sm"
                  >
                    <Play className="h-[18px] w-[18px] fill-white" aria-hidden="true" />
                    Phát đoạn video
                  </button>
                )}
                {activeCue.text && (
                  <button
                    type="button"
                    onClick={() => void playWordAudio(activeCue.text)}
                    disabled={isRecording}
                    className={`inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-[13px] font-black shadow-sm transition-colors disabled:opacity-50 cursor-pointer sm:text-sm ${
                      onPlaySample
                        ? 'border-2 border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100'
                        : 'bg-sky-600 text-white hover:bg-sky-700'
                    }`}
                  >
                    <Volume2 className="h-[18px] w-[18px]" aria-hidden="true" />
                    {onPlaySample ? 'Đọc mẫu' : 'Nghe mẫu'}
                  </button>
                )}
                {isRecording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rose-600 px-4 text-[13px] font-black text-white shadow-sm cursor-pointer sm:text-sm"
                  >
                    <Square className="h-[18px] w-[18px] animate-pulse fill-white" aria-hidden="true" />
                    Dừng ghi âm
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void startRecording(activeCue, safeIndex)}
                    className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rose-500 px-4 text-[13px] font-black text-white shadow-sm transition-colors hover:bg-rose-600 cursor-pointer sm:text-sm"
                  >
                    <Mic className="h-[18px] w-[18px]" aria-hidden="true" />
                    Ghi âm
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => recordingUrl && playRecording(recordingUrl)}
                  disabled={!recordingUrl || isRecording}
                  aria-label="Nghe lại bản ghi của bé"
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-indigo-100 px-4 text-[13px] font-black text-indigo-800 transition-colors hover:bg-indigo-200 disabled:opacity-40 disabled:hover:bg-indigo-100 cursor-pointer sm:text-sm"
                >
                  <Play className="h-[18px] w-[18px] fill-indigo-800" aria-hidden="true" />
                  Nghe lại
                </button>
                <button
                  type="button"
                  onClick={markDone}
                  disabled={done || isRecording}
                  aria-pressed={done}
                  className={`inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-[13px] font-black shadow-sm transition-colors disabled:cursor-default cursor-pointer sm:text-sm ${
                    done
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50'
                  }`}
                >
                  <CheckCircle2 className="h-[18px] w-[18px]" aria-hidden="true" />
                  {done ? 'Bé đã nói xong' : 'Đánh dấu bé đã nói xong'}
                </button>
              </div>

              {done ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-4 flex w-full max-w-md items-center gap-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-left"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
                    <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[15px] font-black text-emerald-900 sm:text-[16px]">Bé đã nói xong câu này!</p>
                    <p className="text-[12px] font-bold text-emerald-700 sm:text-[13px]">
                      Giỏi quá! Bé bấm “Câu tiếp theo” để nói câu kế tiếp nhé.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-4 max-w-xl text-[12px] font-bold leading-relaxed text-slate-500 sm:text-[13px]">
                  Nghe câu mẫu, nói lại thật to rồi nghe lại bản ghi của bé. Khi nói xong, bé bấm nút màu xanh lá nhé!
                </p>
              )}
              <p className="mt-2 text-[12px] font-bold text-slate-400">
                Đã nói xong {doneCount}/{cues.length} câu
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm font-black text-slate-700">Bài này chưa có câu để luyện nói.</p>
          )}

          {error && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[12px] font-bold text-amber-800">{error}</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex shrink-0 flex-wrap items-center justify-center gap-2 border-t-2 border-slate-100 pt-3">
        <button
          type="button"
          disabled={safeIndex <= 0}
          onClick={() => goTo(safeIndex - 1)}
          className="inline-flex h-11 items-center gap-1 rounded-xl border-2 border-slate-200 bg-white px-5 text-[13px] font-black text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
        >
          <ChevronLeft className="h-[18px] w-[18px]" aria-hidden="true" />
          Câu trước
        </button>
        <button
          type="button"
          disabled={safeIndex >= cues.length - 1}
          onClick={() => goTo(safeIndex + 1)}
          className={`inline-flex h-11 items-center gap-1 rounded-xl px-5 text-[13px] font-black text-white shadow-sm transition-colors disabled:opacity-40 cursor-pointer ${
            done
              ? 'bg-emerald-600 ring-4 ring-emerald-200 hover:bg-emerald-700 disabled:hover:bg-emerald-600'
              : 'bg-sky-600 hover:bg-sky-700 disabled:hover:bg-sky-600'
          }`}
        >
          Câu tiếp theo
          <ChevronRight className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
      </div>

      <audio ref={audioRef} className="hidden" />
    </section>
  );
};
