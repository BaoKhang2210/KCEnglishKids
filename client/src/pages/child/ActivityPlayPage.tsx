import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { activitiesApi, learningApi, adminApi } from '../../services/api';
import { vocabMasteryService } from '../../services/vocabMasteryService';
import { learningOutbox } from '../../services/learningOutbox';
import type { Activity, ActivityQuestion, ActivityOption } from '../../types';
import { ResultModal } from '../../components/child/ResultModal';
import { KokoMascot } from '../../components/child/KokoMascot';
import { sfx, playWordAudio, stopWordAudio } from '../../utils/audio';
import { TrueFalseEngine } from '../../components/child/games/TrueFalseEngine';
import { CountObjectsEngine } from '../../components/child/games/CountObjectsEngine';
import { MemoryCardEngine } from '../../components/child/games/MemoryCardEngine';
import { ImageWordMatchEngine } from '../../components/child/games/ImageWordMatchEngine';
import { ListenChooseEngine } from '../../components/child/games/ListenChooseEngine';
import { ColorRecognitionEngine } from '../../components/child/games/ColorRecognitionEngine';
import { MissingObjectEngine } from '../../components/child/games/MissingObjectEngine';
import { FeedAnimalEngine } from '../../components/child/games/FeedAnimalEngine';
import { BubblePopEngine } from '../../components/child/games/BubblePopEngine';
import { TapPictureEngine } from '../../components/child/games/TapPictureEngine';
import { AnimalSoundEngine } from '../../components/child/games/AnimalSoundEngine';
import { StarCatcherEngine } from '../../components/child/games/StarCatcherEngine';
import { createActivityRun } from '../../utils/activityRun';

