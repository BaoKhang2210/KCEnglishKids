/**
 * LineMatchEngine.tsx
 * ===================
 * Stage 2 · Round 2 ("Vòng 2: Kết nối") — the single LINE MATCHING activity.
 *
 * The child draws (drag) or taps lines between word/sound cards on the LEFT and
 * picture cards on the RIGHT. One cubic Bézier line per matched pair in an SVG
 * overlay over the board; geometry is recomputed from node DOM positions via
 * ResizeObserver and stored by word id — never by pixel coordinates.
 *
 * Interaction
 *  - Drag: pointerdown on an unmatched node → drag → release on a node of the
 *    other column. Pointer capture, single active pointer, touch-action: none.
 *  - Tap (mandatory alternative): tap a card → selected (glow + audio for left
 *    cards) → tap a card in the other column → the line is evaluated.
 *  - Evaluate immediately; releasing in empty space retracts without penalty;
 *    same-side drops are ignored.
 *
 * Feedback (never red, no layout shift — the feedback row is reserved):
 *  correct → lock line + ping + star pop + word audio + praise;
 *  wrong → reach node, target card shakes 3px, line recoils, "Try again!".
 *  2 wrongs on a word → its correct node pulses; 3 wrongs → auto-draw (still
 *  earns the star, flagged revealed).
 *
 * All tunable numbers live in ./lineMatchConfig.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, Check } from 'lucide-react';
import type { AgeGroupCode } from '../../../types';
import { playWordAudio, sfx } from '../../../utils/audio';
import type { PracticeQuestion } from './buildPracticePlan';
import {
  LINE_COLORS,
  LINE_MATCH_LAYOUT,
  LINE_MATCH_TIMING,
  HINT_ATTEMPTS,
  REVEAL_ATTEMPTS,
  lineWidthForAge,
  magnetRadiusForAge,
  randomLineMatchPraise,
  rowHeightFor,
  shuffleRightColumn,
  wordIdOf,
} from './lineMatchConfig';

/** Persisted Round 2 state (checkpoint-friendly: plain data only). */
export interface LineMatchRoundState {
  /** boardIndex → right column wordId order (stable for the whole board). */
  rightOrderByBoard: Record<string, string[]>;
  matchedWordIds: string[];
  attemptsByWordId: Record<string, number>;
  firstWrongChoiceByWordId: Record<string, string>;
  revealedWordIds: string[];
}

export const emptyLineMatchState = (): LineMatchRoundState => ({
  rightOrderByBoard: {},
  matchedWordIds: [],
  attemptsByWordId: {},
  firstWrongChoiceByWordId: {},
  revealedWordIds: [],
});

interface LineMatchEngineProps {
  /** All Round 2 questions (one per word), in the plan's stable order. */
  questions: PracticeQuestion[];
  /** Flat question indexes per board (borrow-aware; a word may repeat). */
  boards: number[][];
  boardIndex: number;
  ageGroup: AgeGroupCode;
  /** Restored checkpoint state (already filtered to active words). */
  initialState: LineMatchRoundState | null;
  onStateChange: (state: LineMatchRoundState) => void;
  /** ONE answer per word: fired when a word is completed (matched or revealed). */
  onWordMatched: (wordId: string, info: { firstTry: boolean; revealed: boolean; chosenWrongWordId?: string }) => void;
  /** Fired per wrong link attempt (checkpoint + confusion tracking). */
  onWordWrong: (wordId: string, chosenWrongWordId: string) => void;
  onBoardComplete: (nextBoardIndex: number) => void;
  onRoundComplete: () => void;
  onFeedback: (message: string) => void;
  /** Reports the measured board content height so the parent can fit boards. */
  onSizeMeasured?: (contentHeight: number) => void;
}

type Side = 'left' | 'right';

interface Point { x: number; y: number }

const bezierPath = (a: Point, b: Point): string => {
  const dx = Math.max(60, Math.abs(b.x - a.x) / 2);
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
};

const midPoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );
  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

interface LockedLine {
  wordId: string;
  colorIndex: number;
  from: Point;
  to: Point;
  animate: boolean;
}

interface StarPop { id: number; x: number; y: number; color: string }
interface PingRing { id: number; x: number; y: number; color: string }
interface RecoilLine { id: number; from: Point; to: Point; color: string }

let effectIdCounter = 1;

