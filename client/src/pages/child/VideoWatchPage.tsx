import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flag,
  Headphones,
  Heart,
  List,
  ListChecks,
  LoaderCircle,
  Mic,
  Play,
  RotateCcw,
  Subtitles,
  Video,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import { ScreenShell } from '../../components/layout/ScreenShell';
import { VideoPlayer } from '../../components/child/video/VideoPlayer';
import { VideoTranscriptPanel } from '../../components/child/video/VideoTranscriptPanel';
import { VideoSpeakingStudio } from '../../components/child/video/VideoSpeakingStudio';
import { VideoExercisePanel } from '../../components/child/video/VideoExercisePanel';
import { VideoLessonSidebar } from '../../components/child/video/VideoLessonSidebar';
import { YouTubeBadge } from '../../components/child/video/YouTubeBadge';
import { useAuth } from '../../context/AuthContext';
import { videoApi } from '../../services/api';
import { playWordAudio, sfx } from '../../utils/audio';
import type {
  AgeGroupCode,
  VideoActivity,
  VideoCue,
  VideoEpisodeProgress,
  VideoEpisodeSummary,
  VideoProgressEvent,
  VideoSeriesDetail
} from '../../types';
import {
  activitySummary,
  buildLessonExercises,
  buildSegmentExercises,
  estimateSentenceCues,
  formatCueTimestamp,
  splitCueWords
} from '../../components/child/video/videoLibraryUtils';
import videoConfig from '../../../../shared/videoLearning.json';

type LessonTab = 'listen' | 'read' | 'speak' | 'exercise' | 'dub';

function resolveAge(code?: string): AgeGroupCode {
  return code === '4-5' || code === '5-6' ? code : '3-4';
}

