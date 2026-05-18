'use client';

import { useQuery } from '@tanstack/react-query';
import { metricsApi, anomalyApi, datasetApi, DGDataset } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import {
  StatCard,
  CardSkeleton,
  SeverityBadge,
  StatusBadge,
  HealthScore,
  EmptyState,
} from '@/components/ui';
import { UploadModal } from '@/components/datasets/UploadModal';
import {
  Database,
  AlertTriangle,
  Activity,
  Clock,
  XCircle,
  Plus,
  ArrowRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import Link from 'next/link';
import { useState } from 'react';
import { formatRelative, formatMs, getHealthColor } from '@/lib/utils';

const SEVERITY_COLORS: Record<string, string> = {
  LOW: '#64748b',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
  CRITICAL: '#dc2626',
};

export default function DashboardPage() {
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['metrics-summary'],
    queryFn: () => metricsApi.summary().then((r) => r.data),
    refetchInterval: 15000,
  });

  const { data: anomalyStats } = useQuery({
    queryKey: ['anomaly-stats'],
    queryFn: () => anomalyApi.stats().then((r) => r.data),
  });

  if (isLoading) {
    return (
      <AppShell title="Dashboard" description="Data observability overview">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array(4).fill(0).map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Array(3).fill(0).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </AppShell>
    );
  }

  const severityData = anomalyStats?.bySeverity?.map((s) => ({
    name: s.severity,
    value: (s._count as unknown as number),
    color: SEVERITY_COLORS[s.severity] || '#64748b',
  })) || [];

  // Build trend sparkline from latest datasets
  const trendData = (metrics?.latestDatasets || []).slice(0, 7).reverse().map((d, i) => ({
    day: `D-${6 - i}`,
    anomalies: (d as DGDataset & { _count: { anomalies: number } })._count?.anomalies || 0,
    health: d.healthScore,
  }));

  return (
    <AppShell
      title="Dashboard"
      description="Real-time data observability overview"
      actions={
        <button onClick={() => setUploadOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Upload Dataset
        </button>
      }
    >
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Datasets"
          value={metrics?.totalDatasets || 0}
          icon={<Database className="w-4 h-4 text-accent" />}
          iconBg="bg-accent/10"
        />
        <StatCard
          label="Total Anomalies"
          value={metrics?.totalAnomalies || 0}
          delta={metrics?.unresolvedAnomalies ? `${metrics.unresolvedAnomalies} unresolved` : undefined}
          deltaPositive={false}
          icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
          iconBg="bg-red-500/10"
        />
        <StatCard
          label="Datasets Today"
          value={metrics?.datasetsToday || 0}
          icon={<Activity className="w-4 h-4 text-emerald-400" />}
          iconBg="bg-emerald-500/10"
        />
        <StatCard
          label="Avg Processing"
          value={metrics?.avgProcessingMs ? formatMs(metrics.avgProcessingMs) : '—'}
          icon={<Clock className="w-4 h-4 text-amber-400" />}
          iconBg="bg-amber-500/10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Trend chart */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Dataset Health Trend</h3>
              <p className="text-xs text-muted mt-0.5">Last 7 uploads — health scores</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e33" />
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#12121f', border: '1px solid #1e1e33', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area type="monotone" dataKey="health" stroke="#6366f1" fill="url(#healthGrad)" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Severity breakdown */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">Anomaly Breakdown</h3>
          {severityData.length > 0 ? (
            <div className="flex flex-col items-center">
              <PieChart width={140} height={140}>
                <Pie data={severityData} cx={65} cy={65} innerRadius={40} outerRadius={62} dataKey="value" paddingAngle={3}>
                  {severityData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
              <div className="w-full space-y-2 mt-2">
                {severityData.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-muted capitalize">{s.name.toLowerCase()}</span>
                    </div>
                    <span className="font-semibold text-slate-300 tabular-nums">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title="No anomalies yet" description="Upload a dataset to start detection" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Latest datasets */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Latest Datasets</h3>
            <Link href="/datasets" className="btn-ghost text-xs py-1 px-2">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {(metrics?.latestDatasets || []).slice(0, 5).map((dataset) => {
              const d = dataset as DGDataset & { _count: { anomalies: number } };
              return (
                <Link
                  key={d.id}
                  href={`/datasets/${d.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-700/50 transition-all group"
                >
                  <HealthScore score={d.healthScore} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white">{d.name}</p>
                    <p className="text-xs text-muted">{d.sourceName} · {d.rowCount} rows</p>
                  </div>
                  <div className="text-right shrink-0">
                    <StatusBadge status={d.status} />
                    {d._count?.anomalies > 0 && (
                      <p className="text-[10px] text-red-400 mt-0.5">{d._count.anomalies} anomalies</p>
                    )}
                  </div>
                </Link>
              );
            })}
            {(!metrics?.latestDatasets || metrics.latestDatasets.length === 0) && (
              <EmptyState
                title="No datasets yet"
                action={
                  <button onClick={() => setUploadOpen(true)} className="btn-primary text-xs py-1.5 px-3">
                    <Plus className="w-3 h-3" /> Upload First Dataset
                  </button>
                }
              />
            )}
          </div>
        </div>

        {/* Recent alerts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Recent Alerts</h3>
            <Link href="/alerts" className="btn-ghost text-xs py-1 px-2">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {(metrics?.recentAlerts || []).map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-surface-700/30 transition-all">
                <AlertTriangle
                  className={`w-4 h-4 mt-0.5 shrink-0 ${alert.severity === 'HIGH' || alert.severity === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-300 truncate">{alert.title}</p>
                  <p className="text-[11px] text-muted">{alert.dataset.name}</p>
                </div>
                <div className="shrink-0">
                  <SeverityBadge severity={alert.severity} />
                  <p className="text-[10px] text-muted mt-0.5 text-right">{formatRelative(alert.createdAt)}</p>
                </div>
              </div>
            ))}
            {(!metrics?.recentAlerts || metrics.recentAlerts.length === 0) && (
              <EmptyState
                icon={<XCircle className="w-10 h-10" />}
                title="No alerts"
                description="All datasets are healthy"
              />
            )}
          </div>
        </div>
      </div>

      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} />}
    </AppShell>
  );
}
