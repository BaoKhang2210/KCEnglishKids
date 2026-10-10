import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { activitiesApi, learningApi } from '../../services/api';
import type { Activity, ActivityQuestion, ActivityOption } from '../../types';
import { GameStage } from '../../components/child/games/GameStage';
import { sfx, playWordAudio, stopWordAudio } from '../../utils/audio';
import { MemoryCardEngine } from '../../components/child/games/MemoryCardEngine';
import { BubblePopEngine } from '../../components/child/games/BubblePopEngine';
import { ListenChooseEngine } from '../../components/child/games/ListenChooseEngine';
import { FeedAnimalEngine } from '../../components/child/games/FeedAnimalEngine';
import { TapPictureEngine } from '../../components/child/games/TapPictureEngine';

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

  const startTimeRef = useRef<number>(Date.now());
  const questionStartRef = useRef<number>(Date.now());

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

  // Auto-play question audio
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

  const handleSelectOption = (option: ActivityOption) => {
    handleEngineAnswer(option.isCorrect, option.id);
  };

  const handleEngineAnswer = async (isCorrect: boolean, optionId: string) => {
    if (feedbackState !== 'idle' || !currentQuestion) return;

    setSelectedOptionId(optionId);
    const responseTimeMs = Date.now() - questionStartRef.current;

    if (isCorrect) {
      setFeedbackState('correct');
      sfx.playCorrect();

      const answerRecord = {
        questionIndex: currentIdx,
        promptText: currentQuestion.promptText,
        selectedOptionId: optionId,
        isCorrect: true,
        vocabularyId: currentQuestion.vocabulary,
        responseTimeMs,
      };

      const updatedAnswers = [...recordedAnswers, answerRecord];
      setRecordedAnswers(updatedAnswers);

      setTimeout(async () => {
        if (currentIdx + 1 < (activity?.questions?.length || 0)) {
          setCurrentIdx((prev) => prev + 1);
        } else {
          await handleCompleteActivity(updatedAnswers);
        }
      }, 1200);
    } else {
      setFeedbackState('wrong');
      sfx.playGentleWrong();

      setTimeout(() => {
        setFeedbackState('idle');
        setSelectedOptionId(null);
        playWordAudio(currentQuestion.promptText, currentQuestion.promptAudioUrl);
      }, 900);
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
      responseTimeMs: 2000,
    }));
    await handleCompleteActivity(allAnswers);
  };

  const handleCompleteActivity = async (answers: any[]) => {
    if (!activity) return;
    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

    try {
      await learningApi.submitActivityResult({
        activityId: activity._id,
        lessonId: (activity as any).lesson?._id || (activity as any).lesson,
        childId: user?.id || (user as any)?._id,
        answers,
        durationSeconds,
      });
    } catch (e) {
      console.warn('Could not submit activity result:', e);
    }

    sfx.playStarFanfare();
    setIsFinished(true);
  };

  const handleRetry = () => {
    setCurrentIdx(0);
    setSelectedOptionId(null);
    setFeedbackState('idle');
    setRecordedAnswers([]);
    setIsFinished(false);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-amber-50">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalQuestions = activity?.questions?.length || 1;
  const starsEarned = recordedAnswers.filter((a) => a.isCorrect).length;
  const actType = activity?.activityType || (activity as any)?.type;

  return (
    <GameStage
      onBack={() => navigate(-1)}
      onHome={() => navigate('/')}
      currentQuestionIndex={currentIdx}
      totalQuestions={totalQuestions}
      starsCount={starsEarned}
      isFinished={isFinished}
      onRetry={handleRetry}
      onReturnToGames={() => navigate(-1)}
    >
      {actType === 'MEMORY_CARD' ? (
        <MemoryCardEngine
          activity={activity!}
          onComplete={handleMemoryCardComplete}
        />
      ) : actType === 'BUBBLE_POP' && currentQuestion ? (
        <BubblePopEngine
          question={currentQuestion}
          onAnswer={handleEngineAnswer}
          disabled={feedbackState !== 'idle'}
        />
      ) : actType === 'FEED_ANIMAL' && currentQuestion ? (
        <FeedAnimalEngine
          question={currentQuestion}
          onAnswer={handleEngineAnswer}
          disabled={feedbackState !== 'idle'}
        />
      ) : actType === 'TAP_PICTURE' && currentQuestion ? (
        <TapPictureEngine
          question={currentQuestion}
          onAnswer={handleEngineAnswer}
          disabled={feedbackState !== 'idle'}
        />
      ) : currentQuestion ? (
        <ListenChooseEngine
          question={currentQuestion}
          selectedOptionId={selectedOptionId}
          feedbackState={feedbackState}
          onSelectOption={handleSelectOption}
          onPlayPrompt={handlePlayPrompt}
        />
      ) : null}
    </GameStage>
  );
};
