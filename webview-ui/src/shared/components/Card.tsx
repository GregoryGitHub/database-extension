import React from 'react';
import { cn } from '../utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: React.ReactNode;
}

export function Card({ title, children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-[var(--vscode-background)] border border-[var(--vscode-input-border)] rounded p-4',
        className
      )}
      {...props}
    >
      {title && (
        <h3 className="text-lg font-medium mb-4 text-[var(--vscode-foreground)]">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
