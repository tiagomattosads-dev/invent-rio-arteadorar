
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
  const baseStyles = 'px-4 py-2 rounded-md font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2';
  
  const variants = {
    primary: 'bg-zinc-900 text-white hover:bg-black active:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 dark:active:bg-zinc-300 dark:border dark:border-zinc-200',
    secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border border-zinc-200 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700 dark:active:bg-zinc-600 dark:border-zinc-700',
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
  return (
    <input 
      className={`border rounded-md px-3 py-2 text-sm transition-colors w-full focus:outline-none focus:ring-1 focus:ring-zinc-400 bg-white border-zinc-200 text-black placeholder:text-zinc-400 dark:bg-zinc-900 dark:border-zinc-800 dark:text-white dark:placeholder:text-zinc-600 dark:focus:border-zinc-500 ${className}`}
      {...props}
    />
  );
};

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ children, className = '', ...props }) => {
  return (
    <select 
      className={`border rounded-md px-3 py-2 text-sm transition-colors w-full appearance-none bg-white border-zinc-200 text-black dark:bg-zinc-900 dark:border-zinc-800 dark:text-white dark:focus:border-zinc-500 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <div className={`rounded-lg overflow-hidden border transition-all bg-white border-zinc-200 shadow-sm hover:shadow-md dark:bg-zinc-950 dark:border-zinc-900 dark:shadow-none ${className}`}>
      {children}
    </div>
  );
};

export const Badge: React.FC<{ children: React.ReactNode; variant?: 'success' | 'warning' | 'default' }> = ({ children, variant = 'default' }) => {
  const styles = {
    success: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700',
    warning: 'bg-zinc-50 text-zinc-500 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800',
    default: 'bg-zinc-50 text-zinc-400 border-zinc-100 dark:bg-zinc-900 dark:text-zinc-500 dark:border-zinc-800'
  };

  return (
    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border shadow-sm ${styles[variant]}`}>
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className={`bg-white border-zinc-200 text-black dark:bg-zinc-950 dark:border-zinc-800 dark:text-white border w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl shadow-2xl animate-in fade-in zoom-in duration-200`}>
        <div className={`p-6 border-b flex justify-between items-center border-zinc-200 dark:border-zinc-900`}>
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
        {footer && (
          <div className={`p-6 border-t flex justify-end gap-3 border-zinc-200 dark:border-zinc-900`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
