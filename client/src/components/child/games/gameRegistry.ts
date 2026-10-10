import React from 'react';
import type { Activity, Vocabulary } from '../../../types';

/**
 * Standard Game Definition in the GameRegistry
 */
export interface GameDefinition {
  id: string;
  shortName: string;
  icon: string;
  illustrationEmoji: string;
  skill: string;
  minWords: number;
  maxWords: number;
  themeColor: string;
}

export const GAME_REGISTRY: Record<string, GameDefinition> = {
  LISTEN_CHOOSE: {
    id: 'LISTEN_CHOOSE',
    shortName: 'Nghe & Chọn',
    icon: '🎧',
    illustrationEmoji: '🎯',
    skill: 'Nhận biết âm thanh',
    minWords: 2,
    maxWords: 8,
    themeColor: 'from-sky-400 to-blue-500 border-sky-400',
  },
  BUBBLE_POP: {
    id: 'BUBBLE_POP',
    shortName: 'Bong Bóng',
    icon: '🎈',
    illustrationEmoji: '🫧',
    skill: 'Chạm âm thanh',
    minWords: 2,
    maxWords: 8,
    themeColor: 'from-rose-400 to-pink-500 border-rose-400',
  },
  MEMORY_CARD: {
    id: 'MEMORY_CARD',
    shortName: 'Lật Thẻ Nhớ',
    icon: '🃏',
    illustrationEmoji: '✨',
    skill: 'Trí nhớ ghép đôi',
    minWords: 2,
    maxWords: 6,
    themeColor: 'from-amber-400 to-yellow-500 border-amber-400',
  },
  FEED_ANIMAL: {
    id: 'FEED_ANIMAL',
    shortName: 'Cho Bạn Ăn',
    icon: '🐾',
    illustrationEmoji: '🥣',
    skill: 'Đưa vật đến đích',
    minWords: 2,
    maxWords: 8,
    themeColor: 'from-emerald-400 to-teal-500 border-emerald-400',
  },
  TAP_PICTURE: {
    id: 'TAP_PICTURE',
    shortName: 'Chạm Nhanh',
    icon: '🖼️',
    illustrationEmoji: '👆',
    skill: 'Phản xạ thị giác',
    minWords: 2,
    maxWords: 8,
    themeColor: 'from-orange-400 to-amber-500 border-orange-400',
  },
};

/**
 * Helper to get distinct games for a lesson covering multiple skills
 */
export function getCleanGameTitle(game: Activity): string {
  const type = game.activityType || (game as any).type;
  if (GAME_REGISTRY[type]) {
    return GAME_REGISTRY[type].shortName;
  }
  // Remove suffix like ": Things at School" or ": People at School"
  const raw = game.title || 'Trò chơi vui';
  return raw.replace(/:\s*[^:]+$/i, '').trim();
}

export function getGameIllustration(game: Activity): { icon: string; emoji: string; color: string } {
  const type = game.activityType || (game as any).type;
  if (GAME_REGISTRY[type]) {
    return {
      icon: GAME_REGISTRY[type].icon,
      emoji: GAME_REGISTRY[type].illustrationEmoji,
      color: GAME_REGISTRY[type].themeColor,
    };
  }

  // Fallbacks by keywords in title
  const t = (game.title || '').toLowerCase();
  if (t.includes('memory') || t.includes('nhớ') || t.includes('thẻ')) {
    return { icon: '🃏', emoji: '✨', color: 'from-amber-400 to-yellow-500 border-amber-400' };
  }
  if (t.includes('bubble') || t.includes('bóng')) {
    return { icon: '🎈', emoji: '🫧', color: 'from-rose-400 to-pink-500 border-rose-400' };
  }
  if (t.includes('feed') || t.includes('ăn')) {
    return { icon: '🐾', emoji: '🥣', color: 'from-emerald-400 to-teal-500 border-emerald-400' };
  }
  return { icon: '🎧', emoji: '🎯', color: 'from-sky-400 to-blue-500 border-sky-400' };
}

/**
 * Ensures a lesson has at least 3 distinct games covering 3 distinct skills.
 */
export function pickLessonGames(
  lessonActivities: Activity[],
  vocabulary: Vocabulary[]
): Activity[] {
  if (lessonActivities && lessonActivities.length >= 3) {
    return lessonActivities;
  }

  // If lesson only has 1 or 2 activities, synthesize from vocabulary
  const activities: Activity[] = [...(lessonActivities || [])];
  const existingTypes = new Set(activities.map((a) => a.activityType || (a as any).type));

  const standardOrder = ['LISTEN_CHOOSE', 'BUBBLE_POP', 'MEMORY_CARD', 'FEED_ANIMAL'];

  for (const type of standardOrder) {
    if (activities.length >= 3) break;
    if (!existingTypes.has(type)) {
      const def = GAME_REGISTRY[type];
      const sliceWords = vocabulary.slice(0, 4);
      const synthGame: Activity = {
        _id: `synth_${type.toLowerCase()}`,
        title: def.shortName,
        activityType: type,
        instructions: `Cùng chơi trò ${def.shortName} nhé!`,
        difficulty: 1,
        questionCount: sliceWords.length,
        pointsPerQuestion: 10,
        starConfig: { threeStarsMin: 20, twoStarsMin: 15, oneStarMin: 10 },
        questions: sliceWords.map((v, i) => ({
          id: `q_${type}_${i}`,
          promptText: v.english,
          promptAudioUrl: v.audioUrl,
          correctAnswer: v.english,
          options: sliceWords.map((opt) => ({
            id: opt._id,
            text: opt.english,
            imageUrl: opt.imageUrl,
            vietnameseText: opt.vietnamese,
            isCorrect: opt.english === v.english,
          })),
        })),
      };
      activities.push(synthGame);
      existingTypes.add(type);
    }
  }

  return activities;
}
