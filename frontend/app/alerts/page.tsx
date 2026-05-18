'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { anomalyApi, datasetApi, DGAnomaly } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import { SeverityBadge, ConfidenceBar, EmptyState, Skeleton } from '@/components/ui';
import { AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Filter, Download } from 'lucide-react';
import { formatDateTime, formatRelative, downloadBlob } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const [severity, setSeverity] = useState('');
  const [datasetId, setDatasetId] = useState('');
  const [resolved, setResolved] = useState('false');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['anomalies', { severity, datasetId, resolved, page }],
    queryFn: () =>
      anomalyApi.list({ severity, datasetId, resolved, page, limit: 20 }).then((r) => r.data),
    staleTime: 10000,
  });

  const { data: datasets } = useQuery({
    queryKey: ['datasets-filter'],
    queryFn: () => datasetApi.list({ limit: 100 }).then((r) => r.data),
  });

  const handleResolve = async (id: string) => {
    try {
      await anomalyApi.resolve(id);
      toast.success('Anomaly marked as resolved');
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
    } catch {
      toast.error('Failed to resolve anomaly');
    }
  };

  const handleExportAll = async () => {
    const allAnomalies = data?.data || [];
    const headers = 'Type,Severity,Message,Confidence,Dataset,Column,Row,Detected At';
    const rows = allAnomalies.map((a: DGAnomaly) =>
      [a.type, a.severity, `"${a.message}"`, a.confidence.toFixed(3),
       a.dataset?.name || '', a.columnName || '', a.rowIndex != null ? a.rowIndex + 1 : '',
       a.detectedAt].join(',')
    );
    const csv = [headers, ...rows].join('\n');
    downloadBlob(new Blob([csv], { type: 'text/csv' }), 'all-anomalies.csv');
    toast.success('Exported all anomalies');
  };

  const SEVERITY_TABS = ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  return (
    <AppShell
      title="Alert Center"
      description="Anomaly alerts across all datasets"
      actions={
        <button onClick={handleExportAll} className="btn-secondary">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      }
    >
      {/* Severity filter tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
        {SEVERITY_TABS.map((s) => (
          <button
            key={s || 'ALL'}
            onClick={() => { setSeverity(s); setPage(1); }}
            className={`flex-none px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              severity === s
                ? s === 'CRITICAL' ? 'bg-red-700/40 text-red-300 border-red-600/30'
                : s === 'HIGH' ? 'bg-red-500/20 text-red-400 border-red-500/20'
                : s === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border-amber-500/20'
                : s === 'LOW' ? 'bg-slate-700/50 text-slate-300 border-slate-600/30'
                : 'bg-accent/15 text-accent border-accent/20'
                : 'bg-transparent text-muted border-border hover:border-accent/30 hover:text-white'
            }`}
          >
            {s || 'All Severities'}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted" />
          <select
            value={resolved}
            onChange={(e) => { setResolved(e.target.value); setPage(1); }}
            className="input w-32 py-1"
          >
            <option value="false">Unresolved</option>
            <option value="true">Resolved</option>
            <option value="">All</option>
          </select>
          {datasets?.data?.length && (
            <select
              value={datasetId}
              onChange={(e) => { setDatasetId(e.target.value); setPage(1); }}
              className="input w-44 py-1"
            >
              <option value="">All Datasets</option>
              {datasets.data.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex items-center gap-2 mb-4">
        {data && (
          <span className="text-xs text-muted">
            {data.total} alert{data.total !== 1 ? 's' : ''} found
          </span>
        )}
      </div>

      {/* Alert list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : !data?.data?.length ? (
        <EmptyState
          icon={<AlertTriangle className="w-12 h-12" />}
          title={resolved === 'true' ? 'No resolved alerts' : 'No active alerts'}
          description={resolved === 'true' ? 'No anomalies have been resolved yet' : 'All clear! No anomalies match your filters.'}
        />
      ) : (
        <div className="space-y-2">
          {data.data.map((anomaly: DGAnomaly) => (
            <div
              key={anomaly.id}
              className={`card transition-all ${
                anomaly.resolved ? 'opacity-60' : 'hover:border-accent/20'
              } ${anomaly.severity === 'CRITICAL' ? 'border-red-700/30' : anomaly.severity === 'HIGH' ? 'border-red-500/20' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <AlertTriangle
                    className={`w-5 h-5 ${
                      anomaly.severity === 'CRITICAL' ? 'text-red-400 animate-pulse'
                      : anomaly.severity === 'HIGH' ? 'text-red-400'
                      : anomaly.severity === 'MEDIUM' ? 'text-amber-400'
                      : 'text-slate-500'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <SeverityBadge severity={anomaly.severity} />
                    <span className="text-sm font-semibold text-white">{anomaly.type}</span>
                    {anomaly.columnName && (
                      <span className="font-mono text-xs text-muted bg-surface-700 px-2 py-0.5 rounded">
                        {anomaly.columnName}
                      </span>
                    )}
                    {anomaly.resolved && (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle className="w-3 h-3" /> Resolved
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mb-2">{anomaly.message}</p>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-32 max-w-xs">
                      <p className="text-[10px] text-muted mb-1">Confidence</p>
                      <ConfidenceBar value={anomaly.confidence} />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted">Dataset</p>
                      <p className="text-xs font-medium text-slate-300">{anomaly.dataset?.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted">Detected</p>
                      <p className="text-xs text-muted">{formatRelative(anomaly.detectedAt)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted">Row</p>
                      <p className="text-xs font-mono text-slate-400">
                        {anomaly.rowIndex != null ? anomaly.rowIndex + 1 : '—'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  {!anomaly.resolved ? (
                    <button
                      onClick={() => handleResolve(anomaly.id)}
                      className="btn-ghost text-xs py-1 px-2 hover:text-emerald-400"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Resolve
                    </button>
                  ) : (
                    <span className="text-xs text-muted">{formatDateTime(anomaly.detectedAt)}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted">Page {page} of {data.totalPages}</p>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary p-1.5">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="btn-secondary p-1.5">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
