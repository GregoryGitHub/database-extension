import React from 'react';
import { cn } from '../utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false,
  disabled,
  children, 
  ...props 
}: ButtonProps) {
  return (
    <button
      className={cn(
        // Base styles
        'inline-flex items-center justify-center rounded font-medium transition-colors focus-visible:outline-none focus-visible:ring-1',
        
        // Size variants
        {
          'h-8 px-3 text-xs': size === 'sm',
          'h-9 px-4 py-2': size === 'md',
          'h-10 px-6 py-3': size === 'lg',
        },
        
        // Color variants
        {
          'bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)]': variant === 'primary',
          'bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)]': variant === 'secondary',
        },
        
        // Disabled state
        {
          'opacity-50 cursor-not-allowed': disabled || isLoading,
        },
        
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