export const ActivityPlayPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isPreview = user?.role === 'ADMIN' || user?.role === 'TEACHER';
  const childId = user?.id || (user as any)?._id || 'guest';

  const [activity, setActivity] = useState<Activity | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [recordedAnswers, setRecordedAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadVersion, setLoadVersion] = useState(0);
  const [attemptId, setAttemptId] = useState(0);
  const runRef = useRef(createActivityRun());
  const answerLockedRef = useRef(false);

  const submissionRef = useRef('');
  const payloadRef = useRef<any>(null);
  const submittingRef = useRef(false);
  const startTimeRef = useRef<number>(Date.now());
  const questionStartRef = useRef<number>(Date.now());

  const resetAttempt = () => {
    runRef.current.cancel();
    runRef.current = createActivityRun();
    stopWordAudio();
    answerLockedRef.current = false;
    submittingRef.current = false;
    submissionRef.current = globalThis.crypto?.randomUUID?.() || 'op-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    payloadRef.current = null;
    startTimeRef.current = questionStartRef.current = Date.now();
    setCurrentIdx(0);
    setSelectedOptionId(null);
    setFeedbackState('idle');
    setRecordedAnswers([]);
    setIsFinished(false);
    setResultData(null);
    setSubmitError(null);
    setAttemptId(previous => previous + 1);
  };

  // Load activity data
  useEffect(() => {
    resetAttempt();
    const run = runRef.current;
    setActivity(null);
    setLoadError(null);
    setLoading(true);
    if (!user) {
      navigate('/login');
      return () => run.cancel();
    }

    const fetchActivity = async () => {
      try {
        if (!id) throw new Error('Không tìm thấy trò chơi.');
        const res = await (user.role === 'ADMIN' ? adminApi.getActivityById(id) : activitiesApi.getActivityById(id));
        if (!run.active) return;
        if (!res.success || !res.data) throw new Error(res.message || 'Không tải được trò chơi.');
        if (!res.data.questions?.length) throw new Error('Trò chơi này chưa có câu hỏi. Bé hãy chọn trò khác nhé!');
        setActivity(res.data);
        startTimeRef.current = questionStartRef.current = Date.now();
      } catch (err) {
        if (run.active) setLoadError(err instanceof Error ? err.message : 'Không tải được trò chơi. Bé thử lại nhé!');
      } finally {
        if (run.active) setLoading(false);
      }
    };

    fetchActivity();

    return () => {
      run.cancel();
      runRef.current.cancel();
      stopWordAudio();
    };
  }, [id, childId, user?.role, navigate, loadVersion]);

  const currentQuestion: ActivityQuestion | undefined = activity?.questions?.[currentIdx];

  // Auto-play audio once when question index changes
  useEffect(() => {
    if (!activity || !activity.questions || activity.questions.length === 0) return;
    const q = activity.questions[currentIdx];
    if (!q) return;

    questionStartRef.current = Date.now();
    answerLockedRef.current = false;
    setSelectedOptionId(null);
    setFeedbackState('idle');

    stopWordAudio();

    const timer = setTimeout(() => {
      playWordAudio(q.promptText, q.promptAudioUrl);
    }, 400);

    return () => {
      clearTimeout(timer);
      stopWordAudio();
    };
  }, [currentIdx, activity, attemptId]);

  const handlePlayPrompt = () => {
    if (currentQuestion) {
      playWordAudio(currentQuestion.promptText, currentQuestion.promptAudioUrl);
    }
  };

  const handleSelectOption = async (option: ActivityOption) => {
    handleEngineAnswer(option.isCorrect, option.id);
  };

  const handleEngineAnswer = async (isCorrect: boolean, optionId: string) => {
    const run = runRef.current;
    if (!run.active || answerLockedRef.current || isFinished || feedbackState !== 'idle' || !currentQuestion) return;
    answerLockedRef.current = true;

    setSelectedOptionId(optionId);
    const responseTimeMs = Date.now() - questionStartRef.current;

    // §1.3.3 — every arcade answer feeds the Vocabulary Notebook (Sổ từ vựng):
    // 2 correct game reps solidify a word into MASTERED.
    if (!isPreview && currentQuestion.vocabulary) {
      vocabMasteryService.recordGameResult(childId, currentQuestion.vocabulary, isCorrect);
    }

    if (isCorrect) {
      // Correct answer
      setFeedbackState('correct');
      sfx.playCorrect();

      const answerRecord = {
        questionIndex: currentIdx,
        promptText: currentQuestion.promptText,
        selectedOptionId: optionId,
        isCorrect: true,
        vocabularyId: currentQuestion.vocabulary,
        responseTimeMs
      };

      const updatedAnswers = [...recordedAnswers, answerRecord];
      setRecordedAnswers(updatedAnswers);

      // Advance to next question or complete
      run.schedule(async () => {
        if (currentIdx + 1 < (activity?.questions?.length || 0)) {
          setCurrentIdx(prev => prev + 1);
        } else {
          // Finished all questions!
          await handleCompleteActivity(updatedAnswers);
        }
      }, 1300);
    } else {
      // Wrong answer - gentle feedback and retry
      setFeedbackState('wrong');
      sfx.playGentleWrong();

      run.schedule(() => {
        answerLockedRef.current = false;
        setFeedbackState('idle');
        setSelectedOptionId(null);
        // Replay prompt gently
        playWordAudio(currentQuestion.promptText, currentQuestion.promptAudioUrl);
      }, 1000);
    }
  };

  const handleMemoryCardComplete = async () => {
    if (!runRef.current.active || !activity || answerLockedRef.current) return;
    answerLockedRef.current = true;
    const allAnswers = (activity.questions || []).map((q, idx) => ({
      questionIndex: idx,
      promptText: q.promptText,
      selectedOptionId: String((q.vocabulary as any)?._id || q.vocabulary || q.correctAnswer || ''),
      isCorrect: true,
      vocabularyId: q.vocabulary,
      responseTimeMs: 2000
    }));
    setRecordedAnswers(allAnswers);
    // §1.3.3 — every matched memory pair counts as a correct rep for that word
    (activity.questions || []).forEach(q => {
      if (!isPreview && q.vocabulary) vocabMasteryService.recordGameResult(childId, q.vocabulary, true);
    });
    await handleCompleteActivity(allAnswers);
  };

  const handleCompleteActivity = async (answers: any[]) => {
    const run = runRef.current;
    if (!run.active || !activity || submittingRef.current) return;
    stopWordAudio();
    if (isPreview) {
      setIsFinished(true);
      return;
    }

    // §2.2.3 — resolve lessonId defensively; without it the submit request
    // silently fails and the ResultModal never appears.
    const lessonId = (activity as any).lesson?._id || (activity as any).lesson;
    if (!lessonId) {
      setSubmitError('Không tìm thấy Lesson của trò chơi này. Bé hãy quay lại và thử lại nhé!');
      return;
    }

    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

    submittingRef.current = true;
    try {
      setSubmitError(null);
      payloadRef.current ||= {
        activityId: activity._id,
        lessonId,
        childId: user?.id || (user as any)?._id,
        answers,
        duration: durationSeconds, submissionId: submissionRef.current
      };
      const res = await learningApi.submitActivityResult(payloadRef.current);
      if (!run.active) return;
      if (res.success) {
        setResultData(res.data);
        setIsFinished(true);
      } else {
        setSubmitError(res.message || 'Không thể lưu kết quả. Bé thử lại nhé!');
      }
    } catch (err: any) {
      if (!run.active) return;
      console.error('Failed to submit results:', err);
      if(!err.status || err.status>=500) {
        try {await learningOutbox.enqueue(childId,'activity:'+activity._id,payloadRef.current);} catch { /* Error is visible below. */ }
      }
      if (run.active) setSubmitError(err?.message || 'Có lỗi khi kết nối. Bé thử lại nhé!');
    } finally { if (run.active) submittingRef.current = false; }
  };

  const handleRetry = () => {
    sfx.playPop();
    resetAttempt();
  };

  const handleFinish = () => {
    sfx.playPop();
    if (isPreview) { navigate(-1); return; }
    // §5.6.6 — return to the lesson page (child keeps context), not home.
    const lessonId = (activity as any)?.lesson?._id || (activity as any)?.lesson;
    navigate(lessonId ? `/lessons/${lessonId}` : '/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-100 to-amber-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError || !activity) {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-sky-100 to-amber-50 flex items-center justify-center p-4">
        <section role="alert" className="w-full max-w-md rounded-3xl bg-white border-4 border-amber-200 p-6 text-center shadow-lg">
          <h1 className="text-2xl font-black text-slate-800 mb-3">Chưa mở được trò chơi</h1>
          <p className="text-slate-600 mb-6">{loadError || 'Không tìm thấy trò chơi.'}</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => setLoadVersion(value => value + 1)} className="btn-3d-amber rounded-2xl p-3 font-bold">Thử lại</button>
            <button onClick={() => navigate(-1)} className="rounded-2xl bg-slate-100 p-3 font-bold">Quay lại</button>
          </div>
        </section>
      </div>
    );
  }

  const totalQuestions = activity?.questions?.length || 1;
  const progressPercent = Math.round(((currentIdx + 1) / totalQuestions) * 100);

  // Determine Mascot emotion and speech bubble
  let mascotState: 'thinking' | 'celebrating' | 'encouraging' | 'listening' = 'listening';
  let mascotSpeech = 'Bé nghe thật kỹ nhé! 🐻';

  if (feedbackState === 'correct') {
    mascotState = 'celebrating';
    mascotSpeech = 'Đúng rồi! Bé giỏi quá! ⭐🎉';
  } else if (feedbackState === 'wrong') {
    mascotState = 'encouraging';
    mascotSpeech = 'Không sao đâu, bé thử lại nhé! 💪';
  }

  return (
    <div className="min-h-dvh w-full bg-gradient-to-b from-sky-100 via-amber-50/60 to-orange-50/50 flex flex-col justify-between p-2 sm:p-4 select-none relative overflow-x-clip">
      {/* Top Header with Back Button & Glowing Progress Bar (shrink-0) */}
      <header className="max-w-[1600px] w-full mx-auto px-2 shrink-0">
        <div className="flex items-center justify-between gap-3 mb-2">
          <button
            onClick={() => {
              sfx.playPop();
              navigate(-1);
            }}
            aria-label="Quay lại"
            className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 rounded-3xl bg-white border-3 border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700 cursor-pointer shadow-md active:scale-95 transition-all"
          >
            <ArrowLeft className="w-8 h-8 stroke-[2.5]" />
          </button>

          <div className="flex-1 max-w-md sm:max-w-xl md:max-w-2xl">
            <div className="flex justify-between items-center text-sm sm:text-base font-black text-slate-600 mb-2">
              <span className="bg-white/90 px-3.5 py-1 rounded-full border-2 border-slate-200 shadow-xs">
                Câu {currentIdx + 1} / {totalQuestions}
              </span>
              <span className="font-black text-amber-600">{progressPercent}%</span>
            </div>
            <div className="w-full h-5 sm:h-6 bg-white/90 rounded-full border-2 border-slate-200 overflow-hidden p-0.5 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="h-12 sm:h-16 px-2 sm:px-6 shrink-0 rounded-3xl bg-amber-100 border-3 border-amber-300 flex items-center justify-center font-black text-amber-800 text-xl sm:text-2xl shadow-md gap-2">
            <Star className="w-6 h-6 sm:w-7 sm:h-7 text-amber-500 fill-amber-500 animate-spin-slow" />
            <span>{recordedAnswers.filter(a => a.isCorrect).length}</span>
          </div>
        </div>
      </header>

      {/* Main Game Engine Center Stage */}
      <main key={`${activity._id}:${attemptId}`} className="max-w-[1600px] w-full mx-auto my-auto py-4 sm:py-6 relative z-10 flex flex-col items-center justify-center">
        {activity?.activityType === 'MEMORY_CARD' ? (
          <MemoryCardEngine
            activity={activity}
            onComplete={handleMemoryCardComplete}
          />
        ) : currentQuestion && (
          <>
            {activity?.activityType === 'COLOR_RECOGNITION' ? (
              <ColorRecognitionEngine
                question={currentQuestion}
                onAnswer={handleEngineAnswer}
                disabled={feedbackState !== 'idle'}
              />
            ) : activity?.activityType === 'MISSING_OBJECT' ? (
              <MissingObjectEngine
                question={currentQuestion}
                onAnswer={handleEngineAnswer}
                disabled={feedbackState !== 'idle'}
              />
            ) : activity?.activityType === 'TRUE_FALSE' ? (
              <TrueFalseEngine
                question={currentQuestion}
                onAnswer={handleEngineAnswer}
                disabled={feedbackState !== 'idle'}
              />
            ) : activity?.activityType === 'COUNT_OBJECTS' ? (
              <CountObjectsEngine
                question={currentQuestion}
                onAnswer={handleEngineAnswer}
                disabled={feedbackState !== 'idle'}
              />
            ) : activity?.activityType === 'IMAGE_WORD_MATCH' ? (
              <ImageWordMatchEngine
                question={currentQuestion}
                onAnswer={handleEngineAnswer}
                disabled={feedbackState !== 'idle'}
              />
            ) : activity?.activityType === 'FEED_ANIMAL' ? (
              <FeedAnimalEngine
                question={currentQuestion}
                onAnswer={handleEngineAnswer}
                disabled={feedbackState !== 'idle'}
              />
            ) : activity?.activityType === 'BUBBLE_POP' ? (
              <BubblePopEngine
                question={currentQuestion}
                onAnswer={handleEngineAnswer}
                disabled={feedbackState !== 'idle'}
              />
            ) : activity?.activityType === 'TAP_PICTURE' || activity?.activityType === 'FIND_OBJECT' ? (
              /* §2.2.4 — FIND_OBJECT (18 exercises) shares the giant tap-the-picture
                 board instead of falling into the generic fallback */
              <TapPictureEngine
                question={currentQuestion}
                onAnswer={handleEngineAnswer}
                disabled={feedbackState !== 'idle'}
              />
            ) : activity?.activityType === 'ANIMAL_SOUND' ? (
              <AnimalSoundEngine
                question={currentQuestion}
                onAnswer={handleEngineAnswer}
                disabled={feedbackState !== 'idle'}
              />
            ) : activity?.activityType === 'STAR_CATCHER' ? (
              <StarCatcherEngine
                question={currentQuestion}
                selectedOptionId={selectedOptionId}
                feedbackState={feedbackState}
                onSelectOption={handleSelectOption}
                onPlayPrompt={handlePlayPrompt}
              />
            ) : activity?.activityType === 'DRAG_DROP' || activity?.activityType === 'CLASSIFICATION' || activity?.activityType === 'LISTEN_REPEAT' ? (
              /* §2.2.4 — text-option types play as big choose-the-answer cards;
                 all 12 docs carry options[].isCorrect for server-side grading.
                 LISTEN_REPEAT (1 option) = hear prompt → tap the word card. */
              <ListenChooseEngine
                question={currentQuestion}
                selectedOptionId={selectedOptionId}
                feedbackState={feedbackState}
                onSelectOption={handleSelectOption}
                onPlayPrompt={handlePlayPrompt}
              />
            ) : (
              <ListenChooseEngine
                question={currentQuestion}
                selectedOptionId={selectedOptionId}
                feedbackState={feedbackState}
                onSelectOption={handleSelectOption}
                onPlayPrompt={handlePlayPrompt}
              />
            )}
          </>
        )}
      </main>

      {/* Interactive Mascot Companion Bar at the bottom */}
      <aside className="max-w-2xl w-full mx-auto flex items-center justify-center gap-4 pt-14 pb-3 relative z-10">
        <KokoMascot
          state={mascotState}
          size="md"
          speechBubble={mascotSpeech}
          onClick={() => sfx.playPop()}
        />
      </aside>

      {/* §2.2.3 — Error modal with retry (never leave the child on a frozen screen) */}
      {submitError && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div role="alertdialog" aria-modal="true" aria-label="Không lưu được kết quả" className="bg-white rounded-4xl border-4 border-rose-200 p-5 sm:p-8 max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto text-center shadow-2xl animate-pop-in">
            <div className="text-6xl mb-3">😢</div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Ôi, có lỗi rồi!</h2>
            <p className="text-slate-600 font-bold mb-6 leading-relaxed">{submitError}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  sfx.playPop();
                  setSubmitError(null);
                  handleCompleteActivity(recordedAnswers);
                }}
                className="btn-3d-amber text-amber-950 font-black text-base py-3 px-6 rounded-2xl cursor-pointer"
              >
                Thử lại 🔄
              </button>
              <button
                onClick={() => {
                  sfx.playPop();
                  navigate('/');
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-base py-3 px-6 rounded-2xl cursor-pointer transition-colors"
              >
                Về trang chủ 🏠
              </button>
            </div>
          </div>
        </div>
      )}

      {isFinished && isPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <section role="dialog" aria-modal="true" aria-label="Hoàn tất xem thử" className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border-4 border-amber-300 bg-white p-6 text-center shadow-2xl">
            <h2 className="text-2xl font-black text-slate-800 mb-3">Hoàn tất xem thử</h2>
            <p className="text-slate-600 mb-6">Lượt xem thử không lưu kết quả học tập hoặc cộng sao cho học sinh.</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleRetry} className="btn-3d-amber rounded-2xl p-3 font-bold">Chơi lại</button>
              <button onClick={handleFinish} className="rounded-2xl bg-slate-100 p-3 font-bold">Quay lại</button>
            </div>
          </section>
        </div>
      )}

      {/* Result Celebration Modal */}
      {isFinished && resultData && (
        <ResultModal
          score={resultData.score}
          maxScore={resultData.maxScore}
          stars={resultData.stars}
          correctCount={resultData.correctCount}
          totalQuestions={totalQuestions}
          onRetry={handleRetry}
          onFinish={handleFinish}
          nextActivityId={resultData.nextActivityId}
          nextActivityTitle={resultData.nextActivityTitle}
          lessonStars={resultData.lessonStars}
          lessonScore={resultData.lessonScore}
          starContext="lesson-activity"
          unitCompleted={Array.isArray(resultData.unitCompletionsGranted) && resultData.unitCompletionsGranted.length > 0}
          onPlayNext={() => {
            if (resultData.nextActivityId) {
              navigate(`/activities/${resultData.nextActivityId}`);
            }
          }}
        />
      )}
    </div>
  );
};
