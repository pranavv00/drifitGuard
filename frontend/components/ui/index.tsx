'use client';

import { cn, getSeverityClass } from '@/lib/utils';
import { AlertTriangle, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react';

interface SeverityBadgeProps {
  severity: string;
  className?: string;
}

const SEVERITY_ICONS: Record<string, React.ReactNode> = {
  LOW: <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />,
  MEDIUM: <AlertCircle className="w-3 h-3" />,
  HIGH: <AlertTriangle className="w-3 h-3" />,
  CRITICAL: <AlertTriangle className="w-3 h-3 animate-pulse" />,
};

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const s = severity.toUpperCase();
  return (
    <span className={cn(getSeverityClass(s), className)}>
      {SEVERITY_ICONS[s]}
      {s.charAt(0) + s.slice(1).toLowerCase()}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; dotClass: string; textClass: string }> = {
  PENDING: { label: 'Pending', dotClass: 'status-dot-pending', textClass: 'text-slate-400' },
  QUEUED: { label: 'Queued', dotClass: 'status-dot-pending', textClass: 'text-slate-400' },
  PROCESSING: { label: 'Processing', dotClass: 'status-dot-processing', textClass: 'text-amber-400' },
  COMPLETED: { label: 'Completed', dotClass: 'status-dot-completed', textClass: 'text-emerald-400' },
  FAILED: { label: 'Failed', dotClass: 'status-dot-failed', textClass: 'text-red-400' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status.toUpperCase()] || STATUS_CONFIG.PENDING;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', cfg.textClass, className)}>
      <span className={cfg.dotClass} />
      {cfg.label}
    </span>
  );
}

interface ConfidenceBarProps {
  value: number; // 0–1
  className?: string;
}

export function ConfidenceBar({ value, className }: ConfidenceBarProps) {
  const pct = Math.round(value * 100);
  const color = pct >= 90 ? 'bg-red-400' : pct >= 75 ? 'bg-amber-400' : 'bg-slate-400';
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-1.5 rounded-full bg-surface-700">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-muted w-9 text-right">{pct}%</span>
    </div>
  );
}

interface HealthScoreProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function HealthScore({ score, size = 'md' }: HealthScoreProps) {
  const color =
    score >= 85 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400';
  const ring =
    score >= 85 ? 'stroke-emerald-400' : score >= 60 ? 'stroke-amber-400' : 'stroke-red-400';

  const sizeMap = { sm: 48, md: 64, lg: 80 };
  const dim = sizeMap[size];
  const r = dim / 2 - 6;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={dim} height={dim} className="-rotate-90">
        <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke="#1e1e33" strokeWidth="4" />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={r}
          fill="none"
          className={ring}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <span className={cn('absolute text-sm font-bold tabular-nums', color)}>
        {Math.round(score)}
      </span>
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-muted/40">{icon}</div>}
      <h3 className="text-base font-semibold text-slate-400">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton', className)} />;
}

export function CardSkeleton() {
  return (
    <div className="card space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  icon: React.ReactNode;
  iconBg?: string;
  suffix?: string;
}

export function StatCard({ label, value, delta, deltaPositive, icon, iconBg = 'bg-accent/10', suffix }: StatCardProps) {
  return (
    <div className="card group">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', iconBg)}>
          {icon}
        </div>
        {delta && (
          <span
            className={cn(
              'flex items-center gap-1 text-xs font-medium',
              deltaPositive ? 'text-emerald-400' : 'text-red-400'
            )}
          >
            {deltaPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {delta}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-white tabular-nums">{value}</span>
        {suffix && <span className="text-sm text-muted">{suffix}</span>}
      </div>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}
