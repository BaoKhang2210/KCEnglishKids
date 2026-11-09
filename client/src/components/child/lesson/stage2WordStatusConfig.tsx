import type { Stage2ReportRating } from './stage2ReportTypes';

export type Stage2WordState = Stage2ReportRating | 'NOT_PRACTICED';

export const stage2WordStates: Record<Stage2WordState, {
  label: string;
  shortLabel: string;
  description: string;
  group: 'remembered' | 'practice';
  faceClass: string;
  cardClass: string;
  imageClass: string;
}> = {
  SECURE: {
    label: 'Đã thuộc', shortLabel: 'Nhớ rồi', description: 'Con nhớ từ này rồi. Giỏi quá!', group: 'remembered',
    faceClass: 'bg-emerald-400 text-emerald-950 border-emerald-200',
    cardClass: 'border-emerald-300 border-[3px] bg-emerald-950/30', imageClass: '',
  },
  PRACTICE: {
    label: 'Cần luyện thêm', shortLabel: 'Gần nhớ rồi', description: 'Mình luyện thêm từ này nhé!', group: 'practice',
    faceClass: 'bg-amber-300 text-amber-950 border-amber-100',
    cardClass: 'border-amber-300 border-2 bg-amber-950/20', imageClass: '',
  },
  REVIEW: {
    label: 'Cần ôn lại', shortLabel: 'Ôn thêm nhé', description: 'Mình cùng ôn từ này nhé!', group: 'practice',
    faceClass: 'bg-orange-400 text-orange-950 border-orange-200',
    cardClass: 'border-orange-300 border-2 border-dashed bg-orange-950/20', imageClass: '',
  },
  NOT_PRACTICED: {
    label: 'Chưa luyện', shortLabel: 'Chưa gặp', description: 'Từ này mình chưa gặp. Cùng khám phá nhé!', group: 'practice',
    faceClass: 'bg-slate-300 text-slate-950 border-slate-100',
    cardClass: 'border-slate-300 border-2 border-dotted bg-slate-800/60', imageClass: 'brightness-0 opacity-60',
  },
};

export function getStage2WordState(rating: Stage2ReportRating | null | undefined): Stage2WordState {
  return rating || 'NOT_PRACTICED';
}

// Round results have two child-facing outcomes: right on the first try or keep practicing.
export function getStage2RoundVisualState(rating: Stage2ReportRating | null | undefined): Stage2WordState {
  if (!rating) return 'NOT_PRACTICED';
  return rating === 'SECURE' ? 'SECURE' : 'REVIEW';
}
