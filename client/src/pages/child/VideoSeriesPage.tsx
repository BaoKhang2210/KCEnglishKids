import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Film,
  Heart,
  HelpCircle,
  LayoutGrid,
  List,
  LoaderCircle,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Volume2
} from 'lucide-react';
import { ScreenShell } from '../../components/layout/ScreenShell';
import { videoApi } from '../../services/api';
import { sfx } from '../../utils/audio';
import { YouTubeBadge } from '../../components/child/video/YouTubeBadge';
import type { VideoEpisodeSummary, VideoSeriesDetail, VideoSeriesSummary } from '../../types';
import {
  countDubbedLessons,
  durationLabel,
  filterLessons,
  pickStartEpisode,
  readLessonFilters,
  readLessonView,
  sourceLabel,
  topicLabel,
  writeLessonFilters,
  type LessonFilters,
  type LessonViewMode
} from '../../components/child/video/videoLibraryUtils';

function lessonStatus(episode: VideoEpisodeSummary): { label: string; percent: number; done: boolean } {
  const percent = Math.max(0, Math.min(100, Math.round(episode.progress.watchedPercent)));
  if (episode.progress.completed) return { label: 'Đã học xong', percent: 100, done: true };
  if (percent > 0) return { label: `Đang học ${percent}%`, percent, done: false };
  return { label: 'Chưa học', percent: 0, done: false };
}

function levelBadgeLabel(levelLabel: string): string {
  return levelLabel.replace(/^L(\d+)$/, 'Level $1');
}

/** End time shown next to each row, like the reference lesson list. */
function lessonEndLabel(episode: VideoEpisodeSummary): string {
  const seconds = Number(episode.duration) || Number(episode.clipEnd) || 0;
  return seconds > 0 ? durationLabel(seconds) : '';
}

