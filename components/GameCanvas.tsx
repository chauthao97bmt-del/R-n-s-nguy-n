import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Apple, Position, SnakeSegment, LevelConfig, GameStatus } from '../types';
import { GRID_SIZE, GRID_COUNT, COLORS } from '../constants';
import { audioService } from '../services/audioService';

interface GameCanvasProps {
  levelConfig: LevelConfig;
  status: GameStatus;
  onScore: (points: number) => void;
  onGameOver: (mistake?: { wrong: number, correct: number }) => void;
  onWin: () => void;
  onApplesChange: (apples: Apple[]) => void;
}

export interface GameCanvasHandle {
  startGame: () => void;
  resetGame: () => void;
  changeDirection: (dir: Position) => void;
}

const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(({ 
  levelConfig, 
  status, 
  onScore, 
  onGameOver, 
  onWin,
  onApplesChange 
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game State Refs (Mutable for game loop)
  const snakeRef = useRef<SnakeSegment[]>([]);
  const applesRef = useRef<Apple[]>([]);
  const rocksRef = useRef<Position[]>([]); // Ref for obstacles (now plastic bags)
  const directionRef = useRef<Position>({ x: 0, y: -1 });
  const nextDirectionRef = useRef<Position>({ x: 0, y: -1 });
  const frameCountRef = useRef<number>(0);
  const loopRef = useRef<number | null>(null);
  const isRunningRef = useRef<boolean>(false);
  const waitingForInputRef = useRef<boolean>(true);
  
  // Touch Handling Refs
  const touchStartRef = useRef<{x: number, y: number} | null>(null);

  // Helper to generate random position
  const getRandomPos = (snake: SnakeSegment[], apples: Apple[], rocks: Position[]): Position => {
    let p: Position;
    while (true) {
      p = { x: Math.floor(Math.random() * GRID_COUNT), y: Math.floor(Math.random() * GRID_COUNT) };
      const onSnake = snake.some(s => s.x === p.x && s.y === p.y);
      const onApple = apples.some(a => a.x === p.x && a.y === p.y);
      const onRock = rocks.some(r => r.x === p.x && r.y === p.y);
      
      if (!onSnake && !onApple && !onRock) return p;
    }
  };

  const initGame = () => {
    // Reset Snake
    snakeRef.current = [
      { x: 10, y: 15, val: null },
      { x: 10, y: 16, val: null },
      { x: 10, y: 17, val: null }
    ];
    directionRef.current = { x: 0, y: -1 };
    nextDirectionRef.current = { x: 0, y: -1 };
    waitingForInputRef.current = true; 
    
    // Generate Plastic Bags (Obstacles)
    const rockCount = 4 + Math.floor(Math.random() * 3); 
    const newRocks: Position[] = [];
    for (let i = 0; i < rockCount; i++) {
        newRocks.push(getRandomPos(snakeRef.current, [], newRocks)); 
    }
    rocksRef.current = newRocks;

    // Generate Apples
    const nums: number[] = [];
    for (let i = levelConfig.range[0]; i <= levelConfig.range[1]; i++) nums.push(i);
    
    const newApples: Apple[] = [];
    const availableNums = [...nums];
    for (let i = 0; i < levelConfig.count; i++) {
        if (availableNums.length === 0) break;
        const r = Math.floor(Math.random() * availableNums.length);
        const val = availableNums.splice(r, 1)[0];
        newApples.push({ ...getRandomPos(snakeRef.current, newApples, rocksRef.current), val });
    }
    applesRef.current = newApples;
    onApplesChange(newApples); 
  };

  const getTargetValue = () => {
    const vals = applesRef.current.map(a => a.val);
    if (vals.length === 0) return null;
    return levelConfig.order === 'asc' ? Math.min(...vals) : Math.max(...vals);
  };

  const update = () => {
    if (!isRunningRef.current) return;
    
    if (status === GameStatus.PAUSED) {
        draw(); 
        return;
    }

    if (waitingForInputRef.current) {
        draw();
        return;
    }

    frameCountRef.current++;

    const curDir = directionRef.current;
    const nextDir = nextDirectionRef.current;
    
    if ((nextDir.x !== 0 && curDir.x === 0) || (nextDir.y !== 0 && curDir.y === 0)) {
        directionRef.current = nextDir;
    }

    const dir = directionRef.current;
    const head = { x: snakeRef.current[0].x + dir.x, y: snakeRef.current[0].y + dir.y, val: null as number | null };

    // Collision Walls
    if (head.x < 0 || head.x >= GRID_COUNT || head.y < 0 || head.y >= GRID_COUNT) {
        audioService.playCrash();
        stopGame();
        onGameOver();
        return;
    }

    // Collision Self
    if (snakeRef.current.some(s => s.x === head.x && s.y === head.y)) {
        audioService.playCrash();
        stopGame();
        onGameOver();
        return;
    }

    // Collision Obstacles (Plastic Bags)
    if (rocksRef.current.some(r => r.x === head.x && r.y === head.y)) {
        audioService.playCrash();
        stopGame();
        onGameOver(); 
        return;
    }

    // Check Apple
    const appleIdx = applesRef.current.findIndex(a => a.x === head.x && a.y === head.y);
    if (appleIdx !== -1) {
        const target = getTargetValue();
        const ateApple = applesRef.current[appleIdx];

        if (target !== null && ateApple.val === target) {
            audioService.playEat();
            onScore(10);
            head.val = ateApple.val;
            snakeRef.current.unshift(head); 
            applesRef.current.splice(appleIdx, 1);
            onApplesChange([...applesRef.current]);

            if (applesRef.current.length === 0) {
                audioService.playWin();
                stopGame();
                onWin();
            }
        } else {
            audioService.playCrash();
            stopGame();
            onGameOver({ wrong: ateApple.val, correct: target! });
            return;
        }
    } else {
        snakeRef.current.unshift(head);
        snakeRef.current.pop();
    }
    
    draw();
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw Background
    for (let row = 0; row < GRID_COUNT; row++) {
      for (let col = 0; col < GRID_COUNT; col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? COLORS.gridLight : COLORS.gridDark;
        ctx.fillRect(col * GRID_SIZE, row * GRID_SIZE, GRID_SIZE, GRID_SIZE);
      }
    }

    // Draw Plastic Bags (Túi Ni lông)
    rocksRef.current.forEach(rock => {
        const px = rock.x * GRID_SIZE;
        const py = rock.y * GRID_SIZE;
        const cx = px + GRID_SIZE/2;
        const cy = py + GRID_SIZE/2;
        
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.beginPath();
        ctx.ellipse(cx + 2, cy + 6, 8, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(cx, cy);
        
        // Random slight rotation for natural look
        const seed = (px + py * 57) % 20 - 10; 
        ctx.rotate(seed * Math.PI / 180);

        // Bag Style
        ctx.fillStyle = COLORS.plasticBag;
        ctx.strokeStyle = COLORS.plasticOutline;
        ctx.lineWidth = 1;

        // Handles (Two loops at top)
        ctx.beginPath();
        ctx.moveTo(-5, -4);
        ctx.bezierCurveTo(-8, -10, -2, -10, -2, -4); // Left handle
        ctx.moveTo(2, -4);
        ctx.bezierCurveTo(2, -10, 8, -10, 5, -4); // Right handle
        ctx.stroke();

        // Main Body (Irregular shape)
        ctx.beginPath();
        ctx.moveTo(-6, -4);
        ctx.lineTo(6, -4);
        // Crinkled sides
        ctx.bezierCurveTo(9, 0, 8, 6, 6, 8); 
        ctx.bezierCurveTo(0, 9, 0, 9, -6, 8);
        ctx.bezierCurveTo(-8, 6, -9, 0, -6, -4);
        ctx.fill();
        ctx.stroke();

        // Crinkles details inside
        ctx.beginPath();
        ctx.strokeStyle = '#dfe6e9';
        ctx.moveTo(-2, 0); ctx.lineTo(1, 2);
        ctx.moveTo(3, -1); ctx.lineTo(2, 3);
        ctx.stroke();

        ctx.restore();
    });

    // Draw Apples
    applesRef.current.forEach(apple => {
      const px = apple.x * GRID_SIZE;
      const py = apple.y * GRID_SIZE;
      const cx = px + GRID_SIZE / 2;
      const cy = py + GRID_SIZE / 2 + 2;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(cx, py + 14, 6, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Stem
      ctx.fillStyle = COLORS.stem;
      ctx.beginPath();
      ctx.moveTo(cx, py + 4);
      ctx.quadraticCurveTo(cx - 2, py, cx - 1, py - 2);
      ctx.lineTo(cx + 1, py - 2);
      ctx.quadraticCurveTo(cx, py, cx + 2, py + 4);
      ctx.fill();
      
      // Leaf
      ctx.fillStyle = COLORS.leaf;
      ctx.beginPath();
      ctx.ellipse(cx + 4, py + 3, 4, 2, -Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();

      // Outline
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.arc(cx - 3, cy, 6.5, 0, Math.PI * 2);
      ctx.arc(cx + 3, cy, 6.5, 0, Math.PI * 2);
      ctx.stroke();

      // Fruit Body
      const grad = ctx.createRadialGradient(cx - 2, cy - 2, 2, cx, cy, 8);
      grad.addColorStop(0, '#ff9ff3'); 
      grad.addColorStop(1, COLORS.apple);
      ctx.fillStyle = grad;
      ctx.fill();

      // Shine
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.ellipse(cx - 4, cy - 3, 2.5, 1.5, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      // Text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px Nunito';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 2;
      ctx.fillText(apple.val.toString(), cx, cy + 1);
      ctx.shadowBlur = 0; 
    });

    // Draw Snake (Green Theme)
    snakeRef.current.forEach((s, i) => {
        const px = s.x * GRID_SIZE;
        const py = s.y * GRID_SIZE;
        const cx = px + GRID_SIZE / 2;
        const cy = py + GRID_SIZE / 2;

        if (s.val !== null) {
            // Eaten apple in stomach
             ctx.fillStyle = COLORS.snakeBody;
             ctx.strokeStyle = 'white';
             ctx.lineWidth = 1;
             ctx.beginPath();
             ctx.arc(cx, cy, 9, 0, Math.PI * 2);
             ctx.fill();
             ctx.stroke();

             ctx.fillStyle = '#2d3436'; // Dark text on light green body
             ctx.font = 'bold 10px Nunito';
             ctx.textAlign = 'center';
             ctx.textBaseline = 'middle';
             ctx.fillText(s.val.toString(), cx, cy);
             return;
        }

        const isHead = i === 0;
        const isTail = i === snakeRef.current.length - 1;

        // Shadow under snake
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.arc(cx + 1, cy + 2, isHead ? 9 : 7, 0, Math.PI * 2);
        ctx.fill();

        // Sticker Outline for Snake
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2.5;

        // Body Gradient (Green)
        const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 10);
        grad.addColorStop(0, isHead ? COLORS.snakeHead : COLORS.snakeBody);
        grad.addColorStop(1, isHead ? '#00b894' : '#00cec9'); 
        ctx.fillStyle = grad;

        if (isHead) {
            // Head Shape
            ctx.beginPath();
            ctx.ellipse(cx, cy, 10, 8.5, Math.atan2(directionRef.current.y, directionRef.current.x), 0, Math.PI * 2);
            ctx.stroke(); // Outline
            ctx.fill();

            // Tongue
            if (frameCountRef.current % 20 < 10) {
                const dx = directionRef.current.x;
                const dy = directionRef.current.y;
                ctx.strokeStyle = '#ff7675';
                ctx.lineWidth = 2.5;
                ctx.lineCap = 'round';
                ctx.beginPath();
                const lx = cx + dx * 13;
                const ly = cy + dy * 13;
                ctx.moveTo(cx + dx * 8, cy + dy * 8);
                ctx.lineTo(lx, ly);
                // Forked tongue
                ctx.lineTo(lx + (dy * 3.5), ly + (dx * 3.5));
                ctx.moveTo(lx, ly);
                ctx.lineTo(lx - (dy * 3.5), ly - (dx * 3.5));
                ctx.stroke();
            }

            // Eyes (Bigger, cuter)
            ctx.fillStyle = 'white';
            const dx = directionRef.current.x;
            const dy = directionRef.current.y;
            const eyeOffset = 4.5;
            const ex1 = cx + (dx * 4) + (dy * eyeOffset);
            const ey1 = cy + (dy * 4) - (dx * eyeOffset);
            const ex2 = cx + (dx * 4) - (dy * eyeOffset);
            const ey2 = cy + (dy * 4) + (dx * eyeOffset);

            ctx.beginPath(); ctx.arc(ex1, ey1, 4, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(ex2, ey2, 4, 0, Math.PI*2); ctx.fill();

            // Pupils
            ctx.fillStyle = '#2d3436';
            ctx.beginPath(); ctx.arc(ex1 + dx * 1.5, ey1 + dy * 1.5, 2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(ex2 + dx * 1.5, ey2 + dy * 1.5, 2, 0, Math.PI*2); ctx.fill();
            
            // Eye shine
             ctx.fillStyle = 'white';
             ctx.beginPath(); ctx.arc(ex1 + dx + 0.5, ey1 + dy - 0.5, 1, 0, Math.PI*2); ctx.fill();
             ctx.beginPath(); ctx.arc(ex2 + dx + 0.5, ey2 + dy - 0.5, 1, 0, Math.PI*2); ctx.fill();

        } else {
             const size = isTail ? 6 : 8;
             ctx.beginPath();
             ctx.arc(cx, cy, size, 0, Math.PI * 2);
             ctx.stroke(); // Outline
             ctx.fill();
             
             // Highlight on body
             ctx.fillStyle = 'rgba(255,255,255,0.2)';
             ctx.beginPath();
             ctx.arc(cx - 1, cy - 1, 2.5, 0, Math.PI * 2);
             ctx.fill();
        }
    });

    if (waitingForInputRef.current && isRunningRef.current && status === GameStatus.PLAYING) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '900 16px Nunito';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#2d3436';
        ctx.lineWidth = 3;
        ctx.strokeText("VUỐT HOẶC BẤM ĐỂ CHẠY!", canvas.width / 2, canvas.height / 2 + 60);
        ctx.fillText("VUỐT HOẶC BẤM ĐỂ CHẠY!", canvas.width / 2, canvas.height / 2 + 60);
    }
  };

  const startGame = () => {
    initGame();
    isRunningRef.current = true;
    waitingForInputRef.current = true; 
    if (loopRef.current) clearInterval(loopRef.current);
    loopRef.current = window.setInterval(() => {
        update();
    }, levelConfig.speed);
    requestAnimationFrame(draw);
  };

  const stopGame = () => {
    isRunningRef.current = false;
    if (loopRef.current) {
        clearInterval(loopRef.current);
        loopRef.current = null;
    }
  };

  const handleChangeDirectionInternal = (dir: Position) => {
    if (waitingForInputRef.current) {
        waitingForInputRef.current = false;
    }
    nextDirectionRef.current = dir;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isRunningRef.current || status !== GameStatus.PLAYING) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isRunningRef.current || status !== GameStatus.PLAYING || !touchStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    
    const threshold = 30;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (Math.abs(deltaX) > threshold) {
            if (deltaX > 0) handleChangeDirectionInternal({ x: 1, y: 0 }); 
            else handleChangeDirectionInternal({ x: -1, y: 0 }); 
        }
    } else {
        if (Math.abs(deltaY) > threshold) {
            if (deltaY > 0) handleChangeDirectionInternal({ x: 0, y: 1 });
            else handleChangeDirectionInternal({ x: 0, y: -1 }); 
        }
    }
    
    touchStartRef.current = null;
  };

  useImperativeHandle(ref, () => ({
    startGame,
    resetGame: () => {
        stopGame();
        initGame();
        requestAnimationFrame(draw);
    },
    changeDirection: handleChangeDirectionInternal
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
        canvas.width = GRID_SIZE * GRID_COUNT;
        canvas.height = GRID_SIZE * GRID_COUNT;
        
        initGame();
        
        if (status === GameStatus.PLAYING) {
           startGame();
        } else {
           requestAnimationFrame(draw);
        }
    }
    return () => stopGame();
  }, [levelConfig]);

  return (
    <canvas 
        ref={canvasRef} 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="block rounded-2xl shadow-[0_8px_0_rgba(0,0,0,0.1)] border-4 border-white mx-auto cursor-pointer"
        style={{ maxWidth: '100%', height: 'auto', touchAction: 'none' }}
    />
  );
});

GameCanvas.displayName = 'GameCanvas';
export default GameCanvas;