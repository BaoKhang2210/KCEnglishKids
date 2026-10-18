import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { lessonsApi, stageProgressApi } from '../../services/api';
import type { Lesson } from '../../types';
import { sfx } from '../../utils/audio';
import { ExploreSceneStage } from '../../components/child/lesson/ExploreSceneStage';
import { Stage2PracticeFlow } from '../../components/child/lesson/Stage2PracticeFlow';
import { UnitReviewStage } from '../../components/child/lesson/UnitReviewStage';
import { ScreenShell } from '../../components/layout/ScreenShell';
import { ParentInfoDrawer } from '../../components/child/lesson/ParentInfoDrawer';
import { Stage3ArcadeHub } from '../../components/child/lesson/Stage3ArcadeHub';

export const LessonDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<1 | 2 | 3 | 4>(1);
  const [lockNotice, setLockNotice] = useState<string | null>(null);
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
              }
              if (progRes.data.stage2Completed) {
                localStorage.setItem(`kc_stage2_${childId}_${id}`, 'true');
              }
            }
          } catch {
            /* offline fallback */
          }

          const rawActs = res.data?.activities || [];
          const hasCompletedAny = rawActs.some((a: any) => a.completed);
          const savedStage1 = localStorage.getItem(`kc_stage1_${childId}_${id}`) === 'true' || hasCompletedAny;
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
      ['DRAG_DROP_WORD', 'SPELL_PUZZLE'].includes(type) ||
      titleAndType.includes('match the words') ||
      titleAndType.includes('spelling') ||
      (type === 'DRAG_DROP' && /\b(word|spell|chữ|từ)\b/.test(titleAndType));

    if ((ageGroupCode === '3-4' || ageGroupCode === '4-5') && isTextOnlyGame) return false;
    if (type === 'IMAGE_WORD_MATCH' && ageGroupCode !== '5-6') return false;
    if (type === 'IMAGE_WORD_MATCH' && ageGroupCode === '5-6' && !hasVisualVocabulary) return false;
    return true;
  }).sort(
    (a: any, b: any) =>
      Number(allowedGameTypes.has(b.activityType)) - Number(allowedGameTypes.has(a.activityType))
  );

  const isStage1Completed =
    localStorage.getItem(`kc_stage1_${childId}_${id}`) === 'true' ||
    completedCount > 0 ||
    isAllCompleted;

  const isStage2Completed =
    localStorage.getItem(`kc_stage2_${childId}_${id}`) === 'true' ||
    isAllCompleted;

  const isStage3Completed =
    finalGames.length === 0 || finalGames.every((a: any) => a.completed);

  const isStage4Completed =
    localStorage.getItem(`kc_stage4_${childId}_${id}`) === 'true' ||
    isStage3Completed;

  const completedGamesCount = finalGames.filter((a: any) => a.completed).length;
  const resumeGame = finalGames.find((a: any) => !a.completed) || finalGames[0];

  const handleStartActivity = (activityId: string) => {
    sfx.playPop();
    navigate(`/activities/${activityId}`);
  };

  const lockNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const speakKokoReminder = (text: string) => {
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'vi-VN';
      utter.rate = 0.95;
      window.speechSynthesis.speak(utter);
    } catch {
      /* speech synthesis unavailable */
    }
  };

  const showKokoLockNotice = (message: string, spoken: string) => {
    sfx.playGentleWrong();
    setLockNotice(message);
    speakKokoReminder(spoken);
    if (lockNoticeTimer.current) clearTimeout(lockNoticeTimer.current);
    lockNoticeTimer.current = setTimeout(() => setLockNotice(null), 5000);
  };

  const handleSelectStage = (stage: 1 | 2 | 3 | 4) => {
    if (stage >= 2 && !isStage1Completed) {
      showKokoLockNotice(
        'Bé hãy khám phá ít nhất 4 hình ở Chặng 1 trước đã nhé! 🔍',
        'Bé ơi, hãy khám phá các đồ vật ở Chặng 1 trước đã nhé!'
      );
      return;
    }
    if (stage >= 3 && !isStage2Completed) {
      showKokoLockNotice(
        'Bé hoàn thành bài Luyện tập Chặng 2 thì mở được Thử thách Game nha! 🎯',
        'Bé ơi, hoàn thành bài luyện tập ở Chặng 2 đã rồi chơi game nhé!'
      );
      return;
    }
    if (stage === 4 && !isStage3Completed) {
      showKokoLockNotice(
        'Bé hãy hoàn thành các trò chơi ở Chặng 3 để mở khóa Ôn tập nhé! 🏆',
        'Bé ơi, chơi hết các mini game ở Chặng 3 để vào Chặng 4 nhé!'
      );
      return;
    }
    sfx.playPop();
    setLockNotice(null);
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

  const handleCompleteStage4 = () => {
    sfx.playSuccess();
    localStorage.setItem(`kc_stage4_${childId}_${id}`, 'true');
    navigate('/');
  };

  const topicIcon = (lesson as any)?.topic?.icon || '🌟';

  // Stage dot colors
  const stageDotColors: Record<number, { active: string; icon: string }> = {
    1: { active: 'bg-emerald-500 ring-emerald-300', icon: '🔍' },
    2: { active: 'bg-sky-500 ring-sky-300', icon: '📖' },
    3: { active: 'bg-purple-500 ring-purple-300', icon: '🎮' },
    4: { active: 'bg-amber-500 ring-amber-300', icon: '🏆' },
  };

  const stageCompletedMap = [
    isStage1Completed, isStage2Completed, isStage3Completed, isStage4Completed
  ];
  const stageLockedMap = [
    false,
    !isStage1Completed,
    !isStage2Completed,
    !isStage3Completed,
  ];

  // Compact 1-row TitleBar with stage dots + parent button
  const titleBarElement = (
    <div className="w-full flex items-center gap-2 bg-white/90 backdrop-blur-xs px-3 sm:px-4 py-1.5 rounded-2xl border-2 border-amber-200/80 shadow-2xs">
      {/* Back */}
      <button
        onClick={() => { sfx.playPop(); navigate(-1); }}
        aria-label="Quay lại"
        className="w-11 h-11 rounded-xl bg-slate-50 hover:bg-amber-100 border-2 border-slate-200 flex items-center justify-center text-slate-700 cursor-pointer shadow-2xs active:scale-95 transition-all shrink-0"
      >
        <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
      </button>

      {/* Icon + Title */}
      <span className="text-xl shrink-0">{topicIcon}</span>
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-black text-slate-800 truncate leading-tight">
          {lesson?.title || 'Lesson tiếng Anh'}
        </h1>
      </div>

      {/* 4-dot stage stepper */}
      <div className="flex items-center gap-1.5 shrink-0">
        {[1, 2, 3, 4].map((stage) => {
          const done = stageCompletedMap[stage - 1];
          const locked = stageLockedMap[stage - 1];
          const isActive = activeStage === stage;
          const colors = stageDotColors[stage];
          return (
            <button
              key={stage}
              onClick={() => handleSelectStage(stage as 1 | 2 | 3 | 4)}
              aria-label={`Chặng ${stage}${done ? ' — Đã xong' : locked ? ' — Đang khóa' : isActive ? ' — Đang học' : ''}`}
              title={`Chặng ${stage}`}
              className={`
                w-11 h-11 rounded-full flex items-center justify-center text-base font-black
                cursor-pointer transition-all active:scale-90 border-2
                ${done
                  ? 'bg-emerald-500 border-emerald-400 text-white shadow-sm'
                  : isActive
                  ? `${colors.active} border-transparent text-white shadow-md ring-4 animate-soft-bounce`
                  : locked
                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                }
              `}
            >
              {done ? '✓' : locked ? '🔒' : colors.icon}
            </button>
          );
        })}
      </div>

      {/* Lock notice toast — inline after dots */}
      {lockNotice && (
        <div className="hidden sm:flex items-center gap-1.5 bg-amber-400 text-amber-950 text-xs font-black px-3 py-1.5 rounded-xl shadow-xs shrink-0 max-w-[180px]">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{lockNotice}</span>
        </div>
      )}

      {/* Parent button */}
      <button
        onClick={() => { sfx.playPop(); setShowParentDrawer(true); }}
        aria-label="Thông tin phụ huynh"
        title="Góc phụ huynh"
        className="w-11 h-11 rounded-xl bg-indigo-100 hover:bg-indigo-200 border-2 border-indigo-300 flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 transition-all shrink-0 text-base"
      >
        👨‍👩‍👧
      </button>
    </div>
  );

  // Lock notice toast for mobile (below title bar)
  const lockToastMobile = lockNotice ? (
    <div className="sm:hidden shrink-0 flex items-center gap-1.5 bg-amber-400 text-amber-950 text-xs font-black px-3 py-1.5 rounded-xl shadow-xs mx-1">
      <Lock className="w-3.5 h-3.5 shrink-0" />
      <span>{lockNotice}</span>
    </div>
  ) : null;

  return (
    <>
    <ScreenShell
      completedCount={completedCount}
      titleBar={titleBarElement}
    >
      {loading ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-500">Đang chuẩn bị phòng học...</p>
        </div>
      ) : !lesson ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="bg-white rounded-3xl p-8 text-center border-4 border-dashed border-amber-200 max-w-sm">
            <p className="font-black text-slate-600 text-base">Không tìm thấy Lesson.</p>
          </div>
        </div>
      ) : (
        <div className="w-full h-full min-h-0 flex flex-col gap-2 overflow-hidden">
          {/* Mobile lock toast */}
          {lockToastMobile}
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

            {/* STAGE 4: ÔN TẬP */}
            {activeStage === 4 && (
              <UnitReviewStage vocabulary={lesson.vocabularyItems || []} onComplete={handleCompleteStage4} />
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
      lessonTitle={lesson?.title}
      lessonVietnameseTitle={(lesson as any)?.vietnameseTitle}
      objectives={lesson?.learningObjectives || []}
      vocabulary={lesson?.vocabularyItems || []}
      ageGroupCode={user?.ageGroupCode}
      stage1Completed={isStage1Completed}
      stage2Completed={isStage2Completed}
      stage3Completed={isStage3Completed}
      stage4Completed={isStage4Completed}
      activeStage={activeStage}
      games={finalGames}
    />
    </>
  );
};
