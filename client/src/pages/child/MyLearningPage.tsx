import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRewards } from '../../context/RewardContext';
import { api } from '../../services/api';
import { getAvailableLessonGames } from '../../games/registry';
import { GameRunner } from '../../games/core/GameRunner';
import type { Vocabulary } from '../../types';
import { playWordAudio, sfx } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { KokoMascot } from '../../components/child/KokoMascot';
import {
  Volume2,
  CheckCircle2,
  Circle,
  Gamepad2,
  HeartHandshake,
  Star,
  ArrowLeft,
  PartyPopper,
  Check,
  Lightbulb,
  Play
} from 'lucide-react';

interface HomeReviewData {
  lessonId: string;
  lessonTitle: string;
  lessonVietnameseTitle?: string;
  recentSession?: {
    _id: string;
    title: string;
    endedAt: string;
  } | null;
  words: Vocabulary[];
  sentencePatterns: Array<{
    _id: string;
    english: string;
    vietnamese?: string;
    contentType?: string;
    pronunciation?: string;
    audioUrl?: string | null;
  }>;
  parentGuidance: {
    title: string;
    steps: string[];
    teacherNote?: string;
  };
  completedToday: boolean;
  starsAwarded: number;
}

export function MyLearningPage() {
  const { user } = useAuth();
  const { refresh, rewards } = useRewards();
  const navigate = useNavigate();
  const childId = user?._id || (user as any)?.id || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewData, setReviewData] = useState<HomeReviewData | null>(null);
  const [gameIds, setGameIds] = useState<string[]>([]);

  // Task completion flags
  const [part1Done, setPart1Done] = useState(false);
  const [part2Done, setPart2Done] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Game Runner
  const [playing, setPlaying] = useState(false);
  const [activeAudioWord, setActiveAudioWord] = useState<string | null>(null);

  useEffect(() => {
    if (!childId) return;
    const abort = new AbortController();
    setLoading(true);
    setError('');

    api.get(`/children/${childId}/home-practice`, abort.signal)
      .then((res: any) => {
        if (res.data?.homeReview) {
          const hr = res.data.homeReview as HomeReviewData;
          setReviewData(hr);
          setGameIds(res.data.gameIds || []);
          if (hr.completedToday) {
            setPart1Done(true);
            setPart2Done(true);
            setRewardClaimed(true);
          }
        } else if (res.data?.plan) {
          // Fallback compatibility
          const plan = res.data.plan;
          const fallbackData: HomeReviewData = {
            lessonId: plan.lessonId,
            lessonTitle: plan.lessonTitle,
            words: plan.words || [],
            sentencePatterns: [
              {
                _id: 'sample-p1',
                english: 'What is this?',
                vietnamese: 'Đây là cái gì thế con?',
                contentType: 'QUESTION'
              },
              {
                _id: 'sample-p2',
                english: `It's a ${plan.words?.[0]?.english || 'star'}!`,
                vietnamese: `Đó là một ${plan.words?.[0]?.vietnamese || 'ngôi sao'}!`,
                contentType: 'ANSWER'
              }
            ],
            parentGuidance: {
              title: plan.homeActivity?.title || '3 Bước Cùng Con Ôn Tập 5 Phút Tại Nhà',
              steps: plan.homeActivity?.steps || [
                'Chỉ tranh & Hỏi bé: Ba mẹ chạm vào từng hình từ vựng ở trên, hỏi bé: "What is this?" để bé gọi tên to rõ.',
                'Cùng luyện mẫu câu: Ba mẹ bấm loa nghe câu hỏi và câu trả lời mẫu, cùng bé đối thoại luân phiên.',
                'High-five & Xác nhận: Đập tay khen ngợi bé thật nồng nhiệt và bấm nút xác nhận bên dưới để nhận 3 sao!'
              ],
              teacherNote: plan.teacherNote
            },
            completedToday: false,
            starsAwarded: 0
          };
          setReviewData(fallbackData);
          setGameIds(res.data.gameIds || []);
        } else {
          setError('Chưa có nội dung ôn tập phù hợp cho bé hôm nay.');
        }
      })
      .catch((err: any) => {
        if (!abort.signal.aborted) {
          setError(err.message || 'Không thể tải bài ôn tập.');
        }
      })
      .finally(() => {
        setLoading(false);
      });

    return () => abort.abort();
  }, [childId]);

  // Check if both parts are finished -> award 3 stars!
  useEffect(() => {
    if (part1Done && part2Done && !rewardClaimed && !claiming && reviewData) {
      setClaiming(true);
      api.post(`/children/${childId}/home-practice/complete`, { lessonId: reviewData.lessonId })
        .then(() => {
          setRewardClaimed(true);
          setShowCelebration(true);
          refresh();
          sfx.playStarFanfare();
          sfx.playApplause();
          try {
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.5 }
            });
          } catch (e) {
            // silent
          }
        })
        .catch((err: any) => {
          console.error('Failed to claim 3 stars:', err);
        })
        .finally(() => {
          setClaiming(false);
        });
    }
  }, [part1Done, part2Done, rewardClaimed, claiming, reviewData, childId, refresh]);

  const words = useMemo(() => reviewData?.words || [], [reviewData]);
  const reviewGames = useMemo(() => getAvailableLessonGames(words, 1, 1, gameIds), [words, gameIds]);

  const handlePlayWord = (word: Vocabulary) => {
    sfx.playPop();
    setActiveAudioWord(word._id);
    void playWordAudio(word.english, word.audioUrl).finally(() => {
      setActiveAudioWord(null);
    });
  };

  const handlePlaySentence = (text: string, audioUrl?: string | null) => {
    sfx.playPop();
    void playWordAudio(text, audioUrl || undefined);
  };

  const handleConfirmParentPractice = () => {
    sfx.playSuccess();
    setPart2Done(true);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f2f8ec] via-[#f7faf4] to-[#eef6e8] text-slate-800 p-3 sm:p-5 md:p-6 lg:p-8 font-sans w-full">
      <div className="w-full max-w-[1536px] mx-auto space-y-5 sm:space-y-6">
        {/* TOP NAVIGATION & BACK BUTTON */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-teal-200 text-teal-800 font-bold text-sm shadow-sm hover:bg-teal-50 transition-all hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Về khu vườn</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/80 border border-teal-200 text-teal-900 font-bold text-xs shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{user?.name ? `Bé ${user.name}` : 'Góc học tập'}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-amber-100/90 border border-amber-300 text-amber-950 font-black text-xs sm:text-sm shadow-sm">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>{rewardClaimed ? 'Đã nhận +3 Sao ⭐' : 'Thưởng hoàn thành: +3 Sao ⭐'}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-yellow-300/90 border border-yellow-400 text-amber-950 font-black text-xs sm:text-sm shadow-sm">
              <Star className="w-4 h-4 text-yellow-600 fill-yellow-500" />
              <span>{rewards?.totalStars ?? 0} Sao</span>
            </div>
          </div>
        </div>

        {/* LOADING & ERROR STATES */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            <p className="text-emerald-900 font-black text-sm">Koko đang chuẩn bị bài ôn 5 phút cho bé và ba mẹ...</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-6 rounded-3xl bg-rose-50 border-2 border-rose-200 text-rose-800 text-center space-y-3 shadow-sm max-w-xl mx-auto">
            <p className="font-black text-lg">Ôi, chưa có bài ôn tập!</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-2xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors shadow-sm"
            >
              Quay lại trang chủ
            </button>
          </div>
        )}

        {reviewData && !loading && (
          <>
            {/* HERO CARD: LESSON RECAP & MISSION TRACKER (FULL WIDTH) */}
            <section className="relative overflow-hidden rounded-3xl border-3 border-teal-300 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 p-5 sm:p-7 text-white shadow-xl">
              <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center p-1 shadow-inner">
                    <KokoMascot state="waving" size="sm" interactive={false} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-white/20 backdrop-blur-md border border-white/20 text-emerald-100">
                        ⚡ 5 Phút Ôn Tập Ở Nhà Cùng Ba Mẹ
                      </span>
                      {rewardClaimed && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-yellow-400 text-amber-950 flex items-center gap-1 shadow-sm">
                          <Check className="w-3.5 h-3.5 stroke-[3]" /> Đã Nhận 3 Sao
                        </span>
                      )}
                    </div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-black drop-shadow-sm text-white">
                      {reviewData.lessonVietnameseTitle || reviewData.lessonTitle}
                    </h1>
                    <p className="text-xs sm:text-sm text-emerald-100 font-bold mt-0.5">
                      {reviewData.lessonTitle ? `Tiếng Anh: ${reviewData.lessonTitle}` : ''}
                      {reviewData.recentSession ? ' • Nội dung từ buổi học gần nhất ở trường' : ''}
                    </p>
                  </div>
                </div>

                {/* 2-STEP PROGRESS TRACKER PILL */}
                <div className="w-full lg:w-auto bg-black/20 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 flex flex-col gap-2">
                  <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">
                    Tiến độ hoàn thành:
                  </span>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-black">
                      {part1Done ? (
                        <CheckCircle2 className="w-5 h-5 text-yellow-300 fill-yellow-300/30 flex-shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-white/50 flex-shrink-0" />
                      )}
                      <span className={part1Done ? 'text-yellow-300' : 'text-white/80'}>
                        1. Bé ôn từ vựng & chơi game
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-black">
                      {part2Done ? (
                        <CheckCircle2 className="w-5 h-5 text-yellow-300 fill-yellow-300/30 flex-shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-white/50 flex-shrink-0" />
                      )}
                      <span className={part2Done ? 'text-yellow-300' : 'text-white/80'}>
                        2. Ba mẹ cùng luyện mẫu câu
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 2-COLUMN BALANCED WORKSPACE ON LARGE SCREENS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-stretch">
              {/* PHẦN 1: DÀNH CHO BÉ (ÔN TỪ VỰNG & CHƠI GAME MINI) */}
              <section className="bg-white rounded-3xl border-3 border-amber-200 p-5 sm:p-7 shadow-md flex flex-col justify-between space-y-5">
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xl shadow-inner flex-shrink-0">
                        <Gamepad2 className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2">
                          Phần 1: Dành cho bé · Ôn từ vựng & Chơi game
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">
                          Bé chạm vào tranh để nghe phát âm to rõ, rồi bấm nút Chơi Game cùng Koko nhé!
                        </p>
                      </div>
                    </div>
                    {part1Done ? (
                      <span className="self-start sm:self-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center gap-1 flex-shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" /> Bé đã chơi xong
                      </span>
                    ) : (
                      <span className="self-start sm:self-center px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black flex-shrink-0">
                        Bước 1 / 2
                      </span>
                    )}
                  </div>

                  {/* VOCABULARY CARDS GRID */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-4">
                    {words.map((word) => {
                      const isSpeaking = activeAudioWord === word._id;
                      return (
                        <button
                          key={word._id}
                          onClick={() => handlePlayWord(word)}
                          className={`group relative flex flex-col items-center justify-between p-3.5 rounded-3xl border-2 transition-all duration-200 text-center active:scale-95 ${
                            isSpeaking
                              ? 'border-amber-500 bg-amber-50 ring-4 ring-amber-200 scale-105'
                              : 'border-amber-100 bg-[#fffdf7] hover:border-amber-300 hover:shadow-md'
                          }`}
                        >
                          <div className="relative w-full aspect-square flex items-center justify-center p-1">
                            <img
                              src={word.imageUrl}
                              alt={word.english}
                              className="max-h-full max-w-full object-contain drop-shadow-sm group-hover:scale-110 transition-transform duration-200"
                            />
                            <div className="absolute top-1 right-1 w-7 h-7 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-amber-600 border border-amber-200 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                              <Volume2 className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <div className="w-full mt-2 pt-2 border-t border-amber-100/60">
                            <span className="block font-black text-slate-800 text-sm sm:text-base group-hover:text-amber-600 transition-colors">
                              {word.english}
                            </span>
                            <span className="block text-xs font-semibold text-slate-500 truncate">
                              {word.vietnamese}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* GAME RUNNER BUTTON */}
                <div className="pt-4 border-t border-amber-100">
                  <button
                    disabled={words.length === 0}
                    onClick={() => {
                      sfx.playPop();
                      setPlaying(true);
                    }}
                    className={`w-full py-4 px-6 rounded-2xl text-white font-black text-base sm:text-lg flex items-center justify-center gap-3 shadow-lg transition-all transform active:scale-98 ${
                      part1Done
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
                        : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 animate-pulse'
                    }`}
                  >
                    <Gamepad2 className="w-6 h-6 stroke-[2.5]" />
                    <span>
                      {part1Done
                        ? '🎮 Chơi Lại Game Ôn Tập Mini'
                        : '🎮 Bắt Đầu Chơi Game Ôn Tập Mini (3 câu nhanh)'}
                    </span>
                    <Play className="w-5 h-5 fill-white stroke-none" />
                  </button>
                  {part1Done && (
                    <p className="text-center text-xs text-emerald-700 font-bold mt-2">
                      ✨ Bé đã xuất sắc hoàn thành trò chơi từ vựng! Hãy cùng ba mẹ luyện mẫu câu ở Phần 2 nhé.
                    </p>
                  )}
                </div>
              </section>

              {/* PHẦN 2: DÀNH CHO BA MẸ (HƯỚNG DẪN ĐỒNG HÀNH & CÙNG CON LUYỆN MẪU CÂU) */}
              <section className="bg-white rounded-3xl border-3 border-sky-200 p-5 sm:p-7 shadow-md flex flex-col justify-between space-y-5">
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-black text-xl shadow-inner flex-shrink-0">
                        <HeartHandshake className="w-6 h-6 text-sky-600" />
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2">
                          Phần 2: Dành cho ba mẹ · Cùng con luyện mẫu câu
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">
                          Ba mẹ không cần giỏi tiếng Anh vẫn có thể đồng hành cùng con qua hướng dẫn dưới đây.
                        </p>
                      </div>
                    </div>
                    {part2Done ? (
                      <span className="self-start sm:self-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center gap-1 flex-shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" /> Ba mẹ & bé đã luyện xong
                      </span>
                    ) : (
                      <span className="self-start sm:self-center px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-black flex-shrink-0">
                        Bước 2 / 2
                      </span>
                    )}
                  </div>

                  {/* PARENTING GUIDANCE 3-STEP BOX */}
                  <div className="rounded-2xl bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-amber-50/80 border-2 border-amber-200/80 p-4 sm:p-5 space-y-3">
                    <div className="flex items-center gap-2 text-amber-900 font-black text-sm sm:text-base">
                      <Lightbulb className="w-5 h-5 text-amber-600 fill-amber-500/20" />
                      <span>{reviewData.parentGuidance.title || '3 Bước Đồng Hành 5 Phút Cùng Con:'}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      {reviewData.parentGuidance.steps.map((step, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-2xl bg-white/90 border border-amber-200/60 shadow-sm flex items-start gap-2.5"
                        >
                          <div className="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                            {idx + 1}
                          </div>
                          <p className="text-xs sm:text-sm text-slate-700 leading-snug font-medium">
                            {step}
                          </p>
                        </div>
                      ))}
                    </div>
                    {reviewData.parentGuidance.teacherNote && (
                      <div className="pt-2 text-xs font-bold text-teal-800 bg-teal-50/80 border border-teal-200/60 p-2.5 rounded-xl">
                        💬 Lời cô giáo gửi gắm: {reviewData.parentGuidance.teacherNote}
                      </div>
                    )}
                  </div>

                  {/* SENTENCE PATTERNS & DIALOGUES */}
                  <div className="space-y-3">
                    <h3 className="font-black text-slate-800 text-sm sm:text-base flex items-center gap-2">
                      <span>🗣️ Mẫu câu của bài học:</span>
                      <span className="text-xs text-slate-500 font-normal">
                        (Bấm vào loa để nghe mẫu phát âm)
                      </span>
                    </h3>
                    <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
                      {reviewData.sentencePatterns.map((sentence) => (
                        <div
                          key={sentence._id}
                          className="p-3.5 sm:p-4 rounded-2xl border-2 border-sky-100 bg-[#f7fbfe] hover:border-sky-300 transition-all flex items-start justify-between gap-3 shadow-sm group"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                  sentence.contentType === 'QUESTION'
                                    ? 'bg-sky-200 text-sky-900'
                                    : 'bg-emerald-200 text-emerald-900'
                                }`}
                              >
                                {sentence.contentType === 'QUESTION' ? 'Câu hỏi' : 'Câu đáp'}
                              </span>
                            </div>
                            <p className="font-black text-slate-800 text-base sm:text-lg group-hover:text-sky-700 transition-colors">
                              {sentence.english}
                            </p>
                            {sentence.vietnamese && (
                              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                                {sentence.vietnamese}
                              </p>
                            )}
                          </div>
                          <button
                            aria-label={`Nghe mẫu câu: ${sentence.english}`}
                            onClick={() => handlePlaySentence(sentence.english, sentence.audioUrl)}
                            className="w-10 h-10 rounded-2xl bg-white border border-sky-200 text-sky-600 flex items-center justify-center shadow-sm hover:bg-sky-600 hover:text-white transition-all flex-shrink-0 active:scale-90"
                          >
                            <Volume2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* PARENT CONFIRMATION BUTTON */}
                <div className="pt-4 border-t border-sky-100">
                  {part2Done ? (
                    <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-800 flex items-center justify-center gap-2 font-black text-sm sm:text-base shadow-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-600/20" />
                      <span>Ba mẹ và bé đã hoàn thành luyện mẫu câu!</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleConfirmParentPractice}
                      className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 text-white font-black text-base sm:text-lg flex items-center justify-center gap-3 shadow-lg transition-all active:scale-98"
                    >
                      <HeartHandshake className="w-6 h-6 stroke-[2.5]" />
                      <span>👍 Ba mẹ xác nhận: Hai ba mẹ & con đã luyện xong mẫu câu!</span>
                    </button>
                  )}
                </div>
              </section>
            </div>
          </>
        )}

        {/* REWARD CELEBRATION MODAL */}
        {showCelebration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="relative w-full max-w-md rounded-3xl bg-white border-4 border-amber-300 p-6 sm:p-8 text-center shadow-2xl space-y-5 animate-in zoom-in-95 duration-300">
              <div className="w-24 h-24 mx-auto rounded-3xl bg-amber-100 flex items-center justify-center shadow-inner relative">
                <PartyPopper className="w-12 h-12 text-amber-600 animate-bounce" />
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-amber-950 font-black text-sm shadow">
                  +3⭐
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-800">
                  🎉 CHÚC MỪNG BÉ VÀ BA MẸ!
                </h2>
                <p className="text-sm text-slate-600 font-medium">
                  Bé đã xuất sắc hoàn thành 5 phút ôn tập hôm nay và nhận được{' '}
                  <span className="font-black text-amber-600">3 ngôi sao may mắn</span>!
                </p>
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100 text-amber-950 text-xs sm:text-sm font-black border border-amber-200">
                  <Star className="w-4 h-4 text-amber-600 fill-amber-500" />
                  <span>Tổng sao hiện tại của bé: {rewards?.totalStars ?? 0} ⭐</span>
                </div>
              </div>

              {/* 3 GLOWING STARS */}
              <div className="flex items-center justify-center gap-3 py-2">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 border-2 border-yellow-200 flex items-center justify-center shadow-md animate-pulse"
                    style={{ animationDelay: `${s * 200}ms` }}
                  >
                    <Star className="w-8 h-8 text-white fill-white drop-shadow" />
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    sfx.playPop();
                    setShowCelebration(false);
                    navigate('/');
                  }}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-base shadow-lg transition-transform active:scale-95"
                >
                  Tuyệt vời! Về khu vườn
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FULLSCREEN GAME RUNNER MODAL */}
        {playing && reviewGames[0] && (
          <GameRunner
            config={{
              unitId: 'home-review',
              lessonId: 'home-review-' + (reviewData?.lessonId || 'recent'),
              gameId: reviewGames[0].id,
              vocabularyList: words,
              ageGroup: user?.ageGroupCode || '3-4',
              childId
            }}
            onExit={() => setPlaying(false)}
            onGameComplete={() => {
              setPlaying(false);
              setPart1Done(true);
              sfx.playSuccess();
            }}
          />
        )}
      </div>
    </main>
  );
}
