export enum GameStatus {
  START_SCREEN = 'START_SCREEN',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
  VICTORY = 'VICTORY'
}

export interface Position {
  x: number;
  y: number;
}

export interface SnakeSegment extends Position {
  val: number | null; // null if body part, number if it's an eaten apple (displayed in stomach)
}

export interface Apple extends Position {
  val: number;
}

export interface LevelConfig {
  name: string;
  range: [number, number];
  count: number;
  order: 'asc' | 'desc';
  speed: number;
}

export interface MistakeInfo {
  wrong: number;
  correct: number;
}