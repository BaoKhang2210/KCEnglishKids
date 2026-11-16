import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { GameConfig, GameDefinition, GameId } from './types';
import { GAME_REGISTRY, getAvailableLessonGames } from '../registry';
import { useGameSession } from './useGameSession';
import { GameFullscreenShell } from '../shell/GameFullscreenShell';
import { GameCompleteScreen } from '../shell/GameCompleteScreen';
import { playInstruction, playPraiseAudio, playEncouragementAudio } from './audioPhrases';
import { getWordType, isTransparentImage, pickDistractors, shuffleArray } from './targetSelector';
import { vocabStatsService } from '../../services/vocabStatsService';
import type { Vocabulary } from '../../types';
import { KokoMascot } from '../../components/child/KokoMascot';
import { useManagedTimeout } from '../shared/useManagedTimeout';
import { GameIcon } from '../hub/GameIcon';

interface GameRunnerProps {
  config: GameConfig;
  unitNumber?: number;
  lessonNumber?: number;
  allowedGameIds?: string[];
  onExit: () => void;
  onGameComplete: (gameId: string, stars: number, answers: Array<{wordId: string; selectedId: string | null}>) => void;
  onNextGame?: (nextGameId: string) => void;
}

export const GameRunner: React.FC<GameRunnerProps> = ({
  config,
  unitNumber = 1,
  lessonNumber = 1,
  allowedGameIds,
  onExit,
  onGameComplete,
  onNextGame,
}) => {
  const definition: GameDefinition = GAME_REGISTRY[config.gameId] || GAME_REGISTRY['bubble-pop'];
  const { state, targetVocab, attempts, isAssisted, dispatch, restart, hasCheckpoint } = useGameSession(config, definition);
  const scheduleTimeout = useManagedTimeout();

  const [GameComponent, setGameComponent] = useState<React.ComponentType<any> | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const completedOnceRef = useRef(false);
  const completedTargetRef = useRef<number | null>(null);
  const currentRound = useRef(state.targetIndex);
  useLayoutEffect(() => { currentRound.current = state.targetIndex; }, [state.targetIndex]);

  useEffect(() => {
    let active = true;
    setGameComponent(null);
    setLoadFailed(false);
    definition.load().then((mod: any) => {
      if (active) setGameComponent(() => mod.default);
    }).catch((err: any) => {
      console.error('[GameRunner] Failed to load game:', err);
      if (active) setLoadFailed(true);
    });
    return () => {
      active = false;
    };
  }, [definition]);

  const optionCount = config.ageGroup === '3-4' ? 2 : config.ageGroup === '4-5' ? 3 : 4;
  const options = useMemo(() => {
    if (!targetVocab) return [];
    const compatible = (vocab: Vocabulary) =>
      definition.supportedWordTypes.includes(getWordType(vocab)) &&
      (!definition.requiresImage || Boolean(vocab.imageUrl)) &&
      (!definition.requiresTransparentImage || isTransparentImage(vocab));
    const lessonOptions = config.vocabularyList.filter(compatible);
    const unitOptions = (config.distractorPool || []).filter(compatible);
    const distractors = pickDistractors(
      targetVocab._id,
      lessonOptions,
      unitOptions,
      Math.max(1, optionCount - 1)
    );
    return shuffleArray([targetVocab, ...distractors]);
  }, [targetVocab, state.targetIndex, optionCount, config.vocabularyList, config.distractorPool, definition]);

  const phrase = definition.instructionPhrase
    || (definition.category === 'tap_pop' ? 'pop_the' : 'touch_the');

  useEffect(() => {
    if (hasStarted && state.status === 'playing' && targetVocab) {
      void playInstruction(phrase, targetVocab.english, targetVocab.audioUrl);
    }
  }, [hasStarted, state.status, state.targetIndex, targetVocab, phrase]);

  const handleCorrect = useCallback(() => {
    if (!targetVocab || state.status !== 'playing' || currentRound.current !== state.targetIndex || completedTargetRef.current === state.targetIndex) return;
    completedTargetRef.current = state.targetIndex;
    playPraiseAudio();
    if (config.childId && !config.preview) {
      vocabStatsService.recordAttempt(config.childId, targetVocab._id, {
        type: 'FS',
        ok: true,
        isFirstTry: attempts === 0 && !isAssisted,
        usedHint: isAssisted || attempts >= 2,
        vocab: targetVocab,
      });
    }
    dispatch({ type: 'TARGET_COMPLETED', wordId: targetVocab._id });
  }, [targetVocab, state.status, state.targetIndex, attempts, isAssisted, config.childId, config.preview, dispatch]);

  const handleWrong = useCallback((chosenVocabId?: string) => {
    if (!targetVocab || state.status !== 'playing' || currentRound.current !== state.targetIndex || completedTargetRef.current === state.targetIndex) return;
    dispatch({ type: 'RECORD_ATTEMPT', wordId: targetVocab._id, wrongVocabId: chosenVocabId });
    if (config.childId && !config.preview) {
      vocabStatsService.recordAttempt(config.childId, targetVocab._id, {
        type: 'FS',
        ok: false,
        isFirstTry: false,
        chosenDistractorId: chosenVocabId,
        vocab: targetVocab,
      });
    }

    if (attempts + 1 >= 3) {
      dispatch({ type: 'SET_ASSISTED', wordId: targetVocab._id });
      scheduleTimeout(() => {
        handleCorrect();
      }, 900);
    } else {
      if (attempts + 1 >= 2) dispatch({ type: 'SET_ASSISTED', wordId: targetVocab._id });
      playEncouragementAudio();
    }
  }, [targetVocab, state.status, state.targetIndex, config.childId, config.preview, attempts, dispatch, handleCorrect, scheduleTimeout]);

  const handleReplay = useCallback(() => {
    if (targetVocab) {
      void playInstruction(phrase, targetVocab.english, targetVocab.audioUrl);
    }
  }, [targetVocab, phrase]);

  const handleRestart = useCallback(() => {
    completedOnceRef.current = false;
    completedTargetRef.current = null;
    restart();
  }, [restart]);

  useEffect(() => {
    if (state.status === 'complete' && !completedOnceRef.current) {
      completedOnceRef.current = true;
      const answers = state.targetOrder.map((wordId: string) => ({
        wordId,
        selectedId: wordId as string | null,
      }));
      onGameComplete(config.gameId, state.stars, answers);
    }
    if (state.status !== 'complete') {
      completedOnceRef.current = false;
    }
  }, [state, config.gameId, onGameComplete]);

  const practicedWords = useMemo(() => {
    const words = state.targetOrder
      .map((id: string) => config.vocabularyList.find((v) => v._id === id))
      .filter(Boolean) as typeof config.vocabularyList;
    return words.filter((word, index) => words.findIndex(item => item._id === word._id) === index);
  }, [state.targetOrder, config.vocabularyList]);

  const nextGameId = useMemo(() => {
    const games = getAvailableLessonGames(config.vocabularyList, unitNumber, lessonNumber, allowedGameIds);
    const currentIndex = games.findIndex((g) => g.id === config.gameId);
    const next = games[(currentIndex + 1) % games.length];
    return next && next.id !== config.gameId ? next.id : games.find((g) => g.id !== config.gameId)?.id;
  }, [unitNumber, lessonNumber, config.gameId, config.vocabularyList, allowedGameIds]);

  const isMemoryMatch = config.gameId === 'memory-match';
  const memoryPairCount = config.ageGroup === '3-4' ? 2 : config.ageGroup === '4-5' ? 3 : 4;
  const displayTotalTargets = isMemoryMatch ? Math.min(memoryPairCount, config.vocabularyList.length) : state.targetOrder.length;
  const displayCurrentIndex = isMemoryMatch ? Math.min(state.targetIndex, displayTotalTargets - 1) : state.targetIndex;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col w-full h-full overflow-hidden bg-slate-900">
      <GameFullscreenShell
        title={definition.title}
        categoryIcon={<GameIcon gameId={config.gameId} className="w-7 h-7 sm:w-8 sm:h-8" />}
        currentIndex={displayCurrentIndex}
        totalTargets={displayTotalTargets}
        stars={state.stars}
        onBack={onExit}
        onReplayAudio={hasStarted && state.status === 'playing' ? handleReplay : undefined}
      >
        {state.status === 'complete' ? (
          <GameCompleteScreen
            stars={state.stars}
            practicedWords={practicedWords}
            onPlayAgain={handleRestart}
            onHome={onExit}
            onNextGame={onNextGame && nextGameId ? () => onNextGame(nextGameId as GameId) : undefined}
          />
        ) : loadFailed || state.targetOrder.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-5 px-6 text-center text-white">
            <KokoMascot state="thinking" size="lg" interactive={false} />
            <p className="text-2xl font-black">Let’s play another time!</p>
            <button type="button" onClick={onExit} className="min-h-16 min-w-44 rounded-3xl bg-amber-300 px-8 text-xl font-black text-slate-950 shadow-lg cursor-pointer">Back</button>
          </div>
        ) : !hasStarted && !loadFailed ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-5 text-center text-white">
            <KokoMascot state={hasCheckpoint ? 'encouraging' : 'waving'} size="lg" interactive={false} speechBubble={hasCheckpoint ? "Let's keep going!" : 'Ready to play?'} />
            <div className="flex items-center gap-3 text-3xl font-black sm:text-4xl">
              <GameIcon gameId={config.gameId} className="w-12 h-12" />
              {definition.title}
            </div>
            <p className="max-w-lg text-base font-bold text-indigo-100 sm:text-lg">{definition.subtitle}</p>
            {config.instructions && (
              <div className="max-w-md rounded-2xl border border-amber-300/40 bg-amber-400/15 px-4 py-2 text-sm font-bold text-amber-100">
                📝 Nhiệm vụ cô giao: {config.instructions}
              </div>
            )}
            <button type="button" onClick={() => setHasStarted(true)} className="mt-2 min-h-16 min-w-48 rounded-3xl border-4 border-amber-100 bg-gradient-to-b from-amber-300 to-orange-400 px-8 text-2xl font-black text-slate-950 shadow-[0_6px_0_#b45309] cursor-pointer active:scale-95 transition-transform">{hasCheckpoint ? "Continue!" : "Let's play!"}</button>
            {hasCheckpoint && <button type="button" onClick={() => { handleRestart(); setHasStarted(true); }} className="min-h-12 rounded-2xl px-6 text-base font-bold text-indigo-100 underline underline-offset-4 cursor-pointer">Start over</button>}
          </div>
        ) : GameComponent && targetVocab ? (
          <GameComponent
            config={config}
            targetVocab={targetVocab}
            options={options}
            attemptCount={attempts}
            isAssisted={isAssisted}
            onCorrect={handleCorrect}
            onWrong={handleWrong}
            onReplayAudio={handleReplay}
            showGhostHint={attempts >= 2}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 text-white">
            <div className="w-12 h-12 rounded-full border-4 border-amber-300 border-t-transparent animate-spin" />
            <p className="text-sm font-bold">Getting ready…</p>
          </div>
        )}
      </GameFullscreenShell>
    </div>,
    document.body
  );
};
