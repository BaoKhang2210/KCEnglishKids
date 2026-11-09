import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  Grid3X3,
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
import { sentenceApi, teacherApi } from '../../services/api';
import { sfx, playWordAudio } from '../../utils/audio';
import { childSpeechEngine, type SpeechRecognitionResult } from '../../utils/speechRecognition';
import { getSentenceIllustration } from '../../utils/sentenceIllustrations';

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

export const SentenceTeachingPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlLessonId = searchParams.get('lessonId') || '';
  const urlUnitId = searchParams.get('unitId') || '';
  const urlMode = searchParams.get('mode') || '';

  const [age, setAge] = useState('');
  const [assignedAges, setAssignedAges] = useState<string[]>([]);
  const [unitId, setUnitId] = useState(urlUnitId);
  const [lessonId, setLessonId] = useState(urlLessonId);

  const [catalog, setCatalog] = useState<{ units: any[]; lessons: any[] } | null>(null);
  const [rows, setRows] = useState<SentencePattern[]>([]);
  const [lessonRows, setLessonRows] = useState<SentencePattern[]>([]);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  // Classroom Projector State
  const [mode, setMode] = useState<'grid' | 'classroom'>(urlMode === 'classroom' ? 'classroom' : 'grid');
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
    setUnitId(urlUnitId);
    setLessonId(urlLessonId);
  }, [urlUnitId, urlLessonId]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([teacherApi.getClasses(), teacherApi.getContent()]).then(([classes, content]) => {
      if (cancelled) return;
      setAssignedAges([...new Set((classes.data || []).map((room: any) => room.ageGroupCode).filter(Boolean))] as string[]);
      setCatalog({ units: content.data?.units || [], lessons: content.data?.lessons || [] });
    }).catch(e => { if (!cancelled) setError(e?.message || 'Không thể tải lớp giảng dạy.'); });
    return () => { cancelled = true; };
  }, []);

  // Teaching list
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    sentenceApi
      .getPatterns({
        ageGroupCode: age || undefined
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
  }, [age, reloadTick]);

  useEffect(() => {
    if (!lessonId) {
      setLessonRows(unitId ? rows.filter(row => String(row.sourceUnit?._id || 'none') === unitId) : []);
      setLessonLoading(false);
      return;
    }
    if (lessonId === 'none') {
      setLessonRows(rows.filter(row => !row.lesson));
      return;
    }
    let cancelled = false;
    setLessonRows([]);
    setLessonLoading(true);
    sentenceApi.getPatterns({ ageGroupCode: age || undefined, unitId: unitId || undefined, lessonId })
      .then(response => { if (!cancelled) setLessonRows(response.data || []); })
      .catch(e => { if (!cancelled) { setLessonRows([]); setError(e?.message || 'Không thể tải mẫu câu của bài học.'); } })
      .finally(() => { if (!cancelled) setLessonLoading(false); });
    return () => { cancelled = true; };
  }, [age, unitId, lessonId, reloadTick, rows]);

  useEffect(() => setClassIdx(0), [lessonRows, lessonId, unitId]);

  const activeLesson = useMemo(() => {
    if (!lessonId) return null;
    const match = catalog?.lessons.find((item: any) => String(item._id) === lessonId);
    return match || rows.find((row) => row.lesson?._id === lessonId)?.lesson || null;
  }, [catalog, rows, lessonId]);

  const clearLessonFilter = () => {
    setLessonId('');
    setUnitId('');
    const params = new URLSearchParams(searchParams);
    params.delete('lessonId');
    params.delete('unitId');
    setSearchParams(params);
  };

  const selectUnit = (id: string) => {
    setUnitId(id);
    setLessonId('');
    setMode('grid');
    const params = new URLSearchParams(searchParams);
    params.delete('lessonId');
    params.delete('mode');
    if (id) params.set('unitId', id);
    else params.delete('unitId');
    setSearchParams(params);
  };

  const current = lessonRows[classIdx];
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

  const navigationGroups = grouped;

  const selectedGrouped = useMemo(() => {
    const byUnit = new Map<string, { unit: PatternUnit | null; count: number; lessons: Map<string, { lesson: PatternLesson | null; items: SentencePattern[] }> }>();
    lessonRows.forEach(row => {
      const key = row.sourceUnit?._id || 'none';
      if (!byUnit.has(key)) byUnit.set(key, { unit: row.sourceUnit, count: 0, lessons: new Map() });
      const group = byUnit.get(key)!;
      group.count++;
      if (!group.lessons.has('all')) group.lessons.set('all', { lesson: null, items: [] });
      group.lessons.get('all')!.items.push(row);
    });
    return Array.from(byUnit.values());
  }, [lessonRows]);
  const activeUnit = navigationGroups.find(group => String(group.unit?._id || 'none') === unitId)?.unit;

  const step = useCallback(
    (delta: number) => {
      sfx.playPop();
      setMicActiveTarget(null);
      setMicResult(null);
      setClassIdx((i) => Math.min(Math.max(i + delta, 0), Math.max(lessonRows.length - 1, 0)));
    },
    [lessonRows.length]
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
    <div>
      {!embedded && <div className="mb-5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-800">
              <Sparkles size={14} className="text-teal-800" /> Công cụ trình chiếu sư phạm
            </span>
          </div>
          <h1 className="mt-1 text-3xl font-black text-slate-900 tracking-tight">
            Mẫu câu & hỏi đáp
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Chọn một Unit để xem toàn bộ mẫu câu, nghe phát âm hoặc trình chiếu cho cả lớp.
          </p>
      </div>}

      {assignedAges.length > 1 && <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
          <span className="px-2 text-sm font-semibold text-slate-600">Độ tuổi:</span>
            {['', ...assignedAges].map((a) => (
              <button
                key={a || 'all'}
                onClick={() => { setAge(a); selectUnit(''); }}
                className={`rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  age === a
                    ? 'bg-teal-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {a ? `Tuổi ${a}` : 'Các lớp phụ trách'}
              </button>
            ))}
      </div>}

      {/* Error state */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800 mb-6">
          {error}{' '}
          <button
            className="font-semibold underline ml-2 cursor-pointer"
            onClick={() => setReloadTick((t) => t + 1)}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Loading state */}
      {!error && loading && (
        <div className="py-24 text-center text-slate-600">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
          Đang tải dữ liệu mẫu câu & hỏi đáp tương tác…
        </div>
      )}

      {/* Empty state */}
      {!error && !loading && !navigationGroups.length && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 sm:p-14 text-center text-slate-600 max-w-lg mx-auto my-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-3xl">
            💬
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">
            Không tìm thấy mẫu câu phù hợp
          </h3>
          <p className="text-sm text-slate-600 mb-6">
            {lessonId
              ? 'Bài học này chưa có mẫu câu được liên kết riêng.'
              : 'Chưa có mẫu câu cho độ tuổi đang chọn.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {lessonId && (
              <button
                onClick={clearLessonFilter}
                className="rounded-xl bg-teal-700 hover:bg-teal-700 px-4 py-2 text-xs font-bold text-white cursor-pointer transition-all"
              >
                Xem toàn bộ ngân hàng mẫu câu
              </button>
            )}
            <button
              onClick={() => {
                setAge('');
                setUnitId('');
                clearLessonFilter();
              }}
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 cursor-pointer transition-all"
            >
              Đặt lại tất cả bộ lọc
            </button>
          </div>
        </div>
      )}

      {/* Grid Mode */}
      {!error && !loading && navigationGroups.length > 0 && (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-3 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto">
            <div className="mb-3 flex items-center justify-between gap-3 px-2 pt-1">
              <h2 className="text-base font-bold text-slate-900">Chọn Unit</h2>
              <span className="text-xs text-slate-600">{navigationGroups.length} Unit</span>
            </div>
            <div className="space-y-1">
              {navigationGroups.map(group => (
                <div key={group.unit?._id || 'none'} className="border-b border-slate-100 last:border-b-0">
                  <button type="button" aria-pressed={unitId === String(group.unit?._id || 'none') && !lessonId} onClick={() => selectUnit(String(group.unit?._id || 'none'))} className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-3 text-left ${unitId === String(group.unit?._id || 'none') && !lessonId ? 'bg-teal-700 text-white' : 'hover:bg-slate-50'}`}>
                    <span className="min-w-0"><strong className="block text-sm">{group.unit ? `Sách ${group.unit.bookNumber} · Unit ${group.unit.unitNumber}` : 'Mẫu câu chung'}</strong><small className={`block truncate ${unitId === String(group.unit?._id || 'none') && !lessonId ? 'text-teal-50' : 'text-slate-600'}`}>{group.unit?.bigQuestion || 'Mẫu câu giao tiếp'}</small></span>
                    <span className={`shrink-0 text-xs font-bold ${unitId === String(group.unit?._id || 'none') && !lessonId ? 'text-white' : 'text-teal-800'}`}>{group.count} câu</span>
                  </button>
                </div>
              ))}
            </div>
          </section>
          <div className="min-w-0 space-y-5">
          {!lessonId && !unitId && <div className="rounded-2xl border border-dashed border-teal-300 bg-teal-50 p-8 text-center text-slate-700"><MessageCircle size={28} className="mx-auto mb-3 text-teal-700" /><strong className="block text-lg text-slate-900">Chọn một Unit</strong><p className="mt-1 text-sm">Toàn bộ mẫu câu trong Unit sẽ xuất hiện tại đây.</p></div>}
          {lessonLoading && <div role="status" className="rounded-2xl bg-white p-8 text-center text-slate-600">Đang tải mẫu câu của bài học…</div>}
          {(unitId || lessonId) && !lessonLoading && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-teal-800">{lessonId ? 'Bài đang chọn' : `${lessonRows.length} mẫu câu`}</p><h2 className="text-xl font-bold text-slate-900">{lessonId ? activeLesson?.title || 'Bài học' : activeUnit ? `Unit ${activeUnit.unitNumber} · ${activeUnit.bigQuestion || ''}` : 'Mẫu câu chung'}</h2>{lessonId && activeLesson?.vietnameseTitle && <p className="text-sm text-slate-600">{activeLesson.vietnameseTitle}</p>}</div>
            <button type="button" disabled={!lessonRows.length} onClick={() => setMode('classroom')} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40"><Play size={16} /> Trình chiếu mẫu câu</button>
          </div>}
          {(unitId || lessonId) && !lessonLoading && !lessonRows.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">Chưa có mẫu câu trong nội dung này.</div>}
          {(unitId || lessonId) && !lessonLoading && selectedGrouped.map((g) => (
            <section
              key={g.unit?._id || 'none'}
              className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
            >
              {lessonId && <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <p className="text-sm font-bold text-teal-800">{g.unit ? `Sách ${g.unit.bookNumber} · Unit ${g.unit.unitNumber} · ${g.unit.bigQuestion || ''}` : 'Mẫu câu chung'}</p>
                <span className="text-xs text-slate-600">{g.count} câu</span>
              </div>}

              {/* Lesson groups */}
              <div className="space-y-6">
                {Array.from(g.lessons.values()).map((gl) => (
                  <div key={gl.lesson?._id || 'none'}>
                    <div className="space-y-3">
                      {gl.items.map((item) => {
                        const meta = typeMeta(item.contentType);
                        const globalIdx = lessonRows.findIndex((r) => r._id === item._id);

                        return (
                          <div
                            key={item._id}
                            className="group rounded-xl border border-slate-200 bg-slate-50/60 p-4 hover:border-teal-300 hover:bg-white transition-all"
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
                                    className="rounded-lg p-1.5 text-slate-600 hover:bg-teal-50 hover:text-teal-800 transition-colors cursor-pointer"
                                    title="Nghe phát âm câu hỏi"
                                  >
                                    <Volume2 size={16} />
                                  </button>
                                </div>
                              </div>

                              {/* Question / Main text with Visual Thumbnail */}
                              <div className="flex items-start gap-3 mt-1">
                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white p-1 border-2 border-slate-200/80 shrink-0 flex items-center justify-center group-hover:scale-105 group-hover:border-teal-300 transition-all overflow-hidden">
                                  <img
                                    src={getSentenceIllustration(item.english, item.imageUrl, false)}
                                    alt={item.english}
                                    className="w-full h-full object-contain"
                                    loading="lazy"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-base font-black leading-snug text-slate-900 group-hover:text-teal-900 transition-colors">
                                    {item.english}
                                  </p>
                                  {item.vietnamese && (
                                    <p className="mt-0.5 text-xs font-semibold text-slate-600">
                                      {item.vietnamese}
                                    </p>
                                  )}
                                  {item.pronunciation && (
                                    <p className="mt-0.5 text-[11px] italic text-slate-600 font-mono">
                                      /{item.pronunciation}/
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Nested Answers Box */}
                              {item.answers && item.answers.length > 0 && (
                                <div className="mt-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-2.5 text-xs space-y-1.5">
                                  <p className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                                    <MessageCircle size={12} className="text-emerald-800" />
                                    Câu trả lời tương ứng:
                                  </p>
                                  {item.answers.map((ans, aIdx) => (
                                    <div
                                      key={ans._id || aIdx}
                                      className="flex items-center justify-between gap-2 rounded-lg bg-slate-100 p-1.5 border border-emerald-100"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-white p-0.5 border border-emerald-200 shrink-0 flex items-center justify-center overflow-hidden">
                                          <img
                                            src={getSentenceIllustration(ans.english, ans.imageUrl, true)}
                                            alt={ans.english}
                                            className="w-full h-full object-contain"
                                            loading="lazy"
                                          />
                                        </div>
                                        <div className="min-w-0">
                                          <b className="text-emerald-950 font-bold block text-sm">
                                            {ans.english}
                                          </b>
                                          {ans.vietnamese && (
                                            <span className="text-xs text-emerald-800 font-medium block">
                                              {ans.vietnamese}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          playWordAudio(ans.english, ans.audioUrl || undefined);
                                        }}
                                        className="shrink-0 p-1 text-emerald-800 hover:text-emerald-900"
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
                            <div className="mt-4 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600 font-medium">
                              <span>
                                {item.answers?.length
                                  ? `${item.answers.length} câu trả lời`
                                  : 'Mẫu câu đơn'}
                              </span>
                              <button type="button"
                                onClick={() => jumpToSlide(globalIdx)}
                                className="font-bold text-teal-800 hover:underline inline-flex items-center gap-1"
                              >
                                Trình chiếu câu này <ChevronRight size={13} />
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
                Câu {classIdx + 1} / {lessonRows.length}
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
            className="flex flex-1 flex-col items-center justify-between overflow-y-auto px-6 py-6 md:py-10 w-full max-w-6xl 2xl:max-w-7xl 3xl:max-w-[2000px] mx-auto text-center"
          >
            {/* Top Category Badge */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-wider border ${
                  typeMeta(current.contentType).cls
                }`}
              >
                {typeMeta(current.contentType).label}
              </span>
              {lessonId && current.lesson?.title && (
                <span className="text-xs text-slate-400 font-medium">
                  • {current.lesson.title}
                </span>
              )}
            </div>

            {/* ── QUESTION CARD (Top Half) ───────────────────────────────── */}
            <div className="w-full flex flex-col items-center my-auto py-2">
              {/* Question Visual Illustration Frame */}
              <div className="relative mx-auto mb-5 w-40 h-40 sm:w-52 sm:h-52 md:w-60 md:h-60 rounded-4xl bg-white p-3.5 border-4 border-teal-300 flex items-center justify-center group animate-in zoom-in-95 duration-200">
                <img
                  src={getSentenceIllustration(current.english, current.imageUrl, false)}
                  alt={current.english}
                  className="w-full h-full object-contain filter group-hover:scale-105 transition-transform"
                />
                <button
                  onClick={() => {
                    if (current.answers && current.answers.length > 0) {
                      void playFullDialogue(current);
                    } else {
                      void playWordAudio(current.english, current.audioUrl || undefined);
                    }
                  }}
                  className="absolute -bottom-3 -right-3 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-white flex items-center justify-center active:scale-90 transition-transform cursor-pointer ring-4 ring-teal-300/40"
                  title="Nghe phát âm cả câu hỏi và câu trả lời"
                >
                  <Volume2 size={24} />
                </button>
              </div>

              <p className="max-w-4xl text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight text-white">
                {current.english}
              </p>

              {current.pronunciation && (
                <p className="mt-1 text-sm sm:text-lg italic font-mono text-slate-400">
                  /{current.pronunciation}/
                </p>
              )}

              {current.vietnamese && (
                <p className="mt-2 max-w-3xl text-base sm:text-xl md:text-2xl font-bold text-amber-300 leading-snug">
                  {current.vietnamese}
                </p>
              )}

              {/* Question Action Buttons */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => playWordAudio(current.english, current.audioUrl || undefined)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 font-bold text-base  active:scale-95 transition-all cursor-pointer"
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
                        className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 px-8 py-3.5 font-black text-base  active:scale-95 transition-all cursor-pointer"
                      >
                        <Sparkles size={18} /> Lật mở câu trả lời (Phím Space)
                      </button>
                    </div>
                  ) : (
                    /* State 2: Answer is REVEALED (Pedagogical Display) */
                    <div className="w-full max-w-4xl mx-auto rounded-3xl border-2 border-emerald-400/50 bg-gradient-to-b from-emerald-950/40 via-slate-900/80 to-slate-900/90 p-5 sm:p-7 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
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
                        /* Single Answer View with Visual Illustration */
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-8 py-2">
                          <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-3xl bg-white p-2.5 border-3 border-emerald-300 shrink-0 flex items-center justify-center">
                            <img
                              src={getSentenceIllustration(current.answers[0].english, current.answers[0].imageUrl, true)}
                              alt={current.answers[0].english}
                              className="w-full h-full object-contain filter"
                            />
                          </div>

                          <div className="text-center sm:text-left">
                            <p className="text-2xl sm:text-4xl md:text-5xl font-black text-emerald-300 leading-snug tracking-tight">
                              "{current.answers[0].english}"
                            </p>
                            {current.answers[0].vietnamese && (
                              <p className="mt-1 text-base sm:text-xl font-bold text-emerald-100/90">
                                {current.answers[0].vietnamese}
                              </p>
                            )}

                            {/* Action Bar for Answer */}
                            <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3">
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
                        </div>
                      ) : (
                        /* Multi-Answer / Yes-No Choices View with Visuals */
                        <div className="grid sm:grid-cols-2 gap-4 text-left">
                          {current.answers.map((ans, aIdx) => (
                            <div
                              key={ans._id || aIdx}
                              className="rounded-2xl border border-emerald-400/30 bg-white/5 p-4 flex items-center gap-4 hover:bg-white/10 transition-colors"
                            >
                              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white p-1.5 border-2 border-emerald-300 shrink-0 flex items-center justify-center">
                                <img
                                  src={getSentenceIllustration(ans.english, ans.imageUrl, true)}
                                  alt={ans.english}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="inline-block rounded-md bg-emerald-400/20 text-emerald-300 px-2 py-0.5 text-[11px] font-black mb-1 uppercase">
                                  {aIdx === 0 ? 'Lựa chọn 1 (Khẳng định)' : 'Lựa chọn 2 (Phủ định)'}
                                </span>
                                <p className="text-xl sm:text-2xl font-black text-emerald-300 leading-snug truncate">
                                  "{ans.english}"
                                </p>
                                {ans.vietnamese && (
                                  <p className="mt-0.5 text-xs sm:text-sm font-semibold text-slate-300 truncate">
                                    {ans.vietnamese}
                                  </p>
                                )}

                                <div className="mt-2.5 flex items-center gap-2">
                                  <button
                                    onClick={() => playWordAudio(ans.english, ans.audioUrl || undefined)}
                                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer"
                                  >
                                    <Volume2 size={13} /> Nghe
                                  </button>
                                  <button
                                    onClick={() => startChildSpeechTest(ans.english)}
                                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                                      micActiveTarget === ans.english
                                        ? 'bg-rose-500 text-white animate-pulse'
                                        : 'bg-white/10 hover:bg-white/20 text-amber-300'
                                    }`}
                                  >
                                    <Mic size={13} />
                                    {micActiveTarget === ans.english ? 'Đang nghe…' : 'Bé đọc'}
                                  </button>
                                </div>
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
              disabled={classIdx >= lessonRows.length - 1}
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
