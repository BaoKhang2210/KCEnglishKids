import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  AudioLines,
  Baby,
  BookOpen,
  Film,
  Gamepad2,
  HardDrive,
  Headphones,
  Heart,
  List,
  LockKeyhole,
  Mic,
  MonitorPlay,
  Play,
  RotateCcw,
  Rocket,
  Search,
  SlidersHorizontal,
  Sprout,
  Volume2,
  Zap
} from 'lucide-react';
import type {
  AgeGroupCode,
  VideoContinueItem,
  VideoLevel,
  VideoSeriesListMeta,
  VideoSeriesSummary,
  VideoSkillKey
} from '../../../types';
import { videoApi } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { sfx } from '../../../utils/audio';
import { YouTubeBadge } from './YouTubeBadge';
import {
  VIDEO_AGE_META,
  VIDEO_AGE_ORDER,
  VIDEO_LEVEL_META,
  VIDEO_LEVELS,
  VIDEO_SKILL_META,
  VIDEO_SOURCES,
  defaultVideoFilters,
  isAgeTabAllowed,
  levelsForAgeTab,
  readVideoFilters,
  seriesMatchesFilters,
  sourceLabel,
  writeVideoFilters,
  type VideoFilters
} from './videoLibraryUtils';

interface ChildVideoLibrarySectionProps {
  ageGroupCode?: string;
}

const AGE_ICON: Record<AgeGroupCode, React.ComponentType<{ className?: string }>> = {
  '3-4': Baby,
  '4-5': Sprout,
  '5-6': Rocket
};

const SKILL_ICON: Record<VideoSkillKey, React.ComponentType<{ className?: string }>> = {
  listen: Headphones,
  read: BookOpen,
  speak: Mic,
  quiz: Gamepad2,
  dub: AudioLines
};

function resolveChildAge(ageGroupCode?: string): AgeGroupCode {
  return VIDEO_AGE_ORDER.includes(ageGroupCode as AgeGroupCode)
    ? (ageGroupCode as AgeGroupCode)
    : '3-4';
}

function levelName(level: VideoLevel): string {
  return `Level ${level.slice(1)}`;
}

function compareSeries(a: VideoSeriesSummary, b: VideoSeriesSummary): number {
  const byLevel = VIDEO_LEVELS.indexOf(a.level) - VIDEO_LEVELS.indexOf(b.level);
  if (byLevel !== 0) return byLevel;
  return (a.order || 0) - (b.order || 0);
}

const FilterPill: React.FC<{
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}> = ({ active, children, onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    aria-label={label}
    className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-2 px-3 text-xs font-black transition-colors cursor-pointer lg:min-h-9 ${
      active
        ? 'border-indigo-500 bg-indigo-100 text-indigo-900'
        : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-800'
    }`}
  >
    {children}
  </button>
);

const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: () => void;
  label: string;
  onClass: string;
}> = ({ checked, onChange, label, onClass }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={onChange}
    className={`relative h-7 w-12 shrink-0 rounded-full border-2 transition-colors cursor-pointer ${
      checked ? onClass : 'border-slate-300 bg-slate-200'
    }`}
  >
    <span
      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
        checked ? 'left-[22px]' : 'left-0.5'
      }`}
    />
  </button>
);

