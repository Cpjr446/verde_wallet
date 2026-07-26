import React from 'react';
import { ThemeToggle } from '@/components/theme-toggle';

interface AppHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export default function AppHeader({ title, children }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between h-16 px-6 border-b border-border bg-card flex-shrink-0">
      <h1 className="text-2xl font-bold font-headline">{title}</h1>
      <div className="flex items-center gap-3">
        {children}
        <ThemeToggle showLabel={false} variant="outline" />
      </div>
    </header>
  );
}
