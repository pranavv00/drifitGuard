'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { datasetApi, DGDataset } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import { StatusBadge, HealthScore, EmptyState, Skeleton } from '@/components/ui';
import { UploadModal } from '@/components/datasets/UploadModal';
import {
  Plus, Search, Database, ChevronLeft, ChevronRight,
  ArrowUpDown, Trash2, ExternalLink, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatRelative, downloadBlob } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function DatasetsPage() {
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['datasets', { search, status, page, sortBy, sortOrder }],
    queryFn: () =>
      datasetApi.list({ search, status, page, limit: 10, sortBy, sortOrder }).then((r) => r.data),
    staleTime: 10000,
  });

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await datasetApi.delete(id);
      toast.success('Dataset deleted');
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
    } catch {
      toast.error('Failed to delete dataset');
    }
  };

  const handleExport = async (id: string) => {
    try {
      const { data: blob } = await datasetApi.exportCSV(id);
      downloadBlob(blob as Blob, `anomalies-${id}.csv`);
      toast.success('Anomaly CSV exported!');
    } catch {
      toast.error('Export failed');
    }
  };

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortOrder('desc'); }
  };

  return (
    <AppShell
      title="Datasets"
      description="All uploaded datasets and their processing status"
      actions={
        <button onClick={() => setUploadOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Upload CSV
        </button>
      }
    >
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search datasets..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-9"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="input w-36"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
        </select>
        <div className="text-xs text-muted ml-auto">
          {data?.total || 0} dataset{data?.total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : !data?.data?.length ? (
          <div className="py-16">
            <EmptyState
              icon={<Database className="w-12 h-12" />}
              title="No datasets found"
              description={search ? 'Try adjusting your search' : 'Upload your first CSV to begin anomaly detection'}
              action={
                !search && (
                  <button onClick={() => setUploadOpen(true)} className="btn-primary">
                    <Plus className="w-4 h-4" /> Upload Dataset
                  </button>
                )
              }
            />
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-8" />
                <th>
                  <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-white">
                    Name <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th>Source</th>
                <th>
                  <button onClick={() => toggleSort('rowCount')} className="flex items-center gap-1 hover:text-white">
                    Rows <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th>Health</th>
                <th>Status</th>
                <th>Anomalies</th>
                <th>
                  <button onClick={() => toggleSort('createdAt')} className="flex items-center gap-1 hover:text-white">
                    Uploaded <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.data.map((dataset: DGDataset) => {
                const d = dataset as DGDataset & { _count?: { anomalies: number } };
                return (
                  <tr key={d.id}>
                    <td>
                      <HealthScore score={d.healthScore} size="sm" />
                    </td>
                    <td>
                      <Link href={`/datasets/${d.id}`} className="font-medium text-slate-200 hover:text-accent transition-colors">
                        {d.name}
                      </Link>
                      <p className="text-[11px] text-muted font-mono mt-0.5">
                        {d.columnNames?.slice(0, 3).join(', ')}{d.columnNames?.length > 3 ? '...' : ''}
                      </p>
                    </td>
                    <td>
                      <span className="font-mono text-xs text-muted">{d.sourceName}</span>
                    </td>
                    <td>
                      <span className="tabular-nums">{d.rowCount.toLocaleString()}</span>
                    </td>
                    <td>
                      <span className={`text-sm font-bold tabular-nums ${d.healthScore >= 85 ? 'text-emerald-400' : d.healthScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                        {d.healthScore.toFixed(0)}%
                      </span>
                    </td>
                    <td><StatusBadge status={d.status} /></td>
                    <td>
                      {(d._count?.anomalies || 0) > 0 ? (
                        <span className="flex items-center gap-1 text-red-400 text-xs font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          {d._count?.anomalies}
                        </span>
                      ) : (
                        <span className="text-emerald-400 text-xs">—</span>
                      )}
                    </td>
                    <td>
                      <div>
                        <p className="text-xs text-slate-400">{formatDate(d.createdAt)}</p>
                        <p className="text-[11px] text-muted">{formatRelative(d.createdAt)}</p>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Link href={`/datasets/${d.id}`} className="btn-ghost p-1.5" title="View details">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button onClick={() => handleExport(d.id)} className="btn-ghost p-1.5" title="Export anomalies">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(d.id, d.name)}
                          className="btn-ghost p-1.5 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted">
            Page {page} of {data.totalPages} · {data.total} total
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary p-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="btn-secondary p-1.5"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} />}
    </AppShell>
  );
}