const CourseCard: React.FC<{
  series: VideoSeriesSummary;
  onOpen: () => void;
  onPlay: () => void;
  onFavorite: () => void;
}> = ({ series, onOpen, onPlay, onFavorite }) => {
  const skillIcons = series.availableSkills.slice(0, 3);

  return (
    <article className="group overflow-hidden rounded-[22px] border-2 border-slate-200/80 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Mở bộ video ${series.title}, ${series.episodeCount} tập`}
          className="absolute inset-0 block text-left cursor-pointer"
        >
          {series.thumbnail ? (
            <img
              src={series.thumbnail}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <span className="absolute inset-0 grid place-items-center bg-gradient-to-br from-sky-500 to-indigo-600">
              <Film className="h-9 w-9 text-white/80" aria-hidden="true" />
            </span>
          )}
          <span className="absolute inset-0 bg-gradient-to-b from-slate-950/25 via-transparent to-transparent" />

          <span className="absolute inset-x-0 top-0 z-10 flex items-center gap-1.5 p-3 pr-14">
            <span className="shrink-0 rounded-full bg-sky-600 px-3 py-1 text-xs font-black text-white shadow-sm">
              {levelName(series.level)}
            </span>
            <span className="ml-auto flex shrink-0 gap-1">
              {skillIcons.map((skill) => {
                const Icon = SKILL_ICON[skill];
                return (
                  <span
                    key={skill}
                    aria-label={VIDEO_SKILL_META[skill].label}
                    className="grid h-7 w-7 place-items-center rounded-full bg-white/95 text-sky-600 shadow-sm"
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                );
              })}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={onFavorite}
          aria-label={series.isFavorite ? `Bỏ yêu thích ${series.title}` : `Yêu thích ${series.title}`}
          aria-pressed={series.isFavorite}
          className={`absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full border-2 shadow-sm transition-colors cursor-pointer ${
            series.isFavorite
              ? 'border-rose-300 bg-rose-500 text-white'
              : 'border-white/70 bg-white/95 text-slate-400 hover:text-rose-500'
          }`}
        >
          <Heart className={`h-5 w-5 ${series.isFavorite ? 'fill-white' : ''}`} aria-hidden="true" />
        </button>
      </div>

      <div className="p-4">
        <h3 className="text-xl font-black leading-tight text-slate-900 line-clamp-1">{series.title}</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {series.source === 'youtube' && <YouTubeBadge />}
          {series.hasDubbing && (
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-pink-200 bg-pink-50 px-3 py-1 text-sm font-black text-pink-600">
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
              Lồng tiếng
            </span>
          )}
          <span className="rounded-full bg-amber-200 px-3 py-1 text-sm font-black text-amber-900">
            {series.ageLabel}
          </span>
        </div>

        <div className="mt-4 border-t-2 border-dashed border-slate-200 pt-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpen}
              aria-label={`Xem danh sách ${series.episodeCount} tập của ${series.title}`}
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm font-black text-slate-700 transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 cursor-pointer"
            >
              <List className="h-4 w-4" aria-hidden="true" />
              {series.episodeCount} tập
            </button>
            <button
              type="button"
              onClick={onPlay}
              aria-label={`Phát ngay ${series.title}`}
              className="inline-flex h-11 flex-[1.35] items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-sky-700 cursor-pointer"
            >
              Phát ngay
              <Play className="h-3.5 w-3.5 fill-white" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export const ChildVideoLibrarySection: React.FC<ChildVideoLibrarySectionProps> = ({ ageGroupCode }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const childAge = resolveChildAge(ageGroupCode || user?.ageGroupCode);
  const filters = useMemo(() => readVideoFilters(params, childAge), [params, childAge]);

  const [seriesList, setSeriesList] = useState<VideoSeriesSummary[]>([]);
  const [catalogue, setCatalogue] = useState<VideoSeriesListMeta['catalogue'] | null>(null);
  const [continueItems, setContinueItems] = useState<VideoContinueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  const showNotice = useCallback((message: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(message);
    noticeTimer.current = setTimeout(() => setNotice(null), 3600);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const listRes = await videoApi.listSeries({});
        if (cancelled) return;
        setSeriesList(Array.isArray(listRes.data) ? listRes.data : []);
        setCatalogue(listRes.meta?.catalogue ?? null);
        try {
          const continueRes = await videoApi.getContinue();
          if (!cancelled) setContinueItems(Array.isArray(continueRes.data) ? continueRes.data : []);
        } catch {
          if (!cancelled) setContinueItems([]);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const applyFilters = useCallback(
    (next: VideoFilters) => {
      setParams(writeVideoFilters(params, next), { replace: true });
    },
    [params, setParams]
  );

  const patchFilters = (patch: Partial<VideoFilters>) => {
    sfx.playPop();
    applyFilters({ ...filters, ...patch });
  };

  const resetFilters = () => {
    sfx.playPop();
    setShowFilters(false);
    applyFilters(defaultVideoFilters(childAge));
  };

  const selectAge = (age: AgeGroupCode) => {
    if (age === filters.age) return;
    sfx.playPop();
    if (!isAgeTabAllowed(childAge, age)) {
      showNotice('Nhóm tuổi này mở khi bé lớn thêm một chút. Bé xem nhóm tuổi của mình trước nhé!');
      return;
    }
    applyFilters({ ...filters, age, level: '' });
  };

  const selectLevel = (level: VideoLevel | '') => {
    sfx.playPop();
    applyFilters({ ...filters, level });
  };

  const toggleFavorite = async (series: VideoSeriesSummary) => {
    sfx.playPop();
    try {
      const res = await videoApi.toggleFavorite(series._id, !series.isFavorite);
      const favorite = Boolean(res.data?.favorite);
      setSeriesList((list) =>
        list.map((item) => (item._id === series._id ? { ...item, isFavorite: favorite } : item))
      );
    } catch {
      showNotice('Chưa lưu được video yêu thích. Con thử lại sau nhé!');
    }
  };

  const ageLevels = useMemo(() => levelsForAgeTab(filters.age), [filters.age]);
  const ageSeries = useMemo(
    () => seriesList.filter((series) => ageLevels.includes(series.level)),
    [seriesList, ageLevels]
  );
  const orderedAgeSeries = useMemo(() => [...ageSeries].sort(compareSeries), [ageSeries]);
  const visibleSeries = useMemo(
    () => seriesList.filter((series) => seriesMatchesFilters(series, filters)).sort(compareSeries),
    [seriesList, filters]
  );
  const levelGroups = useMemo(
    () =>
      ageLevels
        .map((level) => ({ level, items: visibleSeries.filter((series) => series.level === level) }))
        .filter((group) => group.items.length > 0),
    [ageLevels, visibleSeries]
  );

  const ageCounts = useMemo(() => {
    const counts = Object.fromEntries(VIDEO_AGE_ORDER.map((age) => [age, 0])) as Record<AgeGroupCode, number>;
    VIDEO_AGE_ORDER.forEach((age) => {
      counts[age] = levelsForAgeTab(age).reduce(
        (sum, level) => sum + (catalogue?.byLevel?.[level] ?? 0),
        0
      );
    });
    return counts;
  }, [catalogue]);

  const advancedFilterCount =
    (filters.source ? 1 : 0) + (filters.dubbing !== 'all' ? 1 : 0) + (filters.favorite ? 1 : 0);
  const hasNarrowing =
    advancedFilterCount > 0 || Boolean(filters.level) || Boolean(filters.search.trim());

  const resumeItem = continueItems[0] ?? null;
  const startSeries = resumeItem ? null : orderedAgeSeries.find((series) => series.firstEpisode) ?? null;
  const featuredTitle = resumeItem ? resumeItem.seriesTitle : startSeries?.title ?? '';
  const featuredLesson = resumeItem
    ? `Bài ${resumeItem.episodeNumber}: ${resumeItem.episodeTitle}`
    : startSeries?.firstEpisode
      ? `Bài ${startSeries.firstEpisode.number}: ${startSeries.firstEpisode.title}`
      : '';
  const featuredPercent = resumeItem
    ? Math.max(0, Math.min(100, Math.round(resumeItem.percent || 0)))
    : startSeries
      ? Math.max(0, Math.min(100, Math.round(startSeries.progress.percent || 0)))
      : 0;
  const featuredTarget = resumeItem
    ? `/videos/${resumeItem.seriesSlug}/${resumeItem.episodeNumber}`
    : startSeries
      ? `/videos/${startSeries.slug}`
      : '';
  const featuredSeries = resumeItem
    ? seriesList.find((series) => series.slug === resumeItem.seriesSlug) ?? null
    : startSeries;
  const featuredThumbnail = resumeItem?.thumbnail ?? featuredSeries?.thumbnail ?? '';

  return (
    <section className="space-y-5" aria-labelledby="video-library-heading">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-indigo-600 via-sky-600 to-teal-500 px-5 py-6 text-white shadow-lg">
        <span className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
        <span className="pointer-events-none absolute -bottom-16 left-1/3 h-32 w-32 rounded-full bg-white/10" />
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-black uppercase tracking-wider">
            <Film className="h-3.5 w-3.5" aria-hidden="true" />
            Video English
          </span>
          <h1 id="video-library-heading" className="mt-2 text-2xl font-black leading-tight sm:text-3xl">
            🎬 Học Tiếng Anh Qua Video Hoạt Hình
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-bold text-sky-50">
            {catalogue
              ? `${catalogue.total} bộ video · ${catalogue.totalEpisodes.toLocaleString('vi-VN')} tập hoạt hình`
              : 'Kho video hoạt hình'}{' '}
            với phụ đề từng câu, luyện đọc và lồng tiếng, chia theo 3 nhóm tuổi 3–4, 4–5 và 5–6.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['Phụ đề từng câu', 'Luyện đọc', 'Luyện nói', 'Lồng tiếng'].map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-[11px] font-black text-white"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </section>

      <p className="sr-only" role="status" aria-live="polite">
        {notice || ''}
      </p>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <aside className="min-w-0 lg:sticky lg:top-3 lg:self-start" aria-label="Bộ lọc video">
          <div className="rounded-[22px] border-2 border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-1.5 text-sm font-black text-slate-800">
                <SlidersHorizontal className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                Bộ lọc
              </p>
              <button
                type="button"
                onClick={() => {
                  sfx.playPop();
                  setShowFilters((value) => !value);
                }}
                aria-expanded={showFilters}
                aria-controls="video-filter-panel"
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border-2 border-slate-200 px-2.5 text-[11px] font-black text-slate-600 transition-colors hover:border-indigo-300 lg:hidden cursor-pointer"
              >
                {showFilters ? 'Thu gọn' : 'Thêm'}
                {advancedFilterCount > 0 && (
                  <span className="grid h-4 min-w-4 place-items-center rounded-full bg-indigo-600 px-1 text-[10px] text-white">
                    {advancedFilterCount}
                  </span>
                )}
              </button>
            </div>

            <label className="relative mt-3 block">
              <span className="sr-only">Tìm kiếm tên series</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={filters.search}
                onChange={(event) => {
                  const value = event.target.value.slice(0, 80);
                  applyFilters({ ...filters, search: value });
                }}
                placeholder="Tìm tên series..."
                className="h-10 w-full rounded-xl border-2 border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400"
              />
            </label>

            <div className="mt-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Nhóm tuổi</p>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5 lg:grid-cols-1">
                {VIDEO_AGE_ORDER.map((age) => {
                  const allowed = isAgeTabAllowed(childAge, age);
                  const active = filters.age === age;
                  const Icon = AGE_ICON[age];
                  const meta = VIDEO_AGE_META[age];
                  return (
                    <button
                      key={age}
                      type="button"
                      aria-pressed={active}
                      aria-disabled={!allowed}
                      onClick={() => selectAge(age)}
                      className={`relative flex min-h-[68px] flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-1.5 py-2 text-center transition-all cursor-pointer lg:min-h-0 lg:flex-row lg:justify-start lg:gap-2 lg:px-2.5 lg:py-2 lg:text-left ${
                        active
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                          : allowed
                            ? 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'
                            : 'border-slate-200 bg-slate-50 text-slate-400'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="flex min-w-0 flex-col leading-tight lg:items-start">
                        <span className="text-xs font-black leading-tight lg:text-sm">{meta.label}</span>
                        <span
                          className={`text-[10px] font-bold leading-tight ${
                            active ? 'text-indigo-100' : allowed ? 'text-slate-500' : 'text-slate-400'
                          }`}
                        >
                          {loading ? 'Đang tải…' : allowed ? `${ageCounts[age]} bộ video` : 'Mở khi lớn thêm'}
                        </span>
                      </span>
                      {!allowed && (
                        <LockKeyhole
                          className="absolute right-1.5 top-1.5 h-3 w-3 lg:static lg:ml-auto lg:h-3.5 lg:w-3.5"
                          aria-label="Chưa mở"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Cấp độ</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <FilterPill active={!filters.level} onClick={() => selectLevel('')} label="Tất cả cấp độ">
                  Tất cả
                </FilterPill>
                {ageLevels.map((level) => (
                  <FilterPill
                    key={level}
                    active={filters.level === level}
                    onClick={() => selectLevel(level)}
                    label={levelName(level)}
                  >
                    {levelName(level)}
                  </FilterPill>
                ))}
              </div>
            </div>

            <div
              id="video-filter-panel"
              className={`${showFilters ? 'block' : 'hidden'} mt-3 space-y-3 border-t border-slate-200 pt-3 lg:block`}
            >
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Nguồn phát hành</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <FilterPill active={!filters.source} onClick={() => patchFilters({ source: '' })} label="Mọi nguồn video">
                    Tất cả
                  </FilterPill>
                  {VIDEO_SOURCES.map((source) => (
                    <FilterPill
                      key={source}
                      active={filters.source === source}
                      onClick={() => patchFilters({ source })}
                      label={`Nguồn ${sourceLabel(source)}`}
                    >
                      {source === 'youtube' ? (
                        <MonitorPlay className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <HardDrive className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {sourceLabel(source)}
                    </FilterPill>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-slate-700">Có lồng tiếng</span>
                <ToggleSwitch
                  checked={filters.dubbing === 'yes'}
                  onChange={() => patchFilters({ dubbing: filters.dubbing === 'yes' ? 'all' : 'yes' })}
                  label="Chỉ video có lồng tiếng"
                  onClass="border-emerald-500 bg-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-700">
                  <Heart className="h-4 w-4 text-rose-500" aria-hidden="true" />
                  Video yêu thích
                </span>
                <ToggleSwitch
                  checked={filters.favorite}
                  onChange={() => patchFilters({ favorite: !filters.favorite })}
                  label="Chỉ hiện video bé yêu thích"
                  onClass="border-rose-500 bg-rose-500"
                />
              </div>
            </div>

            {hasNarrowing && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border-2 border-indigo-200 bg-indigo-50 text-xs font-black text-indigo-700 transition-colors hover:bg-indigo-100 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Đặt lại bộ lọc
              </button>
            )}
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          {notice && (
            <div className="flex items-start gap-2 rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {notice}
            </div>
          )}

      {!loading && !error && featuredTarget && (
        <section aria-labelledby="video-continue-heading">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-700">
            <Zap className="h-4 w-4 fill-amber-500 text-amber-500" aria-hidden="true" />
            <h2 id="video-continue-heading">{resumeItem ? 'Tiếp tục học' : 'Bắt đầu học'}</h2>
          </div>
          <div className="flex flex-col gap-3 rounded-[22px] border-2 border-amber-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => {
                sfx.playPop();
                navigate(featuredTarget);
              }}
              className="flex flex-1 items-center gap-3 text-left cursor-pointer"
            >
              {featuredThumbnail ? (
                <span className="relative block h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-24 sm:w-32">
                  <img
                    src={featuredThumbnail}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <span
                    className="absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-transparent"
                    aria-hidden="true"
                  />
                </span>
              ) : (
                <span
                  className="grid h-20 w-28 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 via-sky-500 to-teal-400 text-white sm:h-24 sm:w-32"
                  aria-hidden="true"
                >
                  <Film className="h-7 w-7" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-slate-500 line-clamp-1">{featuredTitle}</span>
                <span className="mt-0.5 block text-lg font-black leading-tight text-slate-800 line-clamp-2">
                  {featuredLesson}
                </span>
                <span className="mt-3 flex items-center gap-3">
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full bg-emerald-500"
                      style={{ width: `${featuredPercent}%` }}
                    />
                  </span>
                  <span className="text-xs font-black text-slate-600">{featuredPercent}%</span>
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                sfx.playPop();
                navigate(featuredTarget);
              }}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-black text-amber-950 shadow-sm transition-colors hover:bg-amber-300 cursor-pointer"
            >
              <Play className="h-4 w-4 fill-amber-950" aria-hidden="true" />
              {resumeItem ? 'Học tiếp' : 'Bắt đầu học'}
            </button>
          </div>
        </section>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-live="polite">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="animate-pulse overflow-hidden rounded-[22px] border-2 border-slate-100 bg-white">
              <div className="aspect-[16/10] bg-slate-100" />
              <div className="space-y-2 p-4">
                <div className="h-5 w-3/4 rounded bg-slate-100" />
                <div className="h-4 w-1/2 rounded bg-slate-100" />
                <div className="mt-4 h-11 w-full rounded-xl bg-slate-100" />
              </div>
            </div>
          ))}
          <span className="sr-only">Đang tải video…</span>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-[22px] border-2 border-amber-300 bg-amber-50 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-600" aria-hidden="true" />
          <p className="mt-3 text-lg font-black text-amber-900">Chưa tải được danh sách video</p>
          <p className="mt-1 text-sm font-bold text-amber-800">Con kiểm tra mạng rồi thử lại nhé.</p>
          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              setReloadKey((key) => key + 1);
            }}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-black text-amber-950 shadow-sm cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Thử lại
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {visibleSeries.length === 0 ? (
            <div className="rounded-[22px] border-2 border-slate-200 bg-white p-8 text-center">
              <Film className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
              <p className="mt-3 text-lg font-black text-slate-700">
                {hasNarrowing ? 'Không có video khớp bộ lọc' : 'Nhóm tuổi này chưa có video'}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-500">
                {hasNarrowing
                  ? 'Con thử bỏ bớt bộ lọc xem sao.'
                  : 'Cô giáo đang chuẩn bị thêm video cho bé.'}
              </p>
              {hasNarrowing && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-black text-white shadow-sm cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Xem tất cả video
                </button>
              )}
            </div>
          ) : (
            <section className="space-y-6" aria-labelledby="video-catalog-heading">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 id="video-catalog-heading" className="text-xl font-black text-slate-800">
                  Danh sách khóa học
                </h2>
                <p className="text-xs font-bold text-slate-500">
                  {VIDEO_AGE_META[filters.age].label} · {visibleSeries.length} khóa học
                </p>
              </div>
              {levelGroups.map(({ level, items }) => (
                <section key={level} aria-labelledby={`video-level-${level}`}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 id={`video-level-${level}`} className="text-lg font-black text-slate-800">
                      {levelName(level)}
                      <span className="ml-2 text-sm font-bold text-slate-500">
                        · {VIDEO_LEVEL_META[level].title}
                      </span>
                    </h3>
                    <span className="text-xs font-bold text-slate-500">
                      {items.length} khóa học · {VIDEO_LEVEL_META[level].ageLabel}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map((series) => (
                      <CourseCard
                        key={series._id}
                        series={series}
                        onOpen={() => {
                          sfx.playPop();
                          navigate(`/videos/${series.slug}`);
                        }}
                        onPlay={() => {
                          sfx.playPop();
                          const episodeNumber = series.progress.continue?.number ?? series.firstEpisode?.number;
                          navigate(
                            episodeNumber ? `/videos/${series.slug}/${episodeNumber}` : `/videos/${series.slug}`
                          );
                        }}
                        onFavorite={() => toggleFavorite(series)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </section>
          )}
        </>
      )}
        </div>
      </div>
    </section>
  );
};
