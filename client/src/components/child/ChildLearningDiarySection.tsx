import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpenCheck,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  Volume2,
  ClipboardList,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { learningApi, parentNotificationApi } from '../../services/api';
import { playWordAudio, sfx } from '../../utils/audio';
import { KokoMascot } from './KokoMascot';
import { GAME_REGISTRY } from '../../games/registry';
import type { GameId } from '../../games/core/types';

interface ChildLearningDiarySectionProps {
  units: any[];
  ageGroupCode: string;
  totalStars: number;
  completedLessons: number;
  streakDays?: number;
  onNavigateTab?: (tab: string) => void;
}

type DiarySubTab = 'lessons' | 'timeline' | 'assignments';
type LessonFilter = 'all' | 'completed' | 'in_progress' | 'needs_review';

function formatVnDateTime(value?: string | Date): string {
  if (!value) return 'Gần đây';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'Gần đây';
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Gần đây';
  }
}

function readLocalStageCache(childId: string, lessonId: string) {
  try {
    const s1 = localStorage.getItem(`kc_stage1_${childId}_${lessonId}`) === 'true';
    const s2 = localStorage.getItem(`kc_stage2_${childId}_${lessonId}`) === 'true';
    const s3 = localStorage.getItem(`kc_stage3_${childId}_${lessonId}`) === 'true';
    const gamesRaw = localStorage.getItem(`kc_stage3_games_${childId}_${lessonId}`);
    const games: string[] = gamesRaw ? JSON.parse(gamesRaw) : [];
    return { s1, s2, s3, games };
  } catch {
    return { s1: false, s2: false, s3: false, games: [] };
  }
}

