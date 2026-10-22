import type { AgeGroupCode } from '../../../types';

export interface BubblePopParams {
  choicesCount: number;
  floatDurationSec: number;
  sizeVmin: number;
}

export const BUBBLE_POP_PARAMS: Record<AgeGroupCode, BubblePopParams> = {
  '3-4': {
    choicesCount: 2,
    floatDurationSec: 14,
    sizeVmin: 22,
  },
  '4-5': {
    choicesCount: 3,
    floatDurationSec: 11,
    sizeVmin: 20,
  },
  '5-6': {
    choicesCount: 4,
    floatDurationSec: 9,
    sizeVmin: 18,
  },
};
