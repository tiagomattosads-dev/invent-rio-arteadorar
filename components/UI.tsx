
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false,
  className = '',
  ...props 
}) => {
  const isLightTheme = document.body.classList.contains('bg-white');
  const baseStyles = 'px-6 py-3.5 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 shadow-sm';
  
  const variants = {
    primary: isLightTheme 
      ? 'bg-black text-white hover:bg-zinc-800' 
      : 'bg-white text-black hover:bg-zinc-200 border border-zinc-200',
    secondary: isLightTheme
      ? 'bg-zinc-100 text-zinc-900 border border-zinc-200 hover:bg-zinc-200'
      : 'bg-zinc-900 text-white border border-zinc-800 hover:bg-zinc-800',
    outline: 'bg-transparent border border-zinc-300 text-zinc-600 hover:border-zinc-500 hover:text-black dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-white',
    danger: 'bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white hover:border-white'
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...props }) => {
  const isLightTheme = document.body.classList.contains('bg-white');
  return (
    <input 
      className={`border rounded-2xl px-4 py-3.5 text-sm transition-all w-full focus:outline-none focus:ring-2 focus:ring-zinc-500/20 ${
        isLightTheme 
          ? 'bg-zinc-50 border-zinc-200 text-black placeholder:text-zinc-400' 
          : 'bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-500'
      } ${className}`}
      {...props}
    />
  );
};

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ children, className = '', ...props }) => {
  const isLightTheme = document.body.classList.contains('bg-white');
  return (
    <div className="relative w-full">
      <select 
        className={`border rounded-2xl px-4 py-3.5 text-sm transition-all w-full appearance-none ${
          isLightTheme 
            ? 'bg-zinc-50 border-zinc-200 text-black' 
            : 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-500'
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-500">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </div>
    </div>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  const isLightTheme = document.body.classList.contains('bg-white');
  return (
    <div className={`rounded-[2rem] overflow-hidden border transition-all ${
      isLightTheme 
        ? 'bg-white border-zinc-100 shadow-sm' 
        : 'bg-zinc-950 border-zinc-900 shadow-none'
    } ${className}`}>
      {children}
    </div>
  );
};

export const Badge: React.FC<{ children: React.ReactNode; variant?: 'success' | 'warning' | 'default' }> = ({ children, variant = 'default' }) => {
  const isLightTheme = document.body.classList.contains('bg-white');
  
  const darkStyles = {
    success: 'bg-white text-black border-white',
    warning: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    default: 'bg-zinc-900 text-zinc-500 border-zinc-800'
  };

  const lightStyles = {
    success: 'bg-black text-white border-black',
    warning: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    default: 'bg-zinc-50 text-zinc-400 border-zinc-100'
  };

  const activeStyles = isLightTheme ? lightStyles[variant] : darkStyles[variant];

  return (
    <span className={`text-[9px] uppercase tracking-[0.15em] font-black px-3 py-1 rounded-full border shadow-sm ${activeStyles}`}>
      {children}
    </span>
  );
};

export const Modal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;
  const isLightTheme = document.body.classList.contains('bg-white');
  const modalBg = isLightTheme ? 'bg-white text-black' : 'bg-black text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className={`${modalBg} w-full max-w-2xl h-[92vh] sm:h-auto sm:max-h-[90vh] flex flex-col rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl animate-in slide-in-from-bottom-10 duration-500 border-t sm:border border-zinc-900`}>
        {/* Mobile handle indicator */}
        <div className="sm:hidden flex justify-center pt-4 pb-2">
            <div className="w-12 h-1 bg-zinc-800 rounded-full"></div>
        </div>
        <div className={`px-8 pb-6 pt-2 sm:pt-8 border-b flex justify-between items-center ${isLightTheme ? 'border-zinc-100' : 'border-zinc-900'}`}>
          <h2 className="text-xl font-black uppercase tracking-tighter">{title}</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-zinc-500 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div className="p-8 overflow-y-auto flex-1 pb-20 sm:pb-8">
          {children}
        </div>
        {footer && (
          <div className={`p-8 border-t flex justify-end gap-3 ${isLightTheme ? 'border-zinc-100' : 'border-zinc-900'}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