export const VideoWatchPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { seriesSlug, episodeNumber } = useParams();
  const number = Number(episodeNumber);
  const ageGroup = resolveAge(user?.ageGroupCode);

  const [detail, setDetail] = useState<VideoSeriesDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [progress, setProgress] = useState<VideoEpisodeProgress | null>(null);
  const [watched, setWatched] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [autoNext, setAutoNext] = useState<boolean>(() => {
    try {
      const stored = window.localStorage.getItem('kc_video_autonext');
      if (stored === '0') return false;
      if (stored === '1') return true;
    } catch {
      // Fall through to the shared default.
    }
    return Boolean(videoConfig.autoNext?.enabledByDefault);
  });
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownTargetRef = useRef<{ fromEpisodeId: string; episodeNumber: number } | null>(null);
  const [hasEnded, setHasEnded] = useState(false);
  const [cues, setCues] = useState<VideoCue[]>([]);
  const [cuesLoading, setCuesLoading] = useState(false);
  const [cuesUnavailable, setCuesUnavailable] = useState(false);
  const [tab, setTab] = useState<LessonTab>('listen');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [resumeAt, setResumeAt] = useState(0);
  const [playerTime, setPlayerTime] = useState(0);
  const [selectedCueIdx, setSelectedCueIdx] = useState<number | null>(null);
  const [dubVideoMuted, setDubVideoMuted] = useState(true);
  const [localDubDone, setLocalDubDone] = useState(false);
  const [seekRequest, setSeekRequest] = useState<{
    time: number;
    token: number;
    end?: number;
    autoplay?: boolean;
  } | null>(null);

  const mountedRef = useRef(true);
  const watchedRef = useRef(0);
  const lastSavedRef = useRef(0);
  const autoNextTriggeredRef = useRef(false);
  const readRef = useRef<Set<number>>(new Set());
  const speakRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
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
    setFavorite(Boolean(detail.isFavorite));
  }, [detail]);

  const episode = detail?.episodes.find((item) => item.number === number) || null;
  const episodeIndex = detail && episode ? detail.episodes.findIndex((item) => item._id === episode._id) : -1;
  const nextEpisode =
    detail && episodeIndex >= 0 && episodeIndex < detail.episodes.length - 1
      ? detail.episodes[episodeIndex + 1]
      : null;

  const currentProgress = progress || episode?.progress || null;
  const activity = activitySummary(currentProgress);
  const listenDone =
    Boolean(currentProgress?.skills.find((skill) => skill.key === 'listen')?.done) ||
    watched >= Number(videoConfig.progress.listenDonePercent);
  const allDone = activity.total > 0 ? activity.done >= activity.total : listenDone;

  const sidebarEpisodes = useMemo(() => {
    if (!detail) return [];
    return detail.episodes.map((item) =>
      episode && item._id === episode._id && progress ? { ...item, progress } : item
    );
  }, [detail, episode, progress]);

  const seriesCompleted = sidebarEpisodes.filter((item) => {
    const summary = activitySummary(item.progress);
    return summary.total > 0 ? summary.done >= summary.total : item.progress.completed;
  }).length;
  const dubbingAvailable = Boolean(episode?.canDubbing && episode?.dubbingVideoUrl);
  /**
   * YouTube lessons keep their caption text inside the embed, so the sentence
   * grid uses evenly spaced markers built from the official caption count.
   * Licensed cues always win when the episode has them.
   */
  const sentenceCues = useMemo(() => {
    if (!episode || cues.length > 0) return cues;
    if (episode.source !== 'youtube') return [];
    const count = Number(episode.captionCueCount) || 0;
    const start = Math.max(0, Number(episode.clipStart) || 0);
    const end = Number(episode.clipEnd) || Number(episode.duration) || 0;
    return estimateSentenceCues(count, start, end);
  }, [cues, episode]);
  const cueCount = sentenceCues.length > 0 ? sentenceCues.length : Number(episode?.captionCueCount) || 0;
  const exerciseTotal = useMemo(() => {
    if (!episode) return 0;
    const maxChoices = episode.source === 'youtube' ? 10 : 6;
    const choiceCount = buildLessonExercises(episode.title, cues, maxChoices).filter(
      (item) => item.kind === 'choice'
    ).length;
    if (choiceCount > 0) return choiceCount;
    if (episode.source === 'youtube') return buildSegmentExercises(sentenceCues, maxChoices).length;
    return 0;
  }, [episode, cues, sentenceCues]);

  const applyProgress = useCallback((data: VideoEpisodeProgress) => {
    setProgress(data);
    setWatched((current) => Math.max(current, data.watchedPercent));
    watchedRef.current = Math.max(watchedRef.current, data.watchedPercent);
    readRef.current = new Set(Array.isArray(data.readIdx) ? data.readIdx : []);
    speakRef.current = new Set(Array.isArray(data.speakIdx) ? data.speakIdx : []);
  }, []);

  useEffect(() => {
    if (!episode) return;
    setProgress(episode.progress);
    setWatched(episode.progress.watchedPercent);
    watchedRef.current = episode.progress.watchedPercent;
    lastSavedRef.current = episode.progress.watchedPercent;
    readRef.current = new Set(episode.progress.readIdx || []);
    speakRef.current = new Set(episode.progress.speakIdx || []);
    setCountdown(null);
    countdownTargetRef.current = null;
    setHasEnded(false);
    autoNextTriggeredRef.current = false;
    setShowTranslation(false);
    setResumeAt(episode.progress.lastPositionSec || 0);
    setPlayerTime(episode.progress.lastPositionSec || 0);
    setSelectedCueIdx(null);
    setDubVideoMuted(true);
    setLocalDubDone(Boolean(episode.progress.dubDone));
    setSeekRequest(null);
    setCues([]);
    setCuesUnavailable(false);
    setTab('listen');
    setSidebarOpen(false);
    setReportOpen(false);
    setReportText('');
    setReportDone(false);
    setNotice('');
  }, [episode]);

  useEffect(() => {
    if (!episode) return;
    let cancelled = false;
    const stored = Array.isArray(episode.cues) ? episode.cues : [];
    setCues(stored);
    setCuesLoading(true);
    videoApi
      .getCues(episode._id)
      .then((res) => {
        if (cancelled) return;
        const next = Array.isArray(res.data?.cues) ? res.data.cues : [];
        if (next.length > 0 || stored.length === 0) setCues(next);
        setCuesUnavailable(
          Boolean(res.data?.unavailable) || (next.length === 0 && Number(episode.captionCueCount) > 0)
        );
      })
      .catch(() => {
        if (!cancelled) setCuesUnavailable(true);
      })
      .finally(() => {
        if (!cancelled) setCuesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [episode]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  const submitEvent = useCallback(
    (event: VideoProgressEvent) => {
      if (!episode) return;
      videoApi
        .saveProgress(episode._id, event)
        .then((res) => {
          if (mountedRef.current && res.success) applyProgress(res.data);
        })
        .catch(() => {
          // The next heartbeat or activity retries the same evidence.
        });
    },
    [applyProgress, episode]
  );

  const saveHeartbeat = useCallback(
    (percent: number, position: number, keepalive: boolean) => {
      if (!episode || percent < lastSavedRef.current - 0.4) return;
      lastSavedRef.current = Math.max(lastSavedRef.current, percent);
      videoApi
        .saveProgress(
          episode._id,
          {
            type: 'heartbeat',
            watchedPercent: Math.max(0, Math.min(100, percent)),
            lastPositionSec: Math.max(0, position)
          },
          keepalive
        )
        .then((res) => {
          if (!mountedRef.current || !res.success) return;
          applyProgress(res.data);
        })
        .catch(() => {
          // Progress is retried on the next heartbeat.
        });
    },
    [applyProgress, episode]
  );

  const handleWatched = useCallback((percent: number, position: number) => {
    watchedRef.current = Math.max(watchedRef.current, percent);
    setWatched((current) => (percent > current ? percent : current));
    setPlayerTime(position);
  }, []);

  const handleEnded = useCallback(() => {
    setHasEnded(true);
  }, []);

  const playCue = useCallback((cue: VideoCue) => {
    sfx.playPop();
    setSelectedCueIdx(cue.idx);
    setSeekRequest({ time: cue.start, token: Date.now(), end: cue.end, autoplay: true });
  }, []);

  /** The reading tab hides the player for stored videos, so sentences are read with speech audio. */
  const playCueSpeech = useCallback((cue: VideoCue) => playWordAudio(cue.text), []);

  const markRead = useCallback(
    (cue: VideoCue) => {
      if (!episode || readRef.current.has(cue.idx)) return;
      readRef.current.add(cue.idx);
      submitEvent({ type: 'read', idx: cue.idx });
    },
    [episode, submitEvent]
  );

  const markSpoken = useCallback(
    (cue: VideoCue) => {
      if (!episode || speakRef.current.has(cue.idx)) return;
      speakRef.current.add(cue.idx);
      submitEvent({ type: 'speak', idx: cue.idx });
    },
    [episode, submitEvent]
  );

  /** The source has one "Hoàn thành đọc" action, so it marks every cue as read. */
  const completeReading = useCallback(async () => {
    if (!episode) return;
    const sourceList = cues.length > 0 ? cues : sentenceCues;
    const pending = sourceList.filter((cue) => !readRef.current.has(cue.idx));
    if (pending.length === 0) return;
    sfx.playSuccess();
    for (const cue of pending) {
      readRef.current.add(cue.idx);
      try {
        const res = await videoApi.saveProgress(episode._id, { type: 'read', idx: cue.idx });
        if (mountedRef.current && res.success) applyProgress(res.data);
      } catch {
        readRef.current.delete(cue.idx);
      }
    }
  }, [applyProgress, cues, episode, sentenceCues]);

  const playWord = useCallback((word: string) => {
    void playWordAudio(word);
  }, []);

  const markDubbed = useCallback(() => {
    if (!episode || currentProgress?.dubDone || localDubDone) return;
    sfx.playSuccess();
    setLocalDubDone(true);
    if (episode.canDubbing) {
      submitEvent({ type: 'dub', done: true });
    }
  }, [currentProgress?.dubDone, episode, localDubDone, submitEvent]);

  const goTab = (target: string) => {
    navigate(target === 'path' ? '/' : `/?tab=${target}`);
  };

  const goSeries = useCallback(() => {
    if (!detail) return;
    sfx.playPop();
    navigate(`/videos/${detail.slug}`);
  }, [detail, navigate]);

  const openEpisode = useCallback(
    (target: VideoEpisodeSummary) => {
      if (!detail) return;
      sfx.playPop();
      setSidebarOpen(false);
      navigate(`/videos/${detail.slug}/${target.number}`);
    },
    [detail, navigate]
  );

  const handleComplete = useCallback(() => {
    if (!episode) return;
    if (!allDone) {
      setNotice(
        activity.total > 1
          ? `Bé cần hoàn thành ${activity.total} hoạt động: ${(currentProgress?.activities || [])
              .map((item) => item.label)
              .join(', ')}.`
          : 'Bé xem video thêm một chút để hoàn thành bài nhé.'
      );
      if (cues.length > 0) {
        setResumeAt(playerTime);
        setSeekRequest(null);
        setTab('read');
      } else {
        setTab('listen');
      }
      return;
    }
    sfx.playSuccess();
    if (nextEpisode) openEpisode(nextEpisode);
    else goSeries();
  }, [activity.total, allDone, cues.length, currentProgress?.activities, episode, goSeries, nextEpisode, openEpisode, playerTime]);

  const toggleAutoNext = () => {
    sfx.playPop();
    setAutoNext((value) => {
      const next = !value;
      try {
        window.localStorage.setItem('kc_video_autonext', next ? '1' : '0');
      } catch {
        // Preference is optional.
      }
      if (!next) setCountdown(null);
      return next;
    });
  };

  const toggleFavorite = async () => {
    if (!detail || favoriteBusy) return;
    sfx.playPop();
    setFavoriteBusy(true);
    try {
      const res = await videoApi.toggleFavorite(detail._id, !favorite);
      setFavorite(res.data.favorite);
    } catch {
      setNotice('Chưa lưu được bài yêu thích. Bé thử lại nhé.');
    } finally {
      setFavoriteBusy(false);
    }
  };

  const submitReport = async () => {
    if (!episode || reportBusy) return;
    const content = reportText.trim();
    if (!content) return;
    setReportBusy(true);
    try {
      await videoApi.report(episode._id, content);
      setReportDone(true);
      setReportText('');
    } catch {
      setNotice('Chưa gửi được báo lỗi. Bé thử lại nhé.');
    } finally {
      setReportBusy(false);
    }
  };

  // Auto-next only after the clip actually ends; thresholds live in shared config.
  useEffect(() => {
    if (!episode || !autoNext || !nextEpisode || !hasEnded || autoNextTriggeredRef.current) return;
    if (watchedRef.current < Number(videoConfig.progress.listenDonePercent)) return;
    autoNextTriggeredRef.current = true;
    countdownTargetRef.current = { fromEpisodeId: episode._id, episodeNumber: nextEpisode.number };
    setCountdown(Number(videoConfig.autoNext?.countdownSeconds) || 5);
  }, [autoNext, episode, hasEnded, nextEpisode]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      const target = countdownTargetRef.current;
      countdownTargetRef.current = null;
      if (target && episode && target.fromEpisodeId === episode._id && detail) {
        navigate(`/videos/${detail.slug}/${target.episodeNumber}`);
      }
      return;
    }
    const timer = setTimeout(() => setCountdown((value) => (value === null ? null : value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [countdown, detail, episode, navigate]);

  if (loading) {
    return (
      <ScreenShell activeTab="videos" onTabChange={goTab} hideBottomNav>
        <div className="grid flex-1 place-items-center">
          <div className="flex flex-col items-center gap-3 text-slate-600">
            <LoaderCircle className="h-10 w-10 animate-spin text-indigo-500" aria-hidden="true" />
            <p className="text-sm font-black">Đang mở bài học…</p>
          </div>
        </div>
      </ScreenShell>
    );
  }

  if (error || !detail || !episode) {
    return (
      <ScreenShell activeTab="videos" onTabChange={goTab} hideBottomNav>
        <div className="grid flex-1 place-items-center px-4">
          <div className="max-w-md rounded-[28px] border-2 border-amber-200 bg-white p-6 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-amber-500" aria-hidden="true" />
            <h1 className="mt-3 text-xl font-black text-slate-800">Chưa mở được bài học</h1>
            <p className="mt-1 text-sm font-bold text-slate-500">
              Bài này có thể chưa có hoặc đường mạng đang chậm. Con thử lại nhé.
            </p>
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
                onClick={() => goTab('videos')}
                className="inline-flex min-h-12 items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-5 text-sm font-black text-slate-700 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Về kho video
              </button>
            </div>
          </div>
        </div>
      </ScreenShell>
    );
  }

  const isYouTubeEpisode = episode.source === 'youtube';
  /**
   * Every lesson keeps the same five-step layout. YouTube lessons have no
   * stored caption text or dubbing track, but they still unlock reading with
   * the source captions shown inside the embed (read-along over the sentence
   * markers) and speaking practice over the same numbered segments.
   */
  const tabs: Array<{ key: LessonTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { key: 'listen', label: 'Nghe video', icon: Headphones },
    { key: 'read', label: 'Đọc phụ đề', icon: Subtitles },
    { key: 'speak', label: 'Luyện nói', icon: Mic },
    {
      key: 'exercise' as LessonTab,
      label: exerciseTotal > 0 ? `Bài tập (${exerciseTotal})` : 'Bài tập',
      icon: ListChecks
    },
    { key: 'dub' as LessonTab, label: 'Lồng tiếng', icon: Video }
  ];
  const activeTab: LessonTab = tab;
  const activityItems: VideoActivity[] = currentProgress?.activities || [];
  const playerEpisode: VideoEpisodeSummary = { ...episode, cues: sentenceCues };
  const readIdx = currentProgress?.readIdx || [];
  const readThreshold = Math.ceil(sentenceCues.length * Number(videoConfig.progress.readDoneRatio));
  const readDone =
    Boolean(activityItems.find((item) => item.key === 'read')?.done) ||
    (sentenceCues.length > 0 && readIdx.length >= readThreshold);
  const playingCueIndex = sentenceCues.findIndex(
    (cue) => cue.start <= playerTime + 0.05 && playerTime < cue.end
  );
  const selectedCue =
    selectedCueIdx !== null ? sentenceCues.find((cue) => cue.idx === selectedCueIdx) || null : null;
  const focusCue =
    playingCueIndex >= 0
      ? sentenceCues[playingCueIndex]
      : selectedCue || sentenceCues[0] || null;
  const readMode = activeTab === 'read';
  const speakMode = activeTab === 'speak';
  const exerciseMode = activeTab === 'exercise';
  const dubDone = Boolean(currentProgress?.dubDone || localDubDone);
  /**
   * YouTube lessons keep the player mounted in every tab: the sentence grid
   * and transcript panel seek the embed while reading, the speaking and dubbing
   * studios sample from it, and the exercise quiz can play segments through it.
   * Licensed stored lessons hide the player in the three focus tabs.
   */
  const focusMode = !isYouTubeEpisode && (readMode || speakMode || exerciseMode);
  const showSentencePanel = activeTab === 'listen';
  const showReadPanel = isYouTubeEpisode && readMode;
  const showSpeakPanel = isYouTubeEpisode && speakMode;
  const showExercisePanel = isYouTubeEpisode && exerciseMode;
  const showDubStudioPanel = !dubbingAvailable && activeTab === 'dub' && sentenceCues.length > 0;
  const sidePanelOpen =
    showSentencePanel || showReadPanel || showSpeakPanel || showExercisePanel || showDubStudioPanel;

  return (
    <ScreenShell activeTab="videos" onTabChange={goTab} hideBottomNav>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5">
        <header className="flex shrink-0 flex-wrap items-center gap-1.5 rounded-2xl border-2 border-slate-100 bg-white p-1.5 shadow-sm sm:gap-2">
          <button
            type="button"
            onClick={goSeries}
            aria-label="Quay lại danh sách bài học"
            title="Quay lại danh sách bài học"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border-2 border-sky-200 bg-white px-2.5 text-[13px] font-black text-sky-700 transition-colors hover:bg-sky-50 cursor-pointer sm:px-3"
          >
            <ChevronLeft className="h-[18px] w-[18px]" aria-hidden="true" />
            <span className="hidden sm:inline">Quay lại</span>
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Mở danh sách bài"
            title="Danh sách bài"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border-2 border-slate-200 bg-white px-2.5 text-[13px] font-black text-slate-700 transition-colors hover:bg-slate-50 xl:hidden cursor-pointer sm:px-3"
          >
            <List className="h-[18px] w-[18px]" aria-hidden="true" />
            <span className="hidden sm:inline">Danh sách bài</span>
          </button>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
            {tabs.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.key;
              const dubbed = item.key === 'dub';
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    sfx.playPop();
                    // Focus tabs unmount the player, so resume from this point next time.
                    if (
                      (item.key === 'read' || item.key === 'speak' || item.key === 'exercise') &&
                      activeTab !== item.key
                    ) {
                      setResumeAt(playerTime);
                      // Do not replay a sentence request when the player mounts again.
                      setSeekRequest(null);
                    }
                    setTab(item.key);
                  }}
                  aria-pressed={active}
                  aria-label={item.label}
                  title={item.label}
                  className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border-2 px-2 text-[13px] font-black transition-colors cursor-pointer min-[960px]:px-3 ${
                    active
                      ? dubbed
                        ? 'border-pink-500 bg-pink-600 text-white shadow-sm'
                        : 'border-sky-600 bg-sky-600 text-white shadow-sm'
                      : dubbed
                        ? 'border-pink-200 bg-pink-50 text-pink-600 hover:bg-pink-100'
                        : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  <span className="hidden min-[960px]:inline">{item.label}</span>
                </button>
              );
            })}
          </div>
        </header>

        <div
          className={`min-h-0 flex-1 ${
            focusMode ? 'overflow-hidden' : 'custom-scrollbar overflow-y-auto xl:overflow-hidden'
          }`}
        >
          <div className={`flex min-h-0 flex-col gap-2 xl:h-full xl:flex-row ${focusMode ? 'h-full' : ''}`}>
            <aside className="hidden xl:block xl:h-full xl:w-[300px] xl:shrink-0">
              <VideoLessonSidebar
                episodes={sidebarEpisodes}
                currentId={episode._id}
                completedEpisodes={seriesCompleted}
                episodeCount={detail.episodeCount}
                title={detail.title}
                autoNext={autoNext}
                onToggleAutoNext={toggleAutoNext}
                onOpen={openEpisode}
                onBack={goSeries}
              />
            </aside>

            <main
              className={
                focusMode
                  ? 'flex min-h-0 min-w-0 flex-1 flex-col'
                  : 'custom-scrollbar min-w-0 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1'
              }
            >
              {focusMode ? (
                readMode ? (
                  cuesLoading && cues.length === 0 ? (
                    <div className="grid min-h-0 flex-1 place-items-center rounded-2xl border-2 border-slate-100 bg-white">
                      <div className="flex flex-col items-center">
                        <LoaderCircle className="h-6 w-6 animate-spin text-sky-500" aria-hidden="true" />
                        <p className="mt-1 text-xs font-black text-slate-500">Đang tải phụ đề…</p>
                      </div>
                    </div>
                  ) : (
                    <VideoTranscriptPanel
                      key={episode._id}
                      cues={cues}
                      captionCueCount={Number(episode.captionCueCount) || 0}
                      readIdx={readIdx}
                      readDone={readDone}
                      onPlayCue={playCueSpeech}
                      onReadCue={markRead}
                      onPlayWord={playWord}
                      onCompleteReading={completeReading}
                      onContinueSpeaking={() => {
                        sfx.playPop();
                        setTab('speak');
                      }}
                      showTranslation={showTranslation}
                      onToggleTranslation={() => setShowTranslation((value) => !value)}
                      unavailable={cuesUnavailable}
                    />
                  )
                ) : exerciseMode ? (
                  <VideoExercisePanel
                    key={episode._id}
                    title={episode.title}
                    cues={cues}
                    captionsInVideo={isYouTubeEpisode}
                  />
                ) : cues.length === 0 ? (
                  <div className="grid min-h-0 flex-1 place-items-center rounded-2xl border-2 border-slate-100 bg-white px-4 text-center">
                    <div>
                      <Mic className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
                      <p className="mt-1 text-sm font-black text-slate-700">Chưa có câu để luyện nói</p>
                      <p className="mt-0.5 text-xs font-bold text-slate-500">
                        Bài này chưa tải được phụ đề. Bé sang tab Nghe video nhé.
                      </p>
                    </div>
                  </div>
                ) : (
                  <VideoSpeakingStudio
                    key={episode._id}
                    cues={cues}
                    showTranslation={showTranslation}
                    doneIdx={currentProgress?.speakIdx || []}
                    onSpeakCue={markSpoken}
                  />
                )
              ) : (
                <>
              <div
                className={`min-w-0 ${
                  sidePanelOpen
                    ? 'grid gap-2 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] md:items-start'
                    : ''
                }`}
              >
                <div className="min-w-0 space-y-2">
                  <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
                    <VideoPlayer
                      key={episode._id}
                      episode={playerEpisode}
                      ageGroup={ageGroup}
                      initialPosition={resumeAt}
                      showTranslation={showTranslation}
                      onWatched={handleWatched}
                      onHeartbeat={saveHeartbeat}
                      onEnded={handleEnded}
                      onTimeChange={setPlayerTime}
                      seekRequest={seekRequest}
                      mutedOverride={activeTab === 'dub' && !dubbingAvailable && dubVideoMuted}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="inline-flex h-9 shrink-0 items-center rounded-lg border-2 border-slate-200 bg-white px-3 text-[11px] font-black text-slate-700 shadow-sm">
                        Bài {episode.number}/{detail.episodeCount}
                      </span>
                      <button
                        type="button"
                        onClick={toggleAutoNext}
                        role="switch"
                        aria-checked={autoNext}
                        aria-label="Tự động chuyển bài tiếp theo"
                        title={autoNext ? 'Đang tự chuyển bài' : 'Tự chuyển bài'}
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[11px] font-bold text-slate-500 transition-colors hover:bg-slate-100 cursor-pointer"
                      >
                        <span
                          className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${
                            autoNext ? 'bg-sky-600' : 'bg-slate-200'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-[left] ${
                              autoNext ? 'left-[14px]' : 'left-0.5'
                            }`}
                          />
                        </span>
                        Auto next
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {countdown !== null ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1.5 text-[11px] font-black text-emerald-900">
                          Chuyển sau {countdown}s
                          <button
                            type="button"
                            onClick={() => setCountdown(null)}
                            className="rounded bg-white px-1.5 py-0.5 text-[10px] text-emerald-800 cursor-pointer"
                          >
                            Hủy
                          </button>
                        </span>
                      ) : nextEpisode ? (
                        <button
                          type="button"
                          onClick={() => openEpisode(nextEpisode)}
                          className="inline-flex h-9 items-center gap-1 rounded-lg bg-sky-600 px-3.5 text-[12px] font-black text-white shadow-sm transition-colors hover:bg-sky-700 cursor-pointer"
                        >
                          Bài tiếp theo
                          <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ) : (
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-black text-slate-500">
                          Bài cuối
                        </span>
                      )}
                    </div>
                  </div>

                  {activeTab === 'dub' && (
                    <section className="rounded-2xl border-2 border-slate-100 bg-white p-3">
                      <h2 className="flex items-center gap-2 text-sm font-black text-slate-800">
                        <Volume2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                        Lồng tiếng
                      </h2>
                      {dubbingAvailable ? (
                        <>
                          <p className="mt-1 text-[11px] font-bold leading-relaxed text-slate-500">
                            Nghe bản lồng tiếng, đọc theo từng câu rồi đánh dấu khi bé đã lồng tiếng xong.
                          </p>
                          <video
                            key={episode._id}
                            src={episode.dubbingVideoUrl}
                            poster={episode.thumbnail}
                            controls
                            playsInline
                            preload="metadata"
                            className="mt-2 aspect-video w-full rounded-xl bg-black"
                          />
                          <button
                            type="button"
                            onClick={markDubbed}
                            disabled={dubDone}
                            className={`mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-black disabled:opacity-60 cursor-pointer ${
                              dubDone
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            {dubDone ? 'Đã lồng tiếng xong' : 'Đánh dấu đã lồng tiếng'}
                          </button>
                        </>
                      ) : sentenceCues.length > 0 ? (
                        <>
                          <p className="mt-1 text-[12px] font-bold leading-relaxed text-slate-500">
                            Bé hãy chọn từng câu ở bảng bên phải, tắt tiếng video gốc rồi ghi âm giọng lồng tiếng của mình theo hình ảnh trên video nhé!
                          </p>
                          <div className="mt-2.5 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                sfx.playPop();
                                setDubVideoMuted((value) => !value);
                              }}
                              aria-pressed={dubVideoMuted}
                              className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border-2 px-3 text-xs font-black transition-colors cursor-pointer ${
                                dubVideoMuted
                                  ? 'border-pink-300 bg-pink-50 text-pink-800'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {dubVideoMuted ? (
                                <VolumeX className="h-4 w-4 text-pink-600" aria-hidden="true" />
                              ) : (
                                <Volume2 className="h-4 w-4 text-sky-600" aria-hidden="true" />
                              )}
                              {dubVideoMuted ? 'Đang tắt tiếng video gốc (Chế độ lồng tiếng)' : 'Đang bật tiếng video gốc'}
                            </button>
                            <button
                              type="button"
                              onClick={markDubbed}
                              disabled={dubDone}
                              className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3.5 text-xs font-black transition-colors disabled:opacity-60 cursor-pointer ${
                                dubDone
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                            >
                              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                              {dubDone ? 'Đã lồng tiếng xong' : 'Hoàn thành lồng tiếng'}
                            </button>
                          </div>
                        </>
                      ) : (
                        <p className="mt-2 text-sm font-black text-slate-700">Bài này chưa có bản lồng tiếng.</p>
                      )}
                    </section>
                  )}
                </div>

                {showSentencePanel && (
                  <div className="min-w-0 space-y-2">
                    <section className="rounded-2xl border-2 border-slate-100 bg-white p-3 shadow-sm">
                      <h2 className="flex items-center justify-center gap-1.5 text-[13px] font-black uppercase tracking-wide text-slate-800">
                        <Subtitles className="h-4 w-4 text-sky-600" aria-hidden="true" />
                        Luyện đọc từng câu ({cueCount} câu)
                      </h2>
                      {sentenceCues.length > 0 && (
                        <p className="mt-0.5 text-center text-[10px] font-bold text-slate-500">
                          Bấm số để phát câu đó · câu đang chọn/phát được tô xanh
                        </p>
                      )}
                      {sentenceCues.length > 0 ? (
                        <>
                          <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
                            {sentenceCues.map((cue, index) => {
                              const read = readIdx.includes(cue.idx);
                              const isCurrent =
                                index === playingCueIndex ||
                                (playingCueIndex < 0 && focusCue?.idx === cue.idx);
                              const label = cue.text ? `Câu ${index + 1}: ${cue.text}` : `Phát câu ${index + 1}`;
                              return (
                                <button
                                  key={cue.idx}
                                  type="button"
                                  onClick={() => {
                                    markRead(cue);
                                    playCue(cue);
                                  }}
                                  aria-label={
                                    cue.text
                                      ? label
                                      : `${label} (${formatCueTimestamp(cue.start)} đến ${formatCueTimestamp(cue.end)})`
                                  }
                                  aria-current={isCurrent ? 'true' : undefined}
                                  title={
                                    cue.text
                                      ? label
                                      : `${label} · ${formatCueTimestamp(cue.start)}–${formatCueTimestamp(cue.end)}`
                                  }
                                  className={`grid h-[34px] w-[34px] place-items-center rounded-lg border-2 text-[12px] font-black tabular-nums transition-colors cursor-pointer ${
                                    isCurrent
                                      ? 'border-sky-600 bg-sky-600 text-white shadow-sm'
                                      : read
                                        ? 'border-sky-200 bg-sky-50 text-sky-700'
                                        : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50'
                                  }`}
                                >
                                  {index + 1}
                                </button>
                              );
                            })}
                          </div>
                          <p className="mt-2 text-center text-[10px] font-bold text-slate-500">
                            Đã đọc {readIdx.length}/{sentenceCues.length} câu
                          </p>
                        </>
                      ) : (
                        <p className="mt-2 text-[11px] font-bold leading-relaxed text-slate-500">
                          Phụ đề chưa sẵn sàng. Bé vẫn xem video bình thường nhé!
                          {cueCount > 0 ? ` Bản gốc có ${cueCount} câu phụ đề.` : ''}
                        </p>
                      )}
                    </section>

                    <div className="rounded-2xl border-2 border-slate-100 bg-white px-4 py-4 text-center shadow-sm">
                      {focusCue ? (
                        <>
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-black text-sky-700">
                              Câu {focusCue.idx}/{sentenceCues.length}
                              <span className="text-sky-400">·</span>
                              <span className="tabular-nums">
                                {formatCueTimestamp(focusCue.start)} – {formatCueTimestamp(focusCue.end)}
                              </span>
                            </span>
                            <div className="flex items-center gap-1.5">
                              {focusCue.text && (
                                <button
                                  type="button"
                                  onClick={() => void playWordAudio(focusCue.text)}
                                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 text-[11px] font-black text-sky-700 transition-colors hover:bg-sky-100 cursor-pointer"
                                >
                                  <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  Đọc câu
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  markRead(focusCue);
                                  playCue(focusCue);
                                }}
                                className="inline-flex h-8 items-center gap-1 rounded-lg bg-sky-600 px-2.5 text-[11px] font-black text-white transition-colors hover:bg-sky-700 cursor-pointer"
                              >
                                <Play className="h-3.5 w-3.5 fill-white" aria-hidden="true" />
                                Phát đoạn này
                              </button>
                            </div>
                          </div>

                          <div className="mt-3">
                            {focusCue.text ? (
                              <>
                                <p className="text-lg font-black leading-snug text-slate-800 sm:text-xl">
                                  “
                                  {splitCueWords(focusCue.text).map((token, tokenIdx) =>
                                    token.word ? (
                                      <button
                                        key={`${focusCue.idx}-${tokenIdx}`}
                                        type="button"
                                        onClick={() => playWord(token.text)}
                                        aria-label={`Nghe từ ${token.text}`}
                                        className="rounded px-0.5 text-inherit underline-offset-2 hover:bg-sky-100 hover:text-sky-900 cursor-pointer"
                                      >
                                        {token.text}
                                      </button>
                                    ) : (
                                      <span key={`${focusCue.idx}-${tokenIdx}`}>{token.text}</span>
                                    )
                                  )}
                                  ”
                                </p>
                                <p className="mt-1.5 text-[10.5px] font-bold text-slate-400">
                                  Bấm vào từng từ tiếng Anh để nghe phát âm · bấm “Phát đoạn này” để xem trên video
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-lg font-black leading-snug text-slate-800">
                                  Câu {focusCue.idx}
                                </p>
                                <p className="mt-1 text-[11px] font-bold text-sky-700">
                                  Lời câu này hiện ngay trên video — phụ đề đã được bật sẵn.
                                </p>
                              </>
                            )}
                            {showTranslation && focusCue.translationVi && (
                              <p className="mt-1.5 text-xs font-bold text-slate-500">
                                {focusCue.translationVi}
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        <span className="text-base font-black text-slate-500">Chưa có câu phụ đề</span>
                      )}
                    </div>
                  </div>
                )}

                {showReadPanel && (
                  <div className="min-w-0 xl:h-[calc(100vh-180px)] xl:max-h-[680px]">
                    <VideoTranscriptPanel
                      key={`${episode._id}-read-yt`}
                      cues={sentenceCues}
                      captionCueCount={Number(episode.captionCueCount) || sentenceCues.length}
                      readIdx={readIdx}
                      readDone={readDone}
                      onPlayCue={(cue) => {
                        playCue(cue);
                      }}
                      onReadCue={markRead}
                      onPlayWord={playWord}
                      onCompleteReading={completeReading}
                      onContinueSpeaking={() => {
                        sfx.playPop();
                        setTab('speak');
                      }}
                      showTranslation={showTranslation}
                      onToggleTranslation={() => setShowTranslation((value) => !value)}
                      unavailable={cuesUnavailable}
                    />
                  </div>
                )}

                {showSpeakPanel && (
                  <div className="min-w-0">
                    <VideoSpeakingStudio
                      key={`${episode._id}-speak`}
                      cues={sentenceCues}
                      showTranslation={showTranslation}
                      doneIdx={currentProgress?.speakIdx || []}
                      onSpeakCue={markSpoken}
                      onPlaySample={playCue}
                    />
                  </div>
                )}

                {showExercisePanel && (
                  <div className="min-w-0">
                    <VideoExercisePanel
                      key={`${episode._id}-exercise`}
                      title={episode.title}
                      cues={sentenceCues}
                      captionsInVideo={isYouTubeEpisode}
                      segmentCues={sentenceCues}
                      onPlaySegment={playCue}
                    />
                  </div>
                )}

                {showDubStudioPanel && (
                  <div className="min-w-0">
                    <VideoSpeakingStudio
                      key={`${episode._id}-dub-studio`}
                      cues={sentenceCues}
                      showTranslation={showTranslation}
                      doneIdx={currentProgress?.speakIdx || []}
                      onSpeakCue={markSpoken}
                      onPlaySample={playCue}
                    />
                  </div>
                )}
              </div>

              <section className="mt-2 rounded-xl border-2 border-slate-100 bg-white p-3">
                <h1 className="text-base font-black leading-tight text-slate-800">
                  Bài {episode.number}: {episode.title}
                </h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white">
                    Level {detail.level.replace(/^L/i, '')}
                    {detail.levelTitle ? `: ${detail.levelTitle}` : ''}
                  </span>
                  {episode.source === 'youtube' && <YouTubeBadge size="sm" />}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={toggleFavorite}
                    disabled={favoriteBusy}
                    aria-pressed={favorite}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border-2 px-3 text-[11px] font-black transition-colors disabled:opacity-50 cursor-pointer ${
                      favorite
                        ? 'border-rose-300 bg-rose-50 text-rose-700'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${favorite ? 'fill-rose-500 text-rose-500' : ''}`} aria-hidden="true" />
                    Yêu thích
                  </button>
                  <button
                    type="button"
                    onClick={handleComplete}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border-2 px-3 text-[11px] font-black transition-colors cursor-pointer ${
                      allDone
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Hoàn thành bài
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sfx.playPop();
                      setReportDone(false);
                      setReportOpen(true);
                    }}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border-2 border-slate-200 bg-white px-3 text-[11px] font-black text-rose-600 transition-colors hover:border-rose-200 cursor-pointer"
                  >
                    <Flag className="h-4 w-4" aria-hidden="true" />
                    Báo lỗi
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                    Chủ đề: {detail.title}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                    Tiến độ: {Math.round(Number(currentProgress?.percent) || 0)}%
                  </span>
                </div>
              </section>

              {detail.attribution && (
                <p className="mt-2 rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-bold leading-relaxed text-slate-500">
                  {detail.attribution}
                </p>
              )}
                </>
              )}
            </main>
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex xl:hidden" role="dialog" aria-modal="true" aria-label="Danh sách bài học">
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Đóng danh sách bài"
            className="absolute inset-0 bg-slate-950/50"
          />
          <div className="relative mr-auto h-full w-[88%] max-w-sm p-2">
            <VideoLessonSidebar
              episodes={sidebarEpisodes}
              currentId={episode._id}
              completedEpisodes={seriesCompleted}
              episodeCount={detail.episodeCount}
              title={detail.title}
              autoNext={autoNext}
              onToggleAutoNext={toggleAutoNext}
              onOpen={openEpisode}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {reportOpen && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="video-report-heading"
        >
          <div className="w-full max-w-md rounded-2xl border-2 border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 id="video-report-heading" className="text-base font-black text-slate-800">
                Báo lỗi bài học
              </h2>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                aria-label="Đóng báo lỗi"
                className="grid h-9 w-9 place-items-center rounded-xl border-2 border-slate-200 text-slate-500 cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {reportDone ? (
              <div className="mt-3 text-center">
                <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" aria-hidden="true" />
                <p className="mt-1 text-sm font-black text-slate-700">Cảm ơn bé đã báo lỗi!</p>
                <p className="mt-0.5 text-[11px] font-bold text-slate-500">Thầy cô sẽ kiểm tra bài này.</p>
                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-indigo-600 px-4 text-xs font-black text-white cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <>
                <p className="mt-1 text-[11px] font-bold text-slate-500">
                  Bài {episode.number}: {episode.title}
                </p>
                <textarea
                  value={reportText}
                  onChange={(event) => setReportText(event.target.value.slice(0, 1000))}
                  rows={4}
                  placeholder="Con thấy video, phụ đề hay bài tập có gì chưa đúng?"
                  className="mt-2 w-full resize-none rounded-xl border-2 border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReportOpen(false)}
                    className="inline-flex min-h-10 items-center rounded-xl border-2 border-slate-200 px-3 text-xs font-black text-slate-600 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={submitReport}
                    disabled={reportBusy || reportText.trim().length === 0}
                    className="inline-flex min-h-10 items-center rounded-xl bg-indigo-600 px-4 text-xs font-black text-white disabled:opacity-40 cursor-pointer"
                  >
                    {reportBusy ? 'Đang gửi…' : 'Gửi báo lỗi'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {notice && (
        <div className="fixed bottom-4 left-1/2 z-[70] w-[92%] max-w-md -translate-x-1/2">
          <div className="flex items-start gap-2 rounded-2xl border-2 border-amber-200 bg-white px-3 py-2 shadow-lg">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-[11px] font-black leading-relaxed text-slate-700">{notice}</p>
            <button
              type="button"
              onClick={() => setNotice('')}
              aria-label="Đóng thông báo"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </ScreenShell>
  );
};