export const ChildLearningDiarySection: React.FC<ChildLearningDiarySectionProps> = ({
  units = [],
  totalStars = 0,
  completedLessons = 0,
  streakDays = 1,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const childId = (user as any)?.id || (user as any)?._id || 'child_guest';

  const [subTab, setSubTab] = useState<DiarySubTab>('lessons');
  const [lessonFilter, setLessonFilter] = useState<LessonFilter>('all');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      learningApi.getChildProgress(childId).catch(() => ({ success: false, data: null })),
      parentNotificationApi.getChildAssignments(childId).catch(() => ({ success: false, data: [] })),
    ])
      .then(([progRes, assignRes]) => {
        if (!active) return;
        if (progRes?.success && progRes.data) {
          setProgressData(progRes.data);
        }
        if (assignRes?.success && Array.isArray(assignRes.data)) {
          setAssignments(assignRes.data);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [childId]);

  // Map progress records by lessonId
  const progressByLessonId = useMemo(() => {
    const map = new Map<string, any>();
    (progressData?.progressList || []).forEach((p: any) => {
      const lId = String(p.lesson?._id || p.lesson || '');
      if (lId) map.set(lId, p);
    });
    return map;
  }, [progressData]);

  // Weak vocabulary set
  const weakWordIds = useMemo(() => {
    const set = new Set<string>();
    (progressData?.weakVocabulary || []).forEach((item: any) => {
      const id = String(item.vocabulary?._id || item.vocabulary || '');
      if (id) set.add(id);
    });
    return set;
  }, [progressData]);

  // Flatten all curriculum lessons with merged server + local progress
  const enrichedLessons = useMemo(() => {
    const list: Array<{
      _id: string;
      lessonNumber: number;
      title: string;
      vietnameseTitle?: string;
      unitId: string;
      unitNumber: number;
      unitTitle: string;
      unitIcon: string;
      isUnitUnlocked: boolean;
      isLessonUnlocked: boolean;
      completed: boolean;
      stars: number;
      stage1Completed: boolean;
      stage2Completed: boolean;
      stage2Score: number | null;
      stage3Completed: boolean;
      stage3Games: string[];
      lastActivityAt?: string;
      vocabularyItems: any[];
      weakCount: number;
      status: 'completed' | 'in_progress' | 'unlocked' | 'locked';
    }> = [];

    units.forEach((unit, unitIdx) => {
      const isUnitUnlocked =
        unitIdx === 0 || Boolean(units[unitIdx - 1]?.isCompleted) || Boolean(unit.isCompleted);

      (unit.lessons || []).forEach((lesson: any, lessonIdx: number) => {
        const lessonId = String(lesson._id);
        const serverProg = progressByLessonId.get(lessonId);
        const localCache = readLocalStageCache(childId, lessonId);

        const stage1Completed = Boolean(
          serverProg?.stage1Completed || localCache.s1 || lesson.completed
        );
        const stage2Completed = Boolean(
          serverProg?.stage2Completed || localCache.s2 || lesson.completed
        );
        const stage3Games = Array.from(
          new Set([...(serverProg?.stage3Games || []), ...localCache.games])
        );
        const stage3Completed = Boolean(
          serverProg?.stage3Completed ||
            localCache.s3 ||
            stage3Games.length >= 2 ||
            lesson.completed
        );
        const completed = Boolean(
          lesson.completed ||
            serverProg?.completed ||
            (stage1Completed && stage2Completed && stage3Completed)
        );

        const computedStars = Math.max(
          Number(lesson.stars) || 0,
          Number(serverProg?.stars) || 0,
          (stage1Completed ? 1 : 0) + (stage2Completed ? 1 : 0) + (stage3Completed ? 1 : 0)
        );

        const isLessonUnlocked =
          isUnitUnlocked &&
          (completed ||
            stage1Completed ||
            lessonIdx === 0 ||
            Boolean(unit.lessons[lessonIdx - 1]?.completed));

        const vocabItems = Array.isArray(lesson.vocabularyItems) ? lesson.vocabularyItems : [];
        const weakCount = vocabItems.filter((w: any) => weakWordIds.has(String(w?._id || w))).length;

        const isStarted = stage1Completed || stage2Completed || stage3Games.length > 0;
        const status: 'completed' | 'in_progress' | 'unlocked' | 'locked' = completed
          ? 'completed'
          : isStarted
          ? 'in_progress'
          : isLessonUnlocked
          ? 'unlocked'
          : 'locked';

        list.push({
          _id: lessonId,
          lessonNumber: lesson.lessonNumber || lessonIdx + 1,
          title: lesson.title || `Lesson ${lessonIdx + 1}`,
          vietnameseTitle: lesson.vietnameseTitle,
          unitId: String(unit._id),
          unitNumber: unit.unitNumber || unitIdx + 1,
          unitTitle: unit.topicName || unit.storyTitle || `Unit ${unitIdx + 1}`,
          unitIcon: unit.topicIcon || '🌟',
          isUnitUnlocked,
          isLessonUnlocked,
          completed,
          stars: Math.min(3, computedStars),
          stage1Completed,
          stage2Completed,
          stage2Score:
            typeof serverProg?.stage2Score === 'number' && stage2Completed
              ? Math.round(serverProg.stage2Score)
              : null,
          stage3Completed,
          stage3Games,
          lastActivityAt: serverProg?.lastActivityAt || serverProg?.updatedAt,
          vocabularyItems: vocabItems,
          weakCount,
          status,
        });
      });
    });

    return list;
  }, [units, progressByLessonId, childId, weakWordIds]);

  // Average Stage 2 Practice Accuracy
  const avgPracticeAccuracy = useMemo(() => {
    const scored = enrichedLessons.filter((l) => l.stage2Score !== null && l.stage2Score > 0);
    if (!scored.length) return null;
    const sum = scored.reduce((acc, l) => acc + (l.stage2Score || 0), 0);
    return Math.round(sum / scored.length);
  }, [enrichedLessons]);

  // In-progress lessons and next unlocked lesson ("Đang học gì?")
  const inProgressLessons = useMemo(
    () => enrichedLessons.filter((l) => l.status === 'in_progress'),
    [enrichedLessons]
  );

  const nextUnlockedLesson = useMemo(
    () =>
      inProgressLessons[0] ||
      enrichedLessons.find((l) => l.status === 'unlocked' && !l.completed) ||
      enrichedLessons[0] ||
      null,
    [inProgressLessons, enrichedLessons]
  );

  const filteredLessons = useMemo(() => {
    return enrichedLessons.filter((l) => {
      if (selectedUnitFilter !== 'all' && l.unitId !== selectedUnitFilter) return false;
      if (lessonFilter === 'completed') return l.status === 'completed';
      if (lessonFilter === 'in_progress') return l.status === 'in_progress' || l.status === 'unlocked';
      if (lessonFilter === 'needs_review') return l.weakCount > 0;
      return true;
    });
  }, [enrichedLessons, selectedUnitFilter, lessonFilter]);

  const recentEvents: any[] = progressData?.recentActivityResults || [];
  const totalLessonCount = enrichedLessons.length;
  const effectiveCompletedCount = Math.max(
    completedLessons,
    enrichedLessons.filter((l) => l.completed).length
  );

  return (
    <div className="space-y-6 pb-8">
      {/* ── HERO HEADER: SỔ NHẬT KÝ HÀNH TRÌNH CỦA BÉ ── */}
      <div className="relative rounded-[32px] border-4 border-amber-300 bg-gradient-to-r from-amber-100 via-orange-50 to-yellow-100 p-5 sm:p-7 shadow-md overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white border-3 border-amber-300 shadow-sm flex items-center justify-center shrink-0">
              <KokoMascot state="celebrating" size="sm" interactive={false} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-300/80 text-amber-950 text-xs font-black uppercase tracking-wider mb-1">
                <BookOpenCheck className="w-3.5 h-3.5" />
                Nhật ký & Tiến độ học tập
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                Sổ Hành Trình Của Bé {user?.name || 'Yêu'}
              </h2>
              <p className="text-xs sm:text-sm font-bold text-slate-600 mt-0.5">
                Xem lại bé đang học bài nào, đã hoàn thành những gì và kết quả 3 chặng của từng bài học!
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                sfx.playPop();
                navigate('/my-learning');
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white px-4 py-2.5 text-xs sm:text-sm font-black shadow-sm cursor-pointer active:scale-95 transition-all"
            >
              <span>🌱</span>
              <span>Ôn nhanh 5 phút & Báo cáo tuần</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 KPI Milestone Cards */}
        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 relative z-10">
          <div className="rounded-2xl bg-white/95 border-2 border-amber-200 p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-2xl shrink-0">
              ⭐
            </div>
            <div>
              <span className="text-[11px] font-black uppercase text-slate-500 block">
                Sao hành trình
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-700">
                {totalStars}{' '}
                <span className="text-xs font-bold text-slate-500">
                  / {progressData?.maxStars || totalLessonCount * 3 || 135} sao
                </span>
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-white/95 border-2 border-emerald-200 p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-2xl shrink-0">
              📚
            </div>
            <div>
              <span className="text-[11px] font-black uppercase text-slate-500 block">
                Bài đã học xong
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-700">
                {effectiveCompletedCount}{' '}
                <span className="text-xs font-bold text-slate-500">
                  / {totalLessonCount} Lesson
                </span>
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-white/95 border-2 border-sky-200 p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 border border-sky-300 flex items-center justify-center text-2xl shrink-0">
              🎯
            </div>
            <div>
              <span className="text-[11px] font-black uppercase text-slate-500 block">
                Độ đúng luyện tập
              </span>
              <span className="text-xl sm:text-2xl font-black text-sky-700">
                {avgPracticeAccuracy !== null ? `${avgPracticeAccuracy}%` : 'Mới bắt đầu'}
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-white/95 border-2 border-orange-200 p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 border border-orange-300 flex items-center justify-center text-2xl shrink-0">
              🔥
            </div>
            <div>
              <span className="text-[11px] font-black uppercase text-slate-500 block">
                Chuỗi ngày học
              </span>
              <span className="text-xl sm:text-2xl font-black text-orange-600">
                {streakDays} <span className="text-xs font-bold text-slate-500">ngày liên tiếp</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SPOTLIGHT: BÉ ĐANG HỌC BÀI NÀO? ("ĐANG HỌC GÌ") ── */}
      {nextUnlockedLesson && (
        <div className="rounded-[28px] border-3 border-sky-300 bg-gradient-to-r from-sky-50 via-white to-indigo-50 p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-sky-600 text-white text-xs font-black uppercase tracking-wide flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  {nextUnlockedLesson.status === 'in_progress'
                    ? 'Bài bé đang học dở'
                    : 'Bài học tiếp theo của bé'}
                </span>
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black">
                  {nextUnlockedLesson.unitIcon} Unit {nextUnlockedLesson.unitNumber}:{' '}
                  {nextUnlockedLesson.unitTitle}
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                Lesson {nextUnlockedLesson.lessonNumber}: {nextUnlockedLesson.title}
                {nextUnlockedLesson.vietnameseTitle
                  ? ` (${nextUnlockedLesson.vietnameseTitle})`
                  : ''}
              </h3>

              {/* 3-Stage Progress Pills for Current Lesson */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border-2 ${
                    nextUnlockedLesson.stage1Completed
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <span>🔍 Chặng 1: Khám phá</span>
                  <span>{nextUnlockedLesson.stage1Completed ? '✓ Đã xong' : '• Đang chờ'}</span>
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border-2 ${
                    nextUnlockedLesson.stage2Completed
                      ? 'bg-sky-100 border-sky-300 text-sky-900'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <span>📖 Chặng 2: Luyện tập</span>
                  <span>
                    {nextUnlockedLesson.stage2Completed
                      ? `✓ ${
                          nextUnlockedLesson.stage2Score !== null
                            ? `${nextUnlockedLesson.stage2Score}% đúng`
                            : 'Đã xong'
                        }`
                      : '• Đang chờ'}
                  </span>
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border-2 ${
                    nextUnlockedLesson.stage3Completed
                      ? 'bg-purple-100 border-purple-300 text-purple-900'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <span>🎮 Chặng 3: Vui chơi</span>
                  <span>
                    {nextUnlockedLesson.stage3Completed
                      ? '✓ Đã hoàn thành'
                      : `• ${nextUnlockedLesson.stage3Games.length}/2 Minigame`}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  sfx.playPop();
                  navigate(`/lessons/${nextUnlockedLesson._id}`);
                }}
                className="btn-3d-amber px-6 py-3.5 rounded-2xl text-sm sm:text-base font-black text-amber-950 flex items-center gap-2 shadow-md cursor-pointer active:scale-95"
              >
                <Play className="w-5 h-5 fill-amber-950" />
                <span>
                  {nextUnlockedLesson.status === 'in_progress'
                    ? 'Học tiếp ngay!'
                    : 'Bắt đầu học!'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3 SUB-TABS SWITCHER ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border-2 border-amber-200/80 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              setSubTab('lessons');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 cursor-pointer transition-all ${
              subTab === 'lessons'
                ? 'bg-amber-400 text-amber-950 shadow-xs'
                : 'text-slate-600 hover:bg-amber-50'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Kết quả từng Bài học ({enrichedLessons.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              setSubTab('timeline');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 cursor-pointer transition-all ${
              subTab === 'timeline'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-sky-50'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Nhật ký hoạt động gần đây ({recentEvents.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              setSubTab('assignments');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 cursor-pointer transition-all ${
              subTab === 'assignments'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-purple-50'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Bài tập cô giao ({assignments.length})</span>
            {assignments.some((a) => !a.isCompleted) && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px]">
                {assignments.filter((a) => !a.isCompleted).length} mới
              </span>
            )}
          </button>
        </div>

        {/* Unit Filter Dropdown when viewing Lessons */}
        {subTab === 'lessons' && (
          <div className="flex items-center gap-2">
            <select
              value={selectedUnitFilter}
              onChange={(e) => setSelectedUnitFilter(e.target.value)}
              className="rounded-xl border-2 border-amber-200 bg-amber-50/60 px-3 py-2 text-xs sm:text-sm font-black text-slate-800 outline-none"
            >
              <option value="all">Tất cả {units.length} Unit</option>
              {units.map((u, idx) => (
                <option key={u._id || idx} value={String(u._id)}>
                  Unit {u.unitNumber || idx + 1}: {u.topicName || u.storyTitle}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── SUB-TAB 1: KẾT QUẢ TỪNG BÀI HỌC (LESSON PROGRESS & RESULTS) ── */}
      {subTab === 'lessons' && (
        <div className="space-y-4">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'all', label: `📋 Tất cả (${enrichedLessons.length})` },
              {
                id: 'completed',
                label: `✅ Đã hoàn thành (${
                  enrichedLessons.filter((l) => l.status === 'completed').length
                })`,
              },
              {
                id: 'in_progress',
                label: `🚀 Đang học & Đã mở (${
                  enrichedLessons.filter(
                    (l) => l.status === 'in_progress' || l.status === 'unlocked'
                  ).length
                })`,
              },
              {
                id: 'needs_review',
                label: `💡 Có từ cần ôn (${
                  enrichedLessons.filter((l) => l.weakCount > 0).length
                })`,
              },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  sfx.playPop();
                  setLessonFilter(f.id as LessonFilter);
                }}
                className={`px-3.5 py-2 rounded-2xl text-xs font-black shrink-0 cursor-pointer transition-all border-2 ${
                  lessonFilter === f.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
              <p className="text-sm font-black text-slate-600">
                Đang tải nhật ký bài học của bé...
              </p>
            </div>
          ) : filteredLessons.length === 0 ? (
            <div className="rounded-3xl border-3 border-dashed border-amber-300 bg-white p-10 text-center space-y-2">
              <p className="text-lg font-black text-slate-800">
                Chưa có bài học nào trong mục lọc này
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-500">
                Bé hãy chọn &ldquo;Tất cả&rdquo; hoặc bắt đầu khám phá bài học mới nhé!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredLessons.map((lesson) => {
                const isDone = lesson.status === 'completed';
                const isInProg = lesson.status === 'in_progress';
                const isLocked = lesson.status === 'locked';

                return (
                  <div
                    key={lesson._id}
                    className={`rounded-[28px] border-3 p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all ${
                      isDone
                        ? 'bg-white border-emerald-300 shadow-sm'
                        : isInProg
                        ? 'bg-gradient-to-br from-amber-50/90 via-white to-orange-50/70 border-amber-400 shadow-md'
                        : isLocked
                        ? 'bg-slate-50/80 border-slate-200 opacity-70'
                        : 'bg-white border-amber-200 shadow-2xs'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Row: Unit badge + Stars + Timestamp */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-black">
                            {lesson.unitIcon} Unit {lesson.unitNumber} • Lesson{' '}
                            {lesson.lessonNumber}
                          </span>
                          {isDone ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Đã hoàn thành
                            </span>
                          ) : isInProg ? (
                            <span className="px-2.5 py-1 rounded-full bg-amber-200 text-amber-950 text-xs font-black">
                              🚀 Đang học dở
                            </span>
                          ) : isLocked ? (
                            <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-600 text-xs font-bold">
                              🔒 Chưa mở khóa
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-black">
                              ✨ Sẵn sàng học
                            </span>
                          )}
                        </div>

                        {/* 3-Star Stamp */}
                        <div
                          className="flex items-center gap-1 bg-amber-50 px-3 py-1 rounded-full border border-amber-200"
                          aria-label={`${lesson.stars} trên 3 sao`}
                        >
                          {[1, 2, 3].map((idx) => (
                            <Star
                              key={idx}
                              className={`w-4 h-4 ${
                                idx <= lesson.stars
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-300'
                              }`}
                            />
                          ))}
                          <span className="ml-1 text-xs font-black text-amber-900">
                            {lesson.stars}/3
                          </span>
                        </div>
                      </div>

                      {/* Title & Last Activity Time */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                            {lesson.title}
                          </h4>
                          {lesson.vietnameseTitle && (
                            <p className="text-xs sm:text-sm font-bold text-slate-500">
                              {lesson.vietnameseTitle}
                            </p>
                          )}
                        </div>
                        {lesson.lastActivityAt && (
                          <span className="text-[11px] font-bold text-slate-400 shrink-0">
                            🕒 {formatVnDateTime(lesson.lastActivityAt)}
                          </span>
                        )}
                      </div>

                      {/* 3-Stage Detailed Breakdown */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        {/* Stage 1 */}
                        <div
                          className={`rounded-2xl p-2.5 border-2 text-center ${
                            lesson.stage1Completed
                              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                              : 'bg-slate-50 border-slate-200/80 text-slate-400'
                          }`}
                        >
                          <div className="text-xs font-black">🔍 Chặng 1</div>
                          <div className="text-[11px] font-bold mt-0.5">
                            {lesson.stage1Completed ? '✓ Đã khám phá' : 'Chưa xong'}
                          </div>
                        </div>

                        {/* Stage 2 */}
                        <div
                          className={`rounded-2xl p-2.5 border-2 text-center ${
                            lesson.stage2Completed
                              ? 'bg-sky-50/80 border-sky-200 text-sky-900'
                              : 'bg-slate-50 border-slate-200/80 text-slate-400'
                          }`}
                        >
                          <div className="text-xs font-black">📖 Chặng 2</div>
                          <div className="text-[11px] font-bold mt-0.5">
                            {lesson.stage2Completed
                              ? lesson.stage2Score !== null
                                ? `✓ Đúng ${lesson.stage2Score}%`
                                : '✓ Đã luyện tập'
                              : 'Chưa xong'}
                          </div>
                        </div>

                        {/* Stage 3 */}
                        <div
                          className={`rounded-2xl p-2.5 border-2 text-center ${
                            lesson.stage3Completed
                              ? 'bg-purple-50/80 border-purple-200 text-purple-900'
                              : lesson.stage3Games.length > 0
                              ? 'bg-amber-50 border-amber-200 text-amber-900'
                              : 'bg-slate-50 border-slate-200/80 text-slate-400'
                          }`}
                        >
                          <div className="text-xs font-black">🎮 Chặng 3</div>
                          <div className="text-[11px] font-bold mt-0.5">
                            {lesson.stage3Completed
                              ? `✓ Thắng ${Math.max(2, lesson.stage3Games.length)} game`
                              : `${lesson.stage3Games.length}/2 Minigame`}
                          </div>
                        </div>
                      </div>

                      {/* Played Minigame Badges */}
                      {lesson.stage3Games.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-black text-slate-500">
                            🕹️ Game đã thắng:
                          </span>
                          {lesson.stage3Games.map((gId) => {
                            const gDef = GAME_REGISTRY[gId as GameId];
                            return (
                              <span
                                key={gId}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200 text-[11px] font-black"
                              >
                                <span>{gDef?.icon || '🎮'}</span>
                                <span>{gDef?.title || gId}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Vocabulary Words in Lesson (Interactive Audio Pills) */}
                      {lesson.vocabularyItems.length > 0 && (
                        <div className="pt-1">
                          <div className="text-[11px] font-black text-slate-500 mb-1.5 flex items-center justify-between">
                            <span>🗣️ Từ vựng trong bài (Chạm để nghe phát âm):</span>
                            {lesson.weakCount > 0 && (
                              <span className="text-rose-600 font-black">
                                💡 {lesson.weakCount} từ cần ôn thêm
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {lesson.vocabularyItems.map((word: any, wIdx: number) => {
                              const english = word?.english || word?.word || '';
                              if (!english) return null;
                              const isWeak = weakWordIds.has(String(word?._id || ''));
                              return (
                                <button
                                  key={word._id || wIdx}
                                  type="button"
                                  onClick={() => {
                                    sfx.playPop();
                                    void playWordAudio(english, word.audioUrl);
                                  }}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black border cursor-pointer transition-transform active:scale-95 ${
                                    isWeak
                                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                                      : 'bg-amber-50/70 hover:bg-amber-100 border-amber-200 text-slate-800'
                                  }`}
                                >
                                  <Volume2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span className="capitalize">{english}</span>
                                  {word.vietnamese && (
                                    <span className="text-[10px] font-bold text-slate-500">
                                      ({word.vietnamese})
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-500">
                        {isDone
                          ? '🎉 Bé đã hoàn thành xuất sắc bài này!'
                          : isInProg
                          ? '⏳ Bé đang học dở bài này'
                          : isLocked
                          ? 'Hoàn thành bài trước để mở khóa'
                          : 'Bấm để bắt đầu khám phá'}
                      </span>

                      {!isLocked && (
                        <button
                          type="button"
                          onClick={() => {
                            sfx.playPop();
                            navigate(`/lessons/${lesson._id}`);
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95 ${
                            isDone
                              ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300'
                              : 'bg-amber-400 hover:bg-amber-500 text-amber-950 shadow-xs'
                          }`}
                        >
                          {isDone ? (
                            <>
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Ôn lại bài</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>{isInProg ? 'Học tiếp' : 'Vào học'}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SUB-TAB 2: NHẬT KÝ HOẠT ĐỘNG GẦN ĐÂY (CHRONOLOGICAL TIMELINE) ── */}
      {subTab === 'timeline' && (
        <div className="rounded-[28px] border-3 border-sky-200 bg-white p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                🕒 Dòng Thời Gian Học Tập & Vui Chơi Gần Đây
              </h3>
              <p className="text-xs sm:text-sm font-bold text-slate-500">
                Ghi nhận tự động mỗi khi bé hoàn thành Khám phá (Chặng 1), Luyện tập (Chặng 2) hoặc thắng Minigame (Chặng 3).
              </p>
            </div>
          </div>

          {recentEvents.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-base font-black text-slate-700">
                Chưa có hoạt động nào được ghi nhận
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-500">
                Khi bé hoàn thành một chặng bài học hoặc chơi minigame, kết quả sẽ hiện ngay tại đây!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentEvents.map((ev: any, idx: number) => {
                const gameId = ev.gameId || ev.activity?.gameId;
                const gameDef = gameId ? GAME_REGISTRY[gameId as GameId] : null;
                const isStage1 = ev.stage === 1 || ev.activity?.activityType === 'STAGE_1';
                const isStage3 = ev.stage === 3 || ev.activity?.activityType === 'MINIGAME';
                const lessonId = String(ev.lesson?._id || ev.lesson || '');
                const lessonTitle = ev.lesson?.title || 'Bài học';

                return (
                  <div
                    key={ev._id || idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border-2 border-slate-100 hover:border-sky-200 bg-slate-50/70 p-4 transition-all"
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 border-2 ${
                          isStage3
                            ? 'bg-purple-100 border-purple-300'
                            : isStage1
                            ? 'bg-emerald-100 border-emerald-300'
                            : 'bg-sky-100 border-sky-300'
                        }`}
                      >
                        {gameDef?.icon || (isStage3 ? '🎮' : isStage1 ? '🔍' : '📖')}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm sm:text-base text-slate-900">
                            {gameDef
                              ? `Minigame: ${gameDef.title}`
                              : ev.activity?.title || 'Hoạt động bài học'}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-black">
                            {lessonTitle}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-xs font-bold text-slate-600 flex-wrap">
                          <span>📅 {formatVnDateTime(ev.createdAt)}</span>
                          {typeof ev.score === 'number' && !isStage1 && (
                            <span className="text-emerald-700 font-black">
                              🎯 Độ đúng: {Math.round(ev.score)}%
                            </span>
                          )}
                          {(ev.correctCount > 0 || ev.incorrectCount > 0) && (
                            <span>
                              ✓ {ev.correctCount || 0} câu đúng
                              {ev.incorrectCount ? ` • ${ev.incorrectCount} lần thử lại` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {lessonId && (
                      <button
                        type="button"
                        onClick={() => {
                          sfx.playPop();
                          navigate(
                            gameId
                              ? `/lessons/${lessonId}?game=${gameId}`
                              : `/lessons/${lessonId}`
                          );
                        }}
                        className="self-end sm:self-center px-3.5 py-2 rounded-xl bg-white hover:bg-sky-50 border-2 border-slate-200 text-xs font-black text-sky-800 cursor-pointer shrink-0"
                      >
                        Mở lại bài →
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SUB-TAB 3: BÀI TẬP CÔ GIÁO GIAO & NHẬN XÉT ── */}
      {subTab === 'assignments' && (
        <div className="rounded-[28px] border-3 border-purple-200 bg-white p-5 sm:p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-lg sm:text-xl font-black text-slate-900">
              📝 Bài Tập Cô Giáo Giao & Lời Khen
            </h3>
            <p className="text-xs sm:text-sm font-bold text-slate-500">
              Các bài học và Minigame cô giáo giao riêng cho lớp hoặc cho bé kèm nhận xét chấm bài.
            </p>
          </div>

          {assignments.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-base font-black text-slate-700">
                Hiện tại cô giáo chưa giao bài tập mới
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-500">
                Bé có thể tự do học tiếp trên Hành trình hoặc ôn tập từ vựng nhé!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {assignments.map((a: any) => {
                const mgDef = a.minigameId ? GAME_REGISTRY[a.minigameId as GameId] : null;
                const lessonId = String(a.lesson?._id || a.lesson || '');
                const feedback = a.result?.teacherFeedback;

                return (
                  <div
                    key={a._id}
                    className={`rounded-3xl border-3 p-4 sm:p-5 flex flex-col justify-between gap-3 ${
                      a.isCompleted
                        ? 'bg-emerald-50/40 border-emerald-300'
                        : 'bg-purple-50/40 border-purple-300'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black ${
                            a.isCompleted
                              ? 'bg-emerald-500 text-white'
                              : 'bg-amber-400 text-amber-950'
                          }`}
                        >
                          {a.isCompleted ? '✓ Bé đã hoàn thành' : '📌 Cần làm'}
                        </span>

                        {a.dueDate && (
                          <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> Hạn:{' '}
                            {new Date(a.dueDate).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>

                      <h4 className="text-lg font-black text-slate-900">
                        {mgDef
                          ? `${mgDef.icon} Minigame: ${mgDef.title} — ${a.lesson?.title || ''}`
                          : a.activity?.title || a.lesson?.title || 'Bài tập về nhà'}
                      </h4>

                      {a.instructions && (
                        <p className="text-xs sm:text-sm font-bold text-slate-700 bg-white/80 rounded-xl p-2.5 border border-slate-200">
                          💬 Lời cô dặn: &ldquo;{a.instructions}&rdquo;
                        </p>
                      )}

                      {feedback?.comment && (
                        <div className="rounded-2xl bg-amber-100/90 border-2 border-amber-300 p-3 space-y-1">
                          <div className="text-xs font-black text-amber-950 flex items-center justify-between">
                            <span>🏅 Nhận xét của cô giáo:</span>
                            {feedback.bonusStars > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-300 text-amber-950">
                                +{feedback.bonusStars} ⭐ Sao thưởng
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-slate-800">
                            &ldquo;{feedback.comment}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">
                        {a.result?.score !== undefined
                          ? `Điểm đạt được: ${a.result.score}%`
                          : 'Bấm để mở bài học'}
                      </span>

                      {lessonId && (
                        <button
                          type="button"
                          onClick={() => {
                            sfx.playPop();
                            navigate(
                              a.minigameId
                                ? `/lessons/${lessonId}?game=${a.minigameId}`
                                : `/lessons/${lessonId}`
                            );
                          }}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>{a.isCompleted ? 'Làm lại' : 'Làm bài ngay'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

