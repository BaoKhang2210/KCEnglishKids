import { describe, expect, it } from 'vitest';
import type { Vocabulary } from '../../types';
import { buildTargetSequence, getWordType, isTransparentImage, pickDistractors } from './targetSelector';

const vocab = (id: string, extra: Partial<Vocabulary> = {}): Vocabulary => ({
  _id: id, english: id, vietnamese: id, ...extra,
});

describe('Stage 3 vocabulary selection', () => {
  it('infers common word types and defaults to nouns', () => {
    expect(getWordType(vocab('one'))).toBe('number');
    expect(getWordType(vocab('jump'))).toBe('verb');
    expect(getWordType(vocab('apple'))).toBe('noun');
    expect(getWordType(vocab('custom', { wordType: 'adjective' }))).toBe('adjective');
  });

  it('recognizes transparent image formats and explicit overrides', () => {
    expect(isTransparentImage(vocab('cat', { imageUrl: '/cat.png?size=2' }))).toBe(true);
    expect(isTransparentImage(vocab('photo', { imageUrl: '/photo.jpg' }))).toBe(false);
    expect(isTransparentImage(vocab('photo', { imageUrl: '/photo.jpg', isTransparent: true }))).toBe(true);
  });

  it('never fills a noun-only target sequence with unsupported words', () => {
    const sequence = buildTargetSequence(
      [vocab('run', { wordType: 'verb' }), vocab('blue', { wordType: 'color' })],
      4,
      ['noun'],
    );
    expect(sequence).toEqual([]);
  });

  it('uses each eligible word before repeating and avoids adjacent repeats', () => {
    const sequence = buildTargetSequence(
      [vocab('a'), vocab('b'), vocab('c')],
      5,
      ['noun'],
    );
    expect(new Set(sequence.slice(0, 3))).toEqual(new Set(['a', 'b', 'c']));
    expect(sequence).toHaveLength(5);
    expect(sequence.every((id, index) => index === 0 || id !== sequence[index - 1])).toBe(true);
  });

  it('prefers lesson distractors and then fills from the unit pool without duplicates', () => {
    const lesson = [vocab('target'), vocab('lesson-distractor')];
    const unit = [vocab('unit-distractor'), vocab('target')];
    const picks = pickDistractors('target', lesson, unit, 2);
    expect(new Set(picks.map(word => word._id))).toEqual(new Set(['lesson-distractor', 'unit-distractor']));
  });
});
