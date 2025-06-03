import React from 'react';
import { cn } from '../utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
}

export function Select({ 
  className, 
  label, 
  error, 
  helperText, 
  id, 
  options,
  children,
  ...props 
}: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={selectId} 
          className="block text-sm font-medium mb-1 text-[var(--vscode-foreground)]"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'w-full px-3 py-2 text-sm',
          'bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)]',
          'border border-[var(--vscode-input-border)] rounded',
          'focus:outline-none focus:ring-1 focus:ring-[var(--vscode-focusBorder)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-[var(--vscode-errorForeground)]',
          className
        )}
        {...props}
      >
        {children || options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
