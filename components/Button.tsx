import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ai' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  let baseClass = 'bg-[#0984e3] hover:bg-[#74b9ff] border-[#0652dd] text-white';
  
  if (variant === 'ai') {
    baseClass = 'bg-[#a29bfe] hover:bg-[#b8b5ff] border-[#6c5ce7] text-white';
  }
  if (variant === 'danger') {
    baseClass = 'bg-[#ff7675] hover:bg-[#ff9f9f] border-[#d63031] text-white';
  }

  return (
    <button
      className={`
        px-6 py-3 rounded-2xl font-black text-base uppercase tracking-wide
        border-b-[5px] active:border-b-0 active:translate-y-[5px] active:shadow-none
        transition-all duration-150 shadow-lg
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:border-b-[5px]
        ${baseClass} ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};