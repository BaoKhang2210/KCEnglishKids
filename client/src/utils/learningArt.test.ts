import { describe, it, expect } from 'vitest';
import { sentenceArt, wordArt, topicArt } from './learningArt';
describe('learning artwork resolution', () => {
  it('resolves phrases before shorter words and matches word boundaries', () => {
    expect(sentenceArt('I can brush my hair.')).toBe(wordArt('brush my hair')?.url);
    expect(sentenceArt('It is a carpet.')).not.toBe(wordArt('car')?.url);
  });
  it('uses new local assets for old inline placeholders while retaining supplied images', () => {
    expect(sentenceArt('A dog', 'data:image/svg+xml,old')).toBe(wordArt('dog')?.url);
    expect(sentenceArt('A dog', '/custom/picture.webp')).toBe('/custom/picture.webp');
    expect(sentenceArt('Yes, it is.', null, true)).toContain('/images/symbols/');
    expect(topicArt('animals')).toContain('/images/topics/animals');
  });
});
