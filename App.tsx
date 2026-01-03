import React, { useState, useRef, useEffect } from 'react';
import GameCanvas, { GameCanvasHandle } from './components/GameCanvas';
import { MobileControls } from './components/MobileControls';
import { AIBubble } from './components/AIBubble';
import { Button } from './components/Button';
import { Confetti } from './components/Confetti';
import { LEVELS, COLORS } from './constants';
import { GameStatus, Apple, MistakeInfo } from './types';
import { geminiService } from './services/geminiService';
import { audioService } from './services/audioService';

const App: React.FC = () => {
  const [levelIdx, setLevelIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<GameStatus>(GameStatus.START_SCREEN);
  const [aiMessage, setAiMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiVisible, setAiVisible] = useState(false);
  const [currentApples, setCurrentApples] = useState<Apple[]>([]);
  const [mistakeInfo, setMistakeInfo] = useState<MistakeInfo | null>(null);
  const [message, setMessage] = useState("Hãy ăn các quả táo theo đúng thứ tự toán học để về đích!");
  const [isMuted, setIsMuted] = useState(false);

  const gameRef = useRef<GameCanvasHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLevel = LEVELS[levelIdx];

  // Manage BGM based on status
  useEffect(() => {
    if (status === GameStatus.PLAYING) {
        audioService.startBGM();
        // Focus the container to capture keys immediately
        if (containerRef.current) {
            containerRef.current.focus();
        }
    } else {
        audioService.stopBGM();
    }
  }, [status]);

  const handleStart = () => {
    setStatus(GameStatus.PLAYING);
    setMessage("");
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }
    gameRef.current?.startGame();
  };

  const handlePause = () => {
    if (status === GameStatus.PLAYING) {
        setStatus(GameStatus.PAUSED);
    } else if (status === GameStatus.PAUSED) {
        setStatus(GameStatus.PLAYING);
    }
  };

  const handleMuteToggle = () => {
    const newVal = !isMuted;
    setIsMuted(newVal);
    audioService.setMuted(newVal);
  };

  const handleScore = (points: number) => {
    setScore(prev => prev + points);
  };

  const handleGameOver = (mistake?: MistakeInfo) => {
    setStatus(GameStatus.GAME_OVER);
    geminiService.speak("Ôi không, thua mất rồi! Hãy thử lại nhé.");
    
    if (mistake) {
        setMistakeInfo(mistake);
        setMessage(`Bạn ăn nhầm quả táo số ${mistake.wrong} rồi!`);
    } else {
        setMistakeInfo(null);
        setMessage("Rất tiếc, bạn đã va chạm rồi!");
    }
  };

  const handleWin = async () => {
    setStatus(GameStatus.LEVEL_COMPLETE);
    geminiService.speak("Chúc mừng! Bạn đã vượt qua vòng này rồi!");
    
    if (levelIdx < LEVELS.length - 1) {
        setMessage(`Tuyệt vời! Chuẩn bị cho vòng: ${LEVELS[levelIdx + 1].name}`);
        setAiVisible(true);
        setAiLoading(true);
        geminiService.getPraise().then(text => {
            setAiMessage(text);
            setAiLoading(false);
            setTimeout(() => setAiVisible(false), 5000);
        });
    } else {
        setStatus(GameStatus.VICTORY);
        setMessage("Bạn đã phá đảo thế giới số nguyên!");
        geminiService.speak("Xuất sắc! Bạn đã phá đảo toàn bộ trò chơi.");
    }
  };

  const handleNextLevel = () => {
    setLevelIdx(prev => prev + 1);
    setStatus(GameStatus.PLAYING); 
    setMistakeInfo(null);
    gameRef.current?.startGame(); 
    setAiVisible(false);
  };

  const handleRetry = () => {
    setScore(0);
    setStatus(GameStatus.PLAYING);
    setMistakeInfo(null);
    gameRef.current?.startGame();
  };

  const handleResetAll = () => {
    setLevelIdx(0);
    setScore(0);
    setStatus(GameStatus.START_SCREEN);
    setMistakeInfo(null);
    gameRef.current?.resetGame();
  };

  const handleAiHint = async () => {
    if (aiVisible) {
        setAiVisible(false);
        return;
    }
    setAiVisible(true);
    setAiLoading(true);
    const appleVals = currentApples.map(a => a.val);
    const text = await geminiService.getHint(currentLevel, appleVals);
    setAiMessage(text);
    setAiLoading(false);
  };

  const handleAiExplain = async () => {
    if (!mistakeInfo) return;
    setAiVisible(true);
    setAiLoading(true);
    geminiService.explainMistake(currentLevel, mistakeInfo.wrong, mistakeInfo.correct).then(text => {
        setAiMessage(text);
        setAiLoading(false);
        geminiService.speak(text.substring(0, 100)); 
    });
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Allow Pause anywhere
        if (e.key === 'p' || e.key === 'P') {
            handlePause();
            return;
        }

        if (status !== GameStatus.PLAYING) return;
        
        switch(e.key) {
            case 'ArrowUp': 
            case 'w':
            case 'W':
                e.preventDefault(); 
                e.stopPropagation();
                gameRef.current?.changeDirection({x: 0, y: -1}); 
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                e.preventDefault(); 
                e.stopPropagation();
                gameRef.current?.changeDirection({x: 0, y: 1}); 
                break;
            case 'ArrowLeft': 
            case 'a':
            case 'A':
                e.preventDefault(); 
                e.stopPropagation();
                gameRef.current?.changeDirection({x: -1, y: 0}); 
                break;
            case 'ArrowRight': 
            case 'd':
            case 'D':
                e.preventDefault(); 
                e.stopPropagation();
                gameRef.current?.changeDirection({x: 1, y: 0}); 
                break;
        }
    };
    // Attach to window to catch everything
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status]); // Re-attach when status changes ensures fresh state

  return (
    <div 
        ref={containerRef}
        tabIndex={0} 
        className="flex flex-col items-center justify-center min-h-full w-full px-4 relative pt-4 pb-8 outline-none"
    >
      
      {(status === GameStatus.LEVEL_COMPLETE || status === GameStatus.VICTORY) && <Confetti />}

      {/* Header Card */}
      <div className="w-full max-w-[500px] flex justify-between items-center py-3 px-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border-b-4 border-blue-100 mb-4 z-10">
        <div className="font-extrabold text-lg text-slate-700">Vòng <span className="text-[#0984e3] text-xl">{levelIdx + 1}</span><span className="text-slate-400 text-sm">/{LEVELS.length}</span></div>
        
        <div className="flex gap-3">
            <button 
                onClick={handleMuteToggle}
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-[0_4px_0_rgba(0,0,0,0.1)] transition-all active:translate-y-1 active:shadow-none border-2 border-slate-100 ${isMuted ? 'bg-slate-200 text-slate-500' : 'bg-blue-400 text-white'}`}
                title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
            >
                {isMuted ? (
                     <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 7.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 7.71s-2.11 6.85-5 7.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                )}
            </button>
            <button 
                onClick={handlePause}
                className="bg-white hover:bg-slate-50 text-slate-600 border-2 border-slate-200 w-10 h-10 rounded-full flex items-center justify-center shadow-[0_4px_0_rgba(0,0,0,0.05)] transition-all active:translate-y-1 active:shadow-none"
                title="Tạm dừng"
            >
                {status === GameStatus.PAUSED ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5 text-green-500"><path d="M8 5v14l11-7z"/></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                )}
            </button>
            <button 
                onClick={handleAiHint} 
                disabled={status !== GameStatus.PLAYING}
                className="bg-pink-200 hover:bg-pink-300 text-pink-700 border-b-4 border-pink-300 hover:border-pink-400 active:border-b-0 active:translate-y-1 px-4 py-1 rounded-full text-sm font-extrabold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
                Gợi ý ✨
            </button>
        </div>

        <div className="font-black text-xl text-yellow-500 drop-shadow-sm">
             {score} <span className="text-xs text-yellow-600 font-bold uppercase">Điểm</span>
        </div>
      </div>

      <div 
        className="w-full max-w-[500px] text-center py-2 px-4 mb-4 rounded-xl font-black text-white shadow-md transition-colors duration-300 z-10 relative flex items-center justify-center gap-2 border-b-4 border-black/10"
        style={{ backgroundColor: currentLevel.order === 'asc' ? '#00b894' : '#e17055' }}
      >
        <span className="text-2xl">{currentLevel.order === 'asc' ? "📈" : "📉"}</span>
        <span>ĂN TÁO {currentLevel.order === 'asc' ? "TĂNG DẦN" : "GIẢM DẦN"}</span>
      </div>

      <div className="relative z-10 w-full max-w-[500px]">
        <GameCanvas 
            ref={gameRef}
            levelConfig={currentLevel}
            status={status}
            onScore={handleScore}
            onGameOver={handleGameOver}
            onWin={handleWin}
            onApplesChange={setCurrentApples}
        />

        {status !== GameStatus.PLAYING && (
            <div className="absolute inset-0 m-auto w-[90%] h-[90%] bg-white/95 shadow-2xl rounded-3xl flex flex-col items-center justify-center text-center p-6 z-20 backdrop-blur-sm border-4 border-white ring-4 ring-black/5 animate-fade-in-up">
                
                {status === GameStatus.START_SCREEN && <div className="text-6xl mb-2 animate-bounce">🐍</div>}
                {status === GameStatus.VICTORY && <div className="text-6xl mb-2 animate-bounce">🏆</div>}
                {status === GameStatus.GAME_OVER && <div className="text-6xl mb-2 animate-pulse">💥</div>}

                <h1 className={`text-3xl font-black mb-2 uppercase tracking-tight 
                    ${status === GameStatus.GAME_OVER ? 'text-red-500' : 
                      status === GameStatus.VICTORY ? 'text-yellow-500' : 'text-[#0984e3]'}`}>
                    {status === GameStatus.START_SCREEN && "Rắn Số Nguyên"}
                    {status === GameStatus.PAUSED && "Tạm Dừng"}
                    {status === GameStatus.GAME_OVER && "Hết Lượt!"}
                    {status === GameStatus.LEVEL_COMPLETE && "Hoàn Thành!"}
                    {status === GameStatus.VICTORY && "Chiến Thắng!"}
                </h1>
                
                <p className="text-slate-500 mb-6 font-bold text-lg leading-tight px-4">{message}</p>

                <div className="flex flex-col gap-3 w-full max-w-[220px]">
                    {status === GameStatus.START_SCREEN && (
                        <Button onClick={handleStart} className="text-lg">BẮT ĐẦU CHƠI</Button>
                    )}

                    {status === GameStatus.PAUSED && (
                        <Button onClick={handlePause}>TIẾP TỤC</Button>
                    )}
                    
                    {status === GameStatus.GAME_OVER && (
                        <>
                             <Button onClick={handleRetry} className="bg-green-500 hover:bg-green-600 border-green-600">THỬ LẠI NGAY</Button>
                             {mistakeInfo && (
                                <Button variant="ai" onClick={handleAiExplain}>Tại sao sai? 🤔</Button>
                             )}
                        </>
                    )}

                    {status === GameStatus.LEVEL_COMPLETE && (
                        <Button onClick={handleNextLevel} className="text-lg animate-pulse">VÒNG TIẾP THEO ➡</Button>
                    )}

                    {status === GameStatus.VICTORY && (
                        <Button onClick={handleResetAll} className="bg-yellow-400 hover:bg-yellow-500 border-yellow-600 text-yellow-900">CHƠI LẠI TỪ ĐẦU</Button>
                    )}
                </div>
            </div>
        )}
      </div>

      <div className="md:hidden z-10 relative mt-6">
        <MobileControls onDirectionChange={(dir) => gameRef.current?.changeDirection(dir)} />
      </div>

      <AIBubble 
        message={aiMessage} 
        loading={aiLoading} 
        visible={aiVisible} 
        onClose={() => setAiVisible(false)} 
      />
    </div>
  );
};

export default App;