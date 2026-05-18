'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, X, FileText, Loader2, CheckCircle, Download } from 'lucide-react';
import { datasetApi } from '@/lib/api';
import { generateDemoCSV } from '@/lib/utils';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface UploadModalProps {
  onClose: () => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function UploadModal({ onClose }: UploadModalProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [state, setState] = useState<UploadState>('idle');
  const [result, setResult] = useState<{ datasetId: string; jobId: string } | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (f) {
      setFile(f);
      if (!name) setName(f.name.replace('.csv', '').replace(/_/g, ' '));
    }
  }, [name]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  const handleDownloadDemo = () => {
    const csv = generateDemoCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'demo_orders_dataset.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Demo CSV downloaded!');
  };

  const handleUpload = async () => {
    if (!file) return;
    setState('uploading');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name || file.name);
      formData.append('sourceName', sourceName || 'manual_upload');
      const { data } = await datasetApi.upload(formData);
      setResult({ datasetId: data.dataset.id, jobId: data.jobId });
      setState('success');
      toast.success('Dataset uploaded and queued for processing!');
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      queryClient.invalidateQueries({ queryKey: ['metrics-summary'] });
    } catch {
      setState('error');
      toast.error('Upload failed. Check backend is running.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-surface-800 border border-border rounded-2xl shadow-card-hover animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-white">Upload Dataset</h2>
            <p className="text-xs text-muted mt-0.5">CSV files up to 50MB supported</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {state === 'success' ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Upload Successful!</h3>
                <p className="text-sm text-muted mt-1">
                  Dataset is being processed. Anomaly detection running...
                </p>
              </div>
              <div className="w-full p-3 rounded-lg bg-surface-700 border border-border text-left">
                <p className="text-xs text-muted font-mono">Job ID: {result?.jobId}</p>
                <p className="text-xs text-muted font-mono">Dataset ID: {result?.datasetId}</p>
              </div>
              <button onClick={onClose} className="btn-primary w-full justify-center">
                View Datasets
              </button>
            </div>
          ) : (
            <>
              {/* Demo CSV download */}
              <button
                onClick={handleDownloadDemo}
                className="w-full flex items-center gap-2.5 p-3 rounded-lg border border-dashed border-accent/30 bg-accent/5 hover:border-accent/50 hover:bg-accent/10 transition-all text-sm text-accent"
              >
                <Download className="w-4 h-4" />
                <span className="flex-1 text-left text-xs">Download demo CSV with anomalies</span>
              </button>

              {/* Drop zone */}
              <div
                {...getRootProps()}
                className={cn(
                  'relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all',
                  isDragActive
                    ? 'border-accent bg-accent/10 scale-[1.01]'
                    : file
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-border hover:border-accent/40 hover:bg-surface-700/50'
                )}
              >
                <input {...getInputProps()} />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-8 h-8 text-emerald-400" />
                    <p className="text-sm font-medium text-emerald-400">{file.name}</p>
                    <p className="text-xs text-muted">{(file.size / 1024).toFixed(1)} KB</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="text-xs text-muted hover:text-red-400 transition-colors"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted/50" />
                    <p className="text-sm font-medium text-slate-400">
                      {isDragActive ? 'Drop your CSV here' : 'Drag & drop CSV or click to browse'}
                    </p>
                    <p className="text-xs text-muted">Supports date, numeric, and string columns</p>
                  </div>
                )}
              </div>

              {/* Metadata fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="input-group">
                  <label className="input-label">Dataset Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input"
                    placeholder="Q2 Revenue Data"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Source Pipeline</label>
                  <input
                    type="text"
                    value={sourceName}
                    onChange={(e) => setSourceName(e.target.value)}
                    className="input"
                    placeholder="orders_pipeline"
                  />
                </div>
              </div>

              <button
                onClick={handleUpload}
                disabled={!file || state === 'uploading'}
                className="btn-primary w-full justify-center py-2.5"
              >
                {state === 'uploading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading & queuing job...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload & Run Detection
                  </>
                )}
              </button>

              {state === 'error' && (
                <p className="text-xs text-red-400 text-center">Upload failed. Ensure the backend server is running.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
