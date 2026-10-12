import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  Grid3X3,
  Search,
  Volume2,
  X,
  Sparkles,
  Eye,
  EyeOff,
  Mic,
  CheckCircle2,
  Play,
  RotateCcw,
  MessageCircle,
  HelpCircle,
  Lightbulb
} from 'lucide-react';
import { sentenceApi } from '../../services/api';
import { sfx, playWordAudio } from '../../utils/audio';
import { childSpeechEngine, type SpeechRecognitionResult } from '../../utils/speechRecognition';

/**
 * Interactive Sentence-Pattern Teaching Screen for Preschool Teachers
 * (Data from MongoDB `languagecontents`)
 *
 * Highlights:
 *  - Interactive Q&A Pairing: Displays the Question prominently and allows
 *    revealing/answering with the corresponding Answer(s) in both Quiz & Direct modes.
 *  - Multi-Response Support: Handles single answers and bifurcated Yes/No responses.
 *  - Choral Audio Playback: Listen to Question only, Answer only, or the whole dialogue.
 *  - Live Speech Practice: Children can stand up and speak the answer into the mic
 *    with instant phoneme tolerance & celebration fanfare.
 *  - Teacher Keyboard Shortcuts: Space/Enter to toggle answer, Arrows to navigate.
 */

interface PatternTopic {
  _id: string;
  englishName?: string;
  vietnameseName?: string;
}

interface PatternLesson {
  _id: string;
  title?: string;
  vietnameseTitle?: string;
  displayOrder?: number;
}

interface PatternUnit {
  _id: string;
  unitNumber?: number;
  bookNumber?: number;
  bigQuestion?: string;
}

interface PatternVocab {
  _id: string;
  english?: string;
  vietnamese?: string;
  imageUrl?: string;
}

export interface SentenceAnswer {
  _id?: string;
  english: string;
  vietnamese?: string;
  pronunciation?: string;
  audioUrl?: string | null;
  imageUrl?: string | null;
}

export interface SentencePattern {
  _id: string;
  contentType: string;
  english: string;
  vietnamese: string;
  pronunciation: string;
  ageGroupCode: string;
  difficulty: number;
  topic: PatternTopic | null;
  lesson: PatternLesson | null;
  sourceUnit: PatternUnit | null;
  vocabulary: PatternVocab[];
  audioUrl: string | null;
  imageUrl: string | null;
  answers?: SentenceAnswer[];
  hasAnswers?: boolean;
}

interface UnitOverview {
  unitId: string;
  unitNumber: number;
  bookNumber: number;
  bookTitle: string;
  bigQuestion: string;
  ageGroupCode: string;
  sentenceCount: number;
  lessonCount: number;
}

