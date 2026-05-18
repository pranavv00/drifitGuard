'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Database,
  AlertTriangle,
  Activity,
  LogOut,
  Shield,
  Zap,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/datasets', label: 'Datasets', icon: Database },
  { href: '/alerts', label: 'Alert Center', icon: AlertTriangle },
  { href: '/metrics', label: 'System Metrics', icon: Activity },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('dg_token');
    router.push('/login');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 flex flex-col border-r border-border bg-surface-950/80 backdrop-blur-xl z-40">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center glow-accent">
          <Shield className="w-4 h-4 text-accent" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white tracking-tight">DriftGuard</h1>
          <p className="text-[10px] text-muted font-medium uppercase tracking-widest">Data Ops</p>
        </div>
      </div>

      {/* Status indicator */}
      <div className="mx-3 mt-3 mb-1 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[11px] text-emerald-400 font-medium">All systems normal</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-muted uppercase tracking-widest">
          Platform
        </p>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn('nav-link', active && 'active')}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-sm">{label}</span>
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom user section */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-xs font-bold text-accent">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-300 truncate">Alex Chen</p>
            <p className="text-[10px] text-muted">Analyst</p>
          </div>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="text-muted hover:text-white transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
        {userMenuOpen && (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        )}

        {/* Version badge */}
        <div className="mt-2 flex items-center justify-center gap-1.5">
          <Zap className="w-3 h-3 text-accent/50" />
          <span className="text-[10px] text-muted/60 font-mono">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}
