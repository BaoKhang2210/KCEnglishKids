import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Gamepad2, Compass } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { topicsApi, vocabularyApi } from '../../services/api';
import type { Topic, Vocabulary } from '../../types';
import { ChildHeader } from '../../components/child/ChildHeader';
import { ChildBottomNav } from '../../components/child/ChildBottomNav';
import { BigInteractiveFlashcard } from '../../components/child/BigInteractiveFlashcard';
import { KokoMascot } from '../../components/child/KokoMascot';
import { vocabMasteryService } from '../../services/vocabMasteryService';
import { sfx } from '../../utils/audio';

export const TopicDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const childId = (user as any)?.id || (user as any)?._id || 'guest';
  const childAge = user?.ageGroupCode || '3-4';

  const [topic, setTopic] = useState<Topic | null>(null);
  const [topicVocabs, setTopicVocabs] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setMasteryUpdateTick] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const loadTopicData = async () => {
      try {
        if (!slug) return;
        setLoading(true);

        // Fetch topic by slug/id
        const res = await topicsApi.getTopicById(slug);
        let currentTopic: Topic | null = null;
        if (res.success && res.data) {
          currentTopic = res.data;
          setTopic(currentTopic);
        }

        // Fetch curated vocabulary for this topic and age group
        if (currentTopic?._id) {
          const vRes = await vocabularyApi.getVocabulary(childAge, undefined, currentTopic._id);
          if (vRes.success && Array.isArray(vRes.data) && vRes.data.length > 0) {
            // Keep curated age-appropriate count (6 to 10 words)
            setTopicVocabs(vRes.data.slice(0, 10));
          } else {
            // Fallback: search by topic name/english name in vocabulary
            const searchRes = await vocabularyApi.getVocabulary(childAge, currentTopic.englishName);
            if (searchRes.success && Array.isArray(searchRes.data) && searchRes.data.length > 0) {
              setTopicVocabs(searchRes.data.slice(0, 10));
            }
          }
        }
      } catch (err) {
        console.error('Failed to load topic flashcards:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTopicData();

    // Listen to mastery updates to refresh counts
    const handleMasteryUpdate = () => {
      setMasteryUpdateTick(t => t + 1);
    };
    window.addEventListener('kc_vocab_mastery_updated', handleMasteryUpdate);
    return () => {
      window.removeEventListener('kc_vocab_mastery_updated', handleMasteryUpdate);
    };
  }, [slug, user, navigate, childAge]);

  const getBookTitle = (code?: string) => {
    if (code === '5-6') return 'Sách Book 3 (5–6 tuổi)';
    if (code === '4-5') return 'Sách Book 2 (4–5 tuổi)';
    return 'Sách Book 1 (3–4 tuổi)';
  };

  // Compute stats for this topic's vocabularies
  const masteredCount = topicVocabs.filter(v => vocabMasteryService.isMastered(childId, v._id)).length;
  const reviewCount = topicVocabs.filter(v => vocabMasteryService.isReview(childId, v._id)).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-amber-50/40 to-yellow-50 flex flex-col pb-24 md:pb-12">
      <ChildHeader />

      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 flex-1">
        {/* Top Nav: Back to topics tab */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => {
              sfx.playPop();
              navigate('/?tab=topics');
            }}
            aria-label="Quay lại danh sách chủ đề"
            className="w-13 h-13 rounded-2xl bg-white border-2 border-slate-200 hover:bg-amber-50 flex items-center justify-center text-slate-700 cursor-pointer shadow-sm active:scale-95 transition-all"
          >
            <ArrowLeft className="w-7 h-7 stroke-[2.5]" />
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl sm:text-4xl">{topic?.icon || '🌈'}</span>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
                {topic?.englishName || 'Chủ đề từ vựng'}
              </h1>
            </div>
            <p className="text-sm sm:text-base font-extrabold text-amber-700">
              {topic?.vietnameseName} • {getBookTitle(user?.ageGroupCode)}
            </p>
          </div>
        </div>

        {/* Hero Banner: Decoupled Flashcard Exploration space */}
        <section className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 rounded-3xl p-6 sm:p-7 text-white shadow-lg mb-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-48 h-48 bg-white/20 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row pt-2 sm:pt-0">
              <div className="flex-shrink-0 pt-2">
                <KokoMascot
                  state="happy"
                  size="sm"
                  speechBubble="Quẹt thẻ cùng Koko nào! 🐾"
                />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 bg-white/25 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black mb-1.5">
                  <Sparkles className="w-4 h-4 text-yellow-200" />
                  Chủ đề mở rộng • Thẻ thông minh Flashcard
                </div>
                <h2 className="text-2xl sm:text-3xl font-black mb-1">
                  Khám phá từ vựng {topic?.englishName || ''}
                </h2>
                <p className="text-amber-50 font-bold text-sm max-w-md">
                  Quẹt phải để lưu từ <span className="text-emerald-200 underline">Đã nhớ 💚</span>, quẹt trái để đánh dấu <span className="text-yellow-200 underline">Chưa nhớ 🧡</span> nhé bé!
                </p>
              </div>
            </div>

            {/* Quick Topic Mastery Stats */}
            <div className="flex items-center gap-3 bg-white/20 backdrop-blur-md px-4 py-2.5 rounded-2xl">
              <div className="text-center">
                <span className="text-xs font-bold text-amber-100 block">Tổng số từ</span>
                <span className="text-xl font-black text-white">{topicVocabs.length}</span>
              </div>
              <div className="w-px h-8 bg-white/30" />
              <div className="text-center">
                <span className="text-xs font-bold text-emerald-200 block">Đã nhớ</span>
                <span className="text-xl font-black text-emerald-300">
                  {masteredCount}
                </span>
              </div>
              <div className="w-px h-8 bg-white/30" />
              <div className="text-center">
                <span className="text-xs font-bold text-yellow-200 block">Cần ôn</span>
                <span className="text-xl font-black text-yellow-300">
                  {reviewCount}
                </span>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <p className="font-black text-amber-800 text-sm">Đang tải bộ thẻ từ vựng...</p>
          </div>
        ) : topicVocabs.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border-3 border-dashed border-amber-200">
            <p className="font-black text-slate-600 text-lg mb-2">Chưa có từ vựng cho chủ đề này.</p>
            <button
              onClick={() => navigate('/?tab=topics')}
              className="btn-3d-amber text-amber-950 font-black text-sm px-6 py-2.5 rounded-2xl mt-3"
            >
              Chọn chủ đề khác
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Interactive Flashcard Component */}
            <section className="bg-white/80 rounded-3xl border-3 border-amber-200/90 p-6 sm:p-8 shadow-sm">
              <BigInteractiveFlashcard items={topicVocabs} childId={childId} />
            </section>

            {/* Quick Action Navigation Buttons */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Button: Play mini games with words */}
              <div
                onClick={() => {
                  sfx.playPop();
                  navigate('/?tab=games');
                }}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-3xl p-5 flex items-center justify-between gap-4 cursor-pointer shadow-md hover:scale-103 active:scale-98 transition-all border-3 border-emerald-600"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shadow-inner">
                    🎮
                  </div>
                  <div>
                    <h3 className="font-black text-lg">Chơi trò chơi từ vựng</h3>
                    <p className="text-xs font-bold text-emerald-100">
                      Luyện phản xạ với các từ bé đã thuộc!
                    </p>
                  </div>
                </div>
                <Gamepad2 className="w-6 h-6 stroke-[2.5]" />
              </div>

              {/* Button: Return to all topics */}
              <div
                onClick={() => {
                  sfx.playPop();
                  navigate('/?tab=topics');
                }}
                className="bg-white hover:bg-amber-50 border-3 border-amber-300 text-slate-700 rounded-3xl p-5 flex items-center justify-between gap-4 cursor-pointer shadow-md hover:scale-103 active:scale-98 transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-2xl shadow-inner">
                    🌈
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-800">Khám phá chủ đề khác</h3>
                    <p className="text-xs font-bold text-slate-500">
                      Rất nhiều chủ đề từ vựng phong phú!
                    </p>
                  </div>
                </div>
                <Compass className="w-6 h-6 text-amber-500 stroke-[2.5]" />
              </div>
            </div>
          </div>
        )}
      </main>

      <ChildBottomNav />
    </div>
  );
};
