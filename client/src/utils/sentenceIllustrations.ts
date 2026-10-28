import { sentenceArt, symbolArt } from './learningArt';

/** Versioned local artwork, shared by lesson previews and live classroom screens. */
export const makeSentenceSvg = (emoji: string, _bg: string, label: string): string => symbolArt(emoji) || sentenceArt(label);
export const getSentenceIllustration = (text?: string, fallbackUrl?: string | null, isAnswer = false): string => sentenceArt(text, fallbackUrl, isAnswer);
