/**
 * LessonDetailPage — /lessons/:id
 *
 * Chặng 1 (Flashcard) now uses the shared FlashcardView component
 * (variant='lesson') so the layout and behaviour are identical to the
 * TopicDetailPage flashcard (variant='topic').
 *
 * Everything else (LessonShell, LessonTopBar, StageCompleteScreen, etc.)
 * is unchanged.
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { lessonsApi } from '../../services/api';
import type { Lesson, Vocabulary, Activity } from '../../types';
import { LessonShell } from '../../components/child/lesson/LessonShell';
import { LessonTopBar } from '../../components/child/lesson/LessonTopBar';
// FlashcardView — shared component used by both Lesson (variant='lesson')
// and TopicDetailPage (variant='topic').  No other flashcard component needed.
import { FlashcardView } from '../../components/child/lesson/FlashcardView';
import { StageCompleteScreen } from '../../components/child/lesson/StageCompleteScreen';
import { LessonHub } from '../../components/child/lesson/LessonHub';
import { ParentSheetModal } from '../../components/child/lesson/ParentSheetModal';
import { TprPracticeStage } from '../../components/child/lesson/TprPracticeStage';
import { Stage3GameList } from '../../components/child/lesson/Stage3GameList';
import { sfx } from '../../utils/audio';
import { pickLessonGames } from '../../components/child/games/gameRegistry';

// ─────────────────────────────────────────────────────────────────────────────
//  LessonDetailPage Main Component
// ─────────────────────────────────────────────────────────────────────────────
export const LessonDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<1 | 2 | 3>(1);
  const [stageFinished, setStageFinished] = useState<1 | 2 | 3 | null>(null);
  const [showLessonHub, setShowLessonHub] = useState(false);
  const [showParentSheet, setShowParentSheet] = useState(false);

  // Settings (passed to ParentSheetModal)
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [kokoVoice, setKokoVoice] = useState(true);
  const [subtitles, setSubtitles] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [showVietnamese, setShowVietnamese] = useState(false);
  const [showPromptWordText, setShowPromptWordText] = useState(false);

  // Review mode indicator
  const [, setIsReviewMode] = useState(false);

  // TPR Stats for parent sheet
  const [tprStats, setTprStats] = useState<Record<string, any>>({});

  const childId = user?._id || user?.id || 'child_guest';

  useEffect(() => {
    if (!user) { navigate('/login'); return; }

    const fetchLesson = async () => {
      try {
        if (!id) return;
        const res = await lessonsApi.getLessonById(id);
        if (res.success) {
          setLesson(res.data);
          const savedStage1 = localStorage.getItem(`kc_stage1_${childId}_${id}`) === 'true';
          const savedStage2 = localStorage.getItem(`kc_stage2_${childId}_${id}`) === 'true';
          const savedActive = localStorage.getItem(`kc_stage_active_${childId}_${id}`);

          if (savedActive === '3' && savedStage2) setActiveStage(3);
          else if (savedActive === '2' && savedStage1) setActiveStage(2);
          else if (savedStage2) setActiveStage(3);
          else if (savedStage1) setActiveStage(2);
          else setActiveStage(1);
        }
      } catch (err) {
        console.error('Failed to load lesson:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLesson();
  }, [id, user, navigate, childId]);

  const rawActivities = (lesson as any)?.activities || [];
  const vocabItems: Vocabulary[] = lesson?.vocabularyItems || [];

  // Use GameRegistry to guarantee >= 3 distinct games covering 3 distinct skills
  const activities: Activity[] = pickLessonGames(rawActivities, vocabItems);

  const isStage1Completed = localStorage.getItem(`kc_stage1_${childId}_${id}`) === 'true';
  const isStage2Completed = localStorage.getItem(`kc_stage2_${childId}_${id}`) === 'true';
  const isStage3Completed = localStorage.getItem(`kc_stage3_${childId}_${id}`) === 'true';

  const handleCompleteStage1 = () => {
    sfx.playSuccess();
    localStorage.setItem(`kc_stage1_${childId}_${id}`, 'true');
    setStageFinished(1);
  };

  const handleCompleteStage2 = () => {
    sfx.playSuccess();
    localStorage.setItem(`kc_stage2_${childId}_${id}`, 'true');
    setStageFinished(2);
  };

  const handleCompleteStage3 = () => {
    sfx.playSuccess();
    localStorage.setItem(`kc_stage3_${childId}_${id}`, 'true');
    setStageFinished(3);
  };

  const handleSelectStage = (stage: 1 | 2 | 3) => {
    setStageFinished(null);
    setShowLessonHub(false);
    const isCompleted =
      stage === 1 ? isStage1Completed : stage === 2 ? isStage2Completed : isStage3Completed;
    setIsReviewMode(isCompleted);
    setActiveStage(stage);
    localStorage.setItem(`kc_stage_active_${childId}_${id}`, stage.toString());
  };

  return (
    <LessonShell stage={activeStage}>
      {/* ── 1. LessonTopBar ── */}
      <LessonTopBar
        currentStage={activeStage}
        completedStages={{
          1: isStage1Completed,
          2: isStage2Completed,
          3: isStage3Completed,
        }}
        lessonTitle={lesson?.title}
        onBack={() => {
          if (showLessonHub) { setShowLessonHub(false); } else { navigate('/'); }
        }}
        onHome={() => navigate('/')}
        onOpenParentSheet={() => setShowParentSheet(true)}
        onSelectStage={handleSelectStage}
      />

      {/* ── 2. Content Area ── */}
      <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col relative">
        {loading && (
          <div className="h-full flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {showLessonHub ? (
          <LessonHub
            lessonTitle={lesson?.title || 'Bài học tiếng Anh'}
            totalStars={9}
            onReviewStage={(st) => handleSelectStage(st)}
            onGoHome={() => navigate('/')}
          />
        ) : stageFinished ? (
          <StageCompleteScreen
            stage={stageFinished}
            onNextStage={() => {
              if (stageFinished === 1) handleSelectStage(2);
              else if (stageFinished === 2) handleSelectStage(3);
              else { setStageFinished(null); setShowLessonHub(true); }
            }}
            onGoHome={() => navigate('/')}
          />
        ) : (
          <>
            {/* ── Stage 1: FlashcardView (shared with TopicDetailPage) ── */}
            {activeStage === 1 && vocabItems.length > 0 && (
              <FlashcardView
                variant="topic"
                items={vocabItems}
                childId={childId}
                onCompleteStep={handleCompleteStage1}
                subtitlesEnabled={subtitles}
              />
            )}

            {/* ── Stage 2: TPR Practice ── */}
            {activeStage === 2 && (
              <TprPracticeStage
                vocabulary={vocabItems}
                onCompleteStage={handleCompleteStage2}
                subtitlesEnabled={subtitles}
                showCaptions={showCaptions}
                showVietnamese={showVietnamese}
                onUpdateStats={(key, stat) => {
                  setTprStats(prev => ({ ...prev, [key]: stat }));
                }}
              />
            )}

            {/* ── Stage 3: Game List ── */}
            {activeStage === 3 && (
              <Stage3GameList
                games={activities}
                onSelectGame={(gameId) => navigate(`/activities/${gameId}`)}
              />
            )}
          </>
        )}
      </div>

      {/* ── 3. Parent Sheet Modal ── */}
      <ParentSheetModal
        isOpen={showParentSheet}
        onClose={() => setShowParentSheet(false)}
        lessonTitle={lesson?.title || ''}
        vocabulary={vocabItems}
        currentStage={activeStage}
        onJumpToStage={handleSelectStage}
        tprStats={tprStats}
        autoAdvance={autoAdvance}
        onToggleAutoAdvance={setAutoAdvance}
        kokoVoice={kokoVoice}
        onToggleKokoVoice={setKokoVoice}
        subtitles={subtitles}
        onToggleSubtitles={setSubtitles}
        muted={isMuted}
        onToggleMute={setIsMuted}
        showCaptions={showCaptions}
        onToggleShowCaptions={setShowCaptions}
        showVietnamese={showVietnamese}
        onToggleShowVietnamese={setShowVietnamese}
        showPromptWordText={showPromptWordText}
        onToggleShowPromptWordText={setShowPromptWordText}
      />
    </LessonShell>
  );
};
