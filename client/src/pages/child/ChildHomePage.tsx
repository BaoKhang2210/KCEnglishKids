import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Check,
  LockKeyhole,
  Sparkles,
  Star,
  Trophy,
  Compass,
  ArrowRight,
  Gift,
  X
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
import { CuteRosetteMedal } from '../../components/child/CuteRosetteMedal';
import { CuteStickerCard } from '../../components/child/CuteStickerCard';
import { StickerShowcaseModal } from '../../components/child/StickerShowcaseModal';

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

  // Unit Journey Stepping Stones Modal State
  const [selectedUnitModal, setSelectedUnitModal] = useState<{
    unit: CurriculumUnit;
    unitIndex: number;
    theme: any;
    isUnitUnlocked: boolean;
  } | null>(null);

  // Badges Category filter state
  const [badgeCategory, setBadgeCategory] = useState<'all' | 'journey' | 'stars' | 'skills'>('all');
  const [rewardTab, setRewardTab] = useState<'badges' | 'stickers'>('badges');
  const [showcaseBadge, setShowcaseBadge] = useState<any>(null);
  const [selectedSticker, setSelectedSticker] = useState<any>(null);
  const [stickerRarityFilter, setStickerRarityFilter] = useState<'all' | 'common' | 'rare' | 'epic' | 'legendary'>('all');
  const [expandedUnit, setExpandedUnit] = useState<number | null>(null);

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
    if (code === '5-6') return 'Book 3 (Ages 5–6)';
    if (code === '4-5') return 'Book 2 (Ages 4–5)';
    return 'Book 1 (Ages 3–4)';
  };

  return (
    <div className="h-screen overflow-hidden bg-[#fffaf0] flex flex-col">
      <div className="flex-shrink-0"><ChildHeader totalStars={totalStars} completedCount={completedLessons} activeTab={activeTab} /></div>

      <main className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-3 pb-24 md:pb-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
            <p className="text-amber-800 font-black text-sm">Preparing your learning adventure...</p>
          </div>
        ) : (
          <>
            {/* ==================== TAB 1: CURRICULUM JOURNEY PATH ==================== */}
            {activeTab === 'path' && (
              <section className="space-y-10">
                {/* Header */}
                <div className="flex items-end justify-between flex-wrap gap-2">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-orange-600 bg-orange-100 px-3 py-1 rounded-full mb-1">
                      <Compass className="w-3.5 h-3.5" />
                      Cambridge Little Steps Curriculum
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-800">
                      Course Journey
                    </h2>
                    <p className="text-sm font-bold text-slate-500">
                      {getBookBadgeText(ageCode)}
                    </p>
                  </div>
                  <div className="bg-amber-100 border-2 border-amber-300 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xs">
                    <Trophy className="w-5 h-5 text-amber-600" />
                    <span className="text-sm font-black text-amber-900">
                      Completed: {completedUnits} / {totalUnits} Units
                    </span>
                  </div>
                </div>

                {/* Units 1-9 Overview Cards */}
                <div className="space-y-4 sm:space-y-5">
                  {units.map((unit, unitIdx) => {
                    const isUnitUnlocked = unitIdx === 0 || !!units[unitIdx - 1]?.isCompleted;
                    const completedLessonCount = unit.lessons.filter(l => l.completed).length;
                    const totalLessonCount = unit.lessons.length || 5;

                    const UNIT_THEMES = [
                      {
                        themeName: 'Early Learning & School',
                        tag: 'School & Play',
                        bgGradient: 'from-amber-50 via-white to-orange-50/50',
                        border: 'border-amber-300',
                        headerBadge: 'bg-amber-100 text-amber-900 border-amber-300',
                        accentEmoji: '🎒'
                      },
                      {
                        themeName: 'Animal Friends',
                        tag: 'Creatures & Pets',
                        bgGradient: 'from-emerald-50 via-white to-teal-50/50',
                        border: 'border-emerald-300',
                        headerBadge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
                        accentEmoji: '🐶'
                      },
                      {
                        themeName: 'Delicious Treats & Fruits',
                        tag: 'Food & Nutrition',
                        bgGradient: 'from-rose-50 via-white to-orange-50/50',
                        border: 'border-rose-300',
                        headerBadge: 'bg-rose-100 text-rose-900 border-rose-300',
                        accentEmoji: '🍎'
                      },
                      {
                        themeName: 'Magic Toy Box',
                        tag: 'Toys & Fun',
                        bgGradient: 'from-purple-50 via-white to-pink-50/50',
                        border: 'border-purple-300',
                        headerBadge: 'bg-purple-100 text-purple-900 border-purple-300',
                        accentEmoji: '🧸'
                      },
                      {
                        themeName: 'Green Nature Valley',
                        tag: 'The Natural World',
                        bgGradient: 'from-teal-50 via-white to-cyan-50/50',
                        border: 'border-teal-300',
                        headerBadge: 'bg-teal-100 text-teal-900 border-teal-300',
                        accentEmoji: '🌳'
                      },
                      {
                        themeName: 'Happy Home & Family',
                        tag: 'Family & Home',
                        bgGradient: 'from-yellow-50 via-white to-amber-50/50',
                        border: 'border-amber-300',
                        headerBadge: 'bg-yellow-100 text-yellow-900 border-yellow-300',
                        accentEmoji: '🏡'
                      }
                    ];

                    const theme = UNIT_THEMES[unitIdx % UNIT_THEMES.length];

                    return (
                      <div
                        key={unit._id || unitIdx}
                        onClick={() => {
                          if (!isUnitUnlocked) {
                            handleLockedClick(`Please complete Unit ${unitIdx} first to unlock Unit ${unit.unitNumber}! 🎒✨`);
                            return;
                          }
                          sfx.playPop();
                          setSelectedUnitModal({
                            unit,
                            unitIndex: unitIdx,
                            theme,
                            isUnitUnlocked
                          });
                        }}
                        className={`rounded-3xl sm:rounded-[32px] border-4 p-5 sm:p-7 shadow-md relative overflow-hidden transition-all cursor-pointer group ${
                          !isUnitUnlocked
                            ? 'bg-slate-50/80 border-slate-200/90 opacity-75 hover:border-slate-300'
                            : `bg-gradient-to-r ${theme.bgGradient} ${theme.border} hover:shadow-xl hover:-translate-y-1`
                        }`}
                      >
                        {/* Decorative floating pastel bubbles */}
                        <div className="absolute -top-10 -right-10 w-36 h-36 bg-amber-200/20 rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-pink-200/20 rounded-full blur-2xl pointer-events-none" />

                        <div className="flex items-center justify-between flex-wrap gap-4 relative z-10">
                          {/* Left: Icon and details */}
                          <div className="flex items-center gap-4 sm:gap-5 min-w-0 flex-1">
                            <div
                              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center text-3xl sm:text-4xl shadow-md border-3 flex-shrink-0 transition-transform group-hover:scale-108 ${
                                !isUnitUnlocked
                                  ? 'bg-slate-200 border-slate-300 text-slate-400 grayscale'
                                  : 'bg-white border-amber-300 shadow-amber-200/50'
                              }`}
                            >
                              {unit.topicIcon || theme.accentEmoji}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                {!isUnitUnlocked ? (
                                  <span className="bg-slate-200 text-slate-600 text-[11px] sm:text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-slate-300">
                                    <LockKeyhole className="w-3 h-3" /> Locked
                                  </span>
                                ) : unit.isCompleted ? (
                                  <span className="bg-emerald-100 text-emerald-800 text-[11px] sm:text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300">
                                    <Check className="w-3 h-3 stroke-[3]" /> Completed
                                  </span>
                                ) : (
                                  <span className="bg-amber-100 text-amber-900 text-[11px] sm:text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-amber-300 animate-pulse">
                                    <Sparkles className="w-3 h-3 text-amber-600 fill-amber-500" /> Exploring
                                  </span>
                                )}
                              </div>

                              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-800 mt-0.5 font-display tracking-tight group-hover:text-amber-700 transition-colors truncate">
                                Unit {unit.unitNumber}: {unit.topicName || unit.storyTitle || `Unit ${unit.unitNumber}`}
                              </h3>
                              <p className="text-xs sm:text-sm font-extrabold text-slate-600 mt-0.5 truncate">
                                {unit.bigQuestion ? `💬 "${unit.bigQuestion}"` : unit.storyTitle || `Explore Unit ${unit.unitNumber}`}
                              </p>
                            </div>
                          </div>

                          {/* Right: Stars, Progress & Action button */}
                          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                            <div className="text-right hidden sm:block">
                              <div className="flex items-center gap-1 justify-end">
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                <span className="text-xs sm:text-sm font-black text-amber-950">
                                  {unit.totalUnitStars} {unit.totalUnitStars === 1 ? 'Star' : 'Stars'}
                                </span>
                              </div>
                              <span className="text-[11px] font-bold text-slate-500">
                                {completedLessonCount} / {totalLessonCount} Lessons Done
                              </span>
                            </div>

                            <button
                              type="button"
                              className={`btn-3d-amber py-2.5 sm:py-3 px-4 sm:px-5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-sm transition-transform ${
                                !isUnitUnlocked ? 'opacity-60 grayscale' : 'group-hover:scale-105'
                              }`}
                            >
                              <span>{isUnitUnlocked ? 'Explore Unit' : 'Locked'}</span>
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ==================== TAB 2: TOPICS BY AGE GROUP ==================== */}
            {activeTab === 'topics' && (
              <section className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Learning Topics
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-800">
                      Explore Topics ({ageTopics.length} Topics)
                    </h2>
                    <p className="text-sm font-bold text-slate-500">
                      Tailored specifically for {getBookBadgeText(ageCode)}.
                    </p>
                  </div>

                  <div className="bg-emerald-100 border-2 border-emerald-300 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xs">
                    <span className="text-xs font-black text-emerald-900">
                      {getBookBadgeText(ageCode)}
                    </span>
                  </div>
                </div>

                {/* Topics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
                  {ageTopics.map((topic, idx) => {
                    const TOPIC_PALETTES = [
                      { bg: 'from-amber-50 to-orange-50/70', border: 'border-amber-300 hover:border-amber-400', badge: 'bg-amber-100 text-amber-900', iconBg: 'bg-amber-100/90 text-amber-900', btn: 'text-amber-700 group-hover:text-amber-800' },
                      { bg: 'from-emerald-50 to-teal-50/70', border: 'border-emerald-300 hover:border-emerald-400', badge: 'bg-emerald-100 text-emerald-900', iconBg: 'bg-emerald-100/90 text-emerald-900', btn: 'text-emerald-700 group-hover:text-emerald-800' },
                      { bg: 'from-sky-50 to-blue-50/70', border: 'border-sky-300 hover:border-sky-400', badge: 'bg-sky-100 text-sky-900', iconBg: 'bg-sky-100/90 text-sky-900', btn: 'text-sky-700 group-hover:text-sky-800' },
                      { bg: 'from-purple-50 to-pink-50/70', border: 'border-purple-300 hover:border-purple-400', badge: 'bg-purple-100 text-purple-900', iconBg: 'bg-purple-100/90 text-purple-900', btn: 'text-purple-700 group-hover:text-purple-800' },
                      { bg: 'from-rose-50 to-orange-50/70', border: 'border-rose-300 hover:border-rose-400', badge: 'bg-rose-100 text-rose-900', iconBg: 'bg-rose-100/90 text-rose-900', btn: 'text-rose-700 group-hover:text-rose-800' },
                      { bg: 'from-teal-50 to-cyan-50/70', border: 'border-teal-300 hover:border-teal-400', badge: 'bg-teal-100 text-teal-900', iconBg: 'bg-teal-100/90 text-teal-900', btn: 'text-teal-700 group-hover:text-teal-800' },
                    ];
                    const pal = TOPIC_PALETTES[idx % TOPIC_PALETTES.length];

                    return (
                      <button
                        key={topic._id}
                        type="button"
                        onClick={() => {
                          sfx.playPop();
                          navigate(`/topics/${topic.slug}`);
                        }}
                        className={`card-kid bg-gradient-to-b ${pal.bg} rounded-[32px] border-4 ${pal.border} p-6 text-left shadow-md hover:shadow-2xl hover:-translate-y-1.5 transition-all cursor-pointer flex flex-col justify-between group min-h-[260px] sm:min-h-[280px] relative overflow-hidden`}
                      >
                        {/* Decorative floating highlight */}
                        <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/60 rounded-full blur-xl pointer-events-none" />

                        {/* Top Badges */}
                        <div className="w-full flex items-center justify-between gap-2 mb-3 relative z-10">
                          <span className={`text-xs font-black uppercase px-3 py-1 rounded-full border border-black/5 shadow-2xs ${pal.badge}`}>
                            Ages {ageCode}
                          </span>
                          <span className="text-xs font-black text-slate-500 bg-white/90 backdrop-blur-xs px-3 py-1 rounded-full border border-slate-200/80 shadow-2xs">
                            {topic.lessonCount || 0} {(topic.lessonCount || 0) === 1 ? 'Lesson' : 'Lessons'}
                          </span>
                        </div>

                        {/* Main Center Icon & Topic Info */}
                        <div className="my-2 flex flex-col items-center text-center w-full relative z-10">
                          <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl ${pal.iconBg} border-2 border-white shadow-md flex items-center justify-center text-5xl sm:text-6xl group-hover:scale-115 transition-transform duration-300 mb-3`}>
                            {topic.icon || '🌟'}
                          </div>

                          <h3 className="font-black text-slate-800 text-xl sm:text-2xl font-display group-hover:text-amber-700 transition-colors line-clamp-1 w-full">
                            {topic.englishName}
                          </h3>
                        </div>

                        {/* Bottom CTA Action Bar */}
                        <div className="mt-4 pt-3 border-t border-black/5 w-full flex items-center justify-between relative z-10">
                          <span className="text-xs font-black text-slate-400">Interactive</span>
                          <span className={`text-sm font-black flex items-center gap-1.5 ${pal.btn} group-hover:translate-x-1 transition-transform`}>
                            <span>Explore now</span>
                            <ArrowRight className="w-4 h-4 stroke-[3]" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
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

            {/* ==================== TAB 4: BỘ SƯU TẬP ==================== */}
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
                          ? `Bộ sưu tập (${unlockedCount}/${evaluatedBadges.length} huy hiệu đã mở)`
                          : `Bộ sưu tập Sticker (${unlockedStickers.length}/${ALL_STICKERS.length} đã mở)`}
                      </h2>
                      <p className="text-sm font-bold text-slate-500">
                        {rewardTab === 'badges'
                          ? 'Thu thập đủ sao vàng và hoàn thành các Lesson, Unit để mở khóa 20 huy hiệu danh giá!'
                          : 'Đạt từ 2–3 sao vàng trong các Lesson và trò chơi để mở khóa sticker siêu xinh!'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-purple-100 border-2 border-purple-300 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xs">
                        <Trophy className="w-5 h-5 text-purple-600" />
                        <span className="text-base font-black text-purple-900">{unlockedCount} Huy hiệu</span>
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
                              className={`rounded-[28px] border-3 p-4 text-center flex flex-col items-center justify-between transition-all cursor-pointer relative group badge-shimmer-effect ${
                                badge.unlocked
                                  ? 'border-amber-300 bg-gradient-to-b from-white via-amber-50/40 to-orange-50/50 shadow-md hover:shadow-2xl hover:-translate-y-2 active:scale-95'
                                  : 'border-slate-200 bg-white/70 hover:border-amber-200 hover:-translate-y-0.5'
                              }`}
                            >
                              {/* 3D Rosette Medal */}
                              <div className="my-1.5 pb-2">
                                <CuteRosetteMedal
                                  badge={badge}
                                  unlocked={badge.unlocked}
                                  size="md"
                                  showRibbons={true}
                                  className="group-hover:scale-110 transition-transform"
                                />
                              </div>

                              <div className="w-full">
                                <h4 className="font-black text-slate-800 text-xs sm:text-sm mb-0.5 leading-snug group-hover:text-amber-800 transition-colors">
                                  {badge.name}
                                </h4>
                                <p className="text-[11px] font-bold text-slate-500 leading-tight mb-2 line-clamp-2">
                                  {badge.desc}
                                </p>
                              </div>

                              {badge.unlocked ? (
                                <span className="mt-auto inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                                  <span>{badge.tierName}</span>
                                  <span>⭐</span>
                                </span>
                              ) : (
                                <div className="w-full mt-auto space-y-1">
                                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                                    <div
                                      className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all"
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                  <span className="text-[9px] font-extrabold text-slate-400 block">
                                    {currentVal}/{badge.requirement} {badge.reqType === 'star' ? '⭐' : badge.reqType === 'unit' ? 'Unit' : 'Lesson'}
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
                    <div>
                      {/* Rarity filter pills */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
                        {[
                          { id: 'all', label: `Tất cả (${ALL_STICKERS.length})` },
                          { id: 'legendary', label: '👑 Huyền thoại' },
                          { id: 'epic', label: '🔮 Sử thi' },
                          { id: 'rare', label: '💎 Hiếm' },
                          { id: 'common', label: '🌱 Phổ thông' }
                        ].map(rf => (
                          <button
                            key={rf.id}
                            type="button"
                            onClick={() => {
                              sfx.playPop();
                              setStickerRarityFilter(rf.id as any);
                            }}
                            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex-shrink-0 ${
                              stickerRarityFilter === rf.id
                                ? 'bg-rose-500 text-white shadow-md ring-2 ring-rose-300 scale-105'
                                : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700'
                            }`}
                          >
                            {rf.label}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                        {ALL_STICKERS.filter(st => stickerRarityFilter === 'all' || st.rarity === stickerRarityFilter).map((st) => {
                          const isUnlocked = unlockedStickers.includes(st.id);
                          return (
                            <CuteStickerCard
                              key={st.id}
                              sticker={st}
                              isUnlocked={isUnlocked}
                              size="md"
                              onClick={() => {
                                sfx.playPop();
                                setSelectedSticker({ sticker: st, isUnlocked });
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </section>
              );
            })()}

            {/* ==================== TAB 5: STAR STATS ==================== */}
            {activeTab === 'stars' && (() => {
              const unitStarStats = units.map((unit, idx) => ({
                unitNumber: unit.unitNumber || idx + 1,
                topicName: unit.topicName || `Unit ${unit.unitNumber || idx + 1}`,
                topicIcon: unit.topicIcon || '📚',
                totalUnitStars: unit.totalUnitStars || 0,
                maxUnitStars: (unit.lessons?.length || 0) * 3,
                lessons: (unit.lessons || []).map(lesson => ({
                  _id: lesson._id,
                  lessonNumber: lesson.lessonNumber,
                  title: lesson.title || `Lesson ${lesson.lessonNumber}`,
                  stars: lesson.stars || 0,
                  completed: lesson.completed,
                })),
              }));
              return (
                <section className="flex flex-col gap-4 h-full">
                  {/* WELCOME BANNER EXCLUSIVE TO STARS TAB */}
                  <div className="relative rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 px-5 py-3 text-white shadow-md overflow-hidden">
                    <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <KokoMascot state="waving" size="sm" interactive={false} />
                        </div>
                        <div>
                          <h1 className="text-lg sm:text-xl font-black tracking-tight leading-tight">
                            Welcome, {user?.name || 'Explorer'}! Let's learn ✨
                          </h1>
                          <p className="text-amber-100 font-bold text-xs">{getBookBadgeText(ageCode)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="bg-amber-950/20 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border border-white/25">
                          <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                          <span>{totalStars} {totalStars === 1 ? 'Star' : 'Stars'}</span>
                        </div>
                        <div className="bg-amber-950/20 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border border-white/25">
                          <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
                          <span>{completedLessons} {completedLessons === 1 ? 'Lesson' : 'Lessons'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Header */}
                  <div className="flex items-center justify-between flex-wrap gap-3 flex-shrink-0">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-3 py-1 rounded-full mb-1">
                        <Star className="w-3.5 h-3.5 fill-amber-500" />
                        Star Statistics
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-800">
                        My Stars ⭐
                      </h2>
                      <p className="text-sm font-bold text-slate-500">
                        You have earned <span className="text-amber-600 font-black">{totalStars} {totalStars === 1 ? 'star' : 'stars'}</span> from lessons!
                      </p>
                    </div>
                    {/* Big star count badge */}
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-amber-400 to-orange-400 border-4 border-amber-200 px-6 py-3 rounded-3xl flex items-center gap-3 shadow-lg">
                        <Star className="w-8 h-8 text-white fill-white drop-shadow" />
                        <div className="text-left">
                          <span className="text-3xl font-black text-white leading-none block">{totalStars}</span>
                          <span className="text-xs font-black text-amber-100 uppercase tracking-widest">Stars</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Unit accordion list — scrollable */}
                  <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none space-y-2 pr-0.5">
                    {unitStarStats.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-400">
                        <span className="text-5xl">🌟</span>
                        <p className="font-bold text-base">No stars yet. Start learning to collect stars!</p>
                      </div>
                    ) : unitStarStats.map(uStat => {
                      const pct = uStat.maxUnitStars > 0 ? Math.round((uStat.totalUnitStars / uStat.maxUnitStars) * 100) : 0;
                      const isExp = expandedUnit === uStat.unitNumber;
                      return (
                        <div key={uStat.unitNumber} className="rounded-2xl border-2 border-amber-100 bg-white overflow-hidden shadow-xs">
                          <button
                            type="button"
                            onClick={() => { sfx.playPop(); setExpandedUnit(isExp ? null : uStat.unitNumber); }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50/60 transition-colors cursor-pointer"
                          >
                            <span className="text-2xl flex-shrink-0">{uStat.topicIcon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="text-sm font-black text-slate-700 truncate">
                                  Unit {uStat.unitNumber}: {uStat.topicName}
                                </span>
                                <span className="text-xs font-black text-amber-700 whitespace-nowrap flex-shrink-0 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                  {uStat.totalUnitStars}/{uStat.maxUnitStars} ⭐
                                </span>
                              </div>
                              <div className="w-full h-2.5 bg-amber-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-slate-400 text-xs ml-1 flex-shrink-0 select-none font-black">
                              {isExp ? '▲' : '▼'}
                            </span>
                          </button>

                          {isExp && (
                            <div className="border-t-2 border-amber-50 px-4 pb-3 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-amber-50/30">
                              {uStat.lessons.map(lesson => (
                                <div
                                  key={lesson.lessonNumber}
                                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold ${
                                    lesson.completed
                                      ? 'bg-white border-2 border-amber-200 shadow-xs'
                                      : 'bg-white/60 border border-slate-100'
                                  }`}
                                >
                                  <span className={`truncate ${lesson.completed ? 'text-slate-800 font-bold' : 'text-slate-400'}`}>
                                    Lesson {lesson.lessonNumber}: {lesson.title}
                                  </span>
                                  <span className="ml-2 flex-shrink-0 flex items-center">
                                    {[1, 2, 3].map(s => (
                                      <span key={s} className={`text-base ${lesson.stars >= s ? 'text-amber-400' : 'text-slate-200'}`}>⭐</span>
                                    ))}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
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

        {/* Unit Journey Stepping Stones Popup Modal */}
        {selectedUnitModal && (() => {
          const { unit, unitIndex, theme, isUnitUnlocked } = selectedUnitModal;
          const firstIncompleteIdx = unit.lessons.findIndex(l => !l.completed);

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-pop-in">
              <div
                className={`w-full max-w-3xl max-h-[90vh] flex flex-col bg-gradient-to-b ${theme.bgGradient} rounded-[36px] border-4 ${theme.border} shadow-2xl relative overflow-hidden`}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-5 sm:p-7 border-b-2 border-slate-200/80 bg-white/70 backdrop-blur-md relative z-10">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border-2 border-amber-300 shadow-md flex items-center justify-center text-3xl sm:text-4xl flex-shrink-0">
                      {unit.topicIcon || theme.accentEmoji}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {unit.isCompleted ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300">
                            <Check className="w-3 h-3 stroke-[3]" /> Completed
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-900 text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-amber-300 animate-pulse">
                            <Sparkles className="w-3 h-3 text-amber-600 fill-amber-500" /> Exploring
                          </span>
                        )}
                      </div>
                      <h3 className="font-black text-xl sm:text-2xl text-slate-800 font-display">
                        Unit {unit.unitNumber}: {unit.topicName || unit.storyTitle || `Unit ${unit.unitNumber}`}
                      </h3>
                      <p className="text-xs sm:text-sm font-bold text-slate-600">
                        {unit.bigQuestion ? `💬 "${unit.bigQuestion}"` : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      sfx.playPop();
                      setSelectedUnitModal(null);
                    }}
                    className="w-11 h-11 rounded-2xl bg-white hover:bg-slate-100 border-2 border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 shadow-xs flex-shrink-0"
                  >
                    <X className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>

                {/* Modal Scrollable Body: Stepping Stones for 5 lessons + Treasure box */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 relative custom-scrollbar">
                  {/* Stepping Trail */}
                  <div className="relative flex flex-col items-center">
                    {/* Dashed connector line */}
                    <div className="absolute top-8 bottom-8 w-2 border-r-4 border-dashed border-amber-300/80 pointer-events-none" />

                    <div className="w-full max-w-xl flex flex-col gap-6 relative z-10">
                      {unit.lessons.map((lesson, idx) => {
                        const isAlternateRight = idx % 2 === 1;
                        const isLessonUnlocked = isUnitUnlocked && (idx === 0 || !!unit.lessons[idx - 1]?.completed);
                        const isCurrent = isUnitUnlocked && !lesson.completed && (firstIncompleteIdx === idx || firstIncompleteIdx === -1);
                        const wordCount = lesson.vocabularyItems?.length || 4;

                        return (
                          <div
                            key={lesson._id || idx}
                            className={`flex items-center w-full relative ${
                              isAlternateRight ? 'justify-end pr-2 sm:pr-6' : 'justify-start pl-2 sm:pl-6'
                            }`}
                          >
                            {/* Marker on current active lesson */}
                            {isCurrent && (
                              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 font-black text-[11px] px-3 py-1 rounded-full shadow-lg flex items-center gap-1 animate-bounce z-30 whitespace-nowrap border-2 border-white ring-2 ring-amber-300">
                                <span>🚩</span>
                                <span>Current Lesson</span>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                if (!isLessonUnlocked) {
                                  handleLockedClick(`Please complete Lesson ${idx} first to unlock Lesson ${lesson.lessonNumber || idx + 1}! 🌟`);
                                  return;
                                }
                                sfx.playPop();
                                setSelectedUnitModal(null);
                                navigate(`/lessons/${lesson._id}`);
                              }}
                              className={`group flex items-center gap-3.5 p-3.5 sm:p-4 rounded-[24px] border-3 text-left transition-all duration-300 cursor-pointer w-full max-w-[340px] sm:max-w-[400px] relative ${
                                lesson.completed
                                  ? 'bg-white border-emerald-300 hover:border-emerald-400 hover:shadow-xl hover:scale-103 shadow-sm'
                                  : isCurrent
                                  ? 'bg-gradient-to-r from-amber-50 via-white to-orange-50 border-amber-400 ring-3 ring-amber-300 animate-active-stone shadow-lg scale-103'
                                  : isLessonUnlocked
                                  ? 'bg-white border-amber-200/90 hover:border-amber-400 hover:shadow-md hover:scale-102 shadow-xs'
                                  : 'bg-slate-100/90 border-slate-200 opacity-60'
                              }`}
                            >
                              {/* Stepping-Stone Node Avatar */}
                              <div
                                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-sm flex-shrink-0 transition-transform ${
                                  lesson.completed
                                    ? 'bg-gradient-to-tr from-emerald-400 to-teal-500 text-white'
                                    : isCurrent
                                    ? 'bg-gradient-to-tr from-amber-400 via-yellow-400 to-orange-500 text-amber-950 group-hover:scale-110'
                                    : isLessonUnlocked
                                    ? 'bg-gradient-to-br from-amber-100 to-yellow-200 text-amber-900 border border-amber-300'
                                    : 'bg-slate-200 text-slate-400'
                                }`}
                              >
                                {lesson.completed ? (
                                  <Check className="w-7 h-7 stroke-[3]" />
                                ) : !isLessonUnlocked ? (
                                  <LockKeyhole className="w-6 h-6 stroke-[2.5]" />
                                ) : (
                                  <span className="font-display font-black text-xl">{lesson.lessonNumber || idx + 1}</span>
                                )}
                              </div>

                              {/* Lesson Info */}
                              <div className="min-w-0 pr-2 flex-1">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="text-[10px] font-black uppercase text-slate-400">
                                    Lesson {lesson.lessonNumber || idx + 1}
                                  </span>
                                  {lesson.completed ? (
                                    <span className="flex items-center text-amber-500 text-xs">
                                      {[...Array(lesson.stars || 3)].map((_, i) => (
                                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                                      ))}
                                    </span>
                                  ) : isCurrent ? (
                                    <span className="text-[10px] font-black text-amber-900 bg-amber-300 px-2 py-0.5 rounded-full animate-pulse">
                                      Let's play! 🚀
                                    </span>
                                  ) : !isLessonUnlocked ? (
                                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5">
                                      <LockKeyhole className="w-2.5 h-2.5" /> Locked
                                    </span>
                                  ) : null}
                                </div>
                                <h4 className="text-sm sm:text-base font-black text-slate-800 truncate group-hover:text-amber-700 transition-colors">
                                  Lesson {lesson.lessonNumber || idx + 1}: {lesson.title}
                                </h4>
                                <p className="text-xs font-bold text-slate-500 truncate">
                                  {wordCount} {wordCount === 1 ? 'word' : 'words'}
                                </p>
                              </div>
                            </button>
                          </div>
                        );
                      })}

                      {/* End of Unit Treasure Dais */}
                      <div className="flex flex-col items-center justify-center pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            sfx.playPop();
                            setSelectedUnitModal(null);
                            setSecretGiftData({
                              unit,
                              unitIndex,
                              isCompleted: !!unit.isCompleted
                            });
                            setShowSecretGift(true);
                          }}
                          className={`w-full max-w-md p-4 rounded-[24px] border-3 flex items-center justify-between gap-3 shadow-md transition-all cursor-pointer group hover:scale-103 active:scale-95 ${
                            !isUnitUnlocked
                              ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-60'
                              : unit.isCompleted
                              ? 'bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 border-amber-400 text-amber-950 shadow-amber-300/40 animate-pulse'
                              : 'bg-white hover:bg-amber-50/80 border-amber-300 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-xs transition-transform group-hover:rotate-12 ${
                                !isUnitUnlocked
                                  ? 'bg-slate-200 text-slate-400'
                                  : unit.isCompleted
                                  ? 'bg-amber-400 text-amber-950'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              🎁
                            </div>
                            <div className="text-left">
                              <div className="flex items-center gap-1 mb-0.5">
                                <span className="text-[10px] font-black uppercase text-amber-800">
                                  Unit {unit.unitNumber} Mystery Chest
                                </span>
                                {unit.isCompleted && (
                                  <span className="bg-amber-400 text-amber-950 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                                    Unlocked! ✨
                                  </span>
                                )}
                              </div>
                              <h4 className="font-black text-xs sm:text-sm text-slate-800">
                                {unit.isCompleted ? 'Claim Chest Rewards' : 'Secret Mystery Gift Box'}
                              </h4>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="btn-3d-amber py-1.5 px-3 rounded-xl text-xs font-black text-amber-950 inline-flex items-center gap-1">
                              <span>{unit.isCompleted ? 'Open Reward ➔' : 'View Chest'}</span>
                            </span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
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

        {/* 3D Puffy Sticker Showcase Modal */}
        {selectedSticker && (
          <StickerShowcaseModal
            sticker={selectedSticker.sticker}
            isUnlocked={selectedSticker.isUnlocked}
            onClose={() => setSelectedSticker(null)}
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
        </div>
      </main>

      <div className="flex-shrink-0">
      <ChildBottomNav
        totalStars={totalStars}
        completedCount={completedLessons}
        activeTab={activeTab}
        onTabChange={goTab}
      />
      </div>
    </div>
  );
};
