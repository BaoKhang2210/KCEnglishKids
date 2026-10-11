/**
 * TopicDetailPage — /topics/:slug
 *
 * 100dvh viewport-locked shell (LessonShell), no outer scroll.
 * Flashcard now uses the shared FlashcardView (variant='topic') so the
 * layout and action-bar are identical to Chặng 1 in LessonDetailPage.
 *
 * What's different from variant='lesson':
 *   • Koko state machine is OFF (Koko stays 'happy', no auto-advance)
 *   • 🧡/💚 mastery buttons shown in the right column (TOPIC_SELF_MARKING=true)
 *   • Swipe left = 🧡 (cần ôn), swipe right = 💚 (đã nhớ)
 *   • onCompleteStep → shows completion screen inside FlashcardView
 *     (we pass a handler that navigates nowhere; session-complete screen
 *      is rendered by FlashcardView itself when idx >= deck.length)
 *
 * Layout:
 *   ┌──────────────────────────────────────────────┐ ← 100dvh
 *   │  TopicTopBar           (~60–72px)            │
 *   ├──────────────────────────────────────────────┤
 *   │  FlashcardView variant='topic'  (flex-1)     │
 *   │  ├─ ProgressDots  (inside FlashcardView)    │
 *   │  ├─ card frame 2-col md / 1-col mobile      │
 *   │  └─ footer ◀🔊🎤➜                          │
 *   └──────────────────────────────────────────────┘
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Shield, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { topicsApi, vocabularyApi } from '../../services/api';
import type { Topic, Vocabulary } from '../../types';
import { LessonShell } from '../../components/child/lesson/LessonShell';
import { FlashcardView } from '../../components/child/lesson/FlashcardView';
import { vocabMasteryService } from '../../services/vocabMasteryService';
import { sfx } from '../../utils/audio';

// ─────────────────────────────────────────────────────────────────────────────
//  TopicTopBar
// ─────────────────────────────────────────────────────────────────────────────
interface TopicTopBarProps {
  topicIcon?: string;
  topicName?: string;
  onBack: () => void;
  onHome: () => void;
  onOpenParentSheet: () => void;
}

const TopicTopBar: React.FC<TopicTopBarProps> = ({
  topicIcon = '🌈',
  topicName = '',
  onBack,
  onHome,
  onOpenParentSheet,
}) => (
  <header
    style={{ height: 'clamp(60px, 9dvh, 72px)', minHeight: '60px', maxHeight: '72px' }}
    className="flex-shrink-0 w-full bg-white/95 backdrop-blur-md border-b-3 border-amber-300 px-3 sm:px-6 flex items-center justify-between z-30 select-none shadow-xs"
  >
    {/* Left: ← and 🏠 */}
    <div className="flex items-center gap-2 flex-shrink-0">
      <button
        onClick={onBack}
        aria-label="Quay lại danh sách chủ đề"
        style={{ width: '56px', height: '56px' }}
        className="rounded-2xl bg-amber-50 hover:bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-slate-800 cursor-pointer active:scale-95 transition-all shadow-sm"
      >
        <ArrowLeft className="w-7 h-7 stroke-[2.8]" />
      </button>
      <button
        onClick={onHome}
        aria-label="Về trang chủ"
        style={{ width: '56px', height: '56px' }}
        className="rounded-2xl bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center text-emerald-800 cursor-pointer active:scale-95 transition-all shadow-sm"
      >
        <Home className="w-7 h-7 stroke-[2.6]" />
      </button>
    </div>

    {/* Center: topic icon + name */}
    <div className="flex items-center gap-2 min-w-0 flex-1 justify-center px-3">
      <span className="text-2xl flex-shrink-0" aria-hidden="true">{topicIcon}</span>
      <span
        className="font-black text-slate-800 truncate"
        style={{ fontSize: 'clamp(16px, 2.5vw, 22px)' }}
        title={topicName}
      >
        {topicName}
      </span>
    </div>

    {/* Right: Parent sheet */}
    <div className="flex items-center flex-shrink-0">
      <button
        onClick={onOpenParentSheet}
        aria-label="Thông tin chủ đề và cài đặt"
        style={{ minHeight: '48px', minWidth: '48px' }}
        className="rounded-2xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 px-3 py-1.5 flex items-center gap-1.5 text-slate-700 cursor-pointer active:scale-95 transition-all shadow-xs"
      >
        <Shield className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <span className="font-black text-xs hidden md:inline">Phụ huynh</span>
      </button>
    </div>
  </header>
);

// ─────────────────────────────────────────────────────────────────────────────
//  ParentSheet
// ─────────────────────────────────────────────────────────────────────────────
interface ParentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  topic: Topic | null;
  vocabItems: Vocabulary[];
  masteredCount: number;
  reviewCount: number;
}

