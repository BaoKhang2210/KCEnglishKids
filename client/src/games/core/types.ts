import type { Vocabulary, AgeGroupCode } from '../../types';
import type { AudioPhrase } from './audioPhrases';

export type GameCategory = 'tap_pop' | 'find_match' | 'build_make';

export type GameId =
  // Tap & Pop
  | 'bubble-pop'
  | 'balloon-float'
  | 'tunnel-runner'
  | 'prize-wheel'
  | 'koko-says'
  // Find & Match
  | 'memory-match'
  | 'shadow-puzzle'
  | 'peek-a-boo'
  | 'feed-the-monsters'
  | 'mystery-boxes'
  // Build & Make
  | 'picture-builder'
  | 'kokos-delivery';

export type WordType = 'noun' | 'verb' | 'number' | 'color' | 'adjective';

export interface GameDefinition {
  id: GameId;
  category: GameCategory;
  title: string;
  subtitle: string;
  icon: string;
  gesture: string;
  minVocab: number;
  supportedWordTypes: WordType[];
  requiresTransparentImage?: boolean;
  requiresImage?: boolean;
  instructionPhrase?: AudioPhrase;
  targetCountByAge: Record<AgeGroupCode, number>;
  load: () => Promise<{ default: React.ComponentType<GameComponentProps> }>;
}

export interface GameConfig {
  unitId: string;
  lessonId: string;
  gameId: GameId;
  vocabularyList: Vocabulary[];
  distractorPool?: Vocabulary[];
  ageGroup: AgeGroupCode;
  childId?: string;
}

export interface TargetProgress {
  wordId: string;
  attempts: number;
  assisted: boolean;
  wrongVocabIds: string[];
}

export interface GameSessionState {
  status: 'loading' | 'tutorial' | 'playing' | 'targetDone' | 'complete';
  targetOrder: string[]; // word IDs in order
  targetIndex: number;
  attemptsPerTarget: Record<string, number>;
  assistedPerTarget: Record<string, boolean>;
  wrongVocabIdsPerTarget: Record<string, string[]>;
  stars: number;
}

export interface GameComponentProps {
  config: GameConfig;
  targetVocab: Vocabulary;
  options: Vocabulary[];
  attemptCount: number;
  isAssisted: boolean;
  onCorrect: () => void;
  onWrong: (chosenVocabId?: string) => void;
  onReplayAudio: () => void;
  showGhostHint?: boolean;
}

export interface GameCheckpoint {
  gameId: GameId;
  lessonId: string;
  childId: string;
  targetOrder: string[];
  targetIndex: number;
  attemptsPerTarget: Record<string, number>;
  assistedPerTarget: Record<string, boolean>;
  wrongVocabIdsPerTarget: Record<string, string[]>;
  stars: number;
  timestamp: number;
}
