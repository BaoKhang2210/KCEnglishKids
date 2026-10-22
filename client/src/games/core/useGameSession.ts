import { useReducer, useEffect, useRef, useState } from 'react';
import type { GameSessionState, GameCheckpoint, GameConfig, GameDefinition } from './types';
import { buildTargetSequence, getWordType, isTransparentImage } from './targetSelector';

type GameSessionAction =
  | { type: 'START_PLAYING' }
  | { type: 'RECORD_ATTEMPT'; wordId: string; wrongVocabId?: string }
  | { type: 'SET_ASSISTED'; wordId: string }
  | { type: 'TARGET_COMPLETED'; wordId: string }
  | { type: 'RESTART_SESSION'; targetOrder: string[] }
  | { type: 'RESTORE_CHECKPOINT'; checkpoint: GameCheckpoint };

function gameSessionReducer(state: GameSessionState, action: GameSessionAction): GameSessionState {
  switch (action.type) {
    case 'START_PLAYING':
      return { ...state, status: 'playing' };

    case 'RECORD_ATTEMPT': {
      const curAttempts = state.attemptsPerTarget[action.wordId] || 0;
      const curWrongs = state.wrongVocabIdsPerTarget[action.wordId] || [];
      const updatedWrongs = action.wrongVocabId ? [...curWrongs, action.wrongVocabId] : curWrongs;

      return {
        ...state,
        attemptsPerTarget: {
          ...state.attemptsPerTarget,
          [action.wordId]: curAttempts + 1,
        },
        wrongVocabIdsPerTarget: {
          ...state.wrongVocabIdsPerTarget,
          [action.wordId]: updatedWrongs,
        },
      };
    }

    case 'SET_ASSISTED':
      return {
        ...state,
        assistedPerTarget: {
          ...state.assistedPerTarget,
          [action.wordId]: true,
        },
      };

    case 'TARGET_COMPLETED': {
      const nextIdx = state.targetIndex + 1;
      const isComplete = nextIdx >= state.targetOrder.length;
      return {
        ...state,
        targetIndex: nextIdx,
        stars: state.stars + 1,
        status: isComplete ? 'complete' : 'playing',
      };
    }

    case 'RESTART_SESSION':
      return {
        status: 'playing',
        targetOrder: action.targetOrder,
        targetIndex: 0,
        attemptsPerTarget: {},
        assistedPerTarget: {},
        wrongVocabIdsPerTarget: {},
        stars: 0,
      };

    case 'RESTORE_CHECKPOINT':
      return {
        status: 'playing',
        targetOrder: action.checkpoint.targetOrder,
        targetIndex: action.checkpoint.targetIndex,
        attemptsPerTarget: action.checkpoint.attemptsPerTarget,
        assistedPerTarget: action.checkpoint.assistedPerTarget,
        wrongVocabIdsPerTarget: action.checkpoint.wrongVocabIdsPerTarget,
        stars: action.checkpoint.stars,
      };

    default:
      return state;
  }
}

export function useGameSession(config: GameConfig, definition: GameDefinition) {
  const targetCount = definition.targetCountByAge[config.ageGroup] || 4;
  const eligibleVocabulary = config.vocabularyList.filter(v =>
    definition.supportedWordTypes.includes(getWordType(v)) &&
    (!definition.requiresImage || Boolean(v.imageUrl)) &&
    (!definition.requiresTransparentImage || isTransparentImage(v))
  );
  const initialTargets = useRef(
    buildTargetSequence(eligibleVocabulary, targetCount, definition.supportedWordTypes)
  ).current;

  const [state, dispatch] = useReducer(gameSessionReducer, {
    status: 'playing',
    targetOrder: initialTargets,
    targetIndex: 0,
    attemptsPerTarget: {},
    assistedPerTarget: {},
    wrongVocabIdsPerTarget: {},
    stars: 0,
  });

  const cpKey = `kc_game_cp_${config.childId || 'guest'}_${config.lessonId}_${config.gameId}`;
  const [hasCheckpoint, setHasCheckpoint] = useState(false);
  const skipNextSaveRef = useRef(false);

  // Kiểm tra checkpoint khi mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(cpKey);
      if (saved) {
        const parsed: GameCheckpoint = JSON.parse(saved);
        if (
          parsed.lessonId === config.lessonId &&
          parsed.gameId === config.gameId &&
          parsed.targetIndex < parsed.targetOrder.length
        ) {
          // Lọc các từ bị xóa hoặc đã thay đổi
          const activeIds = new Set(eligibleVocabulary.map(v => v._id));
          const completedIds = parsed.targetOrder.slice(0, parsed.targetIndex).filter(id => activeIds.has(id));
          const remainingIds = parsed.targetOrder.slice(parsed.targetIndex).filter(id => activeIds.has(id));
          const knownIds = new Set([...completedIds, ...remainingIds]);
          const addedIds = eligibleVocabulary.map(v => v._id).filter(id => !knownIds.has(id));
          const validOrder = [...completedIds, ...remainingIds, ...addedIds];
          if (validOrder.length > 0) {
            skipNextSaveRef.current = true;
            setHasCheckpoint(true);
            dispatch({
              type: 'RESTORE_CHECKPOINT',
              checkpoint: {
                ...parsed,
                targetOrder: validOrder,
                targetIndex: completedIds.length,
                attemptsPerTarget: Object.fromEntries(Object.entries(parsed.attemptsPerTarget || {}).filter(([id]) => activeIds.has(id))),
                assistedPerTarget: Object.fromEntries(Object.entries(parsed.assistedPerTarget || {}).filter(([id]) => activeIds.has(id))),
                wrongVocabIdsPerTarget: Object.fromEntries(Object.entries(parsed.wrongVocabIdsPerTarget || {}).filter(([id]) => activeIds.has(id))),
                stars: completedIds.length,
              },
            });
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse game checkpoint:', e);
    }
  }, [cpKey, config.lessonId, config.gameId, config.vocabularyList]);

  // Tự động lưu checkpoint khi chuyển targetIndex
  useEffect(() => {
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    if (state.status === 'playing' && state.targetOrder.length > 0) {
      const cp: GameCheckpoint = {
        gameId: config.gameId,
        lessonId: config.lessonId,
        childId: config.childId || 'guest',
        targetOrder: state.targetOrder,
        targetIndex: state.targetIndex,
        attemptsPerTarget: state.attemptsPerTarget,
        assistedPerTarget: state.assistedPerTarget,
        wrongVocabIdsPerTarget: state.wrongVocabIdsPerTarget,
        stars: state.stars,
        timestamp: Date.now(),
      };
      try {
        localStorage.setItem(cpKey, JSON.stringify(cp));
      } catch {}
    } else if (state.status === 'complete') {
      try {
        localStorage.removeItem(cpKey);
      } catch {}
    }
  }, [state, cpKey, config]);

  const currentWordId = state.targetOrder[state.targetIndex];
  const targetVocab = config.vocabularyList.find(v => v._id === currentWordId);
  const attempts = currentWordId ? state.attemptsPerTarget[currentWordId] || 0 : 0;
  const isAssisted = currentWordId ? !!state.assistedPerTarget[currentWordId] : false;

  return {
    state,
    targetVocab,
    attempts,
    isAssisted,
    dispatch,
    hasCheckpoint,
    restart: () => {
      setHasCheckpoint(false);
      const newSeq = buildTargetSequence(eligibleVocabulary, targetCount, definition.supportedWordTypes);
      dispatch({ type: 'RESTART_SESSION', targetOrder: newSeq });
    },
  };
}
