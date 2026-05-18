'use client';

import { useQuery } from '@tanstack/react-query';
import { metricsApi, jobApi } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import { StatCard, StatusBadge, CardSkeleton, Skeleton, EmptyState } from '@/components/ui';
import { Activity, Clock, AlertTriangle, XCircle, CheckCircle, Zap } from 'lucide-react';
import { formatMs, formatRelative, formatDateTime } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

export default function MetricsPage() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['metrics-summary'],
    queryFn: () => metricsApi.summary().then((r) => r.data),
    refetchInterval: 10000,
  });

  const { data: processing, isLoading: procLoading } = useQuery({
    queryKey: ['metrics-processing'],
    queryFn: () => metricsApi.processing().then((r) => r.data),
    refetchInterval: 10000,
  });

  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobApi.list().then((r) => r.data),
    refetchInterval: 5000,
  });

  const processingTimes = (processing || [])
    .filter((p) => p.processingTimeMs !== null)
    .slice(-20)
    .map((p, i) => ({ name: `J${i + 1}`, ms: p.processingTimeMs, dataset: p.datasetName }));

  const jobStatusCounts = (jobs || []).reduce(
    (acc, j) => { acc[j.status] = (acc[j.status] || 0) + 1; return acc; },
    {} as Record<string, number>
  );

  return (
    <AppShell
      title="System Metrics"
      description="Processing performance, job health, and platform statistics"
    >
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Datasets Processed Today"
              value={metrics?.datasetsToday || 0}
              icon={<Activity className="w-4 h-4 text-accent" />}
              iconBg="bg-accent/10"
            />
            <StatCard
              label="Avg Processing Time"
              value={metrics?.avgProcessingMs ? formatMs(metrics.avgProcessingMs) : '—'}
              icon={<Clock className="w-4 h-4 text-emerald-400" />}
              iconBg="bg-emerald-500/10"
            />
            <StatCard
              label="Total Anomalies"
              value={metrics?.totalAnomalies || 0}
              icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
              iconBg="bg-amber-500/10"
            />
            <StatCard
              label="Failed Jobs"
              value={metrics?.failedJobs || 0}
              icon={<XCircle className="w-4 h-4 text-red-400" />}
              iconBg="bg-red-500/10"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Processing time chart */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-1">Processing Time per Job</h3>
          <p className="text-xs text-muted mb-4">Last 20 completed jobs (milliseconds)</p>
          {processingTimes.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={processingTimes} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e33" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => formatMs(v)} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => [formatMs(Number(v)), 'Processing Time']}
                  contentStyle={{ background: '#12121f', border: '1px solid #1e1e33', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="ms" radius={[4, 4, 0, 0]}>
                  {processingTimes.map((_, i) => (
                    <Cell key={i} fill={i === processingTimes.length - 1 ? '#6366f1' : '#1e1e33'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No processing data yet" description="Upload datasets to see timing metrics" />
          )}
        </div>

        {/* Job status breakdown */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">Job Status Breakdown</h3>
          <div className="space-y-3">
            {(['COMPLETED', 'PROCESSING', 'QUEUED', 'FAILED'] as const).map((status) => {
              const count = jobStatusCounts[status] || 0;
              const total = Object.values(jobStatusCounts).reduce((a, b) => a + b, 0) || 1;
              const pct = Math.round((count / total) * 100);
              const colors: Record<string, string> = {
                COMPLETED: 'bg-emerald-400',
                PROCESSING: 'bg-amber-400',
                QUEUED: 'bg-slate-500',
                FAILED: 'bg-red-400',
              };
              return (
                <div key={status}>
                  <div className="flex justify-between mb-1">
                    <StatusBadge status={status} />
                    <span className="text-xs text-muted tabular-nums">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-surface-700 rounded-full">
                    <div
                      className={`h-full rounded-full transition-all ${colors[status]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-muted">Queue health</span>
              </div>
              <span className="text-xs font-semibold text-emerald-400">
                {jobStatusCounts['FAILED'] ? '⚠️ Issues detected' : '✓ Normal'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Job history table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Recent Jobs</h3>
            <p className="text-xs text-muted mt-0.5">BullMQ processing history</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs text-accent font-medium">Live</span>
          </div>
        </div>
        {procLoading ? (
          <div className="p-5 space-y-2">
            {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Dataset</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Processing Time</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {(processing || []).map((job) => (
                <tr key={job.id}>
                  <td>
                    <p className="text-sm font-medium text-slate-300">{job.datasetName}</p>
                    <p className="text-[11px] font-mono text-muted">{job.id.slice(0, 8)}...</p>
                  </td>
                  <td><StatusBadge status={job.status} /></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-surface-700 rounded-full">
                        <div
                          className={`h-full rounded-full ${job.status === 'COMPLETED' ? 'bg-emerald-400' : job.status === 'FAILED' ? 'bg-red-400' : 'bg-amber-400'}`}
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-muted">{job.progress}%</span>
                    </div>
                  </td>
                  <td>
                    <span className="font-mono text-xs text-slate-300">
                      {job.processingTimeMs ? formatMs(job.processingTimeMs) : '—'}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs text-muted">
                      {job.status === 'COMPLETED' ? formatRelative(job.createdAt) : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {processing?.length === 0 && (
          <div className="py-12">
            <EmptyState
              icon={<CheckCircle className="w-10 h-10 text-emerald-400/40" />}
              title="No jobs processed yet"
              description="Upload a dataset to start the processing pipeline"
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
