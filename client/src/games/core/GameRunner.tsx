import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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

interface GameRunnerProps {
  config: GameConfig;
  unitNumber?: number;
  lessonNumber?: number;
  onExit: () => void;
  onGameComplete: (gameId: string, stars: number) => void;
  onNextGame?: (nextGameId: string) => void;
}

export const GameRunner: React.FC<GameRunnerProps> = ({
  config,
  unitNumber = 1,
  lessonNumber = 1,
  onExit,
  onGameComplete,
  onNextGame,
}) => {
  const scheduleTimeout = useManagedTimeout();
  const definition: GameDefinition = GAME_REGISTRY[config.gameId] || GAME_REGISTRY['bubble-pop'];
  const { state, targetVocab, attempts, isAssisted, dispatch, restart, hasCheckpoint } = useGameSession(config, definition);

  const [GameComponent, setGameComponent] = useState<React.ComponentType<any> | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const completedOnceRef = useRef(false);
  const completedTargetRef = useRef<number | null>(null);

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
  }, [targetVocab?._id, optionCount, config.vocabularyList, config.distractorPool, definition]);

  const phrase = definition.instructionPhrase
    || (definition.category === 'tap_pop' ? 'pop_the' : 'touch_the');

  useEffect(() => {
    if (hasStarted && state.status === 'playing' && targetVocab) {
      void playInstruction(phrase, targetVocab.english, targetVocab.audioUrl);
    }
  }, [hasStarted, state.status, targetVocab?._id, phrase]);

  const handleCorrect = useCallback(() => {
    if (!targetVocab || state.status !== 'playing') return;
    if (completedTargetRef.current === state.targetIndex) return;
    completedTargetRef.current = state.targetIndex;
    playPraiseAudio();
    if (config.childId) {
      vocabStatsService.recordAttempt(config.childId, targetVocab._id, {
        type: 'FS',
        ok: true,
        isFirstTry: attempts === 0 && !isAssisted,
        usedHint: isAssisted || attempts >= 2,
        vocab: targetVocab,
      });
    }
    dispatch({ type: 'TARGET_COMPLETED', wordId: targetVocab._id });
  }, [targetVocab, state.status, state.targetIndex, attempts, isAssisted, config.childId, config.gameId, dispatch, playPraiseAudio]);

  const handleWrong = useCallback((chosenVocabId?: string) => {
    if (!targetVocab || state.status !== 'playing') return;
    dispatch({ type: 'RECORD_ATTEMPT', wordId: targetVocab._id, wrongVocabId: chosenVocabId });
    if (config.childId) {
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
      playEncouragementAudio();
    }
  }, [targetVocab, state.status, config.childId, attempts, dispatch, playEncouragementAudio, handleCorrect, scheduleTimeout]);

  const handleReplay = useCallback(() => {
    if (targetVocab) {
      void playInstruction(phrase, targetVocab.english, targetVocab.audioUrl);
    }
  }, [targetVocab, phrase]);

  const handleRestart = useCallback(() => {
    completedTargetRef.current = null;
    restart();
  }, [restart]);

  useEffect(() => {
    if (state.status === 'complete' && !completedOnceRef.current) {
      completedOnceRef.current = true;
      onGameComplete(config.gameId, state.stars);
    }
    if (state.status !== 'complete') {
      completedOnceRef.current = false;
    }
  }, [state.status, config.gameId, state.stars, onGameComplete]);

  const practicedWords = useMemo(() => {
    return state.targetOrder
      .map((id: string) => config.vocabularyList.find((v) => v._id === id))
      .filter(Boolean) as typeof config.vocabularyList;
  }, [state.targetOrder, config.vocabularyList]);

  const nextGameId = useMemo(() => {
    const games = getAvailableLessonGames(config.vocabularyList, unitNumber, lessonNumber);
    const idx = games.findIndex((g) => g.id === config.gameId);
    const next = games[(idx + 1) % Math.max(games.length, 1)];
    return next && next.id !== config.gameId ? next.id : games.find((g) => g.id !== config.gameId)?.id;
  }, [unitNumber, lessonNumber, config.gameId, config.vocabularyList]);

  return createPortal(
    <GameFullscreenShell
      title={definition.title}
      categoryIcon={definition.icon}
      currentIndex={state.targetIndex}
      totalTargets={state.targetOrder.length}
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
          <span className="text-6xl" aria-hidden>🐻</span>
          <p className="text-2xl font-black">Let’s play another time!</p>
          <button type="button" onClick={onExit} className="min-h-16 min-w-44 rounded-3xl bg-amber-300 px-8 text-xl font-black text-slate-950 shadow-lg">Back</button>
        </div>
      ) : !hasStarted && !loadFailed ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-5 text-center text-white">
          <KokoMascot state={hasCheckpoint ? 'encouraging' : 'waving'} size="lg" interactive={false} speechBubble={hasCheckpoint ? "Let's keep going!" : 'Ready to play?'} />
          <div className="flex items-center gap-3 text-3xl font-black sm:text-4xl"><span aria-hidden>{definition.icon}</span>{definition.title}</div>
          <p className="max-w-lg text-base font-bold text-indigo-100 sm:text-lg">{definition.subtitle}</p>
          <button type="button" onClick={() => setHasStarted(true)} className="mt-2 min-h-16 min-w-48 rounded-3xl border-4 border-amber-100 bg-gradient-to-b from-amber-300 to-orange-400 px-8 text-2xl font-black text-slate-950 shadow-[0_6px_0_#b45309]">{hasCheckpoint ? "Continue!" : "Let's play!"}</button>
          {hasCheckpoint && <button type="button" onClick={() => { handleRestart(); setHasStarted(true); }} className="min-h-12 rounded-2xl px-6 text-base font-bold text-indigo-100 underline underline-offset-4">Start over</button>}
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
    </GameFullscreenShell>,
    document.body
  );
};
