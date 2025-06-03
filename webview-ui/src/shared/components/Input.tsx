import React from 'react';
import { cn } from '../utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({ 
  className, 
  label, 
  error, 
  helperText, 
  id, 
  ...props 
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-sm font-medium mb-1 text-[var(--vscode-foreground)]"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full px-3 py-2 text-sm',
          'bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)]',
          'border border-[var(--vscode-input-border)] rounded',
          'placeholder:text-[var(--vscode-input-placeholderForeground)]',
          'focus:outline-none focus:ring-1 focus:ring-[var(--vscode-focusBorder)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-[var(--vscode-errorForeground)]',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-[var(--vscode-errorForeground)]">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-xs text-[var(--vscode-descriptionForeground)]">
          {helperText}
        </p>
      )}
    </div>
  );
}
