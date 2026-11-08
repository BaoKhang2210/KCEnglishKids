import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, RefreshCw, Sparkles, Star, Volume2, X } from 'lucide-react';
import summaryConfig from '../../../../../shared/stage2SummaryConfig.json';
import roundsConfig from '../../../../../shared/stage2Rounds.json';
import reviewConfig from '../../../../../shared/vocabReviewConfig.json';
import type { AgeGroupCode, Vocabulary } from '../../../types';
import { playWordAudio, stopWordAudio } from '../../../utils/audio';
import { wordArt } from '../../../utils/learningArt';
import { KokoMascot } from '../KokoMascot';
import type { Stage2ReportRating, Stage2ReportWord, Stage2ServerReport } from './stage2ReportTypes';
import { RoundMark, Stage2RoundMarks } from './Stage2RoundMarks';
import { getStage2WordState, stage2WordStates } from './stage2WordStatusConfig';

interface Props {
  vocabulary: Vocabulary[];
  ageGroup: AgeGroupCode;
  report: Stage2ServerReport | null;
  resultSaved: boolean;
  isSaving: boolean;
  errorMessage?: string;
  onSync: () => void;
  onContinue: () => void;
  onPractice: () => void;
}

const STAGE2_CARD_MAX_WIDTH = 256;
const STAGE2_GRID_GAP = 8;
const STAGE2_MAX_GRID_WIDTH = 5 * STAGE2_CARD_MAX_WIDTH + 4 * STAGE2_GRID_GAP;
const getStage2GridColumnCount = () => {
  if (typeof window === 'undefined') return 3;
  if (window.innerWidth < 320) return 2;
  if (window.innerWidth < 600) return 3;
  return 5;
};

