import { useState, useEffect, useMemo } from 'react';

export interface FitGridResult {
  cols: number;
  rows: number;
  cardSize: number; // side length in px (square or aspect 1:1)
  gap: number;
}

/**
 * useFitGrid: Calculates the optimal card size and (cols, rows) grid
 * to maximize card surface within container (W x H) without overflow or scrolling.
 *
 * @param count - Total number of cards N (2 to 12)
 * @param containerW - Width of available card area
 * @param containerH - Height of available card area
 * @param maxCardSize - Maximum upper limit for card side (default 440px)
 */
export function useFitGrid(
  count: number,
  containerW: number,
  containerH: number,
  maxCardSize = 440
): FitGridResult {
  return useMemo(() => {
    if (count <= 0 || containerW <= 0 || containerH <= 0) {
      return { cols: 1, rows: 1, cardSize: 160, gap: 16 };
    }

    // Dynamic responsive gap: clamp(16px, 2.5% of min dimension, 32px)
    const minDim = Math.min(containerW, containerH);
    const gap = Math.max(16, Math.min(32, Math.round(minDim * 0.025)));

    let bestSize = 0;
    let bestCols = 1;
    let bestRows = count;

    // Test all possible (cols, rows) combinations where cols * rows >= count
    const maxCols = Math.min(count, 6);
    for (let cols = 1; cols <= maxCols; cols++) {
      const rows = Math.ceil(count / cols);

      const availW = containerW - (cols - 1) * gap;
      const availH = containerH - (rows - 1) * gap;

      if (availW <= 0 || availH <= 0) continue;

      const sizeByW = availW / cols;
      const sizeByH = availH / rows;
      const size = Math.min(sizeByW, sizeByH);

      if (size > bestSize) {
        bestSize = size;
        bestCols = cols;
        bestRows = rows;
      }
    }

    // Apply upper bound maxCardSize and lower bound guarantee
    const finalCardSize = Math.max(110, Math.min(maxCardSize, Math.floor(bestSize)));

    return {
      cols: bestCols,
      rows: bestRows,
      cardSize: finalCardSize,
      gap,
    };
  }, [count, containerW, containerH, maxCardSize]);
}