const TYPE_META: Record<string, { label: string; cls: string; borderCls: string }> = {
  QUESTION: { label: 'Hỏi & Đáp', cls: 'bg-amber-100 text-amber-800 border-amber-200', borderCls: 'border-amber-400' },
  PATTERN: { label: 'Mẫu câu', cls: 'bg-violet-100 text-violet-800 border-violet-200', borderCls: 'border-violet-400' },
  SENTENCE: { label: 'Câu đơn', cls: 'bg-sky-100 text-sky-800 border-sky-200', borderCls: 'border-sky-400' },
  ORACY: { label: 'Đàm thoại', cls: 'bg-rose-100 text-rose-800 border-rose-200', borderCls: 'border-rose-400' },
  DIALOGUE: { label: 'Hội thoại', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200', borderCls: 'border-emerald-400' },
  ANSWER: { label: 'Câu trả lời', cls: 'bg-teal-100 text-teal-800 border-teal-200', borderCls: 'border-teal-400' }
};

const typeMeta = (t: string) =>
  TYPE_META[t] || { label: t, cls: 'bg-slate-100 text-slate-700 border-slate-200', borderCls: 'border-slate-400' };

const TYPE_FILTERS: Array<[string, string]> = [
  ['', 'Tất cả'],
  ['QUESTION', 'Hỏi & Đáp'],
  ['PATTERN', 'Mẫu câu'],
  ['SENTENCE', 'Câu đơn'],
  ['ORACY', 'Đàm thoại']
];

const unitLabel = (u: UnitOverview) => `Sách ${u.bookNumber} · Unit ${u.unitNumber} — ${u.bigQuestion}`;

export const SentenceTeachingPage: React.FC = () => {
  const [age, setAge] = useState('');
  const [unitId, setUnitId] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [units, setUnits] = useState<UnitOverview[]>([]);
  const [rows, setRows] = useState<SentencePattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  // Classroom Projector State
  const [mode, setMode] = useState<'grid' | 'classroom'>('grid');
  const [classIdx, setClassIdx] = useState(0);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [autoReveal, setAutoReveal] = useState(false);
  const [isPlayingDialogue, setIsPlayingDialogue] = useState(false);

  // Microphone state
  const [micActiveTarget, setMicActiveTarget] = useState<string | null>(null);
  const [micResult, setMicResult] = useState<SpeechRecognitionResult | null>(null);
  const [confettiActive, setConfettiActive] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Units overview
  useEffect(() => {
    sentenceApi
      .getUnitsOverview({ ageGroupCode: age || undefined, contentType: type || undefined })
      .then((x) => setUnits(x.data || []))
      .catch(() => setUnits([]));
  }, [age, type]);

  // Teaching list
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    sentenceApi
      .getPatterns({
        ageGroupCode: age || undefined,
        unitId: unitId || undefined,
        contentType: type || undefined,
        search: debouncedSearch || undefined
      })
      .then((x) => {
        if (!cancelled) setRows(x.data || []);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Không thể tải nội dung mẫu câu.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [age, unitId, type, debouncedSearch, reloadTick]);

  useEffect(() => setClassIdx(0), [rows]);
  useEffect(() => setUnitId(''), [age]);

  const current = rows[classIdx];
  const isCurrentRevealed = Boolean(
    autoReveal || (current && revealedAnswers[current._id])
  );

  const toggleRevealCurrent = useCallback(() => {
    if (!current) return;
    sfx.playPop();
    setRevealedAnswers((prev) => {
      const nextState = !prev[current._id];
      if (nextState) {
        sfx.playCorrect();
      }
      return { ...prev, [current._id]: nextState };
    });
  }, [current]);

  const grouped = useMemo(() => {
    const byUnit = new Map<
      string,
      {
        unit: PatternUnit | null;
        lessons: Map<string, { lesson: PatternLesson | null; items: SentencePattern[] }>;
        count: number;
      }
    >();
    rows.forEach((r) => {
      const uKey = r.sourceUnit?._id || 'none';
      if (!byUnit.has(uKey)) byUnit.set(uKey, { unit: r.sourceUnit, lessons: new Map(), count: 0 });
      const g = byUnit.get(uKey)!;
      g.count++;
      const lKey = r.lesson?._id || 'none';
      if (!g.lessons.has(lKey)) g.lessons.set(lKey, { lesson: r.lesson, items: [] });
      g.lessons.get(lKey)!.items.push(r);
    });
    return Array.from(byUnit.values()).sort(
      (a, b) =>
        (a.unit?.bookNumber || 0) - (b.unit?.bookNumber || 0) ||
        (a.unit?.unitNumber || 0) - (b.unit?.unitNumber || 0)
    );
  }, [rows]);

  const step = useCallback(
    (delta: number) => {
      sfx.playPop();
      setMicActiveTarget(null);
      setMicResult(null);
      setClassIdx((i) => Math.min(Math.max(i + delta, 0), Math.max(rows.length - 1, 0)));
    },
    [rows.length]
  );

  // Keyboard shortcuts in classroom mode
  useEffect(() => {
    if (mode !== 'classroom') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        step(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        step(-1);
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggleRevealCurrent();
      } else if (e.key === 'Escape') {
        setMode('grid');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, step, toggleRevealCurrent]);

  const toggleFullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen().catch(() => undefined);
  };

  // Play sequential dialogue (Question -> Pause -> Answer)
  const playFullDialogue = async (item: SentencePattern) => {
    if (isPlayingDialogue) return;
    setIsPlayingDialogue(true);
    sfx.playPop();

    // 1. Play Question
    await playWordAudio(item.english, item.audioUrl || undefined);

    // 2. Pause
    await new Promise((r) => setTimeout(r, 900));

    // 3. Play Answer(s)
    if (item.answers && item.answers.length > 0) {
      for (const ans of item.answers) {
        await playWordAudio(ans.english, ans.audioUrl || undefined);
        await new Promise((r) => setTimeout(r, 600));
      }
    }
    setIsPlayingDialogue(false);
  };

  // Mic speech test for child
  const startChildSpeechTest = async (targetText: string) => {
    if (micActiveTarget === targetText) {
      childSpeechEngine.stop();
      setMicActiveTarget(null);
      return;
    }

    setMicActiveTarget(targetText);
    setMicResult(null);
    sfx.playPop();

    try {
      const res = await childSpeechEngine.listenAndVerify(targetText, 8000);
      setMicResult(res);
      setMicActiveTarget(null);

      if (res.isMatch) {
        sfx.playStarFanfare();
        setConfettiActive(true);
        setTimeout(() => setConfettiActive(false), 3500);
      } else {
        sfx.playPop();
      }
    } catch {
      setMicActiveTarget(null);
    }
  };

  const jumpToSlide = (index: number) => {
    setClassIdx(index);
    setMode('classroom');
  };

  return (
    <div className="min-h-[85vh]">
      {/* Top Banner & Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-800">
              <Sparkles size={14} className="text-teal-600" /> Công cụ trình chiếu sư phạm
            </span>
            <span className="text-xs text-slate-400 font-medium">Mongo languagecontents</span>
          </div>
          <h1 className="mt-1 text-3xl font-black text-slate-900 tracking-tight">
            Mẫu Câu & Hỏi Đáp Tương Tác
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Chiếu câu hỏi lên màn hình, đố bé đoán câu trả lời và lật mở đáp án với âm thanh & luyện đọc giọng nói thực tế.
          </p>
        </div>

        <button
          onClick={() => setMode('classroom')}
          disabled={!rows.length}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-teal-600/25 hover:from-teal-500 hover:to-emerald-500 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
        >
          <Expand size={18} /> Chiếu trên lớp ({rows.length} câu)
        </button>
      </div>

      {/* Filter Bar */}
      <div className="mb-6 flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        {/* Age Groups */}
        <div className="flex items-center gap-1">
          {['', '3-4', '4-5', '5-6'].map((a) => (
            <button
              key={a || 'all'}
              onClick={() => setAge(a)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                age === a
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {a ? `Độ tuổi ${a}` : 'Mọi độ tuổi'}
            </button>
          ))}
        </div>

        <span className="h-5 w-px bg-slate-200" />

        {/* Content Type Filter */}
        <div className="flex items-center gap-1">
          {TYPE_FILTERS.map(([v, label]) => (
            <button
              key={v || 'alltype'}
              onClick={() => setType(v)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                type === v
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Unit Selector */}
        <select
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          className="ml-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-teal-500"
        >
          <option value="">Tất cả 27 Unit ({units.length})</option>
          {units.map((u) => (
            <option key={u.unitId} value={u.unitId}>
              {unitLabel(u)} · {u.sentenceCount} câu
            </option>
          ))}
        </select>

        {/* Search */}
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium focus-within:border-teal-500 focus-within:bg-white transition-colors">
          <Search size={14} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tiếng Anh / tiếng Việt…"
            className="w-48 outline-none bg-transparent font-medium"
          />
        </label>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700 mb-6">
          {error}{' '}
          <button
            className="font-semibold underline ml-2"
            onClick={() => setReloadTick((t) => t + 1)}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Loading state */}
      {!error && loading && (
        <div className="py-24 text-center text-slate-500">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
          Đang tải dữ liệu mẫu câu & hỏi đáp tương tác…
        </div>
      )}

      {/* Empty state */}
      {!error && !loading && !rows.length && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-14 text-center text-slate-500">
          <p className="text-lg font-bold text-slate-700">Không tìm thấy nội dung phù hợp</p>
          <p className="text-sm mt-1">Hãy thử xóa bộ lọc tìm kiếm hoặc chọn độ tuổi khác.</p>
        </div>
      )}

      {/* Grid Mode */}
      {!error && !loading && rows.length > 0 && (
        <div className="space-y-8">
          {grouped.map((g) => (
            <section
              key={g.unit?._id || 'none'}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs"
            >
              {/* Unit header */}
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-teal-700">
                    {g.unit ? `Sách ${g.unit.bookNumber} · Unit ${g.unit.unitNumber}` : 'Chương trình học'}
                  </p>
                  <h2 className="text-xl font-black text-slate-900 mt-0.5">
                    {g.unit?.bigQuestion || 'Mẫu câu bài học'}
                  </h2>
                </div>
                <span className="rounded-full bg-teal-50 px-3.5 py-1 text-xs font-bold text-teal-700 border border-teal-200">
                  {g.count} mẫu câu / hỏi đáp
                </span>
              </div>

              {/* Lesson groups */}
              <div className="space-y-6">
                {Array.from(g.lessons.values()).map((gl) => (
                  <div key={gl.lesson?._id || 'none'}>
                    {gl.lesson && (
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                        <span className="h-2 w-2 rounded-full bg-teal-500" />
                        {gl.lesson.title}
                        {gl.lesson.vietnameseTitle && (
                          <span className="font-normal text-slate-400">
                            ({gl.lesson.vietnameseTitle})
                          </span>
                        )}
                      </h3>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {gl.items.map((item) => {
                        const meta = typeMeta(item.contentType);
                        const globalIdx = rows.findIndex((r) => r._id === item._id);

                        return (
                          <div
                            key={item._id}
                            className="group flex flex-col justify-between rounded-2xl border-2 border-slate-100 bg-slate-50/70 p-4.5 hover:border-teal-300 hover:bg-white hover:shadow-md transition-all"
                          >
                            <div>
                              {/* Card Meta & Action */}
                              <div className="mb-2.5 flex items-center justify-between gap-2">
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-black border ${meta.cls}`}
                                >
                                  {meta.label}
                                </span>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => playWordAudio(item.english, item.audioUrl || undefined)}
                                    className="rounded-lg p-1.5 text-slate-500 hover:bg-teal-50 hover:text-teal-700 transition-colors cursor-pointer"
                                    title="Nghe phát âm câu hỏi"
                                  >
                                    <Volume2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => jumpToSlide(globalIdx)}
                                    className="rounded-lg p-1.5 text-teal-600 hover:bg-teal-100 transition-colors cursor-pointer"
                                    title="Chiếu câu này lên máy chiếu"
                                  >
                                    <Play size={15} />
                                  </button>
                                </div>
                              </div>

                              {/* Question / Main text */}
                              <p className="text-base font-black leading-snug text-slate-900 group-hover:text-teal-900 transition-colors">
                                {item.english}
                              </p>
                              {item.vietnamese && (
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                  {item.vietnamese}
                                </p>
                              )}
                              {item.pronunciation && (
                                <p className="mt-0.5 text-[11px] italic text-slate-400 font-mono">
                                  /{item.pronunciation}/
                                </p>
                              )}

                              {/* Nested Answers Box */}
                              {item.answers && item.answers.length > 0 && (
                                <div className="mt-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-2.5 text-xs space-y-1.5">
                                  <p className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                                    <MessageCircle size={12} className="text-emerald-600" />
                                    Câu trả lời tương ứng:
                                  </p>
                                  {item.answers.map((ans, aIdx) => (
                                    <div
                                      key={ans._id || aIdx}
                                      className="flex items-start justify-between gap-2 rounded-lg bg-white/80 p-1.5 border border-emerald-100"
                                    >
                                      <div>
                                        <b className="text-emerald-950 font-bold block">
                                          {ans.english}
                                        </b>
                                        {ans.vietnamese && (
                                          <span className="text-[11px] text-emerald-700 font-medium">
                                            {ans.vietnamese}
                                          </span>
                                        )}
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          playWordAudio(ans.english, ans.audioUrl || undefined);
                                        }}
                                        className="shrink-0 p-1 text-emerald-700 hover:text-emerald-900"
                                        title="Nghe câu trả lời này"
                                      >
                                        <Volume2 size={13} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Card Footer */}
                            <div className="mt-4 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                              <span>
                                {item.answers?.length
                                  ? `${item.answers.length} câu trả lời`
                                  : 'Mẫu câu đơn'}
                              </span>
                              <button
                                onClick={() => jumpToSlide(globalIdx)}
                                className="font-bold text-teal-700 hover:underline inline-flex items-center gap-1"
                              >
                                Chiếu slide <ChevronRight size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Classroom Projector Mode — Interactive Teaching on Fullscreen */}
      {mode === 'classroom' && current && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white font-sans overflow-hidden select-none">
          {/* Confetti / celebration indicator */}
          {confettiActive && (
            <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
              <div className="animate-bounce text-6xl">🎉 ⭐ 🌟 👏</div>
            </div>
          )}

          {/* Projector Header Bar */}
          <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/10 bg-slate-900/90 backdrop-blur-md shrink-0">
            {/* Left Info */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMode('grid')}
                className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3.5 py-2 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                <X size={16} /> Thoát chiếu
              </button>
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-teal-400">
                  {current.sourceUnit
                    ? `Sách ${current.sourceUnit.bookNumber} · Unit ${current.sourceUnit.unitNumber}`
                    : 'KCEnglishKids Sư Phạm'}
                </p>
                <p className="text-xs text-slate-300 font-medium">
                  {current.sourceUnit?.bigQuestion || current.lesson?.title || 'Mẫu câu giao tiếp'}
                </p>
              </div>
            </div>

            {/* Center: Slide Index */}
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/10 px-4 py-1 text-xs font-black tracking-wide text-slate-200">
                Câu {classIdx + 1} / {rows.length}
              </span>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2.5">
              {/* Toggle Auto Reveal */}
              <button
                onClick={() => {
                  sfx.playPop();
                  setAutoReveal((v) => !v);
                }}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  autoReveal
                    ? 'bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/40'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
                title="Bật/Tắt chế độ luôn hiện câu trả lời"
              >
                {autoReveal ? <Eye size={15} /> : <EyeOff size={15} />}
                <span className="hidden md:inline">
                  {autoReveal ? 'Luôn hiện đáp án' : 'Chế độ đố bé'}
                </span>
              </button>

              <button
                onClick={toggleFullscreen}
                className="rounded-xl bg-white/10 hover:bg-white/20 p-2 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Toàn màn hình"
              >
                <Expand size={17} />
              </button>

              <button
                onClick={() => setMode('grid')}
                className="rounded-xl bg-white/10 hover:bg-white/20 p-2 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Quay lại dạng lưới"
              >
                <Grid3X3 size={17} />
              </button>
            </div>
          </header>

          {/* Stage Area */}
          <main
            ref={stageRef}
            className="flex flex-1 flex-col items-center justify-between overflow-y-auto px-6 py-6 md:py-10 max-w-6xl mx-auto w-full text-center"
          >
            {/* Top Category Badge */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-wider border shadow-sm ${
                  typeMeta(current.contentType).cls
                }`}
              >
                {typeMeta(current.contentType).label}
              </span>
              {current.lesson?.title && (
                <span className="text-xs text-slate-400 font-medium">
                  • {current.lesson.title}
                </span>
              )}
            </div>

            {/* ── QUESTION CARD (Top Half) ───────────────────────────────── */}
            <div className="w-full flex flex-col items-center my-auto py-2">
              <p className="max-w-4xl text-4xl sm:text-6xl md:text-7xl font-black leading-tight tracking-tight text-white drop-shadow-md">
                {current.english}
              </p>

              {current.pronunciation && (
                <p className="mt-2 text-xl md:text-2xl italic font-mono text-slate-400">
                  /{current.pronunciation}/
                </p>
              )}

              {current.vietnamese && (
                <p className="mt-3 max-w-3xl text-xl sm:text-2xl md:text-3xl font-bold text-amber-300 leading-snug">
                  {current.vietnamese}
                </p>
              )}

              {/* Question Action Buttons */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => playWordAudio(current.english, current.audioUrl || undefined)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 font-bold text-base shadow-lg shadow-teal-900/40 active:scale-95 transition-all cursor-pointer"
                >
                  <Volume2 size={20} /> Nghe câu hỏi
                </button>

                {current.answers && current.answers.length > 0 && (
                  <button
                    onClick={() => playFullDialogue(current)}
                    disabled={isPlayingDialogue}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-200 px-5 py-3 font-bold text-sm border border-white/15 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Play size={16} /> Nghe cả đối thoại
                  </button>
                )}
              </div>
            </div>

            {/* ── ANSWER INTERACTIVE SECTION (Bottom Half) ───────────────── */}
            <div className="w-full mt-4 mb-2">
              {current.answers && current.answers.length > 0 ? (
                <>
                  {/* State 1: Answer is HIDDEN (Quiz / Guessing mode) */}
                  {!isCurrentRevealed ? (
                    <div className="w-full max-w-3xl mx-auto rounded-3xl border-3 border-dashed border-amber-400/40 bg-gradient-to-b from-amber-500/10 to-transparent p-6 sm:p-8 flex flex-col items-center text-center animate-pulse">
                      <div className="w-14 h-14 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center mb-3">
                        <HelpCircle size={32} />
                      </div>
                      <p className="text-xl sm:text-2xl font-black text-amber-200 mb-1">
                        Đố các con câu trả lời là gì nào?
                      </p>
                      <p className="text-xs sm:text-sm text-slate-400 font-medium mb-5">
                        Cô mời một bạn đứng lên trả lời trước khi lật mở đáp án nhé!
                      </p>

                      <button
                        onClick={toggleRevealCurrent}
                        className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 px-8 py-3.5 font-black text-base shadow-xl shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
                      >
                        <Sparkles size={18} /> Lật mở câu trả lời (Phím Space)
                      </button>
                    </div>
                  ) : (
                    /* State 2: Answer is REVEALED (Pedagogical Display) */
                    <div className="w-full max-w-4xl mx-auto rounded-3xl border-2 border-emerald-400/50 bg-gradient-to-b from-emerald-950/40 via-slate-900/80 to-slate-900/90 p-5 sm:p-7 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                        <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-400 uppercase tracking-wider">
                          <CheckCircle2 size={16} /> Câu trả lời tương ứng
                        </span>
                        <button
                          onClick={toggleRevealCurrent}
                          className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1"
                        >
                          <EyeOff size={14} /> Ẩn đáp án
                        </button>
                      </div>

                      {/* Display 1 Answer OR Multiple Choices */}
                      {current.answers.length === 1 ? (
                        /* Single Answer View */
                        <div className="flex flex-col items-center text-center py-2">
                          <p className="text-3xl sm:text-4xl md:text-5xl font-black text-emerald-300 leading-snug tracking-tight">
                            "{current.answers[0].english}"
                          </p>
                          {current.answers[0].vietnamese && (
                            <p className="mt-2 text-lg sm:text-xl font-bold text-emerald-100/90">
                              {current.answers[0].vietnamese}
                            </p>
                          )}

                          {/* Action Bar for Answer */}
                          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                            <button
                              onClick={() =>
                                playWordAudio(
                                  current.answers![0].english,
                                  current.answers![0].audioUrl || undefined
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 font-bold text-sm active:scale-95 transition-all cursor-pointer"
                            >
                              <Volume2 size={18} /> Nghe đáp án
                            </button>

                            {/* Child Speech Practice Button */}
                            <button
                              onClick={() => startChildSpeechTest(current.answers![0].english)}
                              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-bold text-sm transition-all cursor-pointer ${
                                micActiveTarget === current.answers[0].english
                                  ? 'bg-rose-500 text-white animate-pulse'
                                  : 'bg-white/10 hover:bg-white/20 text-amber-300 border border-amber-300/30'
                              }`}
                            >
                              <Mic size={17} />
                              {micActiveTarget === current.answers[0].english
                                ? 'Đang lắng nghe bé đọc…'
                                : 'Bé phát âm thử'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Multi-Answer / Yes-No Choices View */
                        <div className="grid sm:grid-cols-2 gap-4 text-left">
                          {current.answers.map((ans, aIdx) => (
                            <div
                              key={ans._id || aIdx}
                              className="rounded-2xl border border-emerald-400/30 bg-white/5 p-4 flex flex-col justify-between hover:bg-white/10 transition-colors"
                            >
                              <div>
                                <span className="inline-block rounded-md bg-emerald-400/20 text-emerald-300 px-2 py-0.5 text-[11px] font-black mb-1.5 uppercase">
                                  {aIdx === 0 ? 'Lựa chọn 1 (Khẳng định)' : 'Lựa chọn 2 (Phủ định)'}
                                </span>
                                <p className="text-xl sm:text-2xl font-black text-emerald-300 leading-snug">
                                  "{ans.english}"
                                </p>
                                {ans.vietnamese && (
                                  <p className="mt-1 text-sm font-semibold text-slate-300">
                                    {ans.vietnamese}
                                  </p>
                                )}
                              </div>

                              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center gap-2">
                                <button
                                  onClick={() => playWordAudio(ans.english, ans.audioUrl || undefined)}
                                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer"
                                >
                                  <Volume2 size={14} /> Nghe
                                </button>
                                <button
                                  onClick={() => startChildSpeechTest(ans.english)}
                                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                                    micActiveTarget === ans.english
                                      ? 'bg-rose-500 text-white animate-pulse'
                                      : 'bg-white/10 hover:bg-white/20 text-amber-300'
                                  }`}
                                >
                                  <Mic size={14} />
                                  {micActiveTarget === ans.english ? 'Đang nghe…' : 'Bé đọc'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Microphone feedback notification */}
                      {micResult && (
                        <div
                          className={`mt-4 rounded-xl p-3 text-xs font-bold flex items-center justify-center gap-2 ${
                            micResult.isMatch
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                          }`}
                        >
                          {micResult.isMatch ? (
                            <>
                              <CheckCircle2 size={16} />
                              Tuyệt vời! Bé phát âm chuẩn: "{micResult.spokenText}" (Độ khớp:{' '}
                              {Math.round(micResult.confidence * 100)}%)
                            </>
                          ) : (
                            <>
                              <RotateCcw size={16} />
                              Bé phát âm: "{micResult.spokenText || 'Chưa nghe rõ'}" — Cô cho bé thử lại nhé!
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* Item without answer (Model Sentence / Statement) */
                <div className="w-full max-w-2xl mx-auto rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-center gap-3 text-slate-300 text-sm font-semibold">
                  <Lightbulb size={18} className="text-amber-400 shrink-0" />
                  <span>
                    Đây là mẫu câu đơn giao tiếp chuẩn. Cô hướng dẫn cả lớp đồng thanh luyện đọc nhé!
                  </span>
                </div>
              )}
            </div>
          </main>

          {/* Projector Footer Navigation */}
          <footer className="flex items-center justify-between gap-4 px-6 py-4 border-t border-white/10 bg-slate-900/90 backdrop-blur-md shrink-0">
            <button
              onClick={() => step(-1)}
              disabled={classIdx === 0}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-20 px-6 py-3 font-bold text-sm text-white transition-all cursor-pointer"
            >
              <ChevronLeft size={18} /> Câu trước
            </button>

            <p className="hidden md:block text-xs font-semibold text-slate-400">
              Phím <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-white">←</kbd>{' '}
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-white">→</kbd>: Chuyển câu ·{' '}
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-white">Space</kbd>: Lật mở đáp án ·{' '}
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-white">Esc</kbd>: Thoát
            </p>

            <button
              onClick={() => step(1)}
              disabled={classIdx >= rows.length - 1}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-20 px-6 py-3 font-bold text-sm text-white transition-all cursor-pointer"
            >
              Câu tiếp <ChevronRight size={18} />
            </button>
          </footer>
        </div>
      )}
    </div>
  );
};

export default SentenceTeachingPage;
