import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  Gamepad2,
  HeartHandshake,
  Star,
  ArrowLeft,
  PartyPopper,
  Check,
  Play,
  RotateCcw
} from 'lucide-react';

interface HomeReviewData {
  lessonId: string;
  lessonTitle: string;
  lessonVietnameseTitle?: string;
  teacherName?: string;
  classroomName?: string;
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
  isCompleted?: boolean;
  starsAwarded: number;
}

export function MyLearningPage() {
  const { user } = useAuth();
  const { refresh, rewards } = useRewards();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryLessonId = searchParams.get('lessonId');
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

    const endpoint = queryLessonId
      ? `/children/${childId}/home-practice?lessonId=${encodeURIComponent(queryLessonId)}`
      : `/children/${childId}/home-practice`;

    api.get(endpoint, abort.signal)
      .then((res: any) => {
        if (res.data?.homeReview && res.data.homeReview.lessonId) {
          const hr = res.data.homeReview as HomeReviewData;
          setReviewData(hr);
          setGameIds(res.data.gameIds || []);
          if (hr.completedToday || (hr as any).isCompleted) {
            setPart1Done(true);
            setPart2Done(true);
            setRewardClaimed(true);
          }
        } else {
          setReviewData(null);
          setError('Giáo viên trên lớp chưa dạy bài học nào để ôn tập. Bé hãy tham gia buổi học trên lớp cùng cô trước nhé!');
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
  }, [childId, queryLessonId]);

  // Check if both parts are finished -> award 3 stars idempotently!
  useEffect(() => {
    if (part1Done && part2Done && !rewardClaimed && !claiming && reviewData) {
      setClaiming(true);
      api.post(`/children/${childId}/home-practice/complete`, { lessonId: reviewData.lessonId })
        .then((res: any) => {
          setRewardClaimed(true);
          const isNewlyCompleted = res.data?.data?.newlyCompleted ?? res.data?.newlyCompleted ?? false;
          if (isNewlyCompleted) {
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
          } else {
            refresh();
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
      <div className="w-full max-w-[1536px] mx-auto space-y-4 sm:space-y-5">
        {/* TOP NAVIGATION & STARS */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-teal-200 text-teal-800 font-bold text-sm shadow-xs hover:bg-teal-50 transition-all hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Về khu vườn</span>
          </Link>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-yellow-300 border border-yellow-400 text-amber-950 font-black text-sm shadow-xs">
            <Star className="w-4 h-4 text-yellow-600 fill-yellow-500" />
            <span>{rewards?.totalStars ?? 0} Sao</span>
          </div>
        </div>

        {/* LOADING & ERROR STATES */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            <p className="text-emerald-900 font-bold text-sm">Koko đang chuẩn bị bài ôn 5 phút...</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-6 rounded-3xl bg-rose-50 border-2 border-rose-200 text-rose-800 text-center space-y-3 shadow-xs max-w-xl mx-auto">
            <p className="font-black text-lg">Chưa có bài ôn tập</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-2xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors shadow-xs"
            >
              Quay lại trang chủ
            </button>
          </div>
        )}

        {reviewData && !loading && (
          <>
            {/* HERO CARD: CLEAN LESSON RECAP & COMPACT STATUS */}
            <section className="relative overflow-hidden rounded-3xl border-2 border-teal-300 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 p-5 sm:p-6 text-white shadow-lg">
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="shrink-0 w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center p-1 shadow-inner">
                    <KokoMascot state="waving" size="sm" interactive={false} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      {reviewData.classroomName && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md text-emerald-100">
                          Lớp {reviewData.classroomName}
                        </span>
                      )}
                      {reviewData.teacherName && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md text-emerald-100">
                          Cô {reviewData.teacherName}
                        </span>
                      )}
                      {rewardClaimed ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-amber-950 flex items-center gap-1 shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" /> Đã nhận 3 sao
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-300 text-amber-950 flex items-center gap-1 shadow-xs">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600" /> Thưởng +3 sao
                        </span>
                      )}
                    </div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white drop-shadow-xs">
                      {reviewData.lessonVietnameseTitle || reviewData.lessonTitle}
                      {reviewData.lessonVietnameseTitle && reviewData.lessonTitle && (
                        <span className="text-emerald-100/90 font-bold text-base sm:text-xl ml-2">
                          ({reviewData.lessonTitle})
                        </span>
                      )}
                    </h1>
                  </div>
                </div>
              </div>
            </section>

            {/* 2-COLUMN BALANCED WORKSPACE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
              {/* PHẦN 1: ÔN TỪ VỰNG & CHƠI GAME */}
              <section className="bg-white rounded-3xl border-2 border-amber-200 p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-amber-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black text-lg shadow-inner shrink-0">
                        <Gamepad2 className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-black text-slate-800">
                          1. Bé ôn từ vựng & chơi game
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">
                          Chạm vào tranh để nghe phát âm, sau đó vào chơi game nhé!
                        </p>
                      </div>
                    </div>
                    {part1Done && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1 shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" /> Xong
                      </span>
                    )}
                  </div>

                  {/* VOCABULARY CARDS GRID */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {words.map((word) => {
                      const isSpeaking = activeAudioWord === word._id;
                      return (
                        <button
                          key={word._id}
                          onClick={() => handlePlayWord(word)}
                          className={`group relative flex flex-col items-center justify-between p-3 rounded-2xl border-2 transition-all duration-200 text-center active:scale-95 ${isSpeaking
                            ? 'border-amber-500 bg-amber-50 ring-3 ring-amber-200 scale-105'
                            : 'border-amber-100 bg-[#fffdf7] hover:border-amber-300 hover:shadow-xs'
                            }`}
                        >
                          <div className="relative w-full aspect-square flex items-center justify-center p-1">
                            <img
                              src={word.imageUrl}
                              alt={word.english}
                              className="max-h-full max-w-full object-contain drop-shadow-xs group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute top-0.5 right-0.5 w-6 h-6 rounded-full bg-white/90 shadow-xs flex items-center justify-center text-amber-600 border border-amber-200 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                              <Volume2 className="w-3 h-3" />
                            </div>
                          </div>
                          <div className="w-full mt-1.5 pt-1.5 border-t border-amber-100/60">
                            <span className="block font-black text-slate-800 text-sm group-hover:text-amber-600 transition-colors">
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
                <div className="pt-3 border-t border-amber-100">
                  <button
                    disabled={words.length === 0}
                    onClick={() => {
                      sfx.playPop();
                      setPlaying(true);
                    }}
                    className={`w-full py-3.5 px-5 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-98 cursor-pointer ${part1Done
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
                      : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600'
                      }`}
                  >
                    <Gamepad2 className="w-5 h-5 stroke-[2.5]" />
                    <span>{part1Done ? 'Chơi lại game mini' : 'Chơi game ôn tập'}</span>
                    <Play className="w-4 h-4 fill-white stroke-none" />
                  </button>
                </div>
              </section>

              {/* PHẦN 2: CÙNG CON LUYỆN MẪU CÂU */}
              <section className="bg-white rounded-3xl border-2 border-sky-200 p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-sky-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-black text-lg shadow-inner shrink-0">
                        <HeartHandshake className="w-5 h-5 text-sky-600" />
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-black text-slate-800">
                          2. Ba mẹ cùng con luyện câu
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">
                          Bấm loa để nghe mẫu phát âm và đối thoại cùng bé
                        </p>
                      </div>
                    </div>
                    {part2Done && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1 shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" /> Xong
                      </span>
                    )}
                  </div>

                  {/* TEACHER NOTE (IF PRESENT) */}
                  {reviewData.parentGuidance?.teacherNote && (
                    <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-teal-900 font-medium leading-relaxed">
                      💬 <span className="font-bold">Lời nhắn của cô:</span> {reviewData.parentGuidance.teacherNote}
                    </div>
                  )}

                  {/* SENTENCE PATTERNS */}
                  <div className="space-y-2.5">
                    {reviewData.sentencePatterns.map((sentence) => (
                      <div
                        key={sentence._id}
                        className="p-3 rounded-2xl border border-sky-100 bg-[#f7fbfe] hover:border-sky-300 transition-all flex items-start justify-between gap-3 shadow-2xs group"
                      >
                        <div className="space-y-0.5">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${sentence.contentType === 'QUESTION'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-emerald-100 text-emerald-800'
                              }`}
                          >
                            {sentence.contentType === 'QUESTION' ? 'Câu hỏi' : 'Câu trả lời'}
                          </span>
                          <p className="font-black text-slate-800 text-base group-hover:text-sky-700 transition-colors">
                            {sentence.english}
                          </p>
                          {sentence.vietnamese && (
                            <p className="text-xs text-slate-600 font-medium">
                              {sentence.vietnamese}
                            </p>
                          )}
                        </div>
                        <button
                          aria-label={`Nghe mẫu: ${sentence.english}`}
                          onClick={() => handlePlaySentence(sentence.english, sentence.audioUrl)}
                          className="w-9 h-9 rounded-xl bg-white border border-sky-200 text-sky-600 flex items-center justify-center shadow-xs hover:bg-sky-600 hover:text-white transition-all shrink-0 active:scale-90"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PARENT CONFIRMATION BUTTON */}
                <div className="pt-3 border-t border-sky-100">
                  {part2Done ? (
                    <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 flex items-center justify-between gap-2 text-sm font-bold shadow-2xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Đã hoàn thành luyện mẫu câu!</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          sfx.playPop();
                          setPart2Done(false);
                        }}
                        className="px-3 py-1 rounded-xl bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-2xs"
                      >
                        <RotateCcw size={12} />
                        <span>Luyện lại</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleConfirmParentPractice}
                      className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 text-white font-black text-base flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-98 cursor-pointer"
                    >
                      <HeartHandshake className="w-5 h-5 stroke-[2.5]" />
                      <span>👍 Ba mẹ xác nhận đã luyện xong</span>
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
              <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-100 flex items-center justify-center shadow-inner relative">
                <PartyPopper className="w-10 h-10 text-amber-600 animate-bounce" />
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-amber-950 font-black text-sm shadow">
                  +3⭐
                </div>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-800">
                  🎉 CHÚC MỪNG BÉ VÀ BA MẸ!
                </h2>
                <p className="text-sm text-slate-600 font-medium">
                  Bé đã hoàn thành 5 phút ôn tập hôm nay và nhận được{' '}
                  <span className="font-black text-amber-600">3 ngôi sao</span>!
                </p>
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-950 text-xs sm:text-sm font-black border border-amber-200">
                  <Star className="w-4 h-4 text-amber-600 fill-amber-500" />
                  <span>Tổng sao của bé: {rewards?.totalStars ?? 0} ⭐</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 py-2">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 border-2 border-yellow-200 flex items-center justify-center shadow-md animate-pulse"
                    style={{ animationDelay: `${s * 200}ms` }}
                  >
                    <Star className="w-7 h-7 text-white fill-white drop-shadow" />
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
                  className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-base shadow-lg transition-transform active:scale-95 cursor-pointer"
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
