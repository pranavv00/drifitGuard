import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('dg_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('dg_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ──────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: DGUser }>('/api/auth/login', { email, password }),
  me: () => api.get<DGUser>('/api/auth/me'),
};

// ─── Datasets ──────────────────────────────────────────
export const datasetApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<DGDataset>>('/api/datasets', { params }),
  get: (id: string) => api.get<DGDatasetDetail>(`/api/datasets/${id}`),
  upload: (formData: FormData) =>
    api.post<{ dataset: DGDataset; jobId: string }>('/api/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: string) => api.delete(`/api/datasets/${id}`),
  exportCSV: (id: string) =>
    api.get(`/api/datasets/${id}/export`, { responseType: 'blob' }),
};

// ─── Anomalies ────────────────────────────────────────
export const anomalyApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<DGAnomaly>>('/api/anomalies', { params }),
  stats: () => api.get<AnomalyStats>('/api/anomalies/stats'),
  resolve: (id: string) => api.patch(`/api/anomalies/${id}/resolve`),
};

// ─── Metrics ──────────────────────────────────────────
export const metricsApi = {
  summary: () => api.get<DashboardMetrics>('/api/metrics/summary'),
  processing: () => api.get<ProcessingMetric[]>('/api/metrics/processing'),
};

// ─── Jobs ─────────────────────────────────────────────
export const jobApi = {
  get: (id: string) => api.get<DGJob>(`/api/jobs/${id}`),
  list: () => api.get<DGJob[]>('/api/jobs'),
};

// ─── Types ────────────────────────────────────────────
export interface DGUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface DGDataset {
  id: string;
  name: string;
  sourceName: string;
  rowCount: number;
  columnNames: string[];
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  healthScore: number;
  createdAt: string;
  updatedAt: string;
  _count?: { anomalies: number };
  user?: { name: string; email: string };
}

export interface DGDatasetDetail extends DGDataset {
  dataRows: { id: string; rowIndex: number; rowData: Record<string, unknown> }[];
  anomalies: DGAnomaly[];
  processingJobs: DGJob[];
  _count?: { anomalies: number; dataRows: number };
}

export interface DGAnomaly {
  id: string;
  datasetId: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  confidence: number;
  columnName?: string;
  rowIndex?: number;
  metadata?: Record<string, unknown>;
  resolved: boolean;
  detectedAt: string;
  dataset?: { name: string; sourceName: string };
}

export interface DGJob {
  id: string;
  datasetId: string;
  bullJobId?: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  dataset?: { name: string };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardMetrics {
  totalDatasets: number;
  totalAnomalies: number;
  unresolvedAnomalies: number;
  datasetsToday: number;
  avgProcessingMs: number;
  failedJobs: number;
  latestDatasets: (DGDataset & { _count: { anomalies: number } })[];
  anomalyBySeverity: { severity: string; _count: { id: number } }[];
  recentAlerts: {
    id: string;
    title: string;
    severity: string;
    createdAt: string;
    dataset: { name: string };
    anomaly: { type: string; confidence: number };
  }[];
}

export interface AnomalyStats {
  total: number;
  bySeverity: { severity: string; _count: boolean }[];
  byType: { type: string; _count: boolean }[];
}

export interface ProcessingMetric {
  id: string;
  datasetName: string;
  status: string;
  progress: number;
  processingTimeMs: number | null;
  createdAt: string;
}
