import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return format(new Date(date), 'MMM d, yyyy');
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), 'MMM d, yyyy HH:mm');
}

export function formatRelative(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatMs(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function getHealthColor(score: number): string {
  if (score >= 85) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-red-400';
}

export function getHealthBg(score: number): string {
  if (score >= 85) return 'bg-emerald-400';
  if (score >= 60) return 'bg-amber-400';
  return 'bg-red-400';
}

export function getSeverityClass(severity: string): string {
  switch (severity.toUpperCase()) {
    case 'LOW': return 'badge-low';
    case 'MEDIUM': return 'badge-medium';
    case 'HIGH': return 'badge-high';
    case 'CRITICAL': return 'badge-critical';
    default: return 'badge-low';
  }
}

export function getStatusClass(status: string): string {
  switch (status.toUpperCase()) {
    case 'COMPLETED': return 'badge-success';
    case 'PROCESSING': return 'badge-medium';
    case 'FAILED': return 'badge-high';
    case 'QUEUED': return 'badge-low';
    case 'PENDING': return 'badge-low';
    default: return 'badge-low';
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function generateDemoCSV(): string {
  const headers = 'date,orders,revenue,avg_order_value';
  const rows: string[] = [];
  const base = new Date('2026-04-01');

  for (let i = 0; i < 30; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    let orders = 1100 + Math.floor(Math.random() * 200 - 100);
    let revenue = orders * (28 + Math.random() * 6);

    // Inject anomalies
    if (i === 12) { orders = 320; revenue = 8100; }
    if (i === 22) { orders = 2400; revenue = 78000; }
    if (i === 27) { orders = 0; revenue = 0; }

    const aov = orders > 0 ? (revenue / orders).toFixed(2) : '0';
    rows.push(`${dateStr},${orders},${Math.round(revenue)},${aov}`);
  }
  return [headers, ...rows].join('\n');
}
