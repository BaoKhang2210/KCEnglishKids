import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Languages, LoaderCircle, Volume2 } from 'lucide-react';
import type { VideoCue } from '../../../types';
import { stopWordAudio } from '../../../utils/audio';
import { formatCueTimestamp, splitCueWords } from './videoLibraryUtils';

interface VideoTranscriptPanelProps {
  cues: VideoCue[];
  captionCueCount?: number;
  readIdx?: number[];
  readDone?: boolean;
  onPlayCue: (cue: VideoCue) => Promise<void> | void;
  onReadCue?: (cue: VideoCue) => void;
  onPlayWord?: (word: string) => void;
  onCompleteReading?: () => Promise<void> | void;
  onContinueSpeaking?: () => void;
  showTranslation?: boolean;
  onToggleTranslation?: () => void;
  unavailable?: boolean;
}

export const VideoTranscriptPanel: React.FC<VideoTranscriptPanelProps> = ({
  cues,
  captionCueCount = 0,
  readIdx = [],
  readDone = false,
  onPlayCue,
  onReadCue,
  onPlayWord,
  onCompleteReading,
  onContinueSpeaking,
  showTranslation = false,
  onToggleTranslation,
  unavailable = false
}) => {
  const listRef = useRef<HTMLOListElement | null>(null);
  // The reading tab always opens at the first sentence and never follows the hidden player.
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [completing, setCompleting] = useState(false);
  const readSet = new Set(readIdx);
  const readCount = cues.filter((cue) => readSet.has(cue.idx)).length;
  const translationAvailable = cues.some((cue) => Boolean(cue.translationVi));
  const safeSelected = Math.min(Math.max(selectedIndex, 0), Math.max(cues.length - 1, 0));

  useEffect(() => {
    const list = listRef.current;
    const node = list?.querySelector<HTMLElement>(`[data-cue-index="${safeSelected}"]`);
    if (!list || !node) return;
    const listRect = list.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    if (nodeRect.top < listRect.top) {
      list.scrollTop += nodeRect.top - listRect.top - 8;
    } else if (nodeRect.bottom > listRect.bottom) {
      list.scrollTop += nodeRect.bottom - listRect.bottom + 8;
    }
  }, [safeSelected]);

  // Stop sentence audio when the child leaves the reading tab.
  useEffect(() => () => stopWordAudio(), []);

  if (cues.length === 0) {
    return (
      <section
        aria-labelledby="video-transcript-heading"
        className="flex min-h-0 flex-1 flex-col rounded-2xl border-2 border-slate-100 bg-white px-4 py-8"
      >
        <h2
          id="video-transcript-heading"
          className="flex items-center justify-center gap-2 text-[17px] font-black text-slate-800 sm:text-lg"
        >
          <BookOpen className="h-5 w-5 text-sky-600" aria-hidden="true" />
          Đọc theo lời video
        </h2>
        <div className="mt-5 rounded-xl bg-slate-50 px-4 py-6 text-center">
          <p className="text-sm font-black text-slate-700">Phụ đề chưa sẵn sàng</p>
          <p className="mt-1 text-xs font-bold leading-relaxed text-slate-500">
            Bé vẫn xem video và luyện nói bình thường nhé!
            {captionCueCount > 0 ? ` Bản gốc có ${captionCueCount} câu phụ đề.` : ''}
            {unavailable ? ' Hiện chưa tải được phụ đề từ nguồn.' : ''}
          </p>
        </div>
      </section>
    );
  }

  const playCue = async (cue: VideoCue, index: number) => {
    setSelectedIndex(index);
    setSpeakingIndex(index);
    onReadCue?.(cue);
    try {
      await onPlayCue(cue);
    } finally {
      setSpeakingIndex((current) => (current === index ? null : current));
    }
  };

  const step = (direction: -1 | 1) => {
    const target = Math.min(Math.max(safeSelected + direction, 0), cues.length - 1);
    const cue = cues[target];
    if (cue) void playCue(cue, target);
  };

  const completeReading = async () => {
    if (!onCompleteReading || completing || readDone) return;
    setCompleting(true);
    try {
      await onCompleteReading();
    } finally {
      setCompleting(false);
    }
  };

  /** One action finishes the reading activity and moves straight to speaking. */
  const finishAndContinue = async () => {
    if (completing) return;
    try {
      if (!readDone) await completeReading();
    } finally {
      onContinueSpeaking?.();
    }
  };

  return (
    <section
      aria-labelledby="video-transcript-heading"
      className="flex h-full min-h-0 flex-1 flex-col rounded-2xl border-2 border-slate-100 bg-white px-3 py-3 shadow-sm sm:px-5 sm:py-4"
    >
      <div className="relative shrink-0 text-center">
        <h2
          id="video-transcript-heading"
          className="flex items-center justify-center gap-2 px-8 text-[18px] font-black text-slate-800 sm:px-0 sm:text-xl"
        >
          <BookOpen className="h-5 w-5 shrink-0 text-sky-600" aria-hidden="true" />
          Đọc theo lời video
        </h2>
        <p className="mt-1 text-[13px] font-bold leading-relaxed text-slate-500 sm:text-sm">
          Bấm cả dòng để nghe câu · bấm từ để nghe phát âm
        </p>
        {translationAvailable && onToggleTranslation && (
          <button
            type="button"
            onClick={onToggleTranslation}
            aria-pressed={showTranslation}
            aria-label={showTranslation ? 'Ẩn nghĩa tiếng Việt' : 'Hiện nghĩa tiếng Việt'}
            title={showTranslation ? 'Ẩn nghĩa tiếng Việt' : 'Hiện nghĩa tiếng Việt'}
            className={`absolute right-0 top-0 grid h-8 w-8 place-items-center rounded-lg border-2 transition-colors cursor-pointer ${
              showTranslation
                ? 'border-sky-300 bg-sky-50 text-sky-700'
                : 'border-slate-200 bg-white text-slate-500'
            }`}
          >
            <Languages className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        <div className="mt-2.5 flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={safeSelected <= 0}
            onClick={() => step(-1)}
            aria-label="Câu trước"
            className="inline-flex h-10 items-center gap-1 rounded-full border-2 border-slate-200 bg-white px-5 text-[13px] font-black text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
          >
            <ChevronLeft className="h-[18px] w-[18px]" aria-hidden="true" />
            Trước
          </button>
          <button
            type="button"
            disabled={safeSelected >= cues.length - 1}
            onClick={() => step(1)}
            aria-label="Câu tiếp theo"
            className="inline-flex h-10 items-center gap-1 rounded-full bg-sky-600 px-5 text-[13px] font-black text-white shadow-sm transition-colors hover:bg-sky-700 disabled:opacity-40 disabled:hover:bg-sky-600 cursor-pointer"
          >
            Tiếp
            <ChevronRight className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>
      </div>

      <ol
        ref={listRef}
        aria-label="Danh sách câu phụ đề"
        className="custom-scrollbar mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1.5"
      >
        {cues.map((cue, index) => {
          const selected = index === safeSelected;
          const speaking = index === speakingIndex;
          return (
            <li key={cue.idx} data-cue-index={index}>
              <div
                className={`relative flex items-center gap-2.5 rounded-xl px-3 py-3 transition-colors sm:gap-3 sm:px-3.5 ${
                  speaking
                    ? 'bg-sky-100'
                    : selected
                      ? 'bg-sky-50 ring-1 ring-inset ring-sky-200'
                      : 'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <button
                  type="button"
                  onClick={() => void playCue(cue, index)}
                  aria-label={`Phát câu ${index + 1}: ${cue.text}`}
                  aria-current={speaking ? 'true' : undefined}
                  className="absolute inset-0 rounded-xl cursor-pointer"
                />
                <span className="pointer-events-none relative z-10 w-10 shrink-0 text-[12.5px] font-black tabular-nums text-slate-500">
                  {formatCueTimestamp(cue.start)}
                </span>
                <Volume2
                  className={`pointer-events-none relative z-10 h-[18px] w-[18px] shrink-0 ${
                    speaking ? 'text-sky-600' : 'text-slate-400'
                  }`}
                  aria-hidden="true"
                />
                <span className="pointer-events-none relative z-10 min-w-0 flex-1">
                  <span className="block text-[15.5px] font-black leading-relaxed text-slate-800 sm:text-[17px]">
                    {splitCueWords(cue.text).map((token, tokenIndex) =>
                      token.word ? (
                        <button
                          key={`${cue.idx}-${tokenIndex}`}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onPlayWord?.(token.text);
                          }}
                          aria-label={`Nghe từ ${token.text}`}
                          className="pointer-events-auto relative z-20 rounded px-0.5 text-inherit underline-offset-2 hover:bg-sky-100 hover:text-sky-900 focus-visible:outline-2 focus-visible:outline-sky-500 cursor-pointer"
                        >
                          {token.text}
                        </button>
                      ) : (
                        <span key={`${cue.idx}-${tokenIndex}`}>{token.text}</span>
                      )
                    )}
                  </span>
                  {showTranslation && cue.translationVi && (
                    <span className="mt-1 block text-[13px] font-bold leading-relaxed text-slate-500">
                      {cue.translationVi}
                    </span>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-2.5 shrink-0 border-t-2 border-slate-100 pt-2">
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-[13px] font-black text-slate-500">
            Đã đọc {readCount}/{cues.length}
          </span>
          <span className="h-2 min-w-12 flex-1 overflow-hidden rounded-full bg-slate-100">
            <span
              className={`block h-full rounded-full transition-[width] duration-300 ${
                readDone || readCount >= cues.length ? 'bg-emerald-500' : 'bg-sky-500'
              }`}
              style={{ width: `${Math.round((readCount / cues.length) * 100)}%` }}
            />
          </span>
        </div>

        <div className="mt-2 flex justify-center">
          <button
            type="button"
            onClick={() => void finishAndContinue()}
            disabled={completing || !onContinueSpeaking}
            className="inline-flex min-h-12 w-full max-w-[420px] items-center justify-center gap-1.5 rounded-full bg-emerald-500 px-5 text-[13.5px] font-black text-white shadow-sm transition-colors hover:bg-emerald-600 disabled:opacity-60 disabled:hover:bg-emerald-500 cursor-pointer sm:text-[14px]"
          >
            {completing ? (
              <>
                <LoaderCircle className="h-[18px] w-[18px] animate-spin" aria-hidden="true" />
                Đang lưu…
              </>
            ) : (
              <>
                {readDone ? 'Đã hoàn thành đọc' : 'Hoàn thành đọc'} – Chuyển sang Luyện nói
                <ChevronRight className="h-[18px] w-[18px]" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};
