import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Check,
  LockKeyhole,
  Sparkles,
  Star,
  Trophy,
  BookOpen,
  Compass,
  ArrowRight,
  Gift
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { learningApi, topicsApi, lessonsApi, vocabularyApi } from '../../services/api';
import type { ProgressSummary, Topic, Vocabulary } from '../../types';
import { ChildHeader } from '../../components/child/ChildHeader';
import { ChildBottomNav } from '../../components/child/ChildBottomNav';
import { KokoMascot } from '../../components/child/KokoMascot';
import { ChildArcadeSection } from '../../components/child/ChildArcadeSection';
import { ChildVocabNotebookSection } from '../../components/child/ChildVocabNotebookSection';
import { SecretGiftModal } from '../../components/child/SecretGiftModal';
import { ALL_BADGES } from '../../data/badges';
import { ALL_STICKERS, stickerService } from '../../data/stickers';
import { sfx } from '../../utils/audio';
import { vocabMasteryService } from '../../services/vocabMasteryService';
import { BadgeShowcaseModal } from '../../components/child/BadgeShowcaseModal';

interface CurriculumLesson {
  _id: string;
  lessonNumber: number;
  title: string;
  vietnameseTitle?: string;
  vocabularyItems?: any[];
  activityCount?: number;
  completed: boolean;
  stars: number;
}

interface CurriculumUnit {
  _id: string;
  unitNumber: number;
  bigQuestion?: string;
  storyTitle?: string;
  topic?: any;
  topicSlug?: string;
  topicName?: string;
  topicVietnameseName?: string;
  topicIcon?: string;
  topicColor?: string;
  lessons: CurriculumLesson[];
  totalLessons: number;
  completedLessons: number;
  totalUnitStars: number;
  isCompleted: boolean;
}

