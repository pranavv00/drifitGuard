'use client';

import { useQuery } from '@tanstack/react-query';
import { datasetApi, DGDatasetDetail } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import { SeverityBadge, StatusBadge, HealthScore, ConfidenceBar, EmptyState, Skeleton } from '@/components/ui';
import { ArrowLeft, Download, Database, AlertTriangle, Clock, BarChart3, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { formatDateTime, formatRelative, downloadBlob } from '@/lib/utils';
import { datasetApi as dApi } from '@/lib/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, AreaChart, Area
} from 'recharts';
import { useState, use } from 'react';
import toast from 'react-hot-toast';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DatasetDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<'overview' | 'data' | 'anomalies'>('overview');

  const { data: dataset, isLoading } = useQuery({
    queryKey: ['dataset', id],
    queryFn: () => datasetApi.get(id).then((r) => r.data as DGDatasetDetail),
    refetchInterval: 3000,
  });

  const handleExport = async () => {
    try {
      const { data: blob } = await dApi.exportCSV(id);
      downloadBlob(blob as Blob, `anomalies-${id}.csv`);
      toast.success('Exported!');
    } catch {
      toast.error('Export failed');
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      </AppShell>
    );
  }

  if (!dataset) {
    return (
      <AppShell>
        <EmptyState icon={<Database className="w-12 h-12" />} title="Dataset not found" />
      </AppShell>
    );
  }

  // Build chart data from rows
  const numericCols = dataset.columnNames?.filter(c => {
    const sample = dataset.dataRows.slice(0, 3).map(r => Number(r.rowData[c]));
    return sample.some(v => !isNaN(v)) && c.toLowerCase() !== 'date';
  }) || [];
  const dateCol = dataset.columnNames?.find(c => c.toLowerCase().includes('date'));

  const chartData = dataset.dataRows.map(row => {
    const point: Record<string, unknown> = { label: dateCol ? String(row.rowData[dateCol]).slice(5) : `R${row.rowIndex + 1}` };
    numericCols.forEach(c => { point[c] = Number(row.rowData[c]) || 0; });
    return point;
  });

  // Compute moving averages
  const maWindowSize = 7;
  if (numericCols[0] && chartData.length >= maWindowSize) {
    for (let i = 0; i < chartData.length; i++) {
      if (i < maWindowSize - 1) { chartData[i][`${numericCols[0]}_ma`] = null; continue; }
      const window = chartData.slice(i - maWindowSize + 1, i + 1);
      const avg = window.reduce((s, d) => s + (Number(d[numericCols[0]]) || 0), 0) / maWindowSize;
      chartData[i][`${numericCols[0]}_ma`] = Math.round(avg);
    }
  }

  // Anomaly row indices for chart reference lines
  const anomalyRows = new Set(dataset.anomalies.map(a => a.rowIndex).filter(r => r !== null));
  const highSeverityRows = new Set(
    dataset.anomalies.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL')
      .map(a => a.rowIndex).filter(r => r !== null)
  );

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'data', label: `Data Preview (${dataset._count?.dataRows || 0} rows)`, icon: Database },
    { id: 'anomalies', label: `Anomalies (${dataset._count?.anomalies || 0})`, icon: AlertTriangle },
  ] as const;

  return (
    <AppShell
      title={dataset.name}
      description={`${dataset.sourceName} · ${dataset.rowCount} rows · ${dataset.columnNames?.join(', ')}`}
      actions={
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary">
            <Download className="w-4 h-4" />
            Export Anomalies
          </button>
          <Link href="/datasets" className="btn-ghost">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      }
    >
      {/* Header stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <div className="card flex items-center gap-3">
          <HealthScore score={dataset.healthScore} size="md" />
          <div>
            <p className="text-xs text-muted">Health Score</p>
            <p className="text-sm font-semibold text-white">{dataset.healthScore.toFixed(1)}%</p>
          </div>
        </div>
        <div className="card">
          <p className="text-xs text-muted mb-1">Status</p>
          <StatusBadge status={dataset.status} />
        </div>
        <div className="card">
          <p className="text-xs text-muted mb-1">Rows</p>
          <p className="text-lg font-bold text-white tabular-nums">{dataset.rowCount.toLocaleString()}</p>
        </div>
        <div className="card">
          <p className="text-xs text-muted mb-1">Anomalies</p>
          <p className={`text-lg font-bold tabular-nums ${dataset._count?.anomalies ? 'text-red-400' : 'text-emerald-400'}`}>
            {dataset._count?.anomalies || 0}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-muted mb-1">Columns</p>
          <p className="text-lg font-bold text-white">{dataset.columnNames?.length || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-5">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              activeTab === id
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-white hover:border-border'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {numericCols.length > 0 && chartData.length > 0 ? (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {numericCols[0]} over time
                  </h3>
                  <p className="text-xs text-muted">Blue line = actual · Dashed = 7-day moving average</p>
                </div>
                <TrendingUp className="w-4 h-4 text-muted" />
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e33" />
                  <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#12121f', border: '1px solid #1e1e33', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                  <Line type="monotone" dataKey={numericCols[0]} stroke="#6366f1" strokeWidth={2} dot={false} name={numericCols[0]} />
                  {chartData[0]?.[`${numericCols[0]}_ma`] !== undefined && (
                    <Line type="monotone" dataKey={`${numericCols[0]}_ma`} stroke="#6366f155" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="7-day MA" connectNulls />
                  )}
                  {/* Anomaly reference lines */}
                  {Array.from(highSeverityRows).slice(0, 5).map(r => (
                    <ReferenceLine key={r} x={chartData[r as number]?.label as string} stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : null}

          {/* Additional columns */}
          {numericCols.slice(1, 3).map((col, i) => (
            <div key={col} className="card">
              <h3 className="text-sm font-semibold text-white mb-3">{col}</h3>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS[i + 1]} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={COLORS[i + 1]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e33" />
                  <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#12121f', border: '1px solid #1e1e33', borderRadius: '8px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey={col} stroke={COLORS[i + 1]} fill={`url(#grad${i})`} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Data Preview */}
      {activeTab === 'data' && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  {dataset.columnNames?.map(col => <th key={col}>{col}</th>)}
                  <th>Anomaly</th>
                </tr>
              </thead>
              <tbody>
                {dataset.dataRows.slice(0, 100).map((row) => {
                  const hasAnomaly = anomalyRows.has(row.rowIndex);
                  const isHigh = highSeverityRows.has(row.rowIndex);
                  return (
                    <tr
                      key={row.id}
                      className={isHigh ? 'bg-red-500/5' : hasAnomaly ? 'bg-amber-500/5' : ''}
                    >
                      <td className="font-mono text-muted text-xs">{row.rowIndex + 1}</td>
                      {dataset.columnNames?.map(col => (
                        <td key={col} className={`font-mono text-xs ${row.rowData[col] === null ? 'text-red-400 italic' : ''}`}>
                          {row.rowData[col] === null ? 'null' : String(row.rowData[col])}
                        </td>
                      ))}
                      <td>
                        {isHigh && <span className="text-[10px] text-red-400">🔴 High</span>}
                        {hasAnomaly && !isHigh && <span className="text-[10px] text-amber-400">🟡</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {dataset.dataRows.length > 100 && (
            <p className="text-xs text-muted text-center py-3">
              Showing 100 of {dataset.dataRows.length} rows
            </p>
          )}
        </div>
      )}

      {/* Tab: Anomalies */}
      {activeTab === 'anomalies' && (
        <div className="space-y-2">
          {dataset.anomalies.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle className="w-10 h-10" />}
              title="No anomalies detected"
              description="This dataset passed all quality checks!"
            />
          ) : (
            dataset.anomalies.map((anomaly) => (
              <div key={anomaly.id} className="card hover:border-red-500/20 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={anomaly.severity} />
                    <span className="text-sm font-semibold text-white">{anomaly.type}</span>
                    {anomaly.columnName && (
                      <span className="text-xs font-mono text-muted bg-surface-700 px-2 py-0.5 rounded">
                        {anomaly.columnName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <Clock className="w-3 h-3" />
                    {formatRelative(anomaly.detectedAt)}
                  </div>
                </div>
                <p className="text-sm text-slate-400 mb-3">{anomaly.message}</p>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-xs text-muted mb-1">Confidence</p>
                    <ConfidenceBar value={anomaly.confidence} />
                  </div>
                  {anomaly.rowIndex !== null && anomaly.rowIndex !== undefined && (
                    <div>
                      <p className="text-xs text-muted">Row</p>
                      <p className="text-sm font-mono text-slate-300">{anomaly.rowIndex + 1}</p>
                    </div>
                  )}
                  {anomaly.metadata && (
                    <div className="text-right">
                      <p className="text-xs text-muted">Z-Score</p>
                      <p className="text-sm font-mono text-slate-300">
                        {(anomaly.metadata as Record<string, number>).zScore?.toFixed(2) || '—'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </AppShell>
  );
}
