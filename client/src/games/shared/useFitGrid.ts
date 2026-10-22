import { useEffect, useState, type RefObject } from 'react';

interface FitGridResult {
  cols: number;
  rows: number;
  cellSize: number;
}

/**
 * Fit an itemCount grid into a container so each cell is at least 72px (mobile)
 * or 96px (desktop), shrinking columns before dropping below the minimum.
 */
export function useFitGrid(
  containerRef: RefObject<HTMLElement | null>,
  itemCount: number,
  gap = 12
): FitGridResult {
  const [result, setResult] = useState<FitGridResult>({ cols: 2, rows: 2, cellSize: 96 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el || itemCount <= 0) return;

    const measure = () => {
      const minSize = window.innerWidth >= 768 ? 96 : 72;
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (width <= 0 || height <= 0) return;

      let best: FitGridResult = { cols: 1, rows: itemCount, cellSize: minSize };

      for (let cols = itemCount; cols >= 1; cols--) {
        const rows = Math.ceil(itemCount / cols);
        const cellW = (width - gap * (cols - 1)) / cols;
        const cellH = (height - gap * (rows - 1)) / rows;
        const cellSize = Math.floor(Math.min(cellW, cellH));
        if (cellSize >= minSize) {
          best = { cols, rows, cellSize };
          break;
        }
        if (cellSize > best.cellSize) {
          best = { cols, rows, cellSize: Math.max(minSize, cellSize) };
        }
      }

      setResult(best);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [containerRef, itemCount, gap]);

  return result;
}
