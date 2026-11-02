import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  LoaderCircle,
  Maximize,
  Minimize,
  Music2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Subtitles,
  Volume2,
  VolumeX
} from 'lucide-react';
import type { AgeGroupCode, VideoCue, VideoEpisodeSummary } from '../../../types';
import { playWordAudio, stopWordAudio } from '../../../utils/audio';
import { formatDuration } from './videoLibraryUtils';

interface VideoPlayerProps {
  episode: VideoEpisodeSummary;
  ageGroup: AgeGroupCode;
  initialPosition: number;
  showTranslation: boolean;
  onWatched: (watchedPercent: number, position: number) => void;
  onHeartbeat: (watchedPercent: number, position: number, keepalive: boolean) => void;
  onEnded: () => void;
  onPlayingChange?: (playing: boolean) => void;
  onTimeChange?: (time: number) => void;
  onRangeEnd?: () => void;
  seekRequest?: { time: number; token: number; end?: number; autoplay?: boolean } | null;
}

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  loadModule: (module: string) => void;
  unloadModule: (module: string) => void;
  getOption: (module: string, option: string) => any;
  setOption: (module: string, option: string, value: any) => void;
  destroy: () => void;
};

const YT_PLAYING = 1;
const YT_PAUSED = 2;
const YT_ENDED = 0;

let youtubeApiPromise: Promise<any> | null = null;

