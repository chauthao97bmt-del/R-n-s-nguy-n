import React from 'react';

interface AIBubbleProps {
  message: string;
  loading: boolean;
  visible: boolean;
  onClose: () => void;
}

export const AIBubble: React.FC<AIBubbleProps> = ({ message, loading, visible, onClose }) => {
  if (!visible) return null;

  return (
    <div className="fixed bottom-32 right-5 max-w-[250px] z-50 animate-bounce-in">
      <div className="bg-white text-gray-800 p-4 rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl border-2 border-[#a855f7] shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-1 right-2 text-gray-400 hover:text-gray-600 font-bold"
        >
          ×
        </button>
        
        {loading ? (
          <div className="flex items-center gap-2 text-sm font-medium text-[#a855f7]">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            Đang suy nghĩ...
          </div>
        ) : (
          <div className="text-sm font-medium">
            <span className="text-[#a855f7] font-bold mr-1">AI:</span>
            {message}
          </div>
        )}
        
        {/* Triangle pointer */}
        <div className="absolute -bottom-2 right-0 w-0 h-0 border-l-[10px] border-l-transparent border-t-[10px] border-t-[#a855f7] border-r-[10px] border-r-transparent transform translate-x-[-10px]"></div>
         <div className="absolute -bottom-[5px] right-[1px] w-0 h-0 border-l-[8px] border-l-transparent border-t-[8px] border-t-white border-r-[8px] border-r-transparent transform translate-x-[-10px]"></div>
      </div>
    </div>
  );
};
