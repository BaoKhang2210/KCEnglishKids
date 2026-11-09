import React from 'react';
import roundsConfig from '../../../../../shared/stage2Rounds.json';
import type { AgeGroupCode } from '../../../types';
import type { Stage2ReportRound } from './stage2ReportTypes';

type MarkSize = 'sm' | 'md' | 'lg';

interface RoundMarkProps {
  round?: Partial<Stage2ReportRound>;
  ageGroup?: AgeGroupCode;
  size?: MarkSize;
  className?: string;
  /** Legend usage: expose the text next to the mark instead of an aria label. */
  decorative?: boolean;
  label?: string;
}

interface Stage2RoundMarksProps {
  rounds?: Array<Partial<Stage2ReportRound>>;
  ageGroup?: AgeGroupCode;
  size?: MarkSize;
  /** Show the round name under each mark (detail dialog). */
  withLabels?: boolean;
  className?: string;
}

const sizeClass: Record<MarkSize, string> = {
  sm: 'h-7 w-7 min-h-7 min-w-7',
  md: 'h-9 w-9 min-h-9 min-w-9',
  lg: 'h-12 w-12 min-h-12 min-w-12',
};

const CheckGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" className="h-1/2 w-1/2">
    <path d="M4.5 12.8 9.6 18 19.5 6.6" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const XGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" className="h-1/2 w-1/2">
    <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
  </svg>
);

const roundLabel = (round?: Partial<Stage2ReportRound>) => {
  if (!round) return 'chưa luyện';
  return round.rating === 'SECURE' ? 'đúng ngay' : 'cần luyện thêm';
};

/**
 * One round mark: a filled green check for a first-try correct round,
 * a soft coral X when the round needed support, or an empty dotted circle
 * when the round was not played. Shapes differ so greyscale still reads.
 */
export const RoundMark: React.FC<RoundMarkProps> = ({
  round,
  ageGroup = '4-5',
  size = 'sm',
  className = '',
  decorative = false,
  label,
}) => {
  const secure = round?.rating === 'SECURE';
  const wrong = Number(round?.wrongAttemptCount) || 0;
  const showWrongCount = ageGroup === '5-6' && Boolean(round) && !secure && wrong > 0;
  const accessible = label ?? `Vòng: ${roundLabel(round)}${showWrongCount ? `, ${wrong} lần sai` : ''}`;
  return (
    <span className={`flex min-w-0 flex-col items-center gap-0.5 ${className}`}>
      <span
        role={decorative ? undefined : 'img'}
        aria-hidden={decorative || undefined}
        aria-label={decorative ? undefined : accessible}
        className={`grid shrink-0 place-items-center rounded-full ${sizeClass[size]} ${
          secure
            ? 'border-2 border-emerald-200 bg-emerald-500 text-white'
            : round
              ? 'border-2 border-rose-200 bg-rose-400 text-white'
              : 'border-2 border-dashed border-slate-300 bg-transparent text-slate-300'
        }`}
      >
        {secure ? <CheckGlyph /> : round ? <XGlyph /> : <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />}
      </span>
      {showWrongCount && (
        <span className={`font-black leading-none text-rose-100 ${size === 'lg' ? 'text-xs' : 'text-[10px]'}`}>×{wrong}</span>
      )}
    </span>
  );
};

/**
 * A child-facing mark row: one circle per configured round.
 */
export const Stage2RoundMarks: React.FC<Stage2RoundMarksProps> = ({
  rounds = [],
  ageGroup = '4-5',
  size = 'sm',
  withLabels = false,
  className = '',
}) => {
  return (
    <span className={`flex items-start justify-center gap-1.5 ${className}`}>
      {roundsConfig.map((config) => {
        const round = rounds.find((item) => Number(item.code) === Number(config.code));
        return (
          <span key={config.code} className="flex min-w-0 flex-col items-center gap-0.5">
            <RoundMark
              round={round}
              ageGroup={ageGroup}
              size={size}
              label={`Vòng ${config.name}: ${roundLabel(round)}${ageGroup === '5-6' && round && round.rating !== 'SECURE' && Number(round.wrongAttemptCount) > 0 ? `, ${round.wrongAttemptCount} lần sai` : ''}`}
            />
            {withLabels && (
              <span className="max-w-16 truncate text-xs font-bold text-slate-300" aria-hidden="true">
                {config.name}
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
};
