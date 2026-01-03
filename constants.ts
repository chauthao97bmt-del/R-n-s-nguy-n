import { LevelConfig } from './types';

export const GRID_SIZE = 20;
export const GRID_COUNT = 20;
export const CANVAS_SIZE = GRID_SIZE * GRID_COUNT;

export const LEVELS: LevelConfig[] = [
  { name: "Khởi động", range: [-10, 10], count: 5, order: 'asc', speed: 250 },
  { name: "Vùng âm u", range: [-30, 5], count: 7, order: 'asc', speed: 220 },
  { name: "Đảo ngược", range: [-20, 20], count: 8, order: 'desc', speed: 200 },
  { name: "Hỗn loạn", range: [-50, 50], count: 10, order: 'asc', speed: 180 },
  { name: "Đỉnh cao", range: [-100, 100], count: 12, order: 'desc', speed: 160 }
];

export const COLORS = {
  // Cartoon Theme Palette
  bg: '#87CEEB',
  gridLight: '#AAD751', // Grass Light
  gridDark: '#A2D149',  // Grass Dark
  
  // Snake (Green Theme - Cute & Natural)
  snakeHead: '#00b894', // Vibrant Green
  snakeBody: '#55efc4', // Light Mint Green
  
  // Obstacles (Plastic Bag)
  plasticBag: 'rgba(255, 255, 255, 0.85)', // White/Translucent
  plasticOutline: '#b2bec3', // Gray outline

  // Apple (Red/Pink)
  apple: '#ff7675',
  leaf: '#55efc4',
  stem: '#636e72',
  
  // UI
  text: '#2d3436',
  white: '#ffffff',
  primaryButton: '#0984e3',
  accent: '#ffeaa7',
  ai: '#d63031',
  aiBubble: '#ffffff'
};