export const VideoSeriesPage: React.FC = () => {
  const { seriesSlug } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [detail, setDetail] = useState<VideoSeriesDetail | null>(null);
  const [related, setRelated] = useState<VideoSeriesSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filters = useMemo(() => readLessonFilters(params), [params]);
  const view = useMemo(() => readLessonView(params), [params]);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  const showNotice = useCallback((message: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(message);
    noticeTimer.current = setTimeout(() => setNotice(null), 3400);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await videoApi.getSeries(String(seriesSlug || ''));
        if (!cancelled) setDetail(res.data);
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
  }, [seriesSlug, reloadKey]);

  useEffect(() => {
    if (!detail) return;
    let cancelled = false;
    videoApi
      .listSeries({ level: detail.level })
      .then((res) => {
        if (cancelled) return;
        const items = Array.isArray(res.data) ? res.data : [];
        setRelated(items.filter((item) => item._id !== detail._id).slice(0, 6));
      })
      .catch(() => {
        if (!cancelled) setRelated([]);
      });
    return () => {
      cancelled = true;
    };
  }, [detail]);

  const applyQuery = useCallback(
    (nextFilters: LessonFilters, nextView: LessonViewMode) => {
      setParams(writeLessonFilters(params, nextFilters, nextView), { replace: true });
    },
    [params, setParams]
  );

  const setKeyword = (keyword: string) => {
    applyQuery({ ...filters, keyword: keyword.slice(0, 80) }, view);
  };

  const patchFilters = (patch: Partial<LessonFilters>) => {
    sfx.playPop();
    applyQuery({ ...filters, ...patch }, view);
  };

  const setView = (nextView: LessonViewMode) => {
    sfx.playPop();
    applyQuery(filters, nextView);
  };

  const resetFilters = () => {
    sfx.playPop();
    applyQuery({ keyword: '', dubbingOnly: false }, view);
  };

  const goLibrary = () => {
    sfx.playPop();
    navigate('/?tab=videos');
  };

  const goTab = (tab: string) => {
    navigate(tab === 'path' ? '/' : `/?tab=${tab}`);
  };

  const openEpisode = (episode: VideoEpisodeSummary) => {
    if (!detail) return;
    sfx.playPop();
    navigate(`/videos/${detail.slug}/${episode.number}`);
  };

  const toggleFavorite = async () => {
    if (!detail || favoriteBusy) return;
    sfx.playPop();
    setFavoriteBusy(true);
    try {
      const res = await videoApi.toggleFavorite(detail._id, !detail.isFavorite);
      setDetail((current) =>
        current ? { ...current, isFavorite: Boolean(res.data?.favorite) } : current
      );
    } catch {
      showNotice('Chưa lưu được yêu thích. Bé thử lại sau nhé!');
    } finally {
      setFavoriteBusy(false);
    }
  };

  const episodes = detail?.episodes || [];
  const dubbedCount = countDubbedLessons(episodes);
  /** YouTube catalogues have no dubbing, so the dubbed filter stays hidden. */
  const dubbingFilter = dubbedCount > 0 && filters.dubbingOnly;
  const visibleEpisodes = filterLessons(
    episodes,
    dubbedCount > 0 ? filters : { ...filters, dubbingOnly: false }
  );
  const startEpisode = detail ? pickStartEpisode(detail.episodes, detail.progress.continue) : null;
  const episodeHalf = Math.ceil(visibleEpisodes.length / 2);
  const episodeColumns = [visibleEpisodes.slice(0, episodeHalf), visibleEpisodes.slice(episodeHalf)];

  if (loading) {
    return (
      <ScreenShell activeTab="videos" onTabChange={goTab} hideBottomNav>
        <div className="grid flex-1 place-items-center">
          <div className="flex flex-col items-center gap-3 text-slate-600">
            <LoaderCircle className="h-10 w-10 animate-spin text-indigo-500" aria-hidden="true" />
            <p className="text-sm font-black">Đang mở danh sách bài học…</p>
          </div>
        </div>
      </ScreenShell>
    );
  }

  if (error || !detail) {
    return (
      <ScreenShell activeTab="videos" onTabChange={goTab} hideBottomNav>
        <div className="grid flex-1 place-items-center px-4">
          <div className="max-w-md rounded-[28px] border-2 border-amber-200 bg-white p-6 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-amber-500" aria-hidden="true" />
            <h1 className="mt-3 text-xl font-black text-slate-800">Chưa mở được bộ video</h1>
            <p className="mt-1 text-sm font-bold text-slate-500">Con thử lại hoặc về danh sách khóa học nhé.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-black text-white cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Thử lại
              </button>
              <button
                type="button"
                onClick={goLibrary}
                className="inline-flex min-h-12 items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-5 text-sm font-black text-slate-700 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Danh sách Khóa học
              </button>
            </div>
          </div>
        </div>
      </ScreenShell>
    );
  }

  const hasFilters = Boolean(filters.keyword) || dubbingFilter;

  return (
    <ScreenShell activeTab="videos" onTabChange={goTab} hideBottomNav>
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1536px] space-y-4 pb-8">
          <header className="rounded-[24px] border-2 border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
                <span className="relative block h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100 sm:h-28 sm:w-28">
                  {detail.thumbnail ? (
                    <img src={detail.thumbnail} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Film className="absolute inset-0 m-auto h-8 w-8 text-slate-300" aria-hidden="true" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={goLibrary}
                    className="inline-flex min-h-9 items-center gap-0.5 rounded-lg text-xs font-black text-slate-600 transition-colors hover:text-indigo-700 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    Danh sách Khóa học
                  </button>
                  <h1 className="mt-0.5 text-2xl font-black leading-tight text-slate-800 sm:text-3xl">
                    {detail.title}
                  </h1>
                  <p className="mt-0.5 text-xs font-bold text-slate-500">
                    {[
                      detail.titleEn && detail.titleEn !== detail.title ? detail.titleEn : '',
                      topicLabel(detail.topicCode),
                      detail.sourceLabel || sourceLabel(detail.source),
                      `${detail.episodeCount} bài học`
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center rounded-full bg-rose-500 px-2.5 py-1 text-[11px] font-black text-white">
                      {levelBadgeLabel(detail.levelLabel)}
                    </span>
                    {detail.source === 'youtube' && <YouTubeBadge size="sm" />}
                    {(detail.difficultyLabel || detail.levelTitle) && (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                        {detail.difficultyLabel || detail.levelTitle}
                      </span>
                    )}
                    <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-black text-sky-700">
                      {detail.completedEpisodes}/{detail.episodeCount} bài đã học
                    </span>
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700">
                      {detail.ageLabel}
                    </span>
                    {detail.hasDubbing && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2.5 py-1 text-[11px] font-black text-pink-700">
                        <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Có lồng tiếng
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={toggleFavorite}
                  aria-label={detail.isFavorite ? `Bỏ yêu thích ${detail.title}` : `Yêu thích ${detail.title}`}
                  aria-pressed={detail.isFavorite}
                  disabled={favoriteBusy}
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 transition-colors cursor-pointer ${
                    detail.isFavorite
                      ? 'border-rose-300 bg-rose-500 text-white'
                      : 'border-slate-200 bg-white text-rose-400 hover:border-rose-300 hover:bg-rose-50'
                  }`}
                >
                  <Heart className={`h-5 w-5 ${detail.isFavorite ? 'fill-white' : ''}`} aria-hidden="true" />
                </button>
                {startEpisode && (
                  <button
                    type="button"
                    onClick={() => openEpisode(startEpisode)}
                    aria-label={`${detail.progress.continue ? 'Tiếp tục' : 'Bắt đầu'} học bài ${startEpisode.number}`}
                    className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 text-sm font-black text-white shadow-[inset_0_-3px_0_#047857] transition-colors hover:bg-emerald-600 cursor-pointer sm:flex-none"
                  >
                    <Play className="h-4 w-4 fill-white" aria-hidden="true" />
                    {detail.progress.continue ? 'Tiếp tục học' : 'Bắt đầu học'}
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* Lesson toolbar: search, type filter and the table/card switcher. */}
          <div className="rounded-[22px] border-2 border-slate-200 bg-white p-3 shadow-sm">
            <label className="relative block">
              <span className="sr-only">Tìm bài học</span>
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={filters.keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Tìm bài học (vd: rain, bugs, farm…)"
                className="min-h-12 w-full rounded-xl border-2 border-slate-200 bg-slate-50 pl-11 pr-4 text-base font-bold text-slate-800 outline-none focus:border-indigo-400"
              />
            </label>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-slate-600">Lọc:</span>
              <button
                type="button"
                onClick={() => patchFilters({ dubbingOnly: false })}
                aria-pressed={!dubbingFilter}
                className={`inline-flex min-h-9 items-center rounded-full border-2 px-3.5 text-xs font-black transition-colors cursor-pointer ${
                  !dubbingFilter
                    ? 'border-rose-500 bg-rose-500 text-white'
                    : 'border-rose-200 bg-white text-rose-600 hover:bg-rose-50'
                }`}
              >
                Tất cả ({episodes.length})
              </button>
              {dubbedCount > 0 && (
                <button
                  type="button"
                  onClick={() => patchFilters({ dubbingOnly: true })}
                  aria-pressed={filters.dubbingOnly}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border-2 px-3.5 text-xs font-black transition-colors cursor-pointer ${
                    filters.dubbingOnly
                      ? 'border-rose-500 bg-rose-500 text-white'
                      : 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
                  }`}
                >
                  <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Lồng tiếng ({dubbedCount})
                </button>
              )}

              <div className="ml-auto inline-flex rounded-2xl border-2 border-slate-200 bg-slate-50 p-1" role="group" aria-label="Cách hiển thị">
                <button
                  type="button"
                  onClick={() => setView('table')}
                  aria-pressed={view === 'table'}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-black transition-colors cursor-pointer ${
                    view === 'table' ? 'bg-white text-indigo-800 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  <List className="h-4 w-4" aria-hidden="true" />
                  Bảng
                </button>
                <button
                  type="button"
                  onClick={() => setView('card')}
                  aria-pressed={view === 'card'}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-black transition-colors cursor-pointer ${
                    view === 'card' ? 'bg-white text-indigo-800 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                  Thẻ
                </button>
              </div>
            </div>
          </div>

          <p className="sr-only" role="status" aria-live="polite">
            {notice || ''}
          </p>
          {notice && (
            <div className="flex items-start gap-2 rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {notice}
            </div>
          )}

          {visibleEpisodes.length === 0 ? (
            <div className="rounded-[26px] border-2 border-slate-200 bg-white p-8 text-center">
              <Search className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
              <p className="mt-3 text-lg font-black text-slate-700">Không tìm thấy bài học</p>
              <p className="mt-1 text-sm font-bold text-slate-500">Bé thử từ khóa khác hoặc xem tất cả bài nhé.</p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-black text-white cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Xem tất cả bài
                </button>
              )}
            </div>
          ) : view === 'table' ? (
            <div className="overflow-hidden rounded-[24px] border-2 border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                {episodeColumns.map((column, columnIndex) => (
                  <ul
                    key={columnIndex}
                    className={`divide-y divide-slate-100 ${
                      columnIndex === 0
                        ? 'lg:border-r-2 lg:border-slate-100'
                        : 'border-t-2 border-slate-100 lg:border-t-0'
                    }`}
                  >
                    {column.map((episode) => {
                      const status = lessonStatus(episode);
                      const endLabel = lessonEndLabel(episode);
                      return (
                        <li key={episode._id}>
                          <button
                            type="button"
                            onClick={() => openEpisode(episode)}
                            aria-label={`Mở bài ${episode.number}: ${episode.title}${endLabel ? `, dài ${endLabel}` : ''}`}
                            className="grid w-full grid-cols-[44px_minmax(0,1fr)_auto_18px] items-center gap-2 px-3 py-3 text-left transition-colors hover:bg-indigo-50 sm:gap-3 sm:px-4"
                          >
                            <span
                              className={`grid h-10 w-10 place-items-center rounded-full text-sm font-black ${
                                status.done
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : episode.progress.watchedPercent > 0
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {status.done ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : episode.number}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-base font-black leading-snug text-slate-800 line-clamp-2">
                                {episode.title}
                              </span>
                              <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-slate-500">
                                {episode.source === 'youtube' && <YouTubeBadge size="sm" />}
                                <span className={status.done ? 'text-emerald-700' : ''}>{status.label}</span>
                                {episode.canDubbing && (
                                  <span className="inline-flex items-center gap-0.5 text-emerald-700">
                                    <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                                    Lồng tiếng
                                  </span>
                                )}
                              </span>
                              {status.percent > 0 && (
                                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100">
                                  <span
                                    className={`block h-full rounded-full ${
                                      status.done ? 'bg-emerald-500' : 'bg-indigo-400'
                                    }`}
                                    style={{ width: `${status.percent}%` }}
                                  />
                                </span>
                              )}
                            </span>
                            <span className="flex shrink-0 flex-col items-end gap-0.5">
                              {endLabel && (
                                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-black tabular-nums text-slate-600">
                                  {endLabel}
                                </span>
                              )}
                              <span
                                className={`text-[11px] font-black tabular-nums ${
                                  status.done ? 'text-emerald-700' : 'text-slate-500'
                                }`}
                              >
                                {status.percent}%
                              </span>
                            </span>
                            <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" aria-hidden="true" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ))}
              </div>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleEpisodes.map((episode) => {
                const status = lessonStatus(episode);
                return (
                  <li key={episode._id}>
                    <button
                      type="button"
                      onClick={() => openEpisode(episode)}
                      aria-label={`Mở bài ${episode.number}: ${episode.title}`}
                      className="group block w-full overflow-hidden rounded-[22px] border-2 border-slate-200 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md cursor-pointer"
                    >
                      <span className="relative block aspect-video overflow-hidden bg-slate-100">
                        {episode.thumbnail || detail.thumbnail ? (
                          <img
                            src={episode.thumbnail || detail.thumbnail}
                            alt=""
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <Film className="absolute inset-0 m-auto h-8 w-8 text-slate-300" aria-hidden="true" />
                        )}
                        <span className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
                        <span className="absolute left-2 top-2 rounded-full bg-slate-950/70 px-2 py-0.5 text-[11px] font-black text-white">
                          Bài {episode.number}
                        </span>
                        {status.done && (
                          <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-white">
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          </span>
                        )}
                        <span className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                          {episode.source === 'youtube' && <YouTubeBadge size="sm" />}
                          {episode.canDubbing && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-black text-white">
                              <Volume2 className="h-3 w-3" aria-hidden="true" />
                              Lồng tiếng
                            </span>
                          )}
                          <span className="rounded-full bg-slate-950/55 px-2 py-0.5 text-[11px] font-black text-white backdrop-blur-sm">
                            {durationLabel(episode.duration)}
                          </span>
                        </span>
                      </span>
                      <span className="block p-4">
                        <span className="block text-base font-black leading-snug text-slate-800 line-clamp-2">{episode.title}</span>
                        <span className="mt-1 flex items-center justify-between gap-2 text-xs font-bold text-slate-500">
                          <span className={status.done ? 'text-emerald-700' : ''}>{status.label}</span>
                          <span className="inline-flex items-center gap-0.5 font-black text-indigo-700">
                            Xem bài
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                          </span>
                        </span>
                        <span className="mt-2 block h-2 overflow-hidden rounded-full bg-slate-100">
                          <span
                            className={`block h-full rounded-full ${status.done ? 'bg-emerald-500' : 'bg-indigo-400'}`}
                            style={{ width: `${status.percent}%` }}
                          />
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {related.length > 0 && (
            <section className="space-y-3" aria-labelledby="related-series-heading">
              <h2 id="related-series-heading" className="flex items-center gap-2 text-xl font-black text-slate-800">
                <Sparkles className="h-6 w-6 text-indigo-500" aria-hidden="true" />
                Khóa học liên quan
              </h2>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {related.map((item) => (
                  <li key={item._id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/videos/${item.slug}`)}
                      className="group flex w-full items-center gap-3.5 rounded-[22px] border-2 border-slate-200 bg-white p-3 text-left transition-all hover:border-indigo-300 hover:shadow-sm cursor-pointer"
                    >
                      <span className="relative block h-20 w-32 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                        {item.thumbnail ? (
                          <img src={item.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <Film className="absolute inset-0 m-auto h-7 w-7 text-slate-300" aria-hidden="true" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-black leading-snug text-slate-800 line-clamp-2">{item.title}</span>
                        <span className="mt-1 block truncate text-xs font-bold text-slate-500">
                          {levelBadgeLabel(item.levelLabel)} · {item.episodeCount} bài
                        </span>
                        <span className="mt-2 block h-2 overflow-hidden rounded-full bg-slate-100">
                          <span
                            className="block h-full rounded-full bg-indigo-400"
                            style={{
                              width: `${item.episodeCount ? Math.round((item.completedEpisodes / item.episodeCount) * 100) : 0}%`
                            }}
                          />
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-[24px] border-2 border-emerald-100 bg-white p-5 shadow-sm" aria-labelledby="learning-guide-heading">
            <h2 id="learning-guide-heading" className="flex items-center gap-2 text-xl font-black text-slate-800">
              <BookOpen className="h-6 w-6 text-emerald-600" aria-hidden="true" />
              Hướng dẫn học
            </h2>
            <ol className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { title: 'Xem một lần', body: 'Bé xem hết bài để hiểu nội dung câu chuyện.' },
                { title: 'Xem lại đoạn khó', body: 'Tua lại đoạn bé chưa hiểu và xem chậm hơn.' },
                { title: 'Nhắc lại câu ngắn', body: 'Bé nhắc to câu hoặc từ mới vừa nghe.' },
                { title: 'Nói theo nhân vật', body: 'Bé đóng vai và nói theo nhân vật trong video.' }
              ].map((step, index) => (
                <li key={step.title} className="flex gap-2.5 rounded-2xl bg-emerald-50 p-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block text-base font-black text-emerald-900">{step.title}</span>
                    <span className="mt-0.5 block text-sm font-bold leading-relaxed text-emerald-800">{step.body}</span>
                  </span>
                </li>
              ))}
            </ol>
            {detail.hasDubbing && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold leading-relaxed text-emerald-900">
                <Volume2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                Bé có thể chuyển sang bản lồng tiếng trong trang bài học nếu cần nghe lại bằng tiếng Việt.
              </p>
            )}
          </section>

          <section className="space-y-2" aria-labelledby="video-faq-heading">
            <h2 id="video-faq-heading" className="flex items-center gap-2 text-xl font-black text-slate-800">
              <HelpCircle className="h-6 w-6 text-indigo-500" aria-hidden="true" />
              Câu hỏi thường gặp
            </h2>
            {[
              {
                question: 'Bé mấy tuổi học được bộ video này?',
                answer: `Bộ video phù hợp với bé ${detail.targetAge ? `${detail.targetAge} tuổi` : detail.ageLabel}.`
              },
              {
                question: 'Bộ video có bao nhiêu bài?',
                answer: `${detail.episodeCount} bài, mỗi bài là một video ngắn để bé học mỗi ngày.`
              },
              {
                question: detail.hasDubbing ? 'Những bài nào có lồng tiếng?' : 'Bộ video có lồng tiếng không?',
                answer: detail.hasDubbing
                  ? `${detail.dubbingCount || 0}/${detail.episodeCount} bài có lồng tiếng. Bé có thể chuyển bản gốc hoặc bản lồng tiếng ở trang bài học.`
                  : 'Bộ video này dùng bản gốc, chưa có lồng tiếng.'
              },
              {
                question: 'Tiến độ học có được lưu không?',
                answer: 'Có. Bé xem đến đâu thì hệ thống ghi nhận đến đó, lần sau mở lại sẽ thấy bài đang học dở.'
              }
            ].map((item) => (
              <details key={item.question} className="group rounded-2xl border-2 border-slate-200 bg-white p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-base font-black text-slate-800">
                  {item.question}
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-90" aria-hidden="true" />
                </summary>
                <p className="mt-2 text-sm font-bold leading-relaxed text-slate-600">{item.answer}</p>
              </details>
            ))}
          </section>
        </div>
      </div>
    </ScreenShell>
  );
};
