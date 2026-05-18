'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface AppShellProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export default function AppShell({ children, title, description, actions }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-56 min-h-screen">
        {/* Page header */}
        {(title || actions) && (
          <div className="sticky top-0 z-30 border-b border-border bg-surface-900/80 backdrop-blur-sm px-8 py-4">
            <div className="flex items-start justify-between">
              <div>
                {title && <h1 className="text-lg font-semibold text-white">{title}</h1>}
                {description && <p className="text-sm text-muted mt-0.5">{description}</p>}
              </div>
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
          </div>
        )}
        {/* Page content */}
        <div className="px-8 py-6 animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
