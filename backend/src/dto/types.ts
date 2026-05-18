export interface AnomalyResult {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  confidence: number;
  columnName?: string;
  rowIndex?: number;
  metadata?: Record<string, unknown>;
}

export interface DatasetRow {
  [key: string]: string | number | null;
}

export interface DatasetUploadDto {
  name: string;
  sourceName: string;
}

export interface DatasetListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AnomalyListQuery {
  page?: number;
  limit?: number;
  severity?: string;
  datasetId?: string;
  dateFrom?: string;
  dateTo?: string;
  resolved?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
