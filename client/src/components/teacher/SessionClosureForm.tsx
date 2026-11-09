import type { TeachingGuide } from './TeachingGuidePanel';
export type Coverage = 'COMPLETE' | 'CONTINUE' | 'REVIEW';

export function SessionClosureForm({
  reviewOnly,
  coverage,
  onCoverage,
}: {
  reviewOnly?: boolean;
  guide?: TeachingGuide;
  coverage: Coverage;
  onCoverage: (value: Coverage) => void;
  covered?: string[];
  onCovered?: (value: string[]) => void;
  reflection?: string;
  onReflection?: (value: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-teal-400/30 bg-slate-800/80 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-teal-300">Tiến độ bài học:</span>
        <span className="text-[11px] text-slate-400">Chọn mức độ hoàn thành bài để ghi nhận</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[
          ['CONTINUE', 'Dạy tiếp buổi sau', '⏳'],
          ['COMPLETE', 'Đã dạy đủ mục tiêu', '✅'],
          ['REVIEW', 'Buổi ôn tập', '🔄'],
        ]
          .filter(([key]) => !reviewOnly || key === 'REVIEW')
          .map(([key, label, icon]) => {
            const isSelected = coverage === key;
            return (
              <label
                key={key}
                onClick={() => onCoverage(key as Coverage)}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-teal-500/25 border-teal-400 text-teal-200 shadow-sm'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <input
                  type="radio"
                  name="teaching-coverage"
                  value={key}
                  checked={isSelected}
                  onChange={() => onCoverage(key as Coverage)}
                  className="sr-only"
                />
                <span>{icon}</span>
                <span>{label}</span>
              </label>
            );
          })}
      </div>
    </section>
  );
}
