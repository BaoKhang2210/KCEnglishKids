import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface FitGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  maxPerPage?: number;
  className?: string;
  emptyState?: React.ReactNode;
}

export function FitGrid<T>({
  items,
  renderItem,
  maxPerPage = 8,
  className = '',
  emptyState
}: FitGridProps<T>) {
  const [currentPage, setCurrentPage] = useState(0);

  if (!items || items.length === 0) {
    return emptyState ? (
      <div className="w-full h-full flex items-center justify-center">{emptyState}</div>
    ) : null;
  }

  const totalPages = Math.ceil(items.length / maxPerPage);
  const safeCurrentPage = Math.min(currentPage, Math.max(0, totalPages - 1));
  const currentItems = items.slice(safeCurrentPage * maxPerPage, (safeCurrentPage + 1) * maxPerPage);
  const count = currentItems.length;

  // Auto-compute responsive columns and rows
  let gridLayoutClass = 'grid-cols-2 grid-rows-1';
  if (count === 1) gridLayoutClass = 'grid-cols-1 grid-rows-1';
  else if (count === 2) gridLayoutClass = 'grid-cols-2 grid-rows-1';
  else if (count === 3) gridLayoutClass = 'grid-cols-3 grid-rows-1';
  else if (count === 4) gridLayoutClass = 'grid-cols-2 sm:grid-cols-4 grid-rows-2 sm:grid-rows-1';
  else if (count <= 6) gridLayoutClass = 'grid-cols-2 sm:grid-cols-3 grid-rows-3 sm:grid-rows-2';
  else if (count <= 8) gridLayoutClass = 'grid-cols-2 sm:grid-cols-4 grid-rows-4 sm:grid-rows-2';
  else if (count <= 12) gridLayoutClass = 'grid-cols-3 sm:grid-cols-4 grid-rows-4 sm:grid-rows-3';

  return (
    <div className={`w-full h-full min-h-0 flex flex-col justify-between overflow-hidden ${className}`}>
      {/* Dynamic Fitted Grid: rows and cols divide space equally */}
      <div className={`w-full flex-1 min-h-0 grid gap-2 sm:gap-3.5 ${gridLayoutClass} overflow-hidden`}>
        {currentItems.map((item, idx) => (
          <div key={idx} className="w-full h-full min-h-0 min-w-0 overflow-hidden flex flex-col">
            {renderItem(item, safeCurrentPage * maxPerPage + idx)}
          </div>
        ))}
      </div>

      {/* Pagination Controls (Only when total items > maxPerPage, non-scrolling) */}
      {totalPages > 1 && (
        <div className="shrink-0 flex items-center justify-center gap-3 pt-1.5 z-10">
          <button
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={safeCurrentPage === 0}
            className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
              safeCurrentPage === 0
                ? 'opacity-30 border-slate-300 text-slate-400 cursor-not-allowed'
                : 'border-amber-400 bg-white text-amber-900 shadow-sm hover:scale-105 active:scale-95 cursor-pointer'
            }`}
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`h-2.5 rounded-full transition-all ${
                  i === safeCurrentPage
                    ? 'w-6 bg-amber-500'
                    : 'w-2.5 bg-amber-200 hover:bg-amber-300'
                }`}
                aria-label={`Go to page ${i + 1}`}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={safeCurrentPage === totalPages - 1}
            className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
              safeCurrentPage === totalPages - 1
                ? 'opacity-30 border-slate-300 text-slate-400 cursor-not-allowed'
                : 'border-amber-400 bg-white text-amber-900 shadow-sm hover:scale-105 active:scale-95 cursor-pointer'
            }`}
            aria-label="Next Page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