export const LineMatchEngine: React.FC<LineMatchEngineProps> = ({
  questions,
  boards,
  boardIndex,
  ageGroup,
  initialState,
  onStateChange,
  onWordMatched,
  onWordWrong,
  onBoardComplete,
  onRoundComplete,
  onFeedback,
  onSizeMeasured,
}) => {
  const reducedMotion = usePrefersReducedMotion();
  const boardRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLSpanElement>());
  const boardSizeRef = useRef({ w: 0, h: 0 });
  const centersRef = useRef(new Map<string, Point>());
  const activePointerRef = useRef<number | null>(null);
  const dragStartRef = useRef<Point | null>(null);
  const dragMovedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const lastAttemptSideRef = useRef(new Map<string, Side>());
  const advanceTimerRef = useRef<number | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const [boardSize, setBoardSize] = useState({ w: 0, h: 0 });
  const [contentHeight, setContentHeight] = useState(0);
  const [, forceVersion] = useState(0);
  const bump = useCallback(() => forceVersion((v) => v + 1), []);

  // ── Round state (survives across boards inside this mounted engine) ─────────
  const stateRef = useRef<LineMatchRoundState>(
    initialState ? {
      rightOrderByBoard: { ...initialState.rightOrderByBoard },
      matchedWordIds: [...initialState.matchedWordIds],
      attemptsByWordId: { ...initialState.attemptsByWordId },
      firstWrongChoiceByWordId: { ...initialState.firstWrongChoiceByWordId },
      revealedWordIds: [...initialState.revealedWordIds],
    } : emptyLineMatchState(),
  );
  const freshMatchRef = useRef(new Set<string>()); // draw-in animation only

  // Recomputed every render (cheap for ≤ dozens of words; state lives in a ref
  // so progress updates are explicit bump() calls, never async races).
  const matchedIds = stateRef.current.matchedWordIds;
  const matchedSet = new Set(matchedIds);

  // ── Derived board data ──────────────────────────────────────────────────────
  const boardItems = useMemo(() => (boards[boardIndex] || [])
    .map((questionIndex) => questions[questionIndex])
    .filter(Boolean), [boards, boardIndex, questions]);
  const boardWordIds = useMemo(() => boardItems.map(wordIdOf), [boardItems]);

  /** Right column order for the current board — stable for the whole board. */
  const rightOrder = useMemo(() => {
    const key = String(boardIndex);
    const saved = stateRef.current.rightOrderByBoard[key];
    const known = new Set(boardWordIds);
    let order = (saved || []).filter((id) => known.has(id));
    for (const id of boardWordIds) if (!order.includes(id)) order = [...order, id]; // appended new words
    if (!saved && order.length > 1) order = shuffleRightColumn(boardWordIds);
    return order;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardIndex, boardWordIds.join('\u0000')]);

  // Persist any right-order materialization once per board.
  useEffect(() => {
    const key = String(boardIndex);
    if (!stateRef.current.rightOrderByBoard[key] && rightOrder.length) {
      stateRef.current.rightOrderByBoard[key] = [...rightOrder];
      onStateChange({ ...stateRef.current, rightOrderByBoard: { ...stateRef.current.rightOrderByBoard } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardIndex, rightOrder.length]);

  const rowHeight = rowHeightFor(contentHeight, boardItems.length);
  const hitSize = boardSize.w >= LINE_MATCH_LAYOUT.largeScreenMinWidth
    ? LINE_MATCH_LAYOUT.nodeHitSizeLarge
    : LINE_MATCH_LAYOUT.nodeHitSize;
  const strokeWidth = lineWidthForAge(ageGroup);
  const magnetRadius = magnetRadiusForAge(ageGroup);

  // Per-board transient state ---------------------------------------------------
  const [selected, setSelected] = useState<{ wordId: string; side: Side } | null>(null);
  const [drag, setDrag] = useState<{ wordId: string; side: Side; from: Point; pos: Point; hover: string | null } | null>(null);
  const [pendingLink, setPendingLink] = useState<{ from: Point; to: Point; color: string } | null>(null);
  const [lines, setLines] = useState<LockedLine[]>([]);
  const [stars, setStars] = useState<StarPop[]>([]);
  const [pings, setPings] = useState<PingRing[]>([]);
  const [recoil, setRecoil] = useState<RecoilLine | null>(null);
  const [shakeWordId, setShakeWordId] = useState<string | null>(null);
  const [hintWordId, setHintWordId] = useState<string | null>(null);
  const [boardComplete, setBoardComplete] = useState(false);
  const [waveOn, setWaveOn] = useState(false);

  const lineColor = (colorIndex: number) => LINE_COLORS[colorIndex % LINE_COLORS.length];

  // ── Measurement ──────────────────────────────────────────────────────────────

  const measure = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const boardRect = board.getBoundingClientRect();
    const nextW = Math.round(boardRect.width);
    const nextH = Math.round(boardRect.height);
    boardSizeRef.current = { w: nextW, h: nextH };
    setBoardSize((prev) => (prev.w === nextW && prev.h === nextH ? prev : { w: nextW, h: nextH }));
    setContentHeight((prev) => (Math.abs(prev - nextH) < 1 ? prev : nextH));
    onSizeMeasured?.(nextH);

    const centers = new Map<string, Point>();
    nodeRefs.current.forEach((el, key) => {
      const rect = el.getBoundingClientRect();
      centers.set(key, {
        x: rect.left + rect.width / 2 - boardRect.left,
        y: rect.top + rect.height / 2 - boardRect.top,
      });
    });
    centersRef.current = centers;
    bump();
    // Resize/rotate mid-drag: cancel the drag, keep matched lines.
    if (activePointerRef.current !== null) cancelDrag();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bump]);

  useEffect(() => {
    measure();
    const board = boardRef.current;
    if (!board) return;
    const ro = new ResizeObserver(measure);
    ro.observe(board);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [measure]);

  // Re-measure after board switch — effects run after refs commit, so node
  // positions are already measurable (no rAF wait; rAF stalls in hidden tabs).
  useEffect(() => {
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardIndex, boardWordIds.join('\u0000'), rowHeight]);

  // A restored (or fully borrowed) board can already be complete on mount.
  useEffect(() => {
    const timer = window.setTimeout(checkBoardComplete, 450);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardIndex, boardWordIds.join('\u0000')]);

  // ── Lines for the current board (rebuilt on board change / resize) ──────────

  const buildLines = useCallback((animateFresh: boolean): LockedLine[] => {
    const result: LockedLine[] = [];
    boardItems.forEach((item, slot) => {
      const wordId = wordIdOf(item);
      if (!stateRef.current.matchedWordIds.includes(wordId)) return;
      const from = centersRef.current.get(`left:${wordId}`);
      const to = centersRef.current.get(`right:${wordId}`);
      if (!from || !to) return;
      result.push({
        wordId,
        colorIndex: slot,
        from,
        to,
        animate: animateFresh && freshMatchRef.current.has(wordId),
      });
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardItems, boardIndex, boardSize.w, boardSize.h, rowHeight]);

  useEffect(() => {
    setLines(buildLines(true));
    setStars([]);
    setPings([]);
    setRecoil(null);
    setPendingLink(null);
    setSelected(null);
    setDrag(null);
    setBoardComplete(false);
    setWaveOn(false);
    setHintWordId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardIndex, boardWordIds.join('\u0000')]);

  useEffect(() => {
    setLines((prev) => {
      const next = buildLines(true);
      // Keep freshly added lines (with animation flags) across re-measures.
      const prevFresh = new Map(prev.filter((line) => line.animate).map((line) => [line.wordId, line]));
      return next.map((line) => prevFresh.get(line.wordId) || line);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardSize.w, boardSize.h, rowHeight]);

  // ── Idle hint (8s): pulse a correct unmatched node + replay its audio once ──

  const armIdleTimer = useCallback(() => {
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(() => {
      if (activePointerRef.current !== null || boardComplete) return;
      const nextItem = boardItems.find((item) => !stateRef.current.matchedWordIds.includes(wordIdOf(item)));
      if (!nextItem) return;
      const wordId = wordIdOf(nextItem);
      setHintWordId(wordId);
      playWordAudio(nextItem.targetVocab.english, nextItem.targetVocab.audioUrl);
      window.setTimeout(() => setHintWordId((current) => (current === wordId ? null : current)), 1600);
    }, LINE_MATCH_TIMING.idleHint);
  }, [boardItems, boardComplete]);

  useEffect(() => {
    armIdleTimer();
    return () => { if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current); };
  }, [armIdleTimer, boardIndex, boardWordIds.join('\u0000'), stateRef.current.matchedWordIds.length]);

  // ── Completion flow ──────────────────────────────────────────────────────────

  const advanceAfterWave = useCallback(() => {
    if (advanceTimerRef.current) { window.clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null; }
    const isLastBoard = boardIndex >= boards.length - 1;
    if (isLastBoard) onRoundComplete();
    else onBoardComplete(boardIndex + 1);
  }, [boardIndex, boards.length, onBoardComplete, onRoundComplete]);

  const checkBoardComplete = useCallback(() => {
    const allMatched = boardWordIds.every((wordId) => stateRef.current.matchedWordIds.includes(wordId));
    if (!allMatched || boardWordIds.length === 0) return;
    setBoardComplete(true);
    onFeedback('Great job! 🎉');
    sfx.playSuccess();
    setWaveOn(true);
    window.setTimeout(() => setWaveOn(false), LINE_MATCH_TIMING.boardWave + boardWordIds.length * 160);
    if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = window.setTimeout(advanceAfterWave, LINE_MATCH_TIMING.boardCompleteAdvance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardWordIds.join('\u0000'), onFeedback, advanceAfterWave]);

  // ── Node helpers ─────────────────────────────────────────────────────────────

  const nodeCenter = useCallback((side: Side, wordId: string): Point | undefined =>
    centersRef.current.get(`${side}:${wordId}`), []);

  const popPing = useCallback((side: Side, wordId: string, color: string) => {
    const center = nodeCenter(side, wordId);
    if (!center) return;
    const id = effectIdCounter++;
    setPings((prev) => [...prev, { id, x: center.x, y: center.y, color }]);
    window.setTimeout(() => setPings((prev) => prev.filter((ring) => ring.id !== id)), LINE_MATCH_TIMING.nodePing + 60);
  }, [nodeCenter]);

  const addStar = useCallback((wordId: string, color: string) => {
    const from = nodeCenter('left', wordId);
    const to = nodeCenter('right', wordId);
    if (!from || !to) return;
    const mid = midPoint(from, to);
    setStars((prev) => [...prev, { id: effectIdCounter++, x: mid.x, y: mid.y, color }]);
  }, [nodeCenter]);

  const commitMatch = useCallback((wordId: string, opts: { firstTry: boolean; revealed: boolean; chosenWrongWordId?: string }) => {
    const item = boardItems.find((candidate) => wordIdOf(candidate) === wordId);
    const slot = boardItems.findIndex((candidate) => wordIdOf(candidate) === wordId);
    freshMatchRef.current.add(wordId);
    stateRef.current.matchedWordIds = [...stateRef.current.matchedWordIds, wordId];
    if (opts.revealed) stateRef.current.revealedWordIds = [...stateRef.current.revealedWordIds, wordId];
    onStateChange({ ...stateRef.current });
    bump();
    if (item && slot >= 0) {
      const from = nodeCenter('left', wordId);
      const to = nodeCenter('right', wordId);
      if (from && to) {
        setLines((prev) => [...prev.filter((line) => line.wordId !== wordId), {
          wordId, colorIndex: slot, from, to, animate: !reducedMotion,
        }]);
      }
      if (!reducedMotion) {
        popPing('left', wordId, lineColor(slot));
        popPing('right', wordId, lineColor(slot));
      }
      addStar(wordId, lineColor(slot));
    }
    const english = item?.targetVocab.english || '';
    onFeedback(`Matched ${english} · ${randomLineMatchPraise()}`);
    onWordMatched(wordId, opts);
    if (item) void playWordAudio(item.targetVocab.english, item.targetVocab.audioUrl);
    window.setTimeout(checkBoardComplete, reducedMotion ? 60 : LINE_MATCH_TIMING.correctDrawIn + 80);
  }, [boardItems, onStateChange, onFeedback, onWordMatched, nodeCenter, popPing, addStar, reducedMotion, checkBoardComplete, bump]);

  const handleWrong = useCallback((startWordId: string, startSide: Side, targetWordId: string, from: Point, to: Point) => {
    const slot = Math.max(0, boardItems.findIndex((candidate) => wordIdOf(candidate) === startWordId));
    stateRef.current.attemptsByWordId[startWordId] = (stateRef.current.attemptsByWordId[startWordId] || 0) + 1;
    if (!stateRef.current.firstWrongChoiceByWordId[startWordId]) {
      stateRef.current.firstWrongChoiceByWordId[startWordId] = targetWordId;
    }
    lastAttemptSideRef.current.set(startWordId, startSide);
    const attempts = stateRef.current.attemptsByWordId[startWordId];
    onStateChange({ ...stateRef.current });
    onWordWrong(startWordId, targetWordId);
    bump();

    onFeedback('Try again! You can do it!');
    sfx.playGentleWrong();
    setShakeWordId(targetWordId);
    window.setTimeout(() => setShakeWordId((current) => (current === targetWordId ? null : current)), 400);

    // The wrong line reaches the node, then recoils to its origin.
    if (!reducedMotion) {
      const id = effectIdCounter++;
      setRecoil({ id, from, to, color: lineColor(slot) });
      window.setTimeout(() => setRecoil((current) => (current?.id === id ? null : current)), LINE_MATCH_TIMING.wrongRecoil + 40);
    }

    if (attempts >= REVEAL_ATTEMPTS) {
      commitMatch(startWordId, {
        firstTry: false,
        revealed: true,
        chosenWrongWordId: stateRef.current.firstWrongChoiceByWordId[startWordId],
      });
    } else if (attempts >= HINT_ATTEMPTS) {
      setHintWordId(startWordId);
      window.setTimeout(() => setHintWordId((current) => (current === startWordId ? null : current)), 1600);
    }
  }, [boardItems, onStateChange, onWordWrong, onFeedback, reducedMotion, commitMatch, bump]);

  // ── Evaluation ───────────────────────────────────────────────────────────────

  const evaluate = useCallback((startWordId: string, startSide: Side, endWordId: string, endSide: Side) => {
    if (startSide === endSide) return; // same-side drop: ignore and retract
    if (stateRef.current.matchedWordIds.includes(startWordId) || stateRef.current.matchedWordIds.includes(endWordId)) return;
    const from = nodeCenter(startSide, startWordId);
    const to = nodeCenter(endSide, endWordId);
    if (!from || !to) return;

    if (startWordId === endWordId) {
      commitMatch(startWordId, {
        firstTry: (stateRef.current.attemptsByWordId[startWordId] || 0) === 0,
        revealed: false,
        chosenWrongWordId: stateRef.current.firstWrongChoiceByWordId[startWordId],
      });
    } else {
      handleWrong(startWordId, startSide, endWordId, from, to);
    }
  }, [commitMatch, handleWrong, nodeCenter]);

  const cancelDrag = useCallback(() => {
    activePointerRef.current = null;
    setDrag(null);
  }, []);

  // ── Selection (tap flow) ─────────────────────────────────────────────────────

  const tapSelect = useCallback((wordId: string, side: Side) => {
    if (stateRef.current.matchedWordIds.includes(wordId) || boardComplete) return;
    const item = questions.find((candidate) => wordIdOf(candidate) === wordId);
    if (selected && selected.side !== side) {
      // Second tap on the other column → the line animates (300ms), then evaluates.
      const from = nodeCenter(selected.side, selected.wordId);
      const to = nodeCenter(side, wordId);
      setSelected(null);
      if (!from || !to) return;
      if (reducedMotion) {
        evaluate(selected.wordId, selected.side, wordId, side);
        return;
      }
      const slot = Math.max(0, boardItems.findIndex((candidate) => wordIdOf(candidate) === selected.wordId));
      setPendingLink({ from, to, color: lineColor(slot) });
      window.setTimeout(() => {
        setPendingLink(null);
        evaluate(selected.wordId, selected.side, wordId, side);
      }, LINE_MATCH_TIMING.tapLineDraw);
      return;
    }
    if (selected && selected.side === side && selected.wordId === wordId) {
      setSelected(null); // tapping the selected card again deselects
      return;
    }
    // Select (or switch selection within the same side).
    setSelected({ wordId, side });
    if (side === 'left' && item) {
      void playWordAudio(item.targetVocab.english, item.targetVocab.audioUrl);
    }
  }, [selected, boardComplete, nodeCenter, evaluate, questions, reducedMotion, boardItems]);

  // ── Pointer handlers (drag flow) ─────────────────────────────────────────────

  const handleNodePointerDown = useCallback((event: React.PointerEvent<HTMLSpanElement>, wordId: string, side: Side) => {
    if (boardComplete) return; // taps during the wave just skip it (handled on board)
    if (stateRef.current.matchedWordIds.includes(wordId)) return;
    if (activePointerRef.current !== null) return; // single active pointer
    event.preventDefault();
    activePointerRef.current = event.pointerId;
    dragMovedRef.current = false;
    try {
      (event.currentTarget as HTMLSpanElement).setPointerCapture(event.pointerId);
    } catch { /* capture is best effort */ }
    const boardRect = boardRef.current?.getBoundingClientRect();
    const point: Point = boardRect
      ? { x: event.clientX - boardRect.left, y: event.clientY - boardRect.top }
      : { x: 0, y: 0 };
    dragStartRef.current = point;
    const from = nodeCenter(side, wordId) || point;
    setDrag({ wordId, side, from, pos: point, hover: null });
    if (side === 'left') {
      const item = questions.find((candidate) => wordIdOf(candidate) === wordId);
      if (item) void playWordAudio(item.targetVocab.english, item.targetVocab.audioUrl);
    }
    armIdleTimer();
  }, [boardComplete, nodeCenter, questions, armIdleTimer]);

  const handleNodePointerMove = useCallback((event: React.PointerEvent<HTMLSpanElement>) => {
    if (activePointerRef.current !== event.pointerId) return;
    const boardRect = boardRef.current?.getBoundingClientRect();
    if (!boardRect) return;
    const point = { x: event.clientX - boardRect.left, y: event.clientY - boardRect.top };
    if (dragStartRef.current) {
      const dist = Math.hypot(point.x - dragStartRef.current.x, point.y - dragStartRef.current.y);
      if (dist > 8) dragMovedRef.current = true;
    }
    if (rafRef.current) return; // rAF-throttled state updates
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      setDrag((current) => {
        if (!current || activePointerRef.current !== event.pointerId) return current;
        // Magnet: nearest valid node on the OTHER column within radius.
        let hover: string | null = null;
        let bestDist = magnetRadius;
        centersRef.current.forEach((center, key) => {
          const [side, wordId] = [key.slice(0, key.indexOf(':')) as Side, key.slice(key.indexOf(':') + 1)];
          if (side === current.side) return;
          if (stateRef.current.matchedWordIds.includes(wordId)) return;
          const dist = Math.hypot(center.x - point.x, center.y - point.y);
          if (dist < bestDist) { bestDist = dist; hover = wordId; }
        });
        return { ...current, pos: point, hover };
      });
    });
  }, [magnetRadius]);

  const handleNodePointerUp = useCallback((event: React.PointerEvent<HTMLSpanElement>) => {
    if (activePointerRef.current !== event.pointerId) return;
    activePointerRef.current = null;
    const current = drag;
    if (!current) return;
    const wasTap = !dragMovedRef.current;
    // A pointer sequence on the node must not also fire the card's click handler.
    suppressClickRef.current = true;
    window.setTimeout(() => { suppressClickRef.current = false; }, 250);
    setDrag(null);
    if (wasTap) {
      tapSelect(current.wordId, current.side);
      return;
    }
    if (current.hover) {
      const targetSide: Side = current.side === 'left' ? 'right' : 'left';
      evaluate(current.wordId, current.side, current.hover, targetSide);
    }
    // Released in empty space: retract softly, NOT counted as a wrong attempt.
  }, [drag, tapSelect, evaluate]);

  const handleCardClick = useCallback((wordId: string, side: Side) => {
    if (suppressClickRef.current) { suppressClickRef.current = false; return; }
    if (boardComplete) return;
    tapSelect(wordId, side);
  }, [boardComplete, tapSelect]);

  // Board tap during the completion wave skips the wait.
  const handleBoardTapDuringWave = useCallback(() => {
    if (boardComplete) advanceAfterWave();
  }, [boardComplete, advanceAfterWave]);

  // ── Render ───────────────────────────────────────────────────────────────────

  const leftItemFor = (wordId: string): PracticeQuestion | undefined =>
    boardItems.find((candidate) => wordIdOf(candidate) === wordId);

  const isNodeSelected = (wordId: string, side: Side) =>
    (selected?.wordId === wordId && selected.side === side)
    || (drag?.wordId === wordId && drag.side === side);
  const isNodeHinted = (wordId: string) => hintWordId === wordId;
  const isMagnetTarget = (wordId: string) => !!drag && drag.hover === wordId;

  const nodeClasses = (wordId: string, side: Side, matched: boolean) => {
    const classes = ['lm-node'];
    if (matched) classes.push('lm-node-matched');
    if (isNodeSelected(wordId, side)) classes.push('lm-node-selected');
    if (isMagnetTarget(wordId)) classes.push('lm-node-magnet');
    if (isNodeHinted(wordId) && !matched) classes.push('lm-node-hint');
    return classes.join(' ');
  };

  const renderNode = (wordId: string, side: Side, matched: boolean, colorIndex: number) => (
    <span
      key={`${side}-${wordId}`}
      ref={(el) => {
        if (el) nodeRefs.current.set(`${side}:${wordId}`, el);
        else nodeRefs.current.delete(`${side}:${wordId}`);
      }}
      role="presentation"
      onPointerDown={(event) => handleNodePointerDown(event, wordId, side)}
      onPointerMove={handleNodePointerMove}
      onPointerUp={handleNodePointerUp}
      onPointerCancel={cancelDrag}
      className={nodeClasses(wordId, side, matched)}
      style={{
        width: hitSize,
        height: hitSize,
        ...(side === 'left' ? { right: -hitSize / 2 } : { left: -hitSize / 2 }),
      }}
    >
      <span
        className="lm-node-dot"
        style={matched ? { background: lineColor(colorIndex), borderColor: lineColor(colorIndex) } : undefined}
      >
        {matched && <Check className="lm-node-check" />}
      </span>
    </span>
  );

  const dragPath = drag ? bezierPath(drag.from, drag.hover
    ? (nodeCenter(drag.side === 'left' ? 'right' : 'left', drag.hover) || drag.pos)
    : drag.pos) : null;
  const snapPos = drag && drag.hover
    ? (nodeCenter(drag.side === 'left' ? 'right' : 'left', drag.hover) || drag.pos)
    : drag?.pos;

  return (
    <div
      ref={boardRef}
      className="lm-board relative w-full h-full min-h-0 flex items-center justify-center select-none"
      style={{ touchAction: 'none' }}
      onPointerDown={handleBoardTapDuringWave}
    >
      {/* LEFT column: sounds / words */}
      <div className="flex-1 min-w-0 h-full flex flex-col justify-center" style={{ gap: LINE_MATCH_LAYOUT.rowGap }} role="group" aria-label="Words to match">
        {boardWordIds.map((wordId, slot) => {
          const item = leftItemFor(wordId);
          if (!item) return null;
          const word = item.targetVocab;
          const matched = matchedSet.has(wordId);
          return (
            <button
              key={`left-${wordId}`}
              type="button"
              role="button"
              aria-pressed={isNodeSelected(wordId, 'left')}
              aria-label={ageGroup === '3-4' ? `Listen: ${word.english}` : word.english}
              aria-disabled={matched}
              onClick={() => handleCardClick(wordId, 'left')}
              className={`lm-card lm-card-left relative w-full ${matched ? 'lm-card-matched' : ''} ${shakeWordId === wordId ? 'lm-shake' : ''}`}
              style={{
                height: rowHeight,
                borderColor: matched ? lineColor(slot) : undefined,
              }}
            >
              {ageGroup === '3-4' && (
                <span className="lm-card-body">
                  <Volume2 className="lm-speaker-large" />
                </span>
              )}
              {ageGroup === '4-5' && (
                <span className="lm-card-body lm-card-row">
                  <Volume2 className="lm-speaker-medium" />
                  <span className="lm-word">{word.english.toLowerCase()}</span>
                </span>
              )}
              {ageGroup === '5-6' && (
                <span className="lm-card-body lm-card-row">
                  <span className="lm-word">{word.english.toLowerCase()}</span>
                  <Volume2 className="lm-speaker-small" />
                </span>
              )}
              {renderNode(wordId, 'left', matched, slot)}
            </button>
          );
        })}
      </div>

      {/* CHANNEL: the line area (no header labels) */}
      <div aria-hidden className="lm-channel shrink-0 h-full" />

      {/* RIGHT column: pictures (no text while matching) */}
      <div className="flex-1 min-w-0 h-full flex flex-col justify-center" style={{ gap: LINE_MATCH_LAYOUT.rowGap }} role="group" aria-label="Pictures to match">
        {rightOrder.map((wordId, orderSlot) => {
          const item = leftItemFor(wordId);
          if (!item) return null;
          const word = item.targetVocab;
          const matched = matchedSet.has(wordId);
          const revealed = matched;
          const leftSlot = Math.max(0, boardWordIds.indexOf(wordId));
          const colorIndex = leftSlot;
          const textCard = item.isAbstractVisual && ageGroup === '5-6';
          return (
            <button
              key={`right-${wordId}-${orderSlot}`}
              type="button"
              role="button"
              aria-pressed={isNodeSelected(wordId, 'right')}
              aria-label={word.english}
              aria-disabled={matched}
              onClick={() => handleCardClick(wordId, 'right')}
              className={`lm-card lm-card-right relative w-full ${matched ? 'lm-card-matched' : ''} ${shakeWordId === wordId ? 'lm-shake' : ''}`}
              style={{ height: rowHeight, borderColor: matched ? lineColor(colorIndex) : undefined }}
            >
              {textCard ? (
                <span className="lm-card-body">
                  <span className="lm-word lm-word-big">{word.english.toLowerCase()}</span>
                </span>
              ) : (
                <span className="lm-card-body lm-card-picture">
                  {word.imageUrl ? (
                    <img
                      src={word.imageUrl}
                      alt=""
                      draggable={false}
                      className="h-full w-full object-contain select-none pointer-events-none drop-shadow-md"
                    />
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-1/2 h-1/2 opacity-40" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="14" rx="3" />
                      <circle cx="9" cy="10" r="1.6" />
                      <path d="M4 17l5-4 4 3 3-2 4 3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
              )}
              {revealed && (
                <span className="lm-reveal">
                  <span className="lm-word">{word.english.toLowerCase()}</span>
                  {word.vietnamese && <span className="lm-gloss">{word.vietnamese}</span>}
                </span>
              )}
              {renderNode(wordId, 'right', matched, colorIndex)}
            </button>
          );
        })}
      </div>

      {/* SVG overlay: one Bézier per pair + drag line + effects */}
      <svg
        className="lm-overlay absolute inset-0 pointer-events-none z-20"
        viewBox={`0 0 ${Math.max(1, boardSize.w)} ${Math.max(1, boardSize.h)}`}
        width={boardSize.w}
        height={boardSize.h}
        aria-hidden="true"
      >
        {lines.map((line) => {
          const color = lineColor(line.colorIndex);
          const path = bezierPath(line.from, line.to);
          return (
            <g key={line.wordId} className={line.animate ? 'lm-draw' : undefined}>
              <path d={path} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={strokeWidth + 4} strokeLinecap="round" />
              <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" pathLength={1} />
              {waveOn && (
                <path
                  d={path}
                  fill="none"
                  stroke="#fff"
                  strokeWidth={strokeWidth + 6}
                  strokeLinecap="round"
                  className="lm-wave"
                  style={{ animationDelay: `${line.colorIndex * 160}ms` }}
                  pathLength={1}
                />
              )}
            </g>
          );
        })}

        {pendingLink && (
          <g className="lm-draw">
            <path d={bezierPath(pendingLink.from, pendingLink.to)} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={strokeWidth + 4} strokeLinecap="round" />
            <path d={bezierPath(pendingLink.from, pendingLink.to)} fill="none" stroke={pendingLink.color} strokeWidth={strokeWidth} strokeLinecap="round" opacity={0.9} pathLength={1} />
          </g>
        )}

        {recoil && (
          <g
            className={reducedMotion ? 'lm-recoil-fade' : 'lm-recoil'}
            style={{ transformOrigin: `${recoil.from.x}px ${recoil.from.y}px` }}
          >
            <path d={bezierPath(recoil.from, recoil.to)} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={strokeWidth + 4} strokeLinecap="round" />
            <path d={bezierPath(recoil.from, recoil.to)} fill="none" stroke={recoil.color} strokeWidth={strokeWidth} strokeLinecap="round" opacity={0.85} />
          </g>
        )}

        {drag && dragPath && (
          <g>
            <path d={dragPath} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={strokeWidth} strokeLinecap="round" />
            <path d={dragPath} fill="none" stroke={lineColor(Math.max(0, boardItems.findIndex((candidate) => wordIdOf(candidate) === drag.wordId)))} strokeWidth={6} strokeLinecap="round" strokeDasharray="10 12" opacity={0.8} />
            <circle cx={snapPos?.x || 0} cy={snapPos?.y || 0} r={LINE_MATCH_LAYOUT.dragPointerDot / 2} fill="#fff" stroke={lineColor(Math.max(0, boardItems.findIndex((candidate) => wordIdOf(candidate) === drag.wordId)))} strokeWidth={3} />
          </g>
        )}

        {pings.map((ring) => (
          <circle
            key={ring.id}
            cx={ring.x}
            cy={ring.y}
            r={LINE_MATCH_LAYOUT.nodeVisibleDiameter / 2 + 2}
            fill="none"
            stroke={ring.color}
            strokeWidth={4}
            className="lm-ping"
          />
        ))}
      </svg>

      {/* Stars at the matched-line midpoints */}
      {stars.map((star) => (
        <span key={star.id} className="lm-star" style={{ left: star.x, top: star.y, color: star.color }} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.05 1.1-6.5-4.7-4.6 6.5-.95L12 2.5z" />
          </svg>
        </span>
      ))}
    </div>
  );
};
