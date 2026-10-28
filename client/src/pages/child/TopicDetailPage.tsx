import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Gamepad2, Compass } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { topicsApi, vocabularyApi } from '../../services/api';
import type { Topic, Vocabulary } from '../../types';
import { BigInteractiveFlashcard } from '../../components/child/BigInteractiveFlashcard';
import { vocabMasteryService } from '../../services/vocabMasteryService';
import { sfx } from '../../utils/audio';
import { ScreenShell } from '../../components/layout/ScreenShell';
import { topicArt } from '../../utils/learningArt';

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

  return (
    <ScreenShell
      titleBar={
        <div className="w-full flex items-center justify-between gap-2 bg-white/90 backdrop-blur-xs px-3 sm:px-4 py-1.5 rounded-2xl border-2 border-amber-200/80 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => {
                sfx.playPop();
                navigate('/?tab=topics');
              }}
              aria-label="Quay lại danh sách chủ đề"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-50 hover:bg-amber-100 border-2 border-slate-200 flex items-center justify-center text-slate-700 cursor-pointer shadow-2xs active:scale-95 transition-all shrink-0"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            <img src={topic?.imageUrl || topicArt(topic?.slug)} alt="" className="w-12 h-10 object-cover rounded-xl shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-black text-slate-800 truncate leading-tight">
                {topic?.englishName || 'Chủ đề từ vựng'}
              </h1>
              <p className="text-[11px] font-extrabold text-amber-700 truncate leading-tight">
                {topic?.vietnameseName} • {getBookTitle(user?.ageGroupCode)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-amber-100/80 px-2.5 py-1 rounded-xl border border-amber-300 text-xs font-black text-amber-900 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>{topicVocabs.length} từ vựng</span>
            {masteredCount > 0 && <span className="text-emerald-700 ml-1">({masteredCount} ⭐)</span>}
          </div>
        </div>
      }
      actionBar={
        <div className="w-full flex items-center justify-between gap-2">
          <button
            onClick={() => {
              sfx.playPop();
              navigate('/?tab=topics');
            }}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50 border-2 border-amber-200 text-slate-700 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
          >
            <Compass className="w-4 h-4 text-amber-500" />
            <span>Đổi chủ đề</span>
          </button>

          <button
            onClick={() => {
              sfx.playPop();
              navigate('/?tab=games');
            }}
            className="btn-3d-amber text-amber-950 font-black text-xs py-1.5 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Chơi game ôn tập ➔</span>
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="font-black text-amber-800 text-xs">Đang tải bộ thẻ từ vựng...</p>
        </div>
      ) : topicVocabs.length === 0 ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="bg-white rounded-3xl p-8 text-center border-3 border-dashed border-amber-200 max-w-sm">
            <p className="font-black text-slate-600 text-sm mb-3">Chưa có từ vựng cho chủ đề này.</p>
            <button
              onClick={() => navigate('/?tab=topics')}
              className="btn-3d-amber text-amber-950 font-black text-xs px-5 py-2 rounded-xl"
            >
              Chọn chủ đề khác
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full h-full min-h-0 flex flex-col overflow-hidden bg-white/80 rounded-2xl border-2 border-amber-200/90 p-2 sm:p-4">
          <BigInteractiveFlashcard items={topicVocabs} childId={childId} />
        </div>
      )}
    </ScreenShell>
  );
};
