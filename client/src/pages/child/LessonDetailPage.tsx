import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Droplets, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRewards } from '../../context/RewardContext';
import { lessonsApi, stageProgressApi, topicsApi, vocabReviewApi } from '../../services/api';
import type { Lesson, Vocabulary } from '../../types';
import { sfx, stopWordAudio } from '../../utils/audio';
import { ExploreSceneStage } from '../../components/child/lesson/ExploreSceneStage';
import { Stage2PracticeFlow } from '../../components/child/lesson/Stage2PracticeFlow';
import type { Stage2EvidenceAnswer, Stage2ServerReport } from '../../components/child/lesson/stage2ReportTypes';
import { ScreenShell } from '../../components/layout/ScreenShell';
import { ParentInfoDrawer } from '../../components/child/lesson/ParentInfoDrawer';
import { GamesTab, REQUIRED_GAMES_TO_COMPLETE } from '../../games/hub/GamesTab';
import { GameRunner } from '../../games/core/GameRunner';
import type { GameId } from '../../games/core/types';
import { learningOutbox } from '../../services/learningOutbox';
import { getAvailableLessonGames } from '../../games/registry';
import { LockedStageDialog } from '../../components/child/lesson/LockedStageDialog';

const childIdFor = (user: any) => user?._id || user?.id || 'child_guest';
const friendlySyncError = (message: string) => {
  if (message.includes('Complete earlier lessons first')) return 'Bé cần hoàn thành bài học trước trong hành trình rồi mới lưu được chặng này.';
  if (message.includes('Complete previous stages first')) return 'Hãy hoàn thành chặng trước rồi thử đồng bộ lại nhé.';
  if (message.includes('Kế hoạch luyện tập hết hạn') || message.includes('Kế hoạch không khớp')) return 'Kế hoạch luyện tập đã thay đổi. Hãy mở lại bài khi có mạng và chơi lại chặng này.';
  if (message.includes('Game targets do not match')) return 'Minigame đã thay đổi nên kết quả cũ chưa thể ghi nhận. Hãy mở lại bài khi có mạng và chơi lại minigame.';
  return 'Máy chủ chưa nhận được kết quả này. Hãy kết nối mạng, mở lại bài và thử đồng bộ.';
};
const cache = {
  getItem(key: string) { try { return localStorage.getItem(key); } catch { return null; } },
  setItem(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* UI cache only */ } },
  removeItem(key: string) { try { localStorage.removeItem(key); } catch { /* UI cache only */ } },
};

