import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { ALL_BADGES } from './badges';
import { ALL_STICKERS } from './stickers';
import { customRewardArt } from './customRewardArt';

it('packages a real transparent illustration for every sticker and individual badge', () => {
  const paths = new Set([
    ...ALL_STICKERS.map(sticker => customRewardArt(sticker.icon)),
    ...ALL_BADGES.map(badge => customRewardArt(badge.id)),
  ]);
  expect(paths.has(undefined)).toBe(false);
  expect(paths.size).toBe(ALL_STICKERS.length + ALL_BADGES.length);
  for (const path of paths) {
    const png = readFileSync(resolve('public', path!.slice(1)));
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(512);
    expect(png.readUInt32BE(20)).toBe(512);
    expect(png[25]).toBe(6); // RGBA, preserves the generated transparent background.
  }
});

it('gives every badge distinct artwork, even when two badges have the same requirement type', () => {
  const fingerprints = ALL_BADGES.map(badge => {
    const path = customRewardArt(badge.id);
    expect(path, badge.name).toBeDefined();
    return createHash('sha256').update(readFileSync(resolve('public', path!.slice(1)))).digest('hex');
  });
  expect(new Set(fingerprints).size).toBe(ALL_BADGES.length);
});
