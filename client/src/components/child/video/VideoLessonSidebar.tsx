import React from 'react';
import { ChevronLeft, GripVertical, X } from 'lucide-react';
import type { VideoEpisodeSummary } from '../../../types';
import { activityCounter, activitySummary } from './videoLibraryUtils';

interface VideoLessonSidebarProps {
  episodes: VideoEpisodeSummary[];
  currentId: string;
  completedEpisodes: number;
  episodeCount: number;
  title?: string;
  autoNext?: boolean;
  onToggleAutoNext?: () => void;
  onOpen: (episode: VideoEpisodeSummary) => void;
  onBack?: () => void;
  onClose?: () => void;
}

export const VideoLessonSidebar: React.FC<VideoLessonSidebarProps> = ({
  episodes,
  currentId,
  completedEpisodes,
  episodeCount,
  title,
  autoNext = false,
  onToggleAutoNext,
  onOpen,
  onBack,
  onClose
}) => {
  const percent = episodeCount > 0 ? Math.round((completedEpisodes / episodeCount) * 100) : 0;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border-2 border-slate-100 bg-white shadow-[0_2px_14px_rgba(15,23,42,0.05)]">
      <div className="flex shrink-0 items-center gap-1 px-2.5 pb-1 pt-2.5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Về danh sách bài học"
            title="Về danh sách bài học"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
        <h2 className="min-w-0 flex-1 truncate px-0.5 text-[17px] font-black leading-tight tracking-tight text-slate-800">
          {title || 'Danh sách bài'}
        </h2>
        {onToggleAutoNext && (
          <button
            type="button"
            onClick={onToggleAutoNext}
            role="switch"
            aria-checked={autoNext}
            aria-label="Tự động chuyển bài tiếp theo"
            title={autoNext ? 'Đang tự chuyển bài' : 'Tự chuyển bài'}
            className="flex shrink-0 items-center gap-1.5 py-1 pl-1 cursor-pointer"
          >
            <span
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                autoNext ? 'bg-sky-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-[left] ${
                  autoNext ? 'left-[18px]' : 'left-0.5'
                }`}
              />
            </span>
            <span className={`text-[11px] font-black ${autoNext ? 'text-sky-700' : 'text-slate-500'}`}>
              Auto next
            </span>
          </button>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng danh sách bài"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="shrink-0 px-4 pb-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11.5px] font-bold text-slate-500">
            Tiến độ: <span className="font-black text-slate-700">{completedEpisodes}/{episodeCount}</span>
          </span>
          <span className="text-[11.5px] font-black tabular-nums text-slate-700">{percent}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-[width] ${
              percent > 0 ? 'bg-gradient-to-r from-sky-400 to-sky-600' : ''
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <ul className="custom-scrollbar min-h-0 flex-1 space-y-px overflow-y-auto px-2 pb-2.5">
        {episodes.map((episode) => {
          const current = episode._id === currentId;
          const summary = activitySummary(episode.progress);
          const done = summary.total > 0 ? summary.done >= summary.total : episode.progress.completed;
          return (
            <li key={episode._id}>
              <button
                type="button"
                onClick={() => onOpen(episode)}
                aria-current={current ? 'true' : undefined}
                aria-label={`Mở bài ${episode.number}: ${episode.title}`}
                className={`group grid w-full grid-cols-[14px_32px_minmax(0,1fr)_auto] items-center gap-2 rounded-[12px] border-2 px-2 py-1.5 text-left transition-colors cursor-pointer ${
                  current ? 'border-sky-300 bg-sky-50' : 'border-transparent hover:bg-slate-50'
                }`}
              >
                <GripVertical
                  className={`h-3.5 w-3.5 ${current ? 'text-sky-300' : 'text-slate-300'}`}
                  aria-hidden="true"
                />
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-black tabular-nums ${
                    current
                      ? 'bg-sky-600 text-white shadow-sm'
                      : done
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {episode.number}
                </span>
                <span
                  className={`block truncate text-[13px] font-black leading-snug ${
                    current ? 'text-sky-900' : 'text-slate-700'
                  }`}
                >
                  {episode.title}
                </span>
                <span
                  className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-black tabular-nums ${
                    current
                      ? 'bg-white text-sky-700 ring-1 ring-inset ring-sky-200'
                      : done
                        ? 'bg-emerald-50 text-emerald-700'
                        : summary.done > 0
                          ? 'bg-sky-50 text-sky-700'
                          : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {activityCounter(episode.progress)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
