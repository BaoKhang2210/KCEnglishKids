import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { lessonsApi, stageProgressApi } from '../../services/api';
import type { Lesson } from '../../types';
import { sfx } from '../../utils/audio';
import { ExploreSceneStage } from '../../components/child/lesson/ExploreSceneStage';
import { Stage2PracticeFlow } from '../../components/child/lesson/Stage2PracticeFlow';
import { ScreenShell } from '../../components/layout/ScreenShell';
import { ParentInfoDrawer } from '../../components/child/lesson/ParentInfoDrawer';
import { Stage3ArcadeHub } from '../../components/child/lesson/Stage3ArcadeHub';
import { LockedStageDialog } from '../../components/child/lesson/LockedStageDialog';

export const LessonDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<1 | 2 | 3>(1);
  const [lockedStage, setLockedStage] = useState<1 | 2 | 3 | null>(null);
  const lockedStageTriggerRef = useRef<HTMLElement | null>(null);
  const stageButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [showParentDrawer, setShowParentDrawer] = useState(false);

  const childId = user?._id || user?.id || 'child_guest';

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchLesson = async () => {
      try {
        if (!id) return;
        const res = await lessonsApi.getLessonById(id);
        if (res.success) {
          setLesson(res.data);

          try {
            const progRes = await stageProgressApi.getLessonProgress(childId, id);
            if (progRes.success && progRes.data) {
              if (progRes.data.stage1Completed) {
                localStorage.setItem(`kc_stage1_${childId}_${id}`, 'true');
              } else {
                localStorage.removeItem(`kc_stage1_${childId}_${id}`);
              }
              if (progRes.data.stage2Completed) {
                localStorage.setItem(`kc_stage2_${childId}_${id}`, 'true');
              } else {
                localStorage.removeItem(`kc_stage2_${childId}_${id}`);
              }
            }
          } catch {
            /* offline fallback */
          }

          const savedStage1 = localStorage.getItem(`kc_stage1_${childId}_${id}`) === 'true';
          const savedStage2 = localStorage.getItem(`kc_stage2_${childId}_${id}`) === 'true';

          const savedActive = localStorage.getItem(`kc_stage_active_${childId}_${id}`);
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
        console.error('Failed to load lesson:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [id, user, navigate, childId]);

  const activities = (lesson as any)?.activities || [];
  const completedCount = activities.filter((a: any) => a.completed).length;
  const isAllCompleted = activities.length > 0 && activities.every((a: any) => a.completed);

  const isMamAge = (user?.ageGroupCode || '3-4') === '3-4';
  const MAM_GAME_TYPES = new Set(['LISTEN_CHOOSE', 'COLOR_RECOGNITION', 'TAP_PICTURE', 'BUBBLE_POP', 'ANIMAL_SOUND']);
  const CHOI_LA_GAME_TYPES = new Set([
    'IMAGE_WORD_MATCH', 'COUNT_OBJECTS', 'MISSING_OBJECT', 'MEMORY_CARD',
    'STAR_CATCHER', 'FEED_ANIMAL', 'TRUE_FALSE', 'DRAG_DROP',
    'FIND_OBJECT', 'CLASSIFICATION', 'LISTEN_REPEAT', 'MATCHING', 'MEMORY'
  ]);
  const allowedGameTypes = isMamAge ? MAM_GAME_TYPES : CHOI_LA_GAME_TYPES;

  const ageGroupCode = user?.ageGroupCode || (lesson as any)?.ageGroupCode || '3-4';
  const hasVisualVocabulary = (lesson?.vocabularyItems || []).some(vocab => Boolean(vocab.imageUrl));
  const finalGames = activities.filter((activity: any) => {
    const type = String(activity.activityType || '').toUpperCase();
    const titleAndType = `${activity.title || ''} ${activity.vietnameseTitle || ''}`.toLowerCase();
    const isTextOnlyGame =
      titleAndType.includes('match the words') ||
      titleAndType.includes('spelling') ||
      (type === 'DRAG_DROP' && /\b(word|spell|chữ|từ)\b/.test(titleAndType));

    // These text-only types do not exist in the current Activity enum/game runtime.
    if (['DRAG_DROP_WORD', 'SPELL_PUZZLE'].includes(type)) return false;
    if ((ageGroupCode === '3-4' || ageGroupCode === '4-5') && isTextOnlyGame) return false;
    if (type === 'IMAGE_WORD_MATCH' && ageGroupCode !== '5-6') return false;
    if (type === 'IMAGE_WORD_MATCH' && ageGroupCode === '5-6' && !hasVisualVocabulary) return false;
    if (type === 'DRAG_DROP' && ageGroupCode === '5-6' && !hasVisualVocabulary) return false;
    return true;
  }).sort(
    (a: any, b: any) =>
      Number(allowedGameTypes.has(b.activityType)) - Number(allowedGameTypes.has(a.activityType))
  );

  const isStage1Completed =
    localStorage.getItem(`kc_stage1_${childId}_${id}`) === 'true';

  const isStage2Completed =
    localStorage.getItem(`kc_stage2_${childId}_${id}`) === 'true';

  const isStage3Completed =
    finalGames.length > 0 && finalGames.every((a: any) => a.completed);

  const completedGamesCount = finalGames.filter((a: any) => a.completed).length;
  const resumeGame = finalGames.find((a: any) => !a.completed) || finalGames[0];

  const handleStartActivity = (activityId: string) => {
    sfx.playPop();
    navigate(`/activities/${activityId}`);
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
    setLockedStage(null);
    setActiveStage(stage);
    localStorage.setItem(`kc_stage_active_${childId}_${id}`, stage.toString());
  };

  const handleCompleteStage1 = () => {
    sfx.playSuccess();
    localStorage.setItem(`kc_stage1_${childId}_${id}`, 'true');
    setActiveStage(2);
    localStorage.setItem(`kc_stage_active_${childId}_${id}`, '2');
    stageProgressApi
      .completeStage(childId, id!, { stage: 1 })
      .catch(err => console.warn('Stage 1 sync failed — kept offline:', err));
  };

  const handleCompleteStage2 = (stats?: { score: number; stars: number }) => {
    sfx.playSuccess();
    localStorage.setItem(`kc_stage2_${childId}_${id}`, 'true');
    setActiveStage(3);
    localStorage.setItem(`kc_stage_active_${childId}_${id}`, '3');
    stageProgressApi
      .completeStage(childId, id!, {
        stage: 2,
        score: Math.max(0, Math.round(stats?.score || 0)),
        stars: Math.min(3, Math.max(0, Math.round(stats?.stars || 0)))
      })
      .catch(err => console.warn('Stage 2 sync failed — kept offline:', err));
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
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-indigo-100 hover:bg-indigo-200 border-2 border-indigo-300 flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 transition-all shrink-0 text-base"
        >
          👨‍👩‍👧
        </button>
      </div>
    </div>
  );

  return (
    <>
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
            <p className="font-black text-slate-600 text-base">Không tìm thấy Lesson.</p>
          </div>
        </div>
      ) : (
        <div className="w-full h-full min-h-0 flex flex-col gap-2 overflow-hidden">
          {/* ACTIVE STAGE CONTENT — fills all space */}
          <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col">
            {/* STAGE 1: KHÁM PHÁ */}
            {activeStage === 1 && (
              <ExploreSceneStage
                vocabulary={lesson.vocabularyItems || []}
                bigQuestion={(lesson as any)?.bigQuestion || `What do we do in ${lesson.title}?`}
                storyTitle={lesson.title}
                onComplete={handleCompleteStage1}
              />
            )}

            {/* STAGE 2: HỌC & NÓI / LUYỆN TẬP 3 VÒNG */}
            {activeStage === 2 && (
              <div className="w-full h-full min-h-0 flex flex-col overflow-hidden">
                <Stage2PracticeFlow
                  vocabulary={lesson.vocabularyItems || []}
                  lessonId={id || ''}
                  stage2Completed={isStage2Completed}
                  ageGroup={user?.ageGroupCode}
                  onComplete={handleCompleteStage2}
                  onParentOpen={() => setShowParentDrawer(true)}
                />
              </div>
            )}

            {/* STAGE 3: VUI CHƠI */}
            {activeStage === 3 && (
              <Stage3ArcadeHub
                games={finalGames}
                resumeGame={resumeGame}
                completedCount={completedGamesCount}
                isCompleted={isStage3Completed}
                onStart={handleStartActivity}
                onBackToStage2={() => handleSelectStage(2)}
                onHome={() => navigate('/')}
              />
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
      games={finalGames}
    />
    {lockedStage !== null && (
      <LockedStageDialog
        currentStage={isStage1Completed ? (isStage2Completed ? 3 : 2) : 1}
        onContinue={() => {
          const target = isStage1Completed ? (isStage2Completed ? 3 : 2) : 1;
          closeLockedStage();
          setActiveStage(target);
          localStorage.setItem(`kc_stage_active_${childId}_${id}`, target.toString());
        }}
        onClose={closeLockedStage}
      />
    )}
    </>
  );
};