export const ChildHomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Active Tab
  const activeTab = params.get('tab') || 'path';
  const ageCode = user?.ageGroupCode || '3-4';

  // Data States
  const [units, setUnits] = useState<CurriculumUnit[]>([]);
  const [ageTopics, setAgeTopics] = useState<Topic[]>([]);
  const [vocabularyList, setVocabularyList] = useState<Vocabulary[]>([]);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Secret Gift Modal state
  const [showSecretGift, setShowSecretGift] = useState(false);
  const [secretGiftData, setSecretGiftData] = useState<{
    unit: any;
    unitIndex: number;
    isCompleted: boolean;
  } | null>(null);

  // Badges Category filter state
  const [badgeCategory, setBadgeCategory] = useState<'all' | 'journey' | 'stars' | 'skills'>('all');
  const [rewardTab, setRewardTab] = useState<'badges' | 'stickers'>('badges');
  const [showcaseBadge, setShowcaseBadge] = useState<any>(null);

  // Friendly Sequential Gatekeeper Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = React.useRef<any>(null);

  const handleLockedClick = (msg: string) => {
    sfx.playPop();
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Load all required data strictly scoped by the child's age group
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const loadAll = async () => {
      try {
        setLoading(true);
        const childId = (user as any).id || (user as any)._id;

        // Fetch curriculum path, topics strictly for this child's age group, vocabulary, and progress
        const [pathRes, topicsRes, vocabRes, progressRes] = await Promise.all([
          lessonsApi.getCurriculumPath(ageCode, childId),
          topicsApi.getTopics(ageCode), // Scoped strictly to child's age
          vocabularyApi.getVocabulary(ageCode), // Scoped strictly to child's age
          learningApi.getChildProgress(childId),
        ]);

        if (pathRes.success && Array.isArray(pathRes.data)) {
          setUnits(pathRes.data);
          try {
            const journeyVocabs: any[] = [];
            pathRes.data.forEach((unit: CurriculumUnit, unitIdx: number) => {
              const isUnitAccessible = unitIdx === 0 || !!pathRes.data[unitIdx - 1]?.isCompleted;
              (unit.lessons || []).forEach((lesson: CurriculumLesson, lessonIdx: number) => {
                const isLessonAccessible = isUnitAccessible && (lesson.completed || lessonIdx === 0 || !!unit.lessons[lessonIdx - 1]?.completed);
                if ((lesson.completed || isLessonAccessible) && Array.isArray(lesson.vocabularyItems)) {
                  lesson.vocabularyItems.forEach(v => {
                    if (v && (v._id || v.word || v.english)) journeyVocabs.push(v);
                  });
                }
              });
            });
            if (journeyVocabs.length > 0) {
              vocabMasteryService.registerJourneyWords(childId, journeyVocabs);
            }
          } catch (e) {
            console.warn('Could not register journey words into mastery service:', e);
          }
        }
        if (topicsRes.success) setAgeTopics(topicsRes.data);
        if (vocabRes.success) setVocabularyList(vocabRes.data);
        if (progressRes.success) setProgress(progressRes.data);
      } catch (err) {
        console.error('Failed to load child home data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [ageCode, navigate, user]);

  const totalStars = progress?.totalStars || units.reduce((acc, u) => acc + (u.totalUnitStars || 0), 0) || 0;
  const completedLessons =
    progress?.completedLessonsCount || units.reduce((acc, u) => acc + (u.completedLessons || 0), 0) || 0;
  const totalUnits = units.length || 9;
  const completedUnits = units.filter(u => u.isCompleted).length || 0;

  const goTab = (tab: string) => {
    navigate(tab === 'path' ? '/' : `/?tab=${tab}`);
  };

  const getBookBadgeText = (code: string) => {
    if (code === '5-6') return 'Book 3 • Lớp Lá (5–6 tuổi)';
    if (code === '4-5') return 'Book 2 • Lớp Chồi (4–5 tuổi)';
    return 'Book 1 • Lớp Mầm (3–4 tuổi)';
  };

  return (
    <div className="min-h-screen bg-[#fffaf0] pb-24 md:pb-12">
      <ChildHeader totalStars={totalStars} completedCount={completedLessons} activeTab={activeTab} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* BANNER (Generous spacing, clean mascot layout, no clipped text) */}
        <section className="relative mb-8 rounded-3xl bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 p-6 sm:p-8 text-white shadow-xl">
          {/* Subtle background decorative shapes */}
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Left Column: Greeting & Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 bg-white/25 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider text-amber-50 mb-3 shadow-xs">
                <BookOpen className="w-4 h-4 text-yellow-200" />
                <span>{getBookBadgeText(ageCode)}</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2">
                Chào bé {user?.name || 'yêu'}! Cùng học nào ✨
              </h1>

              <p className="text-white/90 font-extrabold text-sm sm:text-base max-w-lg mb-4">
                Hành trình gồm 9 Unit hấp dẫn theo sách First Friends đang chờ bé khám phá!
              </p>

              {/* Mini Stat Chips */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <div className="bg-amber-950/20 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 border border-white/20">
                  <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                  <span>{totalStars} Sao vàng</span>
                </div>
                <div className="bg-amber-950/20 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 border border-white/20">
                  <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
                  <span>{completedLessons} Bài hoàn thành</span>
                </div>
              </div>
            </div>

            {/* Right Column: Mascot with comfortable breathing room */}
            <div className="flex-shrink-0 flex items-center justify-center">
              <KokoMascot state="waving" size="lg" speechBubble="Cố lên bé ơi! 🌟" />
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
            <p className="text-amber-800 font-black text-sm">Đang chuẩn bị hành trình học cho bé...</p>
          </div>
        ) : (
          <>
            {/* ==================== TAB 1: HÀNH TRÌNH HỌC (CURRICULUM PATH) ==================== */}
            {activeTab === 'path' && (
              <section className="space-y-10">
                {/* Header */}
                <div className="flex items-end justify-between flex-wrap gap-2">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-orange-600 bg-orange-100 px-3 py-1 rounded-full mb-1">
                      <Compass className="w-3.5 h-3.5" />
                      Lộ trình chuẩn sách giáo khoa
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-800">
                      Hành trình 9 Unit phiêu lưu
                    </h2>
                    <p className="text-sm font-bold text-slate-500">
                      {getBookBadgeText(ageCode)}
                    </p>
                  </div>
                  <div className="bg-amber-100 border-2 border-amber-300 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xs">
                    <Trophy className="w-5 h-5 text-amber-600" />
                    <span className="text-sm font-black text-amber-900">
                      Đã xong: {completedUnits} / {totalUnits} Unit
                    </span>
                  </div>
                </div>

                {/* Units List with Winding Stepping-Stones Trail */}
                <div className="space-y-8">
                  {units.map((unit, unitIdx) => {
                    const isUnitUnlocked = unitIdx === 0 || !!units[unitIdx - 1]?.isCompleted;
                    const firstIncompleteIdx = unit.lessons.findIndex(l => !l.completed);

                    return (
                      <div
                        key={unit._id || unitIdx}
                        className={`rounded-3xl border-3 p-5 sm:p-7 shadow-md relative overflow-hidden transition-all ${
                          !isUnitUnlocked
                            ? 'bg-slate-50/80 border-slate-200/90 opacity-75'
                            : 'bg-white border-amber-200/90'
                        }`}
                      >
                        {/* Unit Island Header */}
                        <div className="flex items-center justify-between border-b border-amber-100 pb-4 mb-6 flex-wrap gap-3">
                          <div className="flex items-center gap-3.5">
                            <div
                              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-xs border flex-shrink-0 ${
                                !isUnitUnlocked
                                  ? 'bg-slate-200 border-slate-300 text-slate-400 grayscale'
                                  : 'bg-gradient-to-br from-amber-200 to-orange-300 border-amber-300'
                              }`}
                            >
                              {unit.topicIcon || '🎒'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-md ${
                                  !isUnitUnlocked ? 'bg-slate-200 text-slate-600' : 'bg-orange-100 text-orange-800'
                                }`}>
                                  Unit {unit.unitNumber}
                                </span>
                                {!isUnitUnlocked ? (
                                  <span className="bg-slate-200 text-slate-600 text-[11px] font-black px-2.5 py-0.5 rounded-md flex items-center gap-1">
                                    <LockKeyhole className="w-3 h-3" /> Chưa mở khóa
                                  </span>
                                ) : unit.isCompleted ? (
                                  <span className="bg-emerald-100 text-emerald-800 text-[11px] font-black px-2.5 py-0.5 rounded-md flex items-center gap-1">
                                    <Check className="w-3 h-3 stroke-[3]" /> Hoàn thành
                                  </span>
                                ) : (
                                  <span className="bg-amber-100 text-amber-800 text-[11px] font-black px-2.5 py-0.5 rounded-md flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-amber-600" /> Đang học
                                  </span>
                                )}
                              </div>
                              <h3 className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">
                                Unit {unit.unitNumber}: {unit.topicName || unit.storyTitle || 'Bài học'}
                              </h3>
                              <p className="text-xs sm:text-sm font-bold text-slate-500">
                                {unit.topicVietnameseName ? `${unit.topicVietnameseName} • ` : ''}
                                {unit.bigQuestion ? `💬 "${unit.bigQuestion}"` : unit.storyTitle || ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 bg-amber-50 px-3.5 py-1.5 rounded-2xl border border-amber-200">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <span className="text-xs font-black text-amber-900">
                              {unit.totalUnitStars} sao
                            </span>
                          </div>
                        </div>

                        {/* Winding Stepping Stones for this Unit's Lessons */}
                        <div className="relative py-4 flex flex-col items-center">
                          {/* Central dashed stepping trail connector */}
                          <div className="absolute top-8 bottom-8 w-1 border-r-4 border-dashed border-amber-300 pointer-events-none" />

                          <div className="w-full max-w-md flex flex-col gap-6 relative z-10">
                            {unit.lessons.map((lesson, idx) => {
                              const isAlternateRight = idx % 2 === 1;
                              const isLessonUnlocked = isUnitUnlocked && (idx === 0 || !!unit.lessons[idx - 1]?.completed);
                              const isCurrent = isUnitUnlocked && !lesson.completed && (firstIncompleteIdx === idx || firstIncompleteIdx === -1);

                              return (
                                <div
                                  key={lesson._id || idx}
                                  className={`flex items-center ${
                                    isAlternateRight ? 'justify-end pr-4 sm:pr-8' : 'justify-start pl-4 sm:pl-8'
                                  }`}
                                >
                                  <button
                                    onClick={() => {
                                      if (!isUnitUnlocked) {
                                        handleLockedClick(`Bé ơi, hãy hoàn thành các bài của Unit ${unitIdx} trước để mở khóa Unit ${unit.unitNumber} nhé! 🎒✨`);
                                        return;
                                      }
                                      if (!isLessonUnlocked) {
                                        handleLockedClick(`Bé hãy hoàn thành Bài ${idx} trước để mở khóa Bài ${lesson.lessonNumber || idx + 1} nhé! 🌟`);
                                        return;
                                      }
                                      sfx.playPop();
                                      navigate(`/lessons/${lesson._id}`);
                                    }}
                                    className={`group flex items-center gap-3.5 p-3 rounded-2xl border-3 text-left transition-all duration-200 cursor-pointer ${
                                      lesson.completed
                                        ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100 hover:scale-105 shadow-sm'
                                        : isCurrent
                                        ? 'bg-gradient-to-r from-amber-100 via-orange-100 to-amber-100 border-amber-400 ring-4 ring-amber-300/70 shadow-lg scale-105 animate-soft-bounce'
                                        : isLessonUnlocked
                                        ? 'bg-white border-amber-200 hover:border-amber-400 hover:scale-103 shadow-xs'
                                        : 'bg-slate-100/90 border-slate-200 opacity-60'
                                    }`}
                                  >
                                    {/* Stepping-Stone Node Avatar */}
                                    <div
                                      className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-md flex-shrink-0 transition-transform ${
                                        lesson.completed
                                          ? 'bg-emerald-500 text-white'
                                          : isCurrent
                                          ? 'bg-gradient-to-tr from-amber-400 to-orange-500 text-white group-hover:scale-110'
                                          : isLessonUnlocked
                                          ? 'bg-gradient-to-br from-amber-200 to-yellow-300 text-amber-900'
                                          : 'bg-slate-200 text-slate-400'
                                      }`}
                                    >
                                      {lesson.completed ? (
                                        <Check className="w-7 h-7 stroke-[3]" />
                                      ) : !isLessonUnlocked ? (
                                        <LockKeyhole className="w-6 h-6 stroke-[2.5]" />
                                      ) : (
                                        <span>{lesson.lessonNumber || idx + 1}</span>
                                      )}
                                    </div>

                                    {/* Lesson Info */}
                                    <div className="min-w-0 pr-2">
                                      <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className="text-[10px] font-black uppercase text-slate-400">
                                          Bài {lesson.lessonNumber || idx + 1}
                                        </span>
                                        {lesson.completed ? (
                                          <span className="flex items-center text-amber-500 text-xs">
                                            {[...Array(lesson.stars || 3)].map((_, i) => (
                                              <Star key={i} className="w-3 h-3 fill-current" />
                                            ))}
                                          </span>
                                        ) : isCurrent ? (
                                          <span className="text-[10px] font-black text-amber-700 bg-amber-200 px-2 py-0.2 rounded-full animate-pulse">
                                            Chơi ngay!
                                          </span>
                                        ) : !isLessonUnlocked ? (
                                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5">
                                            <LockKeyhole className="w-2.5 h-2.5" /> Khóa
                                          </span>
                                        ) : null}
                                      </div>
                                      <h4 className="text-sm font-black text-slate-800 truncate max-w-[170px]">
                                        {lesson.title}
                                      </h4>
                                      <p className="text-[11px] font-bold text-slate-500">
                                        {lesson.vietnameseTitle ? `${lesson.vietnameseTitle} • ` : ''}
                                        {lesson.vocabularyItems?.length || 4} từ vựng
                                      </p>
                                    </div>
                                  </button>
                                </div>
                              );
                            })}

                            {/* End of Unit Treasure Chest */}
                            <div className="flex flex-col items-center justify-center pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isUnitUnlocked) {
                                    handleLockedClick(`Bé hãy hoàn thành các bài học của Unit ${unit.unitNumber} để mở khóa hộp quà bí mật nhé! 🎁✨`);
                                    return;
                                  }
                                  sfx.playPop();
                                  setSecretGiftData({
                                    unit,
                                    unitIndex: unitIdx,
                                    isCompleted: !!unit.isCompleted
                                  });
                                  setShowSecretGift(true);
                                }}
                                className={`w-full max-w-md p-4 rounded-3xl border-3 flex items-center justify-between gap-3 shadow-md transition-all cursor-pointer group hover:scale-105 active:scale-95 ${
                                  !isUnitUnlocked
                                    ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-60'
                                    : unit.isCompleted
                                    ? 'bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 border-amber-400 text-amber-950 animate-pulse'
                                    : 'bg-white hover:bg-amber-50/80 border-amber-200 text-slate-700 hover:border-amber-300'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs transition-transform group-hover:rotate-12 ${
                                      !isUnitUnlocked
                                        ? 'bg-slate-200 text-slate-400'
                                        : unit.isCompleted
                                        ? 'bg-amber-400 text-amber-950'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}
                                  >
                                    {!isUnitUnlocked ? '🔒' : '🎁'}
                                  </div>
                                  <div className="text-left">
                                    <p className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                                      <span>
                                        {!isUnitUnlocked
                                          ? 'Hộp quà bí mật (Chưa mở)'
                                          : unit.isCompleted
                                          ? '🎉 Hộp quà đã mở!'
                                          : '🎁 Hộp quà bí mật'}
                                      </span>
                                      {isUnitUnlocked && <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-400" />}
                                    </p>
                                    <p className="text-[11px] font-bold text-slate-500">
                                      {!isUnitUnlocked
                                        ? 'Hoàn thành bài để mở khóa hộp quà!'
                                        : unit.isCompleted
                                        ? 'Bấm để nhận quà & xem thưởng!'
                                        : 'Bấm để khám phá kho báu bí mật!'}
                                    </p>
                                  </div>
                                </div>

                                <span
                                  className={`text-[11px] font-black px-3 py-1.5 rounded-xl border transition-colors ${
                                    !isUnitUnlocked
                                      ? 'bg-slate-200 border-slate-300 text-slate-500'
                                      : unit.isCompleted
                                      ? 'bg-amber-400 border-amber-500 text-amber-950 shadow-xs'
                                      : 'bg-amber-100 border-amber-200 text-amber-900 group-hover:bg-amber-200'
                                  }`}
                                >
                                  {!isUnitUnlocked ? 'Đang khóa 🔒' : unit.isCompleted ? 'Mở ngay ✨' : 'Xem trước 🎁'}
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ==================== TAB 2: CHỦ ĐỀ CỦA BÉ THEO LỚP ==================== */}
            {activeTab === 'topics' && (
              <section className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Chủ đề theo lứa tuổi bé
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-800">
                      Chủ đề học tập của bé ({ageTopics.length} chủ đề)
                    </h2>
                    <p className="text-sm font-bold text-slate-500">
                      Được thiết kế chuẩn riêng biệt cho lứa tuổi {ageCode} tuổi ({getBookBadgeText(ageCode)}).
                    </p>
                  </div>

                  <div className="bg-emerald-100 border-2 border-emerald-300 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xs">
                    <span className="text-xs font-black text-emerald-900">
                      {getBookBadgeText(ageCode)}
                    </span>
                  </div>
                </div>

                {/* Topics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
                  {ageTopics.map(topic => (
                    <button
                      key={topic._id}
                      onClick={() => {
                        sfx.playPop();
                        navigate(`/topics/${topic.slug}`);
                      }}
                      className="card-kid bg-white rounded-3xl border-3 border-emerald-200/90 p-5 text-center shadow-sm hover:border-emerald-400 hover:shadow-lg transition-all cursor-pointer flex flex-col items-center justify-between group"
                    >
                      <div className="w-full flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                          {ageCode} tuổi
                        </span>
                        <span className="text-[11px] font-extrabold text-slate-400">
                          {topic.lessonCount || 0} bài
                        </span>
                      </div>

                      <div className="my-2 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center text-4xl sm:text-5xl group-hover:scale-110 transition-transform">
                        {topic.icon || '🌟'}
                      </div>

                      <div className="mt-1 w-full">
                        <h3 className="font-black text-slate-800 text-base sm:text-lg group-hover:text-emerald-700 transition-colors truncate">
                          {topic.englishName}
                        </h3>
                        <p className="text-xs font-bold text-slate-500 truncate">
                          {topic.vietnameseName}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 w-full flex items-center justify-center text-xs font-black text-emerald-600 gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>Khám phá</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* ==================== TAB: SỔ TỪ VỰNG CỦA BÉ ==================== */}
            {activeTab === 'vocab' && (
              <section className="space-y-6">
                <ChildVocabNotebookSection onNavigateTab={goTab} />
              </section>
            )}

            {/* ==================== TAB: KHU VƯỜN TRÒ CHƠI ÔN TẬP (STANDALONE VOCAB GAMES) ==================== */}
            {(activeTab === 'games' || activeTab === 'arcade') && (
              <section className="space-y-6">
                <ChildArcadeSection
                  vocabularyList={vocabularyList}
                  ageGroupCode={ageCode}
                  onNavigateTab={goTab}
                />
              </section>
            )}

            {/* ==================== TAB 4: HUY HIỆU CỦA BÉ ==================== */}
            {activeTab === 'badges' && (() => {
              const evaluatedBadges = ALL_BADGES.map(badge => {
                let unlocked = false;
                if (badge.reqType === 'star') {
                  unlocked = totalStars >= badge.requirement;
                } else if (badge.reqType === 'unit') {
                  unlocked = completedUnits >= badge.requirement;
                } else {
                  unlocked = completedLessons >= badge.requirement;
                }
                return { ...badge, unlocked };
              });

              const filteredBadges = badgeCategory === 'all'
                ? evaluatedBadges
                : evaluatedBadges.filter(b => b.category === badgeCategory);

              const unlockedCount = evaluatedBadges.filter(b => b.unlocked).length;
              const childId = (user as any)?.id || (user as any)?._id || 'child_guest';
              const unlockedStickers = stickerService.getUnlockedStickers(childId);

              return (
                <section className="space-y-6">
                  <div className="flex items-end justify-between flex-wrap gap-3">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-3 py-1 rounded-full mb-1">
                        <Trophy className="w-3.5 h-3.5" />
                        Góc phần thưởng của bé
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-800">
                        {rewardTab === 'badges'
                          ? `Huy hiệu của bé (${unlockedCount}/${evaluatedBadges.length} đã mở)`
                          : `Bộ sưu tập Sticker (${unlockedStickers.length}/${ALL_STICKERS.length} đã mở)`}
                      </h2>
                      <p className="text-sm font-bold text-slate-500">
                        {rewardTab === 'badges'
                          ? 'Thu thập đủ sao vàng và hoàn thành bài học để mở khóa 20 huy hiệu danh giá!'
                          : 'Đạt từ 2–3 sao vàng trong các bài luyện tập và trò chơi để mở khóa sticker siêu xinh!'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-purple-100 border-2 border-purple-300 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xs">
                        <Trophy className="w-5 h-5 text-purple-600" />
                        <span className="text-base font-black text-purple-900">{unlockedCount} Huy hiệu</span>
                      </div>
                      <div className="bg-amber-100 border-2 border-amber-300 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xs">
                        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                        <span className="text-base font-black text-amber-900">{totalStars} Sao vàng</span>
                      </div>
                    </div>
                  </div>

                  {/* Badges / Stickers Switcher */}
                  <div className="grid grid-cols-2 gap-2.5 p-1.5 bg-slate-100 rounded-2xl max-w-md">
                    <button
                      type="button"
                      onClick={() => {
                        sfx.playPop();
                        setRewardTab('badges');
                      }}
                      className={`py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        rewardTab === 'badges'
                          ? 'bg-white text-purple-900 shadow-sm ring-2 ring-purple-300'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Trophy className="w-4 h-4 text-purple-600" />
                      <span>Huy hiệu danh giá ({unlockedCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        sfx.playPop();
                        setRewardTab('stickers');
                      }}
                      className={`py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        rewardTab === 'stickers'
                          ? 'bg-white text-rose-900 shadow-sm ring-2 ring-rose-300'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Gift className="w-4 h-4 text-rose-500" />
                      <span>Bộ sưu tập Sticker ({unlockedStickers.length})</span>
                    </button>
                  </div>

                  {rewardTab === 'badges' ? (
                    <>
                      {/* Badges Category Pills */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {[
                          { id: 'all', label: `Tất cả (${evaluatedBadges.length})` },
                          { id: 'journey', label: '🐾 Hành trình (10)' },
                          { id: 'stars', label: '⭐ Ngôi sao (5)' },
                          { id: 'skills', label: '🎯 Kỹ năng (5)' }
                        ].map(cat => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              sfx.playPop();
                              setBadgeCategory(cat.id as any);
                            }}
                            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex-shrink-0 ${
                              badgeCategory === cat.id
                                ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-300 scale-105'
                                : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700'
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                        {filteredBadges.map((badge) => {
                          const currentVal = badge.reqType === 'star' ? totalStars : badge.reqType === 'unit' ? completedUnits : completedLessons;
                          const percent = Math.min(100, Math.round((currentVal / badge.requirement) * 100));

                          return (
                            <div
                              key={badge.id}
                              onClick={() => {
                                sfx.playPop();
                                setShowcaseBadge(badge);
                              }}
                              className={`rounded-3xl border-3 p-4 text-center flex flex-col items-center justify-between transition-all cursor-pointer relative group badge-shimmer-effect ${
                                badge.unlocked
                                  ? 'border-amber-400 bg-gradient-to-b from-white to-amber-50/50 shadow-md hover:shadow-xl hover:-translate-y-1.5 active:scale-95'
                                  : 'border-slate-200 bg-white/70 hover:border-purple-200 hover:-translate-y-0.5'
                              }`}
                            >
                              <div
                                className={`w-16 h-16 sm:w-18 sm:h-18 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl mb-2.5 shadow-sm relative transition-transform duration-300 group-hover:scale-110 ${
                                  badge.unlocked
                                    ? `bg-gradient-to-tr ${badge.color} text-white ring-2 ring-amber-300 animate-badge-float`
                                    : 'bg-slate-100 text-slate-400 border-2 border-dashed border-slate-300'
                                }`}
                              >
                                {badge.unlocked ? badge.icon : <LockKeyhole className="w-6 h-6 text-slate-400" />}
                                {badge.unlocked && (
                                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-400 text-amber-950 rounded-full flex items-center justify-center text-[10px] font-black shadow-xs">
                                    ⭐
                                  </span>
                                )}
                              </div>

                              <div className="w-full">
                                <h4 className="font-black text-slate-800 text-xs sm:text-sm mb-0.5 leading-snug group-hover:text-purple-700 transition-colors">
                                  {badge.name}
                                </h4>
                                <p className="text-[11px] font-bold text-slate-400 leading-tight mb-2 line-clamp-2">
                                  {badge.desc}
                                </p>
                              </div>

                              {badge.unlocked ? (
                                <span className="mt-auto inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                                  <span>Đã đạt</span>
                                  <span>⭐</span>
                                </span>
                              ) : (
                                <div className="w-full mt-auto space-y-1">
                                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                                    <div
                                      className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all"
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                  <span className="text-[9px] font-extrabold text-slate-400 block">
                                    {currentVal}/{badge.requirement} {badge.reqType === 'star' ? '⭐' : 'bài'}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    /* Stickers Grid */
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                      {ALL_STICKERS.map((st) => {
                        const isUnlocked = unlockedStickers.includes(st.id);
                        return (
                          <div
                            key={st.id}
                            className={`rounded-3xl border-3 p-4 text-center flex flex-col items-center justify-between transition-all ${
                              isUnlocked
                                ? 'border-rose-400 bg-white shadow-md hover:scale-105'
                                : 'border-slate-200 bg-slate-50/70 opacity-60'
                            }`}
                          >
                            <div
                              className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl mb-2.5 shadow-sm ${
                                isUnlocked
                                  ? `bg-gradient-to-tr ${st.bgGradient} text-white animate-bounce-subtle`
                                  : 'bg-slate-200 text-slate-400 grayscale'
                              }`}
                            >
                              {isUnlocked ? st.icon : <LockKeyhole className="w-7 h-7 text-slate-400" />}
                            </div>
                            <div>
                              <h4 className="font-black text-slate-800 text-xs sm:text-sm mb-0.5 leading-snug">
                                {isUnlocked ? st.name : 'Sticker Bí Mật'}
                              </h4>
                              <p className="text-[11px] font-bold text-slate-400 leading-tight">
                                {isUnlocked ? st.desc : 'Đạt 2-3 sao khi chơi game để mở khóa'}
                              </p>
                            </div>
                            <span
                              className={`mt-2.5 text-[10px] font-black px-2.5 py-1 rounded-full ${
                                isUnlocked
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-slate-200 text-slate-500'
                              }`}
                            >
                              {isUnlocked ? 'Đã sưu tập 🎁' : 'Chưa mở khóa 🔒'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })()}
          </>
        )}

        {/* Secret Gift Mystery Chest Modal */}
        {secretGiftData && (
          <SecretGiftModal
            isOpen={showSecretGift}
            onClose={() => setShowSecretGift(false)}
            unit={secretGiftData.unit}
            unitIndex={secretGiftData.unitIndex}
            isCompleted={secretGiftData.isCompleted}
            onContinue={() => setShowSecretGift(false)}
          />
        )}

        {/* 3D Badge Showcase Spotlight Modal */}
        {showcaseBadge && (
          <BadgeShowcaseModal
            badge={showcaseBadge}
            currentProgress={
              showcaseBadge.reqType === 'star'
                ? progress?.totalStars || 0
                : showcaseBadge.reqType === 'unit'
                ? (units || []).filter(u => u.isCompleted).length
                : progress?.completedLessonsCount || 0
            }
            onClose={() => setShowcaseBadge(null)}
          />
        )}

        {/* Friendly Gatekeeper Notification Toast */}
        {toastMessage && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] bg-slate-900/95 backdrop-blur-md text-white px-5 py-4 rounded-3xl shadow-2xl border-2 border-amber-400 flex items-center gap-3.5 animate-bounce-short">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center text-2xl flex-shrink-0 shadow-md">
              🎒
            </div>
            <div className="flex-1 text-xs sm:text-sm font-black text-amber-100 leading-snug">
              {toastMessage}
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white text-sm font-black p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              ✕
            </button>
          </div>
        )}
      </main>

      <ChildBottomNav
        totalStars={totalStars}
        completedCount={completedLessons}
        activeTab={activeTab}
        onTabChange={goTab}
      />
    </div>
  );
};
