import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Headphones,
  Lightbulb,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle
} from 'lucide-react';
import type { VideoCue } from '../../../types';
import { playWordAudio, sfx, stopWordAudio } from '../../../utils/audio';
import {
  buildLessonExercises,
  buildSegmentExercises,
  comprehensionPrompt,
  type VideoChoiceExercise,
  type VideoSegmentExercise
} from './videoLibraryUtils';

interface VideoExercisePanelProps {
  title: string;
  cues: VideoCue[];
  /**
   * YouTube captions stay inside the embed, so text quizzes cannot be
   * generated; the panel then falls back to segment-listening questions that
   * play a numbered slot from the embedded video.
   */
  captionsInVideo?: boolean;
  /** Numbered sentence slots used for segment-listening questions. */
  segmentCues?: VideoCue[];
  /** Plays one sentence slot through the embedded video. */
  onPlaySegment?: (cue: VideoCue) => void;
}

type QuizQuestion = VideoChoiceExercise | VideoSegmentExercise;
type AnswerPhase = 'idle' | 'retry' | 'correct' | 'revealed';

export const VideoExercisePanel: React.FC<VideoExercisePanelProps> = ({
  title,
  cues,
  captionsInVideo = false,
  segmentCues = [],
  onPlaySegment
}) => {
  const questions = useMemo<QuizQuestion[]>(() => {
    const maxQuestions = captionsInVideo ? 10 : 6;
    const choices = buildLessonExercises(title, cues, maxQuestions).filter(
      (exercise): exercise is VideoChoiceExercise => exercise.kind === 'choice'
    );
    if (choices.length > 0) return choices;
    if (captionsInVideo) return buildSegmentExercises(segmentCues, maxQuestions);
    return [];
  }, [title, cues, captionsInVideo, segmentCues]);
  const segmentMode = questions.length > 0 && questions[0].kind === 'segment';
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [phase, setPhase] = useState<AnswerPhase>('idle');
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);
  const [playing, setPlaying] = useState(false);
  const wrongTimerRef = useRef<number | null>(null);

  const question = questions[index] || null;
  const correctIndex = question ? question.options.findIndex((option) => option.correct) : -1;
  const lastQuestion = index >= questions.length - 1;

  const clearWrongTimer = useCallback(() => {
    if (wrongTimerRef.current !== null) {
      window.clearTimeout(wrongTimerRef.current);
      wrongTimerRef.current = null;
    }
  }, []);

  const playQuestion = useCallback(async () => {
    if (!question) return;
    setPlaying(true);
    try {
      if (segmentMode) onPlaySegment?.(question.cue);
      else await playWordAudio(question.cue.text);
    } finally {
      setPlaying(false);
    }
  }, [onPlaySegment, question, segmentMode]);

  // Read the sentence out loud as soon as each question opens.
  useEffect(() => {
    if (!question || finished) return;
    const timer = window.setTimeout(() => void playQuestion(), 400);
    return () => window.clearTimeout(timer);
  }, [question, finished, playQuestion]);

  useEffect(() => {
    return () => {
      clearWrongTimer();
      stopWordAudio();
    };
  }, [clearWrongTimer]);

  const choose = (optionIndex: number) => {
    if (!question || phase === 'correct' || phase === 'revealed') return;
    if (optionIndex === correctIndex) {
      clearWrongTimer();
      setSelected(optionIndex);
      setPhase('correct');
      if (attempts === 0) setFirstTry((value) => value + 1);
      sfx.playCorrect();
      return;
    }

    sfx.playGentleWrong();
    setSelected(optionIndex);
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    if (nextAttempts >= 2) {
      // After two tries, show the right sentence so the child is never stuck.
      setPhase('revealed');
      return;
    }
    setPhase('retry');
    clearWrongTimer();
    wrongTimerRef.current = window.setTimeout(() => {
      wrongTimerRef.current = null;
      setSelected(null);
      setPhase((current) => (current === 'retry' ? 'idle' : current));
    }, 1400);
  };

  const goNext = () => {
    if (phase !== 'correct' && phase !== 'revealed') return;
    clearWrongTimer();
    stopWordAudio();
    if (lastQuestion) {
      setFinished(true);
      sfx.playStarFanfare();
      return;
    }
    sfx.playPop();
    setIndex((value) => value + 1);
    setSelected(null);
    setAttempts(0);
    setPhase('idle');
  };

  const restart = () => {
    sfx.playPop();
    stopWordAudio();
    clearWrongTimer();
    setIndex(0);
    setSelected(null);
    setAttempts(0);
    setPhase('idle');
    setFirstTry(0);
    setFinished(false);
  };

  if (questions.length === 0) {
    return (
      <section
        aria-labelledby="video-exercise-heading"
        className="grid h-full min-h-0 flex-1 place-items-center rounded-2xl border-2 border-slate-100 bg-white px-4 py-6 text-center shadow-sm"
      >
        <div className="max-w-md">
          <Headphones className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
          <h2 id="video-exercise-heading" className="mt-2 text-[17px] font-black text-slate-800">
            {captionsInVideo ? 'Bài này chưa đủ câu để chơi' : 'Bài này chưa có câu hỏi trắc nghiệm'}
          </h2>
          <p className="mt-1 text-[13px] font-bold leading-relaxed text-slate-500">
            {captionsInVideo
              ? 'Video này có ít hơn 3 câu nên chưa tạo được câu hỏi nghe. Bé luyện đọc từng câu ở tab Nghe video nhé!'
              : 'Bé cần ít nhất 3 câu phụ đề để chơi. Bé xem video thêm rồi quay lại nhé!'}
          </p>
          <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-[12px] font-bold leading-relaxed text-sky-800">
            {comprehensionPrompt(title)}
          </p>
        </div>
      </section>
    );
  }

  if (finished) {
    return (
      <section
        aria-labelledby="video-exercise-heading"
        className="flex h-full min-h-0 flex-1 flex-col rounded-2xl border-2 border-slate-100 bg-white px-3 py-4 shadow-sm sm:px-6 sm:py-5"
      >
        <h2 id="video-exercise-heading" className="sr-only">
          Bài tập
        </h2>
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-xl flex-col items-center justify-center py-4 text-center">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-amber-100">
              <Trophy className="h-10 w-10 text-amber-500" aria-hidden="true" />
            </span>
            <p className="mt-4 text-[22px] font-black leading-tight text-slate-900 sm:text-[26px]">
              Bé đã hoàn thành bài tập!
            </p>
            <p className="mt-2 text-[14px] font-bold text-slate-600">
              Đúng ngay lần đầu:{' '}
              <span className="font-black text-emerald-700">
                {firstTry}/{questions.length}
              </span>{' '}
              câu
            </p>
            <p className="mt-2 max-w-md text-[13px] font-bold leading-relaxed text-slate-500">
              {comprehensionPrompt(title)}
            </p>
            <button
              type="button"
              onClick={restart}
              className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-sky-600 px-5 text-[14px] font-black text-white shadow-sm transition-colors hover:bg-sky-700 cursor-pointer"
            >
              <RotateCcw className="h-[18px] w-[18px]" aria-hidden="true" />
              Làm lại từ đầu
            </button>
          </div>
        </div>
      </section>
    );
  }

  const showResult = phase === 'correct' || phase === 'revealed';

  return (
    <section
      aria-labelledby="video-exercise-heading"
      className="flex h-full min-h-0 flex-1 flex-col rounded-2xl border-2 border-slate-100 bg-white px-3 py-4 shadow-sm sm:px-6 sm:py-5"
    >
      <h2 id="video-exercise-heading" className="sr-only">
        Bài tập
      </h2>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-sky-50 px-3 py-1 text-[12px] font-black text-sky-700 sm:text-[13px]">
          Câu hỏi {index + 1} / {questions.length}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {!segmentMode && onPlaySegment && question && (
            <button
              type="button"
              onClick={() => onPlaySegment(question.cue)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border-2 border-sky-200 bg-sky-50 px-3 text-[12px] font-black text-sky-800 transition-colors hover:bg-sky-100 cursor-pointer sm:text-[13px]"
            >
              <Headphones className="h-4 w-4" aria-hidden="true" />
              Nghe đoạn video
            </button>
          )}
          <button
            type="button"
            onClick={() => void playQuestion()}
            disabled={playing}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 text-[12px] font-black text-white shadow-sm transition-colors hover:bg-sky-700 disabled:opacity-75 cursor-pointer sm:text-[13px]"
          >
            {playing ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Headphones className="h-4 w-4" aria-hidden="true" />
            )}
            {playing ? 'Đang đọc câu hỏi…' : 'Bấm để nghe câu hỏi'}
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1" aria-hidden="true">
        {questions.map((item, itemIndex) => (
          <span
            key={item.id}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              itemIndex < index ? 'bg-emerald-400' : itemIndex === index ? 'bg-sky-500' : 'bg-slate-100'
            }`}
          />
        ))}
      </div>

      <div className="custom-scrollbar mt-3 min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center py-2">
          <p className="text-center text-[15px] font-black leading-relaxed text-slate-700 sm:text-[17px]">
            {segmentMode ? 'Bé hãy nghe đoạn video rồi chọn đúng câu vừa nghe:' : 'Bé hãy nghe và chọn đúng câu vừa nghe:'}
          </p>
          <p className="mt-1 text-center text-[12px] font-bold text-slate-400">
            {segmentMode
              ? 'Bấm nút xanh để nghe lại đoạn đó trên video bất cứ lúc nào.'
              : 'Bấm nút xanh ở trên để nghe lại câu hỏi bất cứ lúc nào.'}
          </p>

          <div className="mt-4 grid gap-2">
            {question?.options.map((option, optionIndex) => {
              const isSelected = selected === optionIndex;
              const showCorrect = showResult && option.correct;
              const showWrong = !option.correct && isSelected && phase !== 'idle' && phase !== 'correct';
              return (
                <button
                  key={`${question.id}-${optionIndex}`}
                  type="button"
                  onClick={() => choose(optionIndex)}
                  disabled={showResult}
                  aria-pressed={isSelected}
                  className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 px-3.5 py-2.5 text-left transition-colors disabled:cursor-default cursor-pointer ${
                    showCorrect
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                      : showWrong
                        ? 'border-rose-300 bg-rose-50 text-rose-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50/60'
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-black ${
                      showCorrect
                        ? 'bg-emerald-500 text-white'
                        : showWrong
                          ? 'bg-rose-100 text-rose-600'
                          : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {showCorrect ? (
                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                    ) : showWrong ? (
                      <XCircle className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      String.fromCharCode(65 + optionIndex)
                    )}
                  </span>
                  <span className="min-w-0 flex-1 text-[14px] font-black leading-snug sm:text-[16px]">{option.text}</span>
                  {showCorrect && <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <div className="mt-3 min-h-[3.5rem]" aria-live="polite">
            {phase === 'correct' && (
              <div className="flex items-start gap-2 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                <div>
                  <p className="text-[14px] font-black text-emerald-900">Chính xác! Bé giỏi quá!</p>
                  <p className="text-[12px] font-bold text-emerald-700">
                    {attempts === 0 ? 'Bé nghe rất tinh tai.' : 'Bé đã tìm ra câu đúng rồi.'}
                  </p>
                </div>
              </div>
            )}
            {phase === 'retry' && (
              <div className="flex items-start gap-2 rounded-2xl border-2 border-amber-200 bg-amber-50 px-3.5 py-2.5">
                <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
                <div>
                  <p className="text-[14px] font-black text-amber-900">Chưa đúng rồi, bé thử lại nhé!</p>
                  <p className="text-[12px] font-bold text-amber-800">
                    Bé nghe lại câu hỏi ở nút phía trên rồi chọn lại thật chậm nhé.
                  </p>
                </div>
              </div>
            )}
            {phase === 'revealed' && (
              <div className="flex items-start gap-2 rounded-2xl border-2 border-sky-200 bg-sky-50 px-3.5 py-2.5">
                <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" aria-hidden="true" />
                <div>
                  <p className="text-[14px] font-black text-sky-900">Đáp án đúng là câu màu xanh.</p>
                  <p className="text-[12px] font-bold text-sky-800">Bé nghe lại rồi bấm “Câu tiếp theo” nhé!</p>
                </div>
              </div>
            )}
          </div>

          {showResult ? (
            <button
              type="button"
              onClick={goNext}
              className={`mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-[14px] font-black text-white shadow-sm transition-colors cursor-pointer sm:text-[15px] ${
                lastQuestion ? 'bg-amber-500 hover:bg-amber-600' : 'bg-sky-600 hover:bg-sky-700'
              }`}
            >
              {lastQuestion ? (
                <>
                  <Trophy className="h-[18px] w-[18px]" aria-hidden="true" />
                  Xem kết quả
                </>
              ) : (
                <>
                  Câu tiếp theo
                  <ChevronRight className="h-[18px] w-[18px]" aria-hidden="true" />
                </>
              )}
            </button>
          ) : (
            <p className="mt-3 text-center text-[12px] font-bold text-slate-400">
              Chọn một câu trả lời để tiếp tục
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