const ParentSheet: React.FC<ParentSheetProps> = ({
  isOpen,
  onClose,
  topic,
  vocabItems,
  masteredCount,
  reviewCount,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl border-t-4 border-amber-300 shadow-2xl flex flex-col"
        style={{ maxHeight: '70dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 flex-shrink-0 border-b border-slate-100">
          <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-600" />
            Thông tin chủ đề
          </h3>
          <button
            onClick={onClose}
            aria-label="Đóng"
            style={{ minWidth: '48px', minHeight: '48px' }}
            className="rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Topic info */}
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{topic?.icon || '🌈'}</span>
              <div>
                <p className="font-black text-slate-800">
                  {topic?.englishName || ''}{topic?.vietnameseName ? ` · ${topic.vietnameseName}` : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Mastery stats */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-black text-slate-500 uppercase tracking-wide mb-3">Tiến độ học</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-black text-slate-700">{vocabItems.length}</p>
                <p className="text-xs font-bold text-slate-500">Tổng từ</p>
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-600">{masteredCount}</p>
                <p className="text-xs font-bold text-emerald-700">💚 Đã nhớ</p>
              </div>
              <div>
                <p className="text-2xl font-black text-amber-600">{reviewCount}</p>
                <p className="text-xs font-bold text-amber-700">💡 Cần ôn</p>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-sky-50 rounded-2xl border border-sky-200 p-4">
            <p className="text-xs font-black text-sky-600 uppercase tracking-wide mb-2">Hướng dẫn</p>
            <p className="text-sm font-bold text-sky-900 leading-relaxed">
              Bấm 💚 hoặc vuốt phải để đánh dấu Đã nhớ. Bấm 🧡 hoặc vuốt trái để đánh dấu Cần ôn. Từ cần ôn sẽ xuất hiện lại ở cuối bộ thẻ. Bấm ➜ để sang thẻ tiếp theo mà không đánh dấu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  TopicDetailPage
// ─────────────────────────────────────────────────────────────────────────────
export const TopicDetailPage: React.FC = () => {
  const { slug }  = useParams<{ slug: string }>();
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const childId  = (user as any)?.id || (user as any)?._id || 'guest';
  const childAge = user?.ageGroupCode || '3-4';

  const [topic, setTopic]             = useState<Topic | null>(null);
  const [topicVocabs, setTopicVocabs] = useState<Vocabulary[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showParentSheet, setShowParentSheet] = useState(false);
  const [, setMasteryTick]            = useState(0);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }

    const load = async () => {
      try {
        if (!slug) return;
        setLoading(true);

        const res = await topicsApi.getTopicById(slug);
        let current: Topic | null = null;
        if (res.success && res.data) {
          current = res.data;
          setTopic(current);
        }

        if (current?._id) {
          const vRes = await vocabularyApi.getVocabulary(childAge, undefined, current._id);
          if (vRes.success && Array.isArray(vRes.data) && vRes.data.length > 0) {
            setTopicVocabs(vRes.data.slice(0, 10));
          } else {
            const searchRes = await vocabularyApi.getVocabulary(childAge, current.englishName);
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

    load();

    const onMasteryUpdate = () => setMasteryTick(t => t + 1);
    window.addEventListener('kc_vocab_mastery_updated', onMasteryUpdate);
    return () => window.removeEventListener('kc_vocab_mastery_updated', onMasteryUpdate);
  }, [slug, user, navigate, childAge]);

  // Mastery counts for ParentSheet (same service as game)
  const masteredCount = topicVocabs.filter(v => vocabMasteryService.isMastered(childId, v._id)).length;
  const reviewCount   = topicVocabs.filter(v => vocabMasteryService.isReview(childId, v._id)).length;

  return (
    <LessonShell stage={1}>
      {/* ── Top bar ── */}
      <TopicTopBar
        topicIcon={topic?.icon || '🌈'}
        topicName={topic?.englishName || ''}
        onBack={() => { sfx.playPop(); navigate('/?tab=topics'); }}
        onHome={() => { sfx.playPop(); navigate('/'); }}
        onOpenParentSheet={() => { sfx.playPop(); setShowParentSheet(true); }}
      />

      {/* ── Content area ── */}
      <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col px-3 sm:px-5 py-2">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-14 h-14 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <p className="font-black text-amber-800 text-sm">Đang tải bộ thẻ từ vựng...</p>
          </div>
        ) : topicVocabs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <span className="text-6xl">🔍</span>
            <p className="font-black text-slate-600 text-lg">Chưa có từ vựng cho chủ đề này.</p>
            <button
              onClick={() => navigate('/?tab=topics')}
              className="btn-3d-amber text-amber-950 font-black text-sm px-6 py-3 rounded-2xl"
            >
              Chọn chủ đề khác
            </button>
          </div>
        ) : (
          /*
           * FlashcardView variant='topic':
           *   • Same layout as Chặng 1 (grid 2-col md / 1-col, WordImage,
           *     clamp font sizes, identical action bar ◀🔊🎤➜)
           *   • Koko stays 'happy' (no state machine, no auto-advance)
           *   • 🧡/💚 mastery buttons in right column
           *   • Swipe left/right → handleReview/handleRemember
           *   • onCompleteStep → FlashcardView renders its own session-
           *     complete screen (with 🎮/🌈 CTAs) when idx >= deck.length
           */
          <FlashcardView
            key={topic?._id}       /* reset deck when topic slug changes */
            variant="topic"
            items={topicVocabs}
            childId={childId}
            onCompleteStep={() => {
              /* FlashcardView handles the completion screen internally.
                 Nothing to do at the page level. */
            }}
          />
        )}
      </div>

      {/* ── Parent sheet ── */}
      <ParentSheet
        isOpen={showParentSheet}
        onClose={() => setShowParentSheet(false)}
        topic={topic}
        vocabItems={topicVocabs}
        masteredCount={masteredCount}
        reviewCount={reviewCount}
      />
    </LessonShell>
  );
};