export const LessonDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { refresh: refreshRewards } = useRewards();
  const navigate = useNavigate();

  const [plan,setPlan] = useState<any>(null);
  const [lessonProgress, setLessonProgress] = useState<any>(null);
  const [loadError,setLoadError] = useState('');
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncNotice, setSyncNotice] = useState('');
  const [, refresh] = useState(0);
  const activeScope = useRef('');
  activeScope.current = childIdFor(user) + ':' + id;
  const [activeStage, setActiveStage] = useState<1 | 2 | 3>(1);
  const [lockedStage, setLockedStage] = useState<1 | 2 | 3 | null>(null);
  const lockedStageTriggerRef = useRef<HTMLElement | null>(null);
  const stageButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [showParentDrawer, setShowParentDrawer] = useState(false);
  const [warmupDue, setWarmupDue] = useState(0);
  const [warmupDismissed, setWarmupDismissed] = useState(false);

  const childId = user?._id || user?.id || 'child_guest';

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    let cancelled = false;
    setLoading(true); setLesson(null); setPlan(null); setLessonProgress(null); setLoadError('');setCompletedGames([]);
    setWarmupDue(0); setWarmupDismissed(false);
    const fetchLesson = async () => {
      try {
        if (!id) return;
        await learningOutbox.flush(childId);
        const res = await lessonsApi.getLessonById(id);
        if (cancelled) return;
        if (res.success) {
          if(user.role==='CHILD'){
            try {
              const response = await stageProgressApi.getPlan(childId, id);
              const saved = response?.data;
              if(cancelled)return;
              if (saved) setPlan(saved);
            } catch (err) {
              if (import.meta.env.DEV) console.warn('[ProgressService] Error fetching plan:', err);
            }
          }
          setLesson(res.data);

          try {
            const progRes = await stageProgressApi.getLessonProgress(childId, id);
            if (cancelled) return;
            setLessonProgress(progRes.data || null);
            const hasPending = learningOutbox.pending(childId).some(row => row.lessonId === id);
            if (hasPending) setCompletedGames(JSON.parse(cache.getItem(`kc_stage3_games_${childId}_${id}`) || '[]'));
            if (!hasPending && !progRes.data) {
              for (const stage of [1,2,3]) cache.removeItem(`kc_stage${stage}_${childId}_${id}`);
              cache.removeItem(`kc_stage3_games_${childId}_${id}`);
            }
            if (progRes.success && progRes.data && !hasPending) {
              setCompletedGames(progRes.data.stage3Games || []);
              if (progRes.data.stage1Completed) {
                cache.setItem(`kc_stage1_${childId}_${id}`, 'true');
              } else {
                cache.removeItem(`kc_stage1_${childId}_${id}`);
              }
              if (progRes.data.stage2Completed) {
                cache.setItem(`kc_stage2_${childId}_${id}`, 'true');
              } else {
                cache.removeItem(`kc_stage2_${childId}_${id}`);
              }
              if (progRes.data.stage3Completed) {
                cache.setItem(`kc_stage3_${childId}_${id}`, 'true');
              } else cache.removeItem(`kc_stage3_${childId}_${id}`);
            }
          } catch {
            /* offline fallback */
          }

          try {
            const dueRes = await vocabReviewApi.getDue(childId, 1);
            if (!cancelled) setWarmupDue(Number(dueRes.data?.total) || 0);
          } catch {
            /* The warm-up is only a suggestion; offline keeps lesson flow intact. */
          }

          const savedStage1 = cache.getItem(`kc_stage1_${childId}_${id}`) === 'true';
          const savedStage2 = cache.getItem(`kc_stage2_${childId}_${id}`) === 'true';

          const savedActive = cache.getItem(`kc_stage_active_${childId}_${id}`);
          if (savedActive === '3' && savedStage2) {
            setActiveStage(3);
          } else if (savedActive === '2' && savedStage1) {
            setActiveStage(2);
          } else if (savedStage2) {
            setActiveStage(3);
          } else if (savedStage1) {
            setActiveStage(2);
          } else {
            setActiveStage(1);
          }
        }
      } catch (err) {
        if(!cancelled)setLoadError((err as Error).message || 'Chưa mở được bài. Hãy kiểm tra mạng.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchLesson();
    return () => { cancelled = true; };
  }, [id, user, navigate, childId]);

  const activities = (lesson as any)?.activities || [];
  const completedCount = activities.filter((a: any) => a.completed).length;
  const unitNumber = (lesson as any)?.unit?.displayOrder
    ?? (lesson as any)?.unit?.unitNumber
    ?? (lesson as any)?.curriculumUnits?.[0]?.unitNumber
    ?? (lesson as any)?.unitNumber
    ?? 1;
  const lessonNumber = (lesson as any)?.displayOrder ?? (lesson as any)?.lessonNumber ?? 1;

  // Stage 3 Minigames State
  const [activeGameId, setActiveGameId] = useState<GameId | null>(null);
  const [distractorPool, setDistractorPool] = useState<Vocabulary[]>([]);
  const [completedGames, setCompletedGames] = useState<string[]>(() => {
    try {
      const stored = cache.getItem(`kc_stage3_games_${childId}_${id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const isStage1Completed =
    cache.getItem(`kc_stage1_${childId}_${id}`) === 'true';

  const isStage2Completed =
    cache.getItem(`kc_stage2_${childId}_${id}`) === 'true';

  const isStage3Completed =
    completedGames.length >= REQUIRED_GAMES_TO_COMPLETE ||
    cache.getItem(`kc_stage3_${childId}_${id}`) === 'true';

  const persistStage = async (payload: Record<string, unknown>) => {
    if (!id) return false;
    if(user?.role!=='CHILD')return true;
    const scope = childId + ':' + id;
    try {
      const saved = await learningOutbox.enqueue(childId, id, payload);
      if (activeScope.current !== scope) return false;
      const stagePending = learningOutbox.pending(childId).some(row => row.lessonId === id);
      if (saved.offline || stagePending) {
        setSyncNotice('Kết quả đang chờ đồng bộ. Kết nối mạng để ghi nhận sao và mở chặng tiếp theo.');
        return false;
      }
      // Successful progress is already reflected by the lesson UI. Avoid a
      // persistent success banner over the learning activity.
      setSyncNotice('');
      void refreshRewards();
      return true;
    } catch (error: any) {
      if (activeScope.current === scope) setSyncNotice(error.message || 'Chưa lưu được kết quả. Hãy kiểm tra bộ nhớ và thử lại.');
      return false;
    }
  };
  useEffect(() => {
    const status = () => {
      const pending = learningOutbox.pending(childId);
      const rejected = learningOutbox.rejected(childId);
      setSyncNotice(!pending.length ? '' : rejected
        ? friendlySyncError(rejected)
        : 'Kết quả đang chờ đồng bộ. Kết nối mạng để ghi nhận sao và mở chặng tiếp theo.');
      if (!pending.length && id) {
        const scope = childId + ':' + id;
        void stageProgressApi.getLessonProgress(childId, id).then((response) => {
          if (activeScope.current !== scope || !response?.data) return;
          const progress = response.data;
          setLessonProgress(progress);
          setCompletedGames(progress.stage3Games || []);
          for (const [stage, completed] of [[1, progress.stage1Completed], [2, progress.stage2Completed], [3, progress.stage3Completed]] as const) {
            const key = `kc_stage${stage}_${childId}_${id}`;
            if (completed) cache.setItem(key, 'true');
            else cache.removeItem(key);
          }
        }).catch(() => {});
      }
      refresh(n => n + 1);
    };
    const retry = () => { void learningOutbox.flush(childId); };
    window.addEventListener('online', retry); window.addEventListener('kc_learning_sync', status); status();
    return () => { window.removeEventListener('online', retry); window.removeEventListener('kc_learning_sync', status); };
  }, [childId, id]);
  const handleGameCompleted = async (gameId: string, _stars: number, answers: Array<{wordId: string; selectedId: string | null}>) => {
    try {
      const saved = await persistStage({stage: 3, gameId, answers,attemptToken:plan?.games.find((game:any)=>game.id===gameId)?.attemptToken});
      if (!saved) return;
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[ProgressService] Error persisting stage 3 game:', e);
      return;
    }
    const nextCompleted = Array.from(new Set([...completedGames, gameId]));
    setCompletedGames(nextCompleted);
    cache.setItem(`kc_stage3_games_${childId}_${id}`, JSON.stringify(nextCompleted));
    if (nextCompleted.length >= REQUIRED_GAMES_TO_COMPLETE) cache.setItem(`kc_stage3_${childId}_${id}`, 'true');
  };

  useEffect(() => {
    const topicId = typeof lesson?.topic === 'object' ? (lesson.topic as any)?._id : lesson?.topic;
    if (!topicId || !id) return;
    let cancelled = false;
    const activeChildId = user?.role === 'CHILD' ? childId : undefined;
    topicsApi
      .getLessonsByTopic(String(topicId), user?.ageGroupCode, activeChildId)
      .then((res: any) => {
        if (cancelled || !res?.success) return;
        const pool: Vocabulary[] = [];
        (res.data || []).forEach((other: any) => {
          if (String(other._id) === String(id)) return;
          (other.vocabularyItems || []).forEach((v: Vocabulary) => pool.push(v));
        });
        setDistractorPool(pool);
      })
      .catch(() => setDistractorPool([]));
    return () => {
      cancelled = true;
    };
  }, [lesson, id, user?.ageGroupCode, user?.role, childId]);

  const handleStartGame = async (gameId: string) => {
    let activePlan = plan;
    if (!activePlan?.games?.some((game: any) => game.id === gameId && game.attemptToken && game.targetOrder?.length)) {
      try {
        const response = await stageProgressApi.getPlan(childId, id || '');
        activePlan = response?.data;
        if (activePlan) setPlan(activePlan);
      } catch {
        activePlan = null;
      }
    }
    if (!activePlan?.games?.some((game: any) => game.id === gameId && game.attemptToken && game.targetOrder?.length)) {
      setSyncNotice('Chưa tải được kế hoạch minigame. Hãy kết nối mạng rồi thử mở lại trò chơi để kết quả được ghi nhận.');
      return;
    }
    sfx.playPop();
    setActiveGameId(gameId as GameId);
  };

  const closeLockedStage = () => {
    setLockedStage(null);
    window.setTimeout(() => lockedStageTriggerRef.current?.focus(), 0);
  };

  const handleSelectStage = (stage: 1 | 2 | 3) => {
    if (stage >= 2 && !isStage1Completed) {
      lockedStageTriggerRef.current = stageButtonRefs.current[stage - 1];
      setLockedStage(stage);
      return;
    }
    if (stage >= 3 && !isStage2Completed) {
      lockedStageTriggerRef.current = stageButtonRefs.current[stage - 1];
      setLockedStage(stage);
      return;
    }
    sfx.playPop();
    stopWordAudio();
    setActiveGameId(null);
    setLockedStage(null);
    setActiveStage(stage);
    cache.setItem(`kc_stage_active_${childId}_${id}`, stage.toString());
  };

  const handleCompleteStage1 = async () => {
    try {
      const saved = await persistStage({stage: 1, visitedWordIds: (lesson?.vocabularyItems || []).map(word => word._id)});
      if (!saved) return;
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[ProgressService] Error persisting stage 1:', e);
      return;
    }
    sfx.playSuccess();
    cache.setItem(`kc_stage1_${childId}_${id}`, 'true');
    setActiveStage(2);
  };
  const handleCompleteStage2 = async (stats?: { answers: Stage2EvidenceAnswer[]; submissionId?: string }): Promise<Stage2ServerReport | null> => {
    if (isStage2Completed && !stats?.answers.length) {
      stopWordAudio();
      setActiveStage(3);
      return lessonProgress?.stage2Report || null;
    }
    if (stats?.answers.length) {
      try {
        const saved = await persistStage({stage: 2, answers: stats.answers, attemptToken:plan?.stage2Token, submissionId: stats.submissionId});
        if (!saved) return null;
        const progressResponse = await stageProgressApi.getLessonProgress(childId, id || '');
        const confirmedProgress = progressResponse.data;
        if (!confirmedProgress?.stage2Completed) return null;
        setLessonProgress(confirmedProgress);
        cache.setItem(`kc_stage2_${childId}_${id}`, 'true');
        sfx.playSuccess();
        return confirmedProgress.stage2Report || null;
      } catch (e) {
        if (import.meta.env.DEV) console.warn('[ProgressService] Error persisting stage 2:', e);
        return null;
      }
    }
    return null;
  };

  const topicIcon = (lesson as any)?.topic?.icon || '🌟';

  // Stage metadata with clear text names for children
  const stageInfo: Record<number, { active: string; icon: string; name: string }> = {
    1: { active: 'bg-emerald-500 ring-emerald-300', icon: '🔍', name: 'Khám phá' },
    2: { active: 'bg-sky-500 ring-sky-300', icon: '📖', name: 'Luyện tập' },
    3: { active: 'bg-purple-500 ring-purple-300', icon: '🎮', name: 'Vui chơi' },
  };

  const stageCompletedMap = [isStage1Completed, isStage2Completed, isStage3Completed];
  const stageLockedMap = [
    false,
    !isStage1Completed,
    !isStage2Completed,
  ];

  // Centered 3-Stage Navigation Bar with clear text labels
  const titleBarElement = (
    <div className="w-full flex items-center justify-between gap-2 bg-white/95 backdrop-blur-md px-2.5 sm:px-4 py-1.5 rounded-2xl border-2 border-amber-200/80 shadow-2xs">
      {/* LEFT: Back button + Lesson title */}
      <div className="flex items-center gap-2 min-w-0 max-w-[150px] sm:max-w-[200px] md:max-w-[240px]">
        <button
          onClick={() => { sfx.playPop(); navigate(-1); }}
          aria-label="Quay lại"
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-50 hover:bg-amber-100 border-2 border-slate-200 flex items-center justify-center text-slate-700 cursor-pointer shadow-2xs active:scale-95 transition-all shrink-0"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <span className="text-lg sm:text-xl shrink-0 hidden xs:inline">{topicIcon}</span>
        <div className="min-w-0 truncate">
          <h1 className="text-xs sm:text-sm font-black text-slate-800 truncate leading-tight">
            {lesson?.title || 'Lesson'}
          </h1>
          <p className="truncate text-[10px] font-bold leading-tight text-indigo-700 sm:text-xs" aria-label={`Đang học Unit ${unitNumber}, Lesson ${lessonNumber}`}>
            Unit {unitNumber} · Lesson {lessonNumber}
          </p>
        </div>
      </div>

      {/* CENTER: 3 Stages with large, readable labels */}
      <div className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-1 max-w-xl">
        {[1, 2, 3].map((stage) => {
          const done = stageCompletedMap[stage - 1];
          const locked = stageLockedMap[stage - 1];
          const isActive = activeStage === stage;
          const info = stageInfo[stage];

          return (
            <button
              key={stage}
              ref={(element) => { stageButtonRefs.current[stage - 1] = element; }}
              onClick={() => handleSelectStage(stage as 1 | 2 | 3)}
              aria-label={`Chặng ${stage}: ${info.name}${done ? ' — Đã xong' : locked ? ' — Đang khóa' : isActive ? ' — Đang học' : ''}`}
              title={`Chặng ${stage}: ${info.name}`}
              className={`
                min-w-0 h-14 px-1 sm:px-3 rounded-xl flex flex-1 sm:flex-none flex-col sm:flex-row items-center justify-center gap-0 sm:gap-1.5
                cursor-pointer transition-all active:scale-95 border-2 relative select-none
                ${isActive
                  ? `${info.active} border-white text-white shadow-md ring-3 animate-soft-bounce z-10 scale-105`
                  : done
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 shadow-2xs'
                  : locked
                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-65'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs'
                }
              `}
            >
                <span className="text-xl sm:text-2xl leading-none shrink-0">
                {locked ? '🔒' : info.icon}
              </span>
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left leading-tight min-w-0">
                <span className={`text-xs sm:text-sm font-black uppercase tracking-wide ${isActive ? 'text-white/90' : 'text-slate-600'}`}>
                  Chặng {stage}
                </span>
                <span className={`text-[13px] sm:text-base font-black truncate ${isActive ? 'text-white' : ''}`}>
                  {info.name}
                </span>
              </div>

              {/* Small check badge when completed */}
              {done && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white text-white flex items-center justify-center text-[9px] font-black shadow-xs">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* RIGHT: Parent button */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => { sfx.playPop(); setShowParentDrawer(true); }}
          aria-label="Thông tin phụ huynh"
          title="Góc phụ huynh"
          className="h-10 sm:h-11 min-w-10 sm:min-w-11 px-2 rounded-xl bg-indigo-100 hover:bg-indigo-200 border-2 border-indigo-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all shrink-0 text-base"
        >
          👨‍👩‍👧
          <span className="text-[11px] sm:text-xs font-black text-indigo-950 whitespace-nowrap">Phụ huynh</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
    {syncNotice && <div role="status" className="fixed right-3 top-16 z-[200] max-w-[min(24rem,calc(100vw-1.5rem))] rounded-2xl border border-amber-300 bg-amber-50/95 p-3 text-sm font-semibold text-slate-900 shadow-lg backdrop-blur-sm">{syncNotice}{learningOutbox.pending(childId).length > 0 && <button className="ml-2 inline-flex min-h-10 items-center rounded-xl bg-amber-200 px-3 font-black underline" onClick={() => void learningOutbox.retryRejected(childId)}>Đồng bộ lại</button>}</div>}
    <ScreenShell
      completedCount={completedCount}
      titleBar={titleBarElement}
    >
      {loading ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-600">Đang chuẩn bị phòng học...</p>
        </div>
      ) : !lesson ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="bg-white rounded-3xl p-8 text-center border-4 border-dashed border-amber-200 max-w-sm">
            <p className="font-black text-slate-600 text-base">{loadError || 'Không tìm thấy bài học.'}</p>
          </div>
        </div>
      ) : (
        <div className="w-full h-full min-h-0 flex flex-col gap-2 overflow-hidden">
          {user?.role === 'CHILD' && warmupDue > 0 && !warmupDismissed && !isStage1Completed && (
            <div className="flex shrink-0 items-center gap-2 rounded-2xl border-2 border-sky-200 bg-sky-50 px-2 py-1 text-slate-900">
              <Droplets className="h-5 w-5 shrink-0 text-sky-600" aria-hidden="true" />
              <p className="min-w-0 flex-1 truncate text-xs font-black sm:text-sm">Có {warmupDue} từ sắp quên. Ôn nhanh 3 từ trước khi học nhé?</p>
              <button type="button" onClick={() => navigate('/?tab=vocab&review=1')} className="min-h-9 shrink-0 rounded-xl bg-sky-700 px-2 text-xs font-black text-white">Ôn nhanh</button>
              <button type="button" onClick={() => setWarmupDismissed(true)} aria-label="Để sau" className="grid min-h-9 min-w-9 shrink-0 place-items-center rounded-xl bg-white text-slate-700"><X className="h-4 w-4" /></button>
            </div>
          )}
          {/* ACTIVE STAGE CONTENT — fills all space */}
          <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col">
            {/* STAGE 1: KHÁM PHÁ */}
            {activeStage === 1 && (
              <ExploreSceneStage key={childId + ':' + id}
                vocabulary={lesson.vocabularyItems || []}
                bigQuestion={(lesson as any)?.bigQuestion || `What do we do in ${lesson.title}?`}
                storyTitle={lesson.title}
                onComplete={handleCompleteStage1}
              />
            )}

            {/* STAGE 2: HỌC & NÓI / LUYỆN TẬP 3 VÒNG */}
            {activeStage === 2 && (
              <div className="w-full h-full min-h-0 flex flex-col overflow-hidden">
                <Stage2PracticeFlow key={childId + ':' + id}
                  vocabulary={lesson.vocabularyItems || []}
                  distractorVocabulary={distractorPool}
                  lessonId={id || ''}
                  stage2Completed={isStage2Completed}
                  ageGroup={user?.ageGroupCode}
                  stage2Report={lessonProgress?.stage2Report || null}
                  unitNumber={unitNumber}
                  lessonNumber={lessonNumber}
                  onBackToStage1={() => {
                    setActiveStage(1);
                    cache.setItem(`kc_stage_active_${childId}_${id}`, '1');
                  }}
                  onComplete={handleCompleteStage2}
                />
              </div>
            )}

            {/* STAGE 3: VUI CHƠI */}
            {activeStage === 3 && (
              <div className="relative flex flex-col flex-1 min-h-0 w-full h-full overflow-hidden">
                {activeGameId ? (
                  <GameRunner
                    allowedGameIds={plan?.games.map((game: any) => game.id)}
                    key={activeGameId}
                    config={{
                      targetOrder:plan?.games.find((game:any)=>game.id===activeGameId)?.targetOrder,
                      attemptToken:plan?.games.find((game:any)=>game.id===activeGameId)?.attemptToken,
                      unitId: (lesson as any)?.unit?._id
                        || (lesson as any)?.curriculumUnits?.[0]?._id
                        || (lesson as any)?.unitId
                        || 'u1',
                      lessonId: id || '',
                      gameId: activeGameId,
                      vocabularyList: lesson.vocabularyItems || [],
                      distractorPool,
                      ageGroup: user?.ageGroupCode || '3-4',
                      childId,
                    }}
                    unitNumber={unitNumber}
                    lessonNumber={lessonNumber}
                    onExit={() => setActiveGameId(null)}
                    onGameComplete={handleGameCompleted}
                    onNextGame={(nextId) => setActiveGameId(nextId as GameId)}
                  />
                ) : (
                  <GamesTab
                    allowedGameIds={plan?.games.map((game: any) => game.id)}
                    vocabularyList={lesson.vocabularyItems || []}
                    unitNumber={unitNumber}
                    lessonNumber={lessonNumber}
                    completedGameIds={completedGames}
                    isStage3Completed={isStage3Completed}
                    onSelectGame={handleStartGame}
                  />
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </ScreenShell>

    {/* Parent Drawer — outside ScreenShell to overlay full screen */}
    <ParentInfoDrawer
      isOpen={showParentDrawer}
      onClose={() => setShowParentDrawer(false)}
      childId={childId}
      lessonId={id}
      lessonTitle={lesson?.title}
      lessonVietnameseTitle={(lesson as any)?.vietnameseTitle}
      objectives={lesson?.learningObjectives || []}
      vocabulary={lesson?.vocabularyItems || []}
      ageGroupCode={user?.ageGroupCode}
      stage1Completed={isStage1Completed}
      stage2Completed={isStage2Completed}
      stage3Completed={isStage3Completed}
      activeStage={activeStage}
      games={getAvailableLessonGames(lesson?.vocabularyItems || [], unitNumber, lessonNumber, plan?.games.map((game: any) => game.id)).map((game) => ({
        _id: game.id,
        title: game.title,
        vietnameseTitle: game.subtitle,
        activityType: game.category,
        instructions: game.subtitle,
        completed: completedGames.includes(game.id),
      }))}
    />
    {lockedStage !== null && (
      <LockedStageDialog
        currentStage={isStage1Completed ? (isStage2Completed ? 3 : 2) : 1}
        onContinue={() => {
          const target = isStage1Completed ? (isStage2Completed ? 3 : 2) : 1;
          closeLockedStage();
          setActiveStage(target);
          cache.setItem(`kc_stage_active_${childId}_${id}`, target.toString());
        }}
        onClose={closeLockedStage}
      />
    )}
    </>
  );
};