export const Stage2CompletionSummary: React.FC<Props> = ({
  vocabulary, ageGroup, report, resultSaved, isSaving, errorMessage, onSync, onContinue, onPractice,
}) => {
  const confirmed = Boolean(report?.confirmed);
  const [gridColumns, setGridColumns] = useState(getStage2GridColumnCount);
  const [selected, setSelected] = useState<Stage2ReportWord | null>(null);
  const [badImages, setBadImages] = useState<Set<string>>(() => new Set());
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const byId = useMemo(() => new Map((report?.words || []).map((word) => [word.wordId, word])), [report]);
  // Preserve lesson order; the server's per-word ratings only determine the display group.
  const words: Stage2ReportWord[] = useMemo(() => vocabulary.map((vocab) => {
    const id = vocab._id || (vocab as any).id || vocab.english;
    const reported = byId.get(id);
    // The server report owns results, while the lesson vocabulary remains the source
    // for presentation fields that older reports may not include (especially images).
    return reported ? {
      ...reported,
      english: reported.english || vocab.english,
      vietnamese: reported.vietnamese || vocab.vietnamese,
      imageUrl: reported.imageUrl || vocab.imageUrl,
    } : {
      wordId: id, english: vocab.english, vietnamese: vocab.vietnamese,
      imageUrl: vocab.imageUrl, rating: null, rounds: [],
    };
  }), [vocabulary, byId]);

  const strong = confirmed ? words.filter((word) => word.rating === 'SECURE').length : 0;
  const weak = confirmed ? words.filter((word) => word.rating === 'PRACTICE' || word.rating === 'REVIEW').length : 0;
  const unrated = confirmed ? words.length - strong - weak : 0;
  const allStrong = confirmed && words.length > 0 && strong === words.length;
  // 3–4 year olds read pictures and shapes only; names appear from 4–5 up.
  const showEnglish = ageGroup !== '3-4' && (summaryConfig[ageGroup]?.showEnglish ?? true);
  const showVietnamese = summaryConfig[ageGroup]?.showVietnamese ?? ageGroup === '5-6';
  const isYoungest = ageGroup === '3-4';
  // Server owns the due date; the client only turns that day key into a short
  // relative label using the same UTC+7 calendar the server uses.
  const daysUntil = (dueOn?: string | null) => {
    if (!dueOn || !/^\d{4}-\d{2}-\d{2}$/.test(dueOn)) return null;
    const toUtc = (day: string) => Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
    const offset = (reviewConfig.timezoneOffsetMinutes ?? 0) * 60000;
    const today = new Date(Date.now() + offset).toISOString().slice(0, 10);
    return Math.round((toUtc(dueOn) - toUtc(today)) / 86400000);
  };
  const dueLabel = (dueOn?: string | null) => {
    const days = daysUntil(dueOn);
    if (days === null) return '';
    if (days <= 0) return 'hôm nay';
    if (days === 1) return 'ngày mai';
    return `${days} ngày nữa`;
  };

  useEffect(() => {
    const updateColumns = () => {
      const nextColumns = getStage2GridColumnCount();
      setGridColumns((current) => current === nextColumns ? current : nextColumns);
    };
    window.addEventListener('resize', updateColumns);
    window.addEventListener('orientationchange', updateColumns);
    return () => {
      window.removeEventListener('resize', updateColumns);
      window.removeEventListener('orientationchange', updateColumns);
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSelected(null);
        stopWordAudio();
        window.setTimeout(() => triggerRef.current?.focus(), 0);
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) { event.preventDefault(); dialogRef.current.focus(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    window.setTimeout(() => dialogRef.current?.focus(), 0);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  useEffect(() => () => stopWordAudio(), []);

  const stateFor = (rating: Stage2ReportRating | null) => getStage2WordState(rating);
  const roundName = (round: Stage2ReportWord['rounds'][number]) => round.name || roundsConfig.find((item) => item.code === round.code)?.name || '';
  // Older reports stored only an aggregate rating; never invent round marks.
  const hasRoundDetail = (word: Stage2ReportWord) => word.rounds.some((round) => round.code != null);
  const description = (word: Stage2ReportWord) => {
    if (!confirmed) return `Từ ${word.english}, kết quả đang chờ xác nhận.`;
    const state = stage2WordStates[stateFor(word.rating)];
    const rounds = word.rounds.filter((round) => round.code != null)
      .map((round) => `${roundName(round)}: ${round.rating === 'SECURE' ? 'đúng ngay' : 'cần luyện thêm'}`);
    return `Từ ${word.english}, ${state.label}${rounds.length ? `. ${rounds.join('. ')}` : ''}. Mở kết quả các vòng.`;
  };
  const speakWord = (word: string, audioUrl?: string) => {
    try { stopWordAudio(); void playWordAudio(word, audioUrl).catch(() => undefined); }
    catch { /* Audio may be unavailable; keep the result dialog usable. */ }
  };
  const openWord = (word: Stage2ReportWord, trigger: HTMLButtonElement) => {
    triggerRef.current = trigger;
    const vocab = vocabulary.find((item) => (item._id || (item as any).id || item.english) === word.wordId);
    speakWord(word.english, vocab?.audioUrl);
    setSelected(word);
  };
  const closeDialog = () => {
    setSelected(null);
    stopWordAudio();
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  };
  const moveSelected = (direction: -1 | 1) => {
    if (!selected) return;
    const nextIndex = words.findIndex((word) => word.wordId === selected.wordId) + direction;
    const next = words[nextIndex];
    if (!next) return;
    const vocab = vocabulary.find((item) => (item._id || (item as any).id || item.english) === next.wordId);
    setSelected(next);
    speakWord(next.english, vocab?.audioUrl);
  };

  // One result grid keeps every word visible. The picture is the primary
  // channel; the small mark row reports each round with a check or an X.
  const renderCard = (word: Stage2ReportWord, index: number) => {
    const state = confirmed ? stateFor(word.rating) : null;
    const art = wordArt(word.english);
    const image = word.imageUrl || art?.url || '';
    const lastRowCount = words.length % gridColumns;
    const lastRowStart = words.length - lastRowCount;
    const gridColumn = lastRowCount > 0 && index >= lastRowStart
      ? Math.floor((gridColumns - lastRowCount) / 2) + (index - lastRowStart) + 1
      : undefined;
    return <button
      key={word.wordId}
      ref={(element) => { if (element && selected?.wordId === word.wordId) triggerRef.current = element; }}
      type="button"
      aria-label={description(word)}
      onClick={(event) => openWord(word, event.currentTarget)}
      className={`stage2-result-card relative flex h-full min-h-[104px] min-w-0 w-full max-h-64 flex-col items-center justify-center gap-1 justify-self-center rounded-2xl border bg-slate-800/80 p-1.5 shadow-md transition-transform motion-reduce:transform-none active:scale-[0.98] focus-visible:outline focus-visible:outline-4 focus-visible:outline-amber-300 ${state ? stage2WordStates[state].cardClass : 'border-white/20 border-2'}`}
      style={{ gridColumn }}
    >
      <span aria-hidden="true" className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-xl">
        {image && !badImages.has(word.wordId)
          ? <img src={image} alt="" draggable={false} onError={() => setBadImages((prev) => new Set(prev).add(word.wordId))} className={`h-full max-h-full w-full max-w-full object-contain ${state ? stage2WordStates[state].imageClass : ''}`} />
          : <Sparkles className="h-8 w-8 text-amber-300" />}
      </span>
      {showEnglish && <span className="block max-w-full truncate px-1 text-[13px] font-black capitalize leading-tight text-white drop-shadow sm:text-sm">{word.english}</span>}
      {confirmed && hasRoundDetail(word) && (
        <Stage2RoundMarks rounds={word.rounds} ageGroup={ageGroup} size="sm" />
      )}
    </button>;
  };

  const duePhrase = (dueOn?: string | null) => {
    const label = dueLabel(dueOn);
    return label ? (label === 'hôm nay' ? 'Ôn lại hôm nay' : `Ôn lại vào ${label}`) : '';
  };
  const praise = resultSaved && !confirmed
    ? 'Kết quả đang được xác nhận.'
    : !confirmed
      ? (isSaving ? 'Đang lưu kết quả…' : 'Đang chờ xác nhận kết quả.')
      : unrated > 0
        ? 'Mình cùng luyện lại nhé!'
        : allStrong
          ? `Con nhớ ${strong} từ rồi!`
          : `Con nhớ ${strong} từ. Mình luyện thêm ${weak} từ nhé!`;

  return <div className="relative flex h-full min-h-0 w-full flex-col bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 text-white">
    <header className="shrink-0 px-2 pt-1 text-center sm:px-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <KokoMascot state="celebrating" size="sm" interactive={false} />
        <h2 className="text-[clamp(1.1rem,2.7vh,1.65rem)] font-black">Hoàn thành Chặng 2!</h2>
        {confirmed && <Star aria-hidden="true" className={`h-8 w-8 shrink-0 fill-amber-300 text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.65)] ${report?.starsAdded ? 'stage2-star-earned' : ''}`} />}
      </div>
      {confirmed && <p className="text-sm font-black text-amber-200 sm:text-base">Bé nhận 1 sao khi hoàn thành Chặng 2!</p>}
      <p className={`mx-auto max-w-3xl truncate text-base font-bold sm:text-lg ${isYoungest ? 'sr-only' : ''}`} aria-live="polite">{praise}</p>
      {confirmed && <div className="flex items-center justify-center gap-3 py-0.5">
        <div className="flex items-center gap-3 rounded-full border border-white/15 bg-slate-800/80 px-3 py-1 text-xs font-black sm:text-sm">
          <span className="flex items-center gap-1.5"><RoundMark round={{ rating: 'SECURE' }} ageGroup={ageGroup} size="sm" decorative /><span>Đúng ngay</span></span>
          <span aria-hidden="true" className="h-5 w-px bg-white/20" />
          <span className="flex items-center gap-1.5"><RoundMark round={{ rating: 'PRACTICE' }} ageGroup={ageGroup} size="sm" decorative /><span>Cần luyện thêm</span></span>
        </div>
      </div>}
      {!confirmed && resultSaved && <div className="text-sm font-bold text-amber-100" role="status">Đang chờ xác nhận · Chưa cập nhật sao</div>}
    </header>

    <main className="flex min-h-0 flex-1 flex-col gap-1 px-2 pb-1 sm:px-4" aria-label="Từ trong bài học">
      {errorMessage && !confirmed && <p data-stage2-error role="status" className="shrink-0 truncate text-center text-sm font-bold text-amber-100">{errorMessage}</p>}
      <div className="stage2-result-grid grid min-h-0 flex-1 content-center justify-items-center gap-2 self-center" style={{ width: '100%', maxWidth: STAGE2_MAX_GRID_WIDTH, gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}>
        {words.map(renderCard)}
      </div>
    </main>

    <footer className="flex shrink-0 gap-2 px-2 pb-2 pt-1 sm:px-4">
      <button type="button" onClick={onPractice} aria-label="Ôn lại toàn bộ Chặng 2" className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-amber-300/70 bg-amber-600 px-2 text-center text-sm font-black sm:text-base"><RefreshCw className="h-5 w-5" /><span>Ôn lại toàn bộ</span></button>
      <button type="button" disabled={isSaving} onClick={resultSaved ? onContinue : onSync} aria-label={resultSaved ? 'Sang Chặng 3' : 'Đồng bộ kết quả Chặng 2'} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-2 text-center text-sm font-black shadow-lg disabled:opacity-70 sm:text-base"><span>{isSaving ? 'Đang lưu…' : resultSaved ? 'Sang Chặng 3' : 'Đồng bộ kết quả'}</span><ArrowRight className="h-5 w-5" /></button>
    </footer>

    {selected && <div className="fixed inset-0 z-[300] flex items-end justify-center bg-slate-950/75 p-0 backdrop-blur-sm md:items-center md:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="stage2-report-dialog-title" tabIndex={-1} className="relative flex max-h-[98dvh] w-full max-w-xl flex-col gap-2 overflow-hidden rounded-t-[2rem] border-2 border-white/20 bg-slate-900 p-2 shadow-2xl outline-none sm:p-3 md:max-h-[88dvh] md:rounded-[2rem] md:p-4">
        <button type="button" onClick={closeDialog} aria-label="Đóng kết quả từ" className="absolute right-2 top-2 z-10 grid min-h-12 min-w-12 place-items-center rounded-full bg-slate-700"><X className="h-6 w-6" /></button>
        <header className="flex shrink-0 items-center gap-2 pr-12">
          <span className={`grid h-[clamp(4.5rem,18vh,7rem)] w-[clamp(4.5rem,18vh,7rem)] shrink-0 place-items-center overflow-hidden rounded-2xl border-2 p-1 ${confirmed ? stage2WordStates[stateFor(selected.rating)].cardClass : 'border-white/20 bg-slate-800'}`}>
            {(() => {
              const image = selected.imageUrl || wordArt(selected.english)?.url;
              return image && !badImages.has(selected.wordId)
                ? <img src={image} alt="" onError={() => setBadImages((previous) => new Set(previous).add(selected.wordId))} className={`max-h-full max-w-full object-contain ${confirmed ? stage2WordStates[stateFor(selected.rating)].imageClass : ''}`} />
                : <Sparkles aria-hidden="true" className="h-8 w-8 text-amber-300" />;
            })()}
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="min-w-0 flex-1">
              <h3 id="stage2-report-dialog-title" className="truncate text-3xl font-black capitalize leading-tight sm:text-4xl">{selected.english}</h3>
              {showVietnamese && selected.vietnamese && <p className="truncate text-base font-bold text-slate-200 sm:text-lg">{selected.vietnamese}</p>}
            </div>
            <button type="button" onClick={() => { const vocab = vocabulary.find((item) => (item._id || (item as any).id || item.english) === selected.wordId); speakWord(selected.english, vocab?.audioUrl); }} aria-label={`Nghe từ ${selected.english}`} className="grid min-h-12 min-w-12 shrink-0 place-items-center rounded-full bg-sky-600 text-white"><Volume2 className="h-6 w-6" /></button>
          </div>
        </header>

        {confirmed && (hasRoundDetail(selected) ? (
          <ol className="flex min-h-0 flex-1 flex-col justify-center gap-1" aria-label={`Kết quả từng vòng của từ ${selected.english}`}>
            {roundsConfig.map((config) => {
              const round = selected.rounds.find((item) => Number(item.code) === Number(config.code));
              const name = round?.name || config.name;
              const accessibleResult = round?.rating === 'SECURE' ? 'con làm đúng ngay' : round?.rating ? 'cần luyện thêm' : 'chưa luyện';
              return <li key={`${selected.wordId}-round-${config.code}`} aria-label={`Vòng ${config.code}: ${name}, ${accessibleResult}`} className="flex min-h-12 items-center gap-2 rounded-2xl bg-slate-800/80 px-2 py-1 sm:min-h-16 sm:gap-3 sm:px-3 sm:py-1.5">
                <RoundMark round={round} ageGroup={ageGroup} size="lg" decorative />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-amber-200 sm:text-base">Vòng {config.code}</span>
                  <span className="block truncate text-lg font-black text-white sm:text-xl">{name}</span>
                </span>
              </li>;
            })}
          </ol>
        ) : (
          <p className="shrink-0 rounded-2xl bg-slate-800/80 px-3 py-2 text-center text-base font-bold text-slate-200">Bài cũ chỉ lưu kết quả tổng hợp.</p>
        ))}

        {confirmed && !isYoungest && selected.review?.dueOn && (
          <p className="flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-sky-900/60 px-3 py-1 text-sm font-bold text-sky-100">
            <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-sky-300" />
            <span>{duePhrase(selected.review.dueOn)}</span>
          </p>
        )}

        <nav className="flex shrink-0 justify-between gap-3" aria-label="Chuyển từ">
          <button type="button" onClick={() => moveSelected(-1)} aria-label="Từ trước" disabled={words.findIndex((word) => word.wordId === selected.wordId) <= 0} className="grid min-h-12 min-w-12 place-items-center rounded-full bg-slate-700 disabled:opacity-40"><ChevronLeft className="h-7 w-7" /></button>
          <button type="button" onClick={() => moveSelected(1)} aria-label="Từ tiếp theo" disabled={words.findIndex((word) => word.wordId === selected.wordId) >= words.length - 1} className="grid min-h-12 min-w-12 place-items-center rounded-full bg-slate-700 disabled:opacity-40"><ChevronRight className="h-7 w-7" /></button>
        </nav>
      </div>
    </div>}
  </div>;
};
