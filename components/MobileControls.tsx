import React from 'react';
import { Position } from '../types';

interface MobileControlsProps {
  onDirectionChange: (dir: Position) => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({ onDirectionChange }) => {
  const btnClass = "w-16 h-16 bg-white/40 backdrop-blur-sm border-2 border-white/60 rounded-full flex items-center justify-center text-3xl text-white shadow-sm active:bg-white/60 active:scale-95 select-none touch-manipulation transition-all";

  return (
    <div className="grid grid-cols-3 gap-3 max-w-[220px] mx-auto">
      <div></div>
      <button 
        className={btnClass} 
        onPointerDown={(e) => { e.preventDefault(); onDirectionChange({ x: 0, y: -1 }); }}
      >
        ⬆️
      </button>
      <div></div>
      
      <button 
        className={btnClass} 
        onPointerDown={(e) => { e.preventDefault(); onDirectionChange({ x: -1, y: 0 }); }}
      >
        ⬅️
      </button>
      <button 
        className={btnClass} 
        onPointerDown={(e) => { e.preventDefault(); onDirectionChange({ x: 0, y: 1 }); }}
      >
        ⬇️
      </button>
      <button 
        className={btnClass} 
        onPointerDown={(e) => { e.preventDefault(); onDirectionChange({ x: 1, y: 0 }); }}
      >
        ➡️
      </button>
    </div>
  );
};