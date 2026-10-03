import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Sparkles,
  CheckCircle2,
  Star,
  Gamepad2,
  Lock,
  Pencil,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { lessonsApi } from '../../services/api';
import type { Lesson } from '../../types';
import { ChildHeader } from '../../components/child/ChildHeader';
import { ChildBottomNav } from '../../components/child/ChildBottomNav';
import { BigInteractiveFlashcard } from '../../components/child/BigInteractiveFlashcard';
import { InteractivePracticeStudio } from '../../components/child/InteractivePracticeStudio';
import { KokoMascot } from '../../components/child/KokoMascot';
import { sfx } from '../../utils/audio';

const GAME_TYPES = new Set([
  'COLOR_RECOGNITION',
  'IMAGE_WORD_MATCH',
  'COUNT_OBJECTS',
  'MISSING_OBJECT',
  'MEMORY_CARD',
  'DRAG_DROP_WORD',
  'SPELL_PUZZLE'
]);

export const LessonDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<1 | 2 | 3>(1);
  const [lockNotice, setLockNotice] = useState<string | null>(null);

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

          // Restore or calculate initial active stage
          const rawActs = res.data?.activities || [];
          const hasCompletedAny = rawActs.some((a: any) => a.completed);
          const savedStage1 = localStorage.getItem(`kc_stage1_${childId}_${id}`) === 'true' || hasCompletedAny;

          const practiceActs = rawActs.filter((a: any) => !GAME_TYPES.has(a.type));
          const isPracticeAllDone = practiceActs.length > 0 && practiceActs.every((a: any) => a.completed);
          const savedStage2 = localStorage.getItem(`kc_stage2_${childId}_${id}`) === 'true' || isPracticeAllDone;

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

  // Strict Age Group Filtering for Interactive Games
  const isMamAge = (user?.ageGroupCode || '3-4') === '3-4';
  const MAM_GAME_TYPES = new Set(['LISTEN_CHOOSE', 'COLOR_RECOGNITION']);
  const CHOI_LA_GAME_TYPES = new Set(['IMAGE_WORD_MATCH', 'COUNT_OBJECTS', 'MISSING_OBJECT', 'MEMORY_CARD']);
  const allowedGameTypes = isMamAge ? MAM_GAME_TYPES : CHOI_LA_GAME_TYPES;

  // Split activities into Practice and Games
  const practiceActivities = activities.filter((a: any) => !allowedGameTypes.has(a.type));
  const gameActivities = activities.filter((a: any) => allowedGameTypes.has(a.type));

  let finalPractice = practiceActivities;
  let finalGames = gameActivities;

  if (finalGames.length === 0 && activities.length > 0) {
    finalGames = activities.filter((a: any) => isMamAge ? a.type === 'LISTEN_CHOOSE' : a.type !== 'LISTEN_CHOOSE');
    if (finalGames.length === 0) finalGames = activities;
  }

  if (finalPractice.length === 0 && activities.length > 1) {
    finalPractice = activities.slice(0, Math.ceil(activities.length / 2));
  } else if (finalPractice.length === 0 && activities.length === 1) {
    finalPractice = activities;
  }

  // Stage completion flags
  const isStage1Completed =
    localStorage.getItem(`kc_stage1_${childId}_${id}`) === 'true' ||
    completedCount > 0 ||
    isAllCompleted;

  const isStage2Completed =
    (finalPractice.length > 0 && finalPractice.every((a: any) => a.completed)) ||
    localStorage.getItem(`kc_stage2_${childId}_${id}`) === 'true';

  const isStage3Completed =
    finalGames.length > 0 && finalGames.every((a: any) => a.completed);

  const completedGamesCount = finalGames.filter((a: any) => a.completed).length;
  const resumeGame = finalGames.find((a: any) => !a.completed) || finalGames[0];

  const handleStartActivity = (activityId: string) => {
    sfx.playPop();
    navigate(`/activities/${activityId}`);
  };

  const handleSelectStage = (stage: 1 | 2 | 3) => {
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
  };

  const handleCompleteStage2 = () => {
    sfx.playSuccess();
    localStorage.setItem(`kc_stage2_${childId}_${id}`, 'true');
    setActiveStage(3);
    localStorage.setItem(`kc_stage_active_${childId}_${id}`, '3');
  };

  const topicIcon = (lesson as any)?.topic?.icon || '🌟';

  const getBookTitle = (code?: string) => {
    if (code === '5-6') return 'Sách Book 3 (5–6 tuổi)';
    if (code === '4-5') return 'Sách Book 2 (4–5 tuổi)';
    return 'Sách Book 1 (3–4 tuổi)';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-amber-50/50 to-orange-50/40 flex flex-col pb-24 md:pb-12">
      <ChildHeader completedCount={completedCount} />

      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 flex-1">
        {/* Back Button & Lesson Header */}
        <div className="flex items-center gap-5 mb-8">
          <button
            onClick={() => {
              sfx.playPop();
              navigate(-1);
            }}
            aria-label="Quay lại"
            className="w-14 h-14 rounded-2xl bg-white border-3 border-slate-200 hover:bg-amber-50 flex items-center justify-center text-slate-700 cursor-pointer shadow-sm active:scale-95 transition-all"
          >
            <ArrowLeft className="w-8 h-8 stroke-[2.5]" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-4xl sm:text-5xl">{topicIcon}</span>
              <h1 className="text-3xl sm:text-5xl font-black text-slate-800 tracking-tight">
                {lesson?.title || 'Bài học tiếng Anh'}
              </h1>
            </div>
            <p className="text-base sm:text-lg font-extrabold text-amber-700 mt-1">
              {lesson?.vietnameseTitle} • {getBookTitle(user?.ageGroupCode)}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center my-20">
            <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !lesson ? (
          <div className="bg-white rounded-3xl p-12 text-center border-4 border-dashed border-amber-200">
            <p className="font-black text-slate-600 text-xl">Không tìm thấy bài học.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Sequential 3-Stage Stepper Header */}
            <section className="bg-white rounded-4xl border-4 border-amber-200/90 p-4 sm:p-6 shadow-md relative overflow-hidden">
              <div className="grid grid-cols-3 gap-3 sm:gap-5 relative z-10">
                {/* Step 1: Học từ mới */}
                <button
                  onClick={() => handleSelectStage(1)}
                  className={`p-3.5 sm:p-4 rounded-3xl border-3 transition-all cursor-pointer flex flex-col sm:flex-row items-center sm:items-start gap-3 text-left relative ${
                    activeStage === 1
                      ? 'border-amber-400 bg-gradient-to-br from-amber-50 via-white to-orange-50/70 ring-4 ring-amber-300 shadow-md scale-102'
                      : isStage1Completed
                      ? 'border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 hover:scale-102'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-amber-50/40'
                  }`}
                >
                  <div
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-xl sm:text-2xl shadow-sm ${
                      isStage1Completed
                        ? 'bg-gradient-to-tr from-emerald-400 to-teal-500 text-white'
                        : activeStage === 1
                        ? 'bg-gradient-to-tr from-amber-400 to-orange-500 text-amber-950 animate-soft-bounce'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isStage1Completed ? '✓' : '📖'}
                  </div>
                  <div className="min-w-0 text-center sm:text-left">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-800 block">
                      Chặng 1
                    </span>
                    <h3 className="font-black text-slate-800 text-sm sm:text-base truncate font-display">
                      Khám phá từ
                    </h3>
                    <span className="text-xs font-extrabold text-slate-400 hidden sm:inline">
                      Flashcard & âm thanh
                    </span>
                  </div>
                </button>

                {/* Step 2: Luyện tập */}
                <button
                  onClick={() => handleSelectStage(2)}
                  className={`p-3.5 sm:p-4 rounded-3xl border-3 transition-all cursor-pointer flex flex-col sm:flex-row items-center sm:items-start gap-3 text-left relative ${
                    activeStage === 2
                      ? 'border-sky-400 bg-gradient-to-br from-sky-50 via-white to-blue-50/70 ring-4 ring-sky-300 shadow-md scale-102'
                      : isStage2Completed
                      ? 'border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 hover:scale-102'
                      : !isStage1Completed
                      ? 'border-slate-200 bg-slate-100/70 opacity-60'
                      : 'border-slate-200 bg-white hover:bg-sky-50/40'
                  }`}
                >
                  <div
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-xl sm:text-2xl shadow-sm ${
                      isStage2Completed
                        ? 'bg-gradient-to-tr from-emerald-400 to-teal-500 text-white'
                        : activeStage === 2
                        ? 'bg-gradient-to-tr from-sky-400 to-blue-500 text-white animate-soft-bounce'
                        : 'bg-sky-100 text-sky-800'
                    }`}
                  >
                    {isStage2Completed ? '✓' : '🎯'}
                  </div>
                  <div className="min-w-0 text-center sm:text-left">
                    <span className="text-xs font-black uppercase tracking-wider text-sky-800 block">
                      Chặng 2
                    </span>
                    <h3 className="font-black text-slate-800 text-sm sm:text-base truncate font-display">
                      Luyện tập
                    </h3>
                    <span className="text-xs font-extrabold text-slate-400 hidden sm:inline">
                      Studio tương tác
                    </span>
                  </div>
                </button>

                {/* Step 3: Trò chơi */}
                <button
                  onClick={() => handleSelectStage(3)}
                  className={`p-3.5 sm:p-4 rounded-3xl border-3 transition-all cursor-pointer flex flex-col sm:flex-row items-center sm:items-start gap-3 text-left relative ${
                    activeStage === 3
                      ? 'border-purple-400 bg-gradient-to-br from-purple-50 via-white to-pink-50/70 ring-4 ring-purple-300 shadow-md scale-102'
                      : isStage3Completed
                      ? 'border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 hover:scale-102'
                      : 'border-slate-200 bg-white hover:bg-purple-50/40'
                  }`}
                >
                  <div
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-xl sm:text-2xl shadow-sm ${
                      isStage3Completed
                        ? 'bg-gradient-to-tr from-emerald-400 to-teal-500 text-white'
                        : activeStage === 3
                        ? 'bg-gradient-to-tr from-purple-500 to-pink-500 text-white animate-soft-bounce'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {isStage3Completed ? '✓' : '🏆'}
                  </div>
                  <div className="min-w-0 text-center sm:text-left">
                    <span className="text-xs font-black uppercase tracking-wider text-purple-800 block">
                      Chặng 3
                    </span>
                    <h3 className="font-black text-slate-800 text-sm sm:text-base truncate font-display">
                      Thử thách game
                    </h3>
                    <span className="text-xs font-extrabold text-slate-400 hidden sm:inline">
                      Rinh sao & Sticker
                    </span>
                  </div>
                </button>
              </div>

              {/* Lock Warning Toast */}
              {lockNotice && (
                <div className="mt-3 bg-amber-500 text-white text-xs sm:text-sm font-black px-4 py-2 rounded-2xl text-center shadow-md animate-pop-in flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4 flex-shrink-0" />
                  <span>{lockNotice}</span>
                </div>
              )}
            </section>

            {/* STAGE 1: HỌC TỪ MỚI QUA FLASHCARD */}
            {activeStage === 1 && (
              <div className="space-y-6 animate-fade-in">
                {/* Stage 1 Header Banner */}
                <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 rounded-3xl p-5 sm:p-6 text-white shadow-md flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-3xl flex-shrink-0">
                      📚
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 bg-white/25 px-3 py-0.5 rounded-full text-xs font-black mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-100" />
                        Chặng 1: Học từ vựng & âm thanh
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black">
                        Làm quen từ mới cùng Koko
                      </h2>
                      <p className="text-amber-100 text-xs sm:text-sm font-bold max-w-lg">
                        Bé hãy nghe phát âm chuẩn, chạm nút "Bé đọc theo mẫu 🎤" và lật thẻ để hiểu nghĩa tiếng Việt trước khi vào luyện tập nhé!
                      </p>
                    </div>
                  </div>

                  {isStage1Completed && (
                    <button
                      onClick={() => handleSelectStage(2)}
                      className="hidden md:flex items-center gap-2 btn-3d-emerald text-white font-black text-sm py-3 px-5 rounded-2xl cursor-pointer shadow-md flex-shrink-0"
                    >
                      <span>Sang Chặng 2: Luyện tập</span>
                      <ArrowRight className="w-4 h-4 stroke-[3]" />
                    </button>
                  )}
                </div>

                {/* Big Interactive Flashcard */}
                {lesson.vocabularyItems && lesson.vocabularyItems.length > 0 ? (
                  <section className="bg-white/85 rounded-3xl border-3 border-amber-200/90 p-5 sm:p-8 shadow-sm">
                    <BigInteractiveFlashcard
                      items={lesson.vocabularyItems}
                      onCompleteStep={handleCompleteStage1}
                    />
                  </section>
                ) : (
                  <div className="bg-white rounded-3xl p-8 text-center border-2 border-slate-200">
                    <p className="text-slate-600 font-bold mb-4">Bài học này chưa có danh sách từ vựng riêng.</p>
                    <button
                      onClick={handleCompleteStage1}
                      className="btn-3d-amber py-3 px-6 rounded-2xl font-black text-amber-950"
                    >
                      Tiến tới phần Luyện tập 🚀
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STAGE 2: LUYỆN TẬP SAU BÀI HỌC (INTERACTIVE PRACTICE STUDIO) */}
            {activeStage === 2 && (
              <div className="space-y-6 animate-fade-in">
                {/* Hero Card for Practice */}
                <section className="bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 rounded-3xl p-6 sm:p-7 text-white shadow-xl relative flex flex-col md:flex-row items-center justify-between gap-6 border-3 border-sky-300/40">
                  <div className="flex items-center gap-5 flex-col sm:flex-row text-center sm:text-left relative z-10">
                    <KokoMascot
                      state={isStage2Completed ? 'celebrating' : 'encouraging'}
                      size="md"
                      speechBubble={isStage2Completed ? 'Luyện tập tốt lắm! ⭐' : 'Cùng luyện bài với Koko! ✏️'}
                    />
                    <div>
                      <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-black mb-2">
                        <Pencil className="w-3.5 h-3.5 text-yellow-200" />
                        Chặng 2: Luyện tập sau bài học
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black mb-1">
                        Xưởng thực hành từ vựng tương tác
                      </h2>
                      <p className="text-sky-100 font-bold text-sm sm:text-base max-w-md">
                        {isStage2Completed
                          ? 'Bé đã hoàn thành xuất sắc bài luyện tập! Chuyển sang Chặng 3 để chơi Mini-game nhé!'
                          : 'Củng cố sâu sắc từng từ vựng qua tương tác giác quan, bắt âm Phonics và ghép câu trước khi chơi trò chơi!'}
                      </p>
                    </div>
                  </div>

                  {isStage2Completed && (
                    <div className="flex-shrink-0 w-full md:w-auto relative z-10">
                      <button
                        onClick={handleCompleteStage2}
                        className="btn-3d-purple text-white font-black text-base py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-xl w-full md:w-auto"
                      >
                        <span>Tiến tới Mini-game 🎮</span>
                        <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                      </button>
                    </div>
                  )}
                </section>

                {/* Main Interactive Studio Container */}
                <section className="bg-white rounded-3xl border-3 border-sky-200 p-5 sm:p-8 shadow-sm">
                  <InteractivePracticeStudio
                    vocabulary={lesson.vocabularyItems || []}
                    lessonTitle={lesson.title}
                    ageGroupCode={user?.ageGroupCode}
                    onComplete={() => {
                      handleCompleteStage2();
                    }}
                    onBackToStage1={() => handleSelectStage(1)}
                  />
                </section>
              </div>
            )}

            {/* STAGE 3: TRÒ CHƠI TƯƠNG TÁC (MINI-GAMES) */}
            {activeStage === 3 && (
              <div className="space-y-6 animate-fade-in">
                {/* Hero Card for Games */}
                <section className="bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 rounded-3xl p-6 sm:p-7 text-white shadow-xl relative flex flex-col md:flex-row items-center justify-between gap-6 border-3 border-purple-300/40">
                  <div className="flex items-center gap-5 flex-col sm:flex-row text-center sm:text-left relative z-10">
                    <KokoMascot
                      state={isStage3Completed ? 'celebrating' : 'happy'}
                      size="md"
                      speechBubble={isStage3Completed ? 'Bé là nhà vô địch! 🏆' : 'Chơi game nhận sticker! 🎮'}
                    />
                    <div>
                      <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-black mb-2">
                        <Gamepad2 className="w-3.5 h-3.5 text-yellow-200" />
                        Chặng 3: Trò chơi tương tác theo nhóm tuổi
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black mb-1">
                        Khu vui chơi tiếng Anh
                      </h2>
                      <p className="text-purple-100 font-bold text-sm sm:text-base max-w-md">
                        {isStage3Completed
                          ? 'Tuyệt vời! Bé đã vượt qua tất cả mini-game và rinh trọn vẹn sticker & sao vàng!'
                          : `Đã hoàn thành ${completedGamesCount}/${finalGames.length} trò chơi. Vượt qua thử thách để nhận sticker siêu dễ thương!`}
                      </p>
                    </div>
                  </div>

                  {resumeGame && (
                    <div className="flex-shrink-0 w-full md:w-auto relative z-10">
                      <button
                        onClick={() => handleStartActivity(resumeGame._id)}
                        className="btn-3d-amber text-amber-950 font-black text-lg py-4 px-8 rounded-2xl flex items-center justify-center gap-3 cursor-pointer shadow-xl transition-all w-full md:w-auto whitespace-nowrap"
                      >
                        <Play className="w-6 h-6 fill-current" />
                        <span>
                          {resumeGame.completed ? 'Chơi lại game 🔄' : 'Chơi mini-game ngay 🎮'}
                        </span>
                      </button>
                    </div>
                  )}
                </section>

                {/* Game Activities Grid */}
                <section className="bg-white rounded-3xl border-3 border-purple-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                    <h3 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2.5">
                      <Gamepad2 className="w-7 h-7 text-purple-500" />
                      <span>Danh sách trò chơi ({completedGamesCount} / {finalGames.length})</span>
                    </h3>
                    <span className="text-xs font-black text-purple-700 bg-purple-100 px-3.5 py-1 rounded-full border border-purple-200">
                      {isStage3Completed ? 'Đã hoàn thành toàn bộ bài học 🏆' : 'Độ khó tăng dần theo lứa tuổi'}
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {finalGames.map((act: any, idx: number) => {
                      const isCurrent = act._id === resumeGame?._id && !act.completed;
                      return (
                        <div
                          key={act._id}
                          onClick={() => handleStartActivity(act._id)}
                          className={`card-kid p-5 rounded-3xl border-3 transition-all cursor-pointer flex flex-col justify-between group ${
                            isCurrent
                              ? 'border-purple-400 bg-purple-50/60 shadow-md ring-2 ring-purple-300'
                              : act.completed
                              ? 'border-amber-300 bg-amber-50/30 hover:bg-white'
                              : 'border-slate-200 bg-white hover:border-purple-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                                Mini-game {idx + 1}
                              </span>
                              {act.completed ? (
                                <span className="inline-flex items-center gap-1 text-xs font-black text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                                  {[...Array(act.stars || 1)].map((_, i) => (
                                    <Star key={i} className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                  ))}
                                </span>
                              ) : isCurrent ? (
                                <span className="text-xs font-black text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full animate-pulse">
                                  Chơi ngay
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-slate-400">Chưa chơi</span>
                              )}
                            </div>
                            <h4 className="font-black text-slate-800 group-hover:text-purple-700 transition-colors text-lg mb-1">
                              {act.title}
                            </h4>
                            <p className="text-xs text-slate-500 font-bold line-clamp-2 leading-relaxed">
                              {act.instructions}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black">
                            <span className="text-slate-400">{act.questionCount} câu hỏi</span>
                            <span className="text-purple-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                              {act.completed ? 'Chơi lại' : 'Vào chơi'} →
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Navigation Helper */}
                  <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => handleSelectStage(2)}
                      className="text-xs font-black text-slate-500 hover:text-slate-700 flex items-center gap-1.5 cursor-pointer py-2 px-3 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Quay lại Chặng 2 (Luyện tập)</span>
                    </button>

                    <button
                      onClick={() => {
                        sfx.playSuccess();
                        navigate('/');
                      }}
                      className="btn-3d-emerald text-white font-black text-sm py-2.5 px-5 rounded-2xl flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <span>Về trang chủ 🏠</span>
                    </button>
                  </div>
                </section>
              </div>
            )}

            {/* Learning Objectives Pill (Always accessible at bottom) */}
            {lesson.learningObjectives && lesson.learningObjectives.length > 0 && (
              <section className="bg-white/80 rounded-3xl border-2 border-amber-200/80 p-5 shadow-xs">
                <h3 className="font-black text-base text-slate-800 mb-2.5 flex items-center gap-2">
                  <span>🎯</span>
                  <span>Mục tiêu bài học</span>
                </h3>
                <div className="grid sm:grid-cols-2 gap-2">
                  {lesson.learningObjectives.map((obj, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs font-bold text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{obj}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Child Mobile Bottom Navigation */}
      <ChildBottomNav completedCount={completedCount} />
    </div>
  );
};
