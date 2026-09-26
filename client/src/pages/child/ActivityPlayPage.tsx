import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { activitiesApi, learningApi } from '../../services/api';
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

export const ActivityPlayPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [recordedAnswers, setRecordedAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [resultData, setResultData] = useState<any>(null);

  const startTimeRef = useRef<number>(Date.now());
  const questionStartRef = useRef<number>(Date.now());

  // Load activity data
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchActivity = async () => {
      try {
        if (!id) return;
        setLoading(true);
        setCurrentIdx(0);
        setSelectedOptionId(null);
        setFeedbackState('idle');
        setRecordedAnswers([]);
        setIsFinished(false);
        setResultData(null);

        const res = await activitiesApi.getActivityById(id);
        if (res.success) {
          setActivity(res.data);
          startTimeRef.current = Date.now();
          questionStartRef.current = Date.now();
        }
      } catch (err) {
        console.error('Failed to load activity:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();

    return () => {
      stopWordAudio();
    };
  }, [id, user, navigate]);

  const currentQuestion: ActivityQuestion | undefined = activity?.questions?.[currentIdx];

  // Auto-play audio once when question index changes
  useEffect(() => {
    if (!activity || !activity.questions || activity.questions.length === 0) return;
    const q = activity.questions[currentIdx];
    if (!q) return;

    questionStartRef.current = Date.now();
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
  }, [currentIdx, activity?._id]);

  const handlePlayPrompt = () => {
    if (currentQuestion) {
      playWordAudio(currentQuestion.promptText, currentQuestion.promptAudioUrl);
    }
  };

  const handleSelectOption = async (option: ActivityOption) => {
    handleEngineAnswer(option.isCorrect, option.id);
  };

  const handleEngineAnswer = async (isCorrect: boolean, optionId: string) => {
    if (feedbackState !== 'idle' || !currentQuestion) return;

    setSelectedOptionId(optionId);
    const responseTimeMs = Date.now() - questionStartRef.current;

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
      setTimeout(async () => {
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

      setTimeout(() => {
        setFeedbackState('idle');
        setSelectedOptionId(null);
        // Replay prompt gently
        playWordAudio(currentQuestion.promptText, currentQuestion.promptAudioUrl);
      }, 1000);
    }
  };

  const handleMemoryCardComplete = async () => {
    if (!activity) return;
    const allAnswers = (activity.questions || []).map((q, idx) => ({
      questionIndex: idx,
      promptText: q.promptText,
      selectedOptionId: q.options?.[0]?.id || `pair_${idx}`,
      isCorrect: true,
      vocabularyId: q.vocabulary,
      responseTimeMs: 2000
    }));
    await handleCompleteActivity(allAnswers);
  };

  const handleCompleteActivity = async (answers: any[]) => {
    if (!activity) return;

    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

    try {
      const res = await learningApi.submitActivityResult({
        activityId: activity._id,
        lessonId: (activity as any).lesson?._id || (activity as any).lesson,
        childId: user?.id || (user as any)?._id,
        answers,
        duration: durationSeconds
      });

      if (res.success) {
        setResultData(res.data);
        setIsFinished(true);
      }
    } catch (err) {
      console.error('Failed to submit results:', err);
    }
  };

  const handleRetry = () => {
    sfx.playPop();
    setCurrentIdx(0);
    setRecordedAnswers([]);
    setSelectedOptionId(null);
    setFeedbackState('idle');
    setIsFinished(false);
    startTimeRef.current = Date.now();
  };

  const handleFinish = () => {
    sfx.playPop();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-100 to-amber-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
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
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-amber-50/60 to-orange-50/50 flex flex-col justify-between p-4 sm:p-6 select-none relative overflow-x-hidden">
      {/* Top Header with Back Button & Glowing Progress Bar */}
      <header className="max-w-[1600px] w-full mx-auto px-2 sm:px-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <button
            onClick={() => {
              sfx.playPop();
              navigate(-1);
            }}
            aria-label="Quay lại"
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-white border-3 border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700 cursor-pointer shadow-md active:scale-95 transition-all"
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

          <div className="h-14 sm:h-16 px-5 sm:px-6 rounded-3xl bg-amber-100 border-3 border-amber-300 flex items-center justify-center font-black text-amber-800 text-xl sm:text-2xl shadow-md gap-2">
            <Star className="w-6 h-6 sm:w-7 sm:h-7 text-amber-500 fill-amber-500 animate-spin-slow" />
            <span>{recordedAnswers.filter(a => a.isCorrect).length}</span>
          </div>
        </div>
      </header>

      {/* Main Game Engine Center Stage */}
      <main className="max-w-[1600px] w-full mx-auto my-auto py-4 sm:py-6 relative z-10 flex flex-col items-center justify-center">
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
            ) : activity?.activityType === 'TAP_PICTURE' ? (
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
      <aside className="max-w-2xl w-full mx-auto flex items-center justify-center gap-4 py-3 relative z-10">
        <KokoMascot
          state={mascotState}
          size="md"
          speechBubble={mascotSpeech}
          onClick={() => sfx.playPop()}
        />
      </aside>

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