function loadYouTubeApi(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('No browser window.'));
  }
  const scope = window as any;
  if (scope.YT?.Player) return Promise.resolve(scope.YT);
  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve, reject) => {
      const previousReady = scope.onYouTubeIframeAPIReady;
      scope.onYouTubeIframeAPIReady = () => {
        if (typeof previousReady === 'function') previousReady();
        resolve(scope.YT);
      };
      if (document.getElementById('kc-youtube-iframe-api')) return;
      const script = document.createElement('script');
      script.id = 'kc-youtube-iframe-api';
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => reject(new Error('YouTube IFrame API failed to load.'));
      document.head.appendChild(script);
    });
  }
  return youtubeApiPromise;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  episode,
  ageGroup,
  initialPosition,
  showTranslation,
  onWatched,
  onHeartbeat,
  onEnded,
  onPlayingChange,
  onTimeChange,
  onRangeEnd,
  seekRequest
}) => {
  const isYouTube = episode.source === 'youtube';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ytHostRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<YTPlayer | null>(null);
  const ytCaptionRef = useRef<{ languageCode: string } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [segmentEnd, setSegmentEnd] = useState(Math.max(1, episode.clipEnd || episode.duration || 1));
  const [speed, setSpeed] = useState(1);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [volume, setVolume] = useState(0.9);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const clipStart = Math.max(0, Number(episode.clipStart) || 0);
  const startRef = useRef(clipStart);
  const endRef = useRef(segmentEnd);
  const maxWatchedRef = useRef(clipStart);
  const currentRef = useRef(0);
  const playingRef = useRef(false);
  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const callbacksRef = useRef({ onWatched, onHeartbeat, onEnded, onTimeChange, onRangeEnd });
  const lastCueIdxRef = useRef<number | null>(null);
  const seekTokenRef = useRef(0);
  const rangeEndRef = useRef<number | null>(null);

  useEffect(() => {
    callbacksRef.current = { onWatched, onHeartbeat, onEnded, onTimeChange, onRangeEnd };
  }, [onWatched, onHeartbeat, onEnded, onTimeChange, onRangeEnd]);

  const cues: VideoCue[] = Array.isArray(episode.cues) ? episode.cues : [];

  const watchedPercent = useCallback(() => {
    const span = Math.max(1, endRef.current - startRef.current);
    return Math.round(clamp(((maxWatchedRef.current - startRef.current) / span) * 100, 0, 100));
  }, []);

  const emitHeartbeat = useCallback((keepalive: boolean) => {
    const percent = watchedPercent();
    if (percent <= 0 && currentRef.current <= startRef.current) return;
    callbacksRef.current.onHeartbeat(percent, currentRef.current, keepalive);
  }, [watchedPercent]);

  useEffect(() => {
    const onPageHide = () => emitHeartbeat(true);
    const onBeforeUnload = () => emitHeartbeat(true);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [emitHeartbeat]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      emitHeartbeat(true);
      stopWordAudio();
      try {
        ytPlayerRef.current?.destroy();
      } catch {
        // Player may already be gone.
      }
      ytPlayerRef.current = null;
    };
    // Only when the whole player unmounts (episode pages remount the player).
  }, [emitHeartbeat]);

  useEffect(() => {
    playingRef.current = playing;
    onPlayingChange?.(playing);
  }, [playing, onPlayingChange]);

  const applyBounds = useCallback(
    (mediaDuration: number) => {
      const declaredEnd = Number(episode.clipEnd) || Number(episode.duration) || mediaDuration || 1;
      const end = Math.max(clipStart + 1, Math.min(declaredEnd, mediaDuration || declaredEnd));
      endRef.current = end;
      setSegmentEnd(end);
      const resume = clamp(Number(initialPosition) || 0, clipStart, end - 0.5);
      const startAt = resume >= end - 0.6 ? clipStart : resume;
      maxWatchedRef.current = Math.max(clipStart, startAt);
      currentRef.current = startAt;
      setCurrentTime(startAt);
      return startAt;
    },
    [clipStart, episode.clipEnd, episode.duration, initialPosition]
  );

  const seekTo = useCallback(
    (seconds: number) => {
      const target = clamp(seconds, startRef.current, Math.max(startRef.current, endRef.current - 0.15));
      stopWordAudio();
      endedRef.current = false;
      if (isYouTube) {
        try {
          ytPlayerRef.current?.seekTo(target, true);
        } catch {
          // Ignore seek failures while buffering.
        }
      } else if (videoRef.current) {
        try {
          videoRef.current.currentTime = target;
        } catch {
          // Metadata may still be loading.
        }
      }
      currentRef.current = target;
      setCurrentTime(target);
      callbacksRef.current.onTimeChange?.(target);
    },
    [isYouTube]
  );

  const seekManual = useCallback(
    (seconds: number) => {
      rangeEndRef.current = null;
      seekTo(seconds);
    },
    [seekTo]
  );

  const pauseMedia = useCallback(() => {
    if (isYouTube) {
      try {
        ytPlayerRef.current?.pauseVideo();
      } catch {
        // Ignore.
      }
    } else if (videoRef.current) {
      videoRef.current.pause();
    }
    setPlaying(false);
  }, [isYouTube]);

  const resumeMedia = useCallback(() => {
    setHasStarted(true);
    startedRef.current = true;
    endedRef.current = false;
    try {
      if (isYouTube) {
        ytPlayerRef.current?.playVideo();
      } else if (videoRef.current) {
        void videoRef.current.play().catch(() => {
          setPlaying(false);
          setError(false);
        });
      }
    } catch {
      setPlaying(false);
    }
  }, [isYouTube]);

  const markEnded = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setPlaying(false);
    emitHeartbeat(false);
    callbacksRef.current.onEnded();
  }, [emitHeartbeat]);

  const enforceClip = useCallback(
    (time: number) => {
      const rangeEnd = rangeEndRef.current;
      if (rangeEnd !== null && time >= rangeEnd - 0.08) {
        rangeEndRef.current = null;
        pauseMedia();
        callbacksRef.current.onRangeEnd?.();
        return;
      }
      if (time < startRef.current - 0.8) {
        seekTo(startRef.current);
        return;
      }
      if (time >= endRef.current - 0.12) {
        pauseMedia();
        markEnded();
      }
    },
    [markEnded, pauseMedia, seekTo]
  );

  const handleTick = useCallback(
    (time: number) => {
      if (!Number.isFinite(time)) return;
      currentRef.current = time;
      maxWatchedRef.current = Math.max(maxWatchedRef.current, time);
      setCurrentTime(time);
      callbacksRef.current.onWatched(watchedPercent(), time);
      callbacksRef.current.onTimeChange?.(time);
      enforceClip(time);
    },
    [enforceClip, watchedPercent]
  );

  const play = useCallback(() => {
    setError(false);
    if (!ready) return;
    rangeEndRef.current = null;
    if (currentRef.current >= endRef.current - 0.6) {
      seekTo(startRef.current);
    }
    resumeMedia();
  }, [ready, resumeMedia, seekTo]);

  const pause = useCallback(() => {
    pauseMedia();
    emitHeartbeat(false);
  }, [emitHeartbeat, pauseMedia]);

  // Sentence playback: seek to the cue start, stop at the cue end.
  useEffect(() => {
    if (!seekRequest || !ready) return;
    if (seekRequest.token === seekTokenRef.current) return;
    seekTokenRef.current = seekRequest.token;
    seekTo(seekRequest.time);
    const rangeEnd = Number(seekRequest.end);
    rangeEndRef.current = Number.isFinite(rangeEnd) && rangeEnd > seekRequest.time ? rangeEnd : null;
    if (seekRequest.autoplay) {
      const timer = setTimeout(resumeMedia, 90);
      return () => clearTimeout(timer);
    }
  }, [ready, resumeMedia, seekRequest, seekTo]);

  // Hosted <video> setup.
  useEffect(() => {
    if (isYouTube) return;
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    const onLoaded = () => {
      if (cancelled) return;
      const mediaDuration = Number.isFinite(video.duration) ? video.duration : episode.duration;
      const startAt = applyBounds(mediaDuration);
      try {
        video.currentTime = startAt;
      } catch {
        // Ignore.
      }
      setReady(true);
    };
    const onTime = () => handleTick(video.currentTime);
    const onPlayEvent = () => setPlaying(true);
    const onPauseEvent = () => {
      setPlaying(false);
      if (startedRef.current) emitHeartbeat(false);
    };
    const onEndEvent = () => markEnded();
    const onErrorEvent = () => {
      setError(true);
      setReady(false);
    };
    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('play', onPlayEvent);
    video.addEventListener('pause', onPauseEvent);
    video.addEventListener('ended', onEndEvent);
    video.addEventListener('error', onErrorEvent);
    if (video.readyState >= 1) onLoaded();
    return () => {
      cancelled = true;
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('play', onPlayEvent);
      video.removeEventListener('pause', onPauseEvent);
      video.removeEventListener('ended', onEndEvent);
      video.removeEventListener('error', onErrorEvent);
    };
  }, [applyBounds, episode._id, episode.duration, emitHeartbeat, handleTick, isYouTube, markEnded, retryToken]);

  // YouTube IFrame setup.
  useEffect(() => {
    if (!isYouTube) return;
    if (!episode.youtubeId) {
      setError(true);
      return;
    }
    let cancelled = false;
    let playerInstance: YTPlayer | null = null;
    let mountNode: HTMLDivElement | null = null;
    setReady(false);
    setError(false);
    const setup = async () => {
      try {
        const YT = await loadYouTubeApi();
        if (cancelled || !ytHostRef.current) return;
        mountNode = document.createElement('div');
        mountNode.className = 'h-full w-full';
        ytHostRef.current.appendChild(mountNode);
        const player = new YT.Player(mountNode, {
          videoId: episode.youtubeId,
          host: 'https://www.youtube-nocookie.com',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            playsinline: 1,
            cc_load_policy: 1,
            cc_lang_pref: 'en',
            origin: window.location.origin
          },
          events: {
            onReady: (event: { target: YTPlayer }) => {
              if (cancelled) return;
              ytPlayerRef.current = event.target;
              const mediaDuration = Number(event.target.getDuration()) || Number(episode.duration) || 1;
              const startAt = applyBounds(mediaDuration);
              try {
                event.target.seekTo(startAt, true);
                event.target.setPlaybackRate(speed);
              } catch {
                // Ignore.
              }
              // Pick the English caption track so the on-screen words match the lesson.
              try {
                event.target.loadModule('captions');
                window.setTimeout(() => {
                  if (cancelled) return;
                  try {
                    const tracks = event.target.getOption('captions', 'tracklist') || [];
                    const preferred =
                      tracks.find((track: { languageCode?: string }) =>
                        String(track?.languageCode || '').toLowerCase().startsWith('en')
                      ) || tracks[0];
                    if (preferred?.languageCode) {
                      ytCaptionRef.current = { languageCode: preferred.languageCode };
                      event.target.setOption('captions', 'track', {
                        languageCode: preferred.languageCode
                      });
                    }
                  } catch {
                    // cc_load_policy already requests captions on by default.
                  }
                }, 350);
              } catch {
                // Ignore.
              }
              setReady(true);
              if (pollRef.current) clearInterval(pollRef.current);
              pollRef.current = setInterval(() => {
                const active = ytPlayerRef.current;
                if (!active) return;
                const state = active.getPlayerState();
                if (state === YT_PLAYING) {
                  setPlaying(true);
                  handleTick(active.getCurrentTime());
                } else if (state === YT_PAUSED) {
                  setPlaying(false);
                } else if (state === YT_ENDED) {
                  setPlaying(false);
                  markEnded();
                }
              }, 250);
            },
            onStateChange: (event: { data: number }) => {
              if (cancelled) return;
              if (event.data === YT_PLAYING) setPlaying(true);
              if (event.data === YT_PAUSED) {
                setPlaying(false);
                if (startedRef.current) emitHeartbeat(false);
              }
              if (event.data === YT_ENDED) {
                setPlaying(false);
                markEnded();
              }
            },
            onError: () => {
              if (!cancelled) {
                setError(true);
                setReady(false);
              }
            }
          }
        });
        playerInstance = player;
      } catch {
        if (!cancelled) {
          setError(true);
          setReady(false);
        }
      }
    };
    setup();
    return () => {
      cancelled = true;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      try {
        playerInstance?.destroy();
        ytPlayerRef.current?.destroy();
      } catch {
        // Ignore.
      }
      ytPlayerRef.current = null;
      if (mountNode?.parentNode) mountNode.parentNode.removeChild(mountNode);
    };
    // speed intentionally excluded: applied by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyBounds, episode.duration, episode.youtubeId, isYouTube, markEnded, retryToken]);

  useEffect(() => {
    if (!ready) return;
    if (isYouTube) {
      try {
        ytPlayerRef.current?.setPlaybackRate(speed);
      } catch {
        // Ignore.
      }
    } else if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [isYouTube, ready, speed]);

  useEffect(() => {
    if (!ready) return;
    if (isYouTube) {
      try {
        ytPlayerRef.current?.setVolume(Math.round(volume * 100));
        if (muted) ytPlayerRef.current?.mute();
        else ytPlayerRef.current?.unMute();
      } catch {
        // Ignore.
      }
    } else if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = muted;
    }
  }, [isYouTube, muted, ready, volume]);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  /** YouTube keeps its captions inside the embed; toggle the official track. */
  const applyYtCaptions = useCallback(
    (on: boolean) => {
      if (!isYouTube) return;
      const player = ytPlayerRef.current;
      if (!player) return;
      try {
        if (on) {
          player.loadModule('captions');
          if (ytCaptionRef.current) player.setOption('captions', 'track', ytCaptionRef.current);
        } else {
          player.setOption('captions', 'track', {});
        }
      } catch {
        // Some embeds ship without the captions module.
      }
    },
    [isYouTube]
  );

  useEffect(() => {
    if (!ready || !isYouTube) return;
    applyYtCaptions(captionsOn);
  }, [applyYtCaptions, captionsOn, isYouTube, ready]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void containerRef.current?.requestFullscreen().catch(() => {});
    }
  }, []);

  // Periodic heartbeat while the video actually plays.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => emitHeartbeat(false), 10000);
    return () => clearInterval(id);
  }, [emitHeartbeat, playing]);

  const activeCue: VideoCue | null =
    cues.find((cue) => cue.start <= currentTime + 0.05 && currentTime < cue.end) || null;
  const activeCueIndex = activeCue ? cues.findIndex((cue) => cue.idx === activeCue.idx) : -1;
  const selectorIndex = activeCueIndex >= 0 ? activeCueIndex : 0;
  const previousCueIndex = activeCueIndex > 0 ? activeCueIndex - 1 : 0;
  const nextCueIndex = activeCueIndex >= 0 ? Math.min(cues.length - 1, activeCueIndex + 1) : 0;

  useEffect(() => {
    if (!activeCue) return;
    if (lastCueIdxRef.current !== activeCue.idx) {
      lastCueIdxRef.current = activeCue.idx;
      stopWordAudio();
    }
  }, [activeCue]);

  const speakWord = (word: string) => (event: React.MouseEvent) => {
    event.stopPropagation();
    void playWordAudio(word.replace(/[.,!?;:]/g, ''));
  };

  const showIntroHint =
    ready && !error && Number(episode.dialogueStartSec) > 0 && currentTime < Number(episode.dialogueStartSec) - 0.2;

  const showBigPlay = ready && !error && !hasStarted;
  const segmentLength = Math.max(1, segmentEnd - clipStart);

  return (
    <div
      ref={containerRef}
      className={`flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-slate-950 ${
        fullscreen ? 'rounded-none' : 'rounded-2xl border border-slate-900/80 shadow-sm'
      }`}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
        {!isYouTube && (
          <video
            key={retryToken}
            ref={videoRef}
            src={episode.videoUrl}
            poster={episode.thumbnail}
            playsInline
            preload="metadata"
            className="h-full w-full bg-black object-contain"
            aria-label={`Video tập ${episode.number}: ${episode.title}`}
          />
        )}
        {isYouTube && <div key={retryToken} ref={ytHostRef} className="h-full w-full" />}

        {!ready && !error && (
          <div className="absolute inset-0 grid place-items-center bg-slate-950/80 text-white">
            <div className="flex flex-col items-center gap-2">
              <LoaderCircle className="h-8 w-8 animate-spin text-indigo-300" aria-hidden="true" />
              <p className="text-sm font-bold">Đang chuẩn bị video…</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 grid place-items-center bg-slate-950/90 px-4 text-center text-white">
            <div>
              <AlertCircle className="mx-auto h-9 w-9 text-amber-300" aria-hidden="true" />
              <p className="mt-2 text-base font-black">Video chưa phát được</p>
              <p className="mt-1 text-xs font-bold text-slate-300">Con thử lại hoặc chọn tập khác nhé.</p>
              <button
                type="button"
                onClick={() => {
                  setError(false);
                  setReady(false);
                  setRetryToken((token) => token + 1);
                }}
                className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-amber-400 px-5 text-sm font-black text-amber-950 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Thử lại
              </button>
            </div>
          </div>
        )}

        {showIntroHint && (
          <button
            type="button"
            onClick={() => seekManual(Number(episode.dialogueStartSec))}
            aria-label="Bỏ qua nhạc mở đầu, tới lời thoại"
            className="absolute left-2 top-2 z-10 inline-flex min-h-12 items-center gap-2 rounded-full bg-slate-950/70 px-3 text-white backdrop-blur-sm cursor-pointer"
          >
            <Music2 className="h-5 w-5 text-amber-300" aria-hidden="true" />
            {ageGroup !== '3-4' && <span className="text-xs font-black">Nhạc mở đầu · Tới lời thoại</span>}
          </button>
        )}

        {activeCue && !showBigPlay && captionsOn && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-transparent px-4 pb-3 pt-12">
            <div className="pointer-events-auto mx-auto max-w-3xl text-center">
              {ageGroup === '5-6' ? (
                <p className="flex flex-wrap items-baseline justify-center gap-x-1.5 gap-y-0.5 text-xl font-black leading-snug text-white sm:text-2xl">
                  {activeCue.text.split(/\s+/).map((word, wordIdx) => (
                    <button
                      key={`${word}-${wordIdx}`}
                      type="button"
                      onClick={speakWord(word)}
                      aria-label={`Nghe từ ${word}`}
                      className="rounded px-0.5 text-left drop-shadow hover:bg-white/15 cursor-pointer"
                    >
                      {word}
                    </button>
                  ))}
                </p>
              ) : (
                <p className="text-xl font-black leading-snug text-white drop-shadow sm:text-2xl">
                  {activeCue.text}
                </p>
              )}
              {ageGroup === '5-6' && showTranslation && activeCue.translationVi && (
                <p className="mt-1 text-base font-bold text-white/80">{activeCue.translationVi}</p>
              )}
            </div>
          </div>
        )}

        {showBigPlay && (
          <button
            type="button"
            onClick={play}
            aria-label="Bấm để phát video"
            className="absolute inset-0 z-20 grid place-items-center overflow-hidden text-white cursor-pointer"
          >
            {/* Curated cover hides third-party player chrome until the child starts. */}
            <span className="absolute inset-0 bg-slate-900" aria-hidden="true" />
            {episode.thumbnail && (
              <img src={episode.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
            <span className="absolute inset-0 bg-slate-950/35" aria-hidden="true" />
            <span className="relative flex flex-col items-center gap-2.5">
              <span className="grid h-[76px] w-[76px] place-items-center rounded-full bg-sky-500 text-white shadow-[0_10px_30px_rgba(0,0,0,0.4)] ring-4 ring-white/15">
                <Play className="ml-1 h-9 w-9 fill-white" aria-hidden="true" />
              </span>
              <span className="rounded-full bg-slate-950/75 px-4 py-1.5 text-sm font-black text-white backdrop-blur-sm">
                {initialPosition > clipStart + 1 ? 'Tiếp tục xem' : 'Bấm để phát'}
              </span>
            </span>
          </button>
        )}
      </div>

      {/* Custom controls: no YouTube chrome, no channel title, no related rail. */}
      <div className="shrink-0 border-t border-white/5 bg-slate-950 px-2.5 pb-2 pt-1.5">
        <div>
          <input
            type="range"
            min={0}
            max={segmentLength}
            step={0.1}
            value={clamp(currentTime - clipStart, 0, segmentLength)}
            onChange={(event) => seekManual(clipStart + Number(event.target.value))}
            aria-label="Tua video"
            className="h-6 w-full cursor-pointer accent-sky-500"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10.5px] font-bold tabular-nums text-white/65">
              {formatDuration(currentTime)} / {formatDuration(segmentEnd)}
            </span>
            <span className="text-[10.5px] font-bold tabular-nums text-white/50">
              {cues.length > 0 ? `Câu ${selectorIndex + 1}/${cues.length}` : ''}
            </span>
          </div>
        </div>

        <div className="mt-0.5 flex items-center gap-0.5">
          <button
            type="button"
            onClick={playing ? pause : play}
            aria-label={playing ? 'Tạm dừng video' : 'Phát video'}
            disabled={!ready || error}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition-colors hover:bg-white/10 disabled:opacity-40 cursor-pointer"
          >
            {playing ? (
              <Pause className="h-6 w-6 fill-white" aria-hidden="true" />
            ) : (
              <Play className="ml-0.5 h-6 w-6 fill-white" aria-hidden="true" />
            )}
          </button>

          {cues.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => seekManual(cues[previousCueIndex].start)}
                disabled={activeCueIndex <= 0}
                aria-label="Nghe lại câu trước"
                title="Câu trước"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 cursor-pointer"
              >
                <SkipBack className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => seekManual(cues[nextCueIndex].start)}
                disabled={activeCueIndex === cues.length - 1}
                aria-label="Chuyển sang câu tiếp theo"
                title="Câu tiếp theo"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 cursor-pointer"
              >
                <SkipForward className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
            </>
          )}

          <div className="ml-0.5 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMuted((value) => !value)}
              aria-label={muted || volume === 0 ? 'Bật tiếng' : 'Tắt tiếng'}
              title={muted || volume === 0 ? 'Bật tiếng' : 'Tắt tiếng'}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
            >
              {muted || volume === 0 ? (
                <VolumeX className="h-[18px] w-[18px]" aria-hidden="true" />
              ) : (
                <Volume2 className="h-[18px] w-[18px]" aria-hidden="true" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(event) => {
                setVolume(Number(event.target.value));
                setMuted(false);
              }}
              aria-label="Âm lượng"
              className="hidden h-6 w-16 cursor-pointer accent-sky-500 sm:block"
            />
          </div>

          <button
            type="button"
            onClick={() => seekManual(Math.max(clipStart, currentTime - 5))}
            aria-label="Nghe lại 5 giây"
            title="Nghe lại 5 giây"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <RotateCcw className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>

          <div className="ml-auto flex items-center gap-1">
            {(cues.length > 0 || isYouTube) && (
              <button
                type="button"
                onClick={() => setCaptionsOn((value) => !value)}
                aria-pressed={captionsOn}
                aria-label={captionsOn ? 'Tắt phụ đề' : 'Bật phụ đề'}
                title={captionsOn ? 'Tắt phụ đề' : 'Bật phụ đề'}
                className={`inline-flex h-9 items-center gap-1 rounded-md px-2 text-[11px] font-black transition-colors cursor-pointer ${
                  captionsOn ? 'bg-sky-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/15'
                }`}
              >
                <Subtitles className="h-4 w-4" aria-hidden="true" />
                CC
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                setSpeed((value) => (value === 1 ? 1.25 : value === 1.25 ? 0.75 : 1))
              }
              aria-label={`Tốc độ phát ${speed}x`}
              title="Đổi tốc độ phát"
              className="inline-flex h-9 min-w-11 items-center justify-center rounded-md px-1.5 text-[11px] font-black tabular-nums text-white/80 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
            >
              {speed === 1 ? '1.0x' : `${speed}x`}
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
              title={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
            >
              {fullscreen ? (
                <Minimize className="h-[18px] w-[18px]" aria-hidden="true" />
              ) : (
                <Maximize className="h-[18px] w-[18px]" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
