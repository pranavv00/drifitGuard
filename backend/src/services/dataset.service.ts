import { prisma } from '../config/prisma';
import { csvQueue } from '../config/queue';
import { DatasetListQuery, PaginatedResponse } from '../dto/types';
import { Dataset } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export async function createDataset(
  name: string,
  sourceName: string,
  userId: string,
  filePath: string
) {
  // Create dataset record
  const dataset = await prisma.dataset.create({
    data: {
      id: uuidv4(),
      name,
      sourceName,
      rowCount: 0,
      columnNames: [],
      status: 'PENDING',
      healthScore: 100,
      uploadedBy: userId,
    },
  });

  // Create processing job
  const job = await prisma.processingJob.create({
    data: {
      datasetId: dataset.id,
      status: 'QUEUED',
    },
  });

  // Enqueue BullMQ job
  const bullJob = await csvQueue.add(
    'process-csv',
    { datasetId: dataset.id, jobId: job.id, filePath },
    { jobId: `dataset-${dataset.id}` }
  );

  // Update job with bull job ID
  await prisma.processingJob.update({
    where: { id: job.id },
    data: { bullJobId: bullJob.id },
  });

  return { dataset, jobId: job.id };
}

export async function listDatasets(
  query: DatasetListQuery
): Promise<PaginatedResponse<Dataset>> {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { sourceName: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  if (query.status) where.status = query.status.toUpperCase();

  const orderBy: Record<string, string> = {};
  if (query.sortBy) {
    orderBy[query.sortBy] = query.sortOrder || 'desc';
  } else {
    orderBy.createdAt = 'desc';
  }

  const [data, total] = await Promise.all([
    prisma.dataset.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        _count: { select: { anomalies: true } },
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.dataset.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getDatasetById(id: string) {
  const dataset = await prisma.dataset.findUnique({
    where: { id },
    include: {
      dataRows: { orderBy: { rowIndex: 'asc' }, take: 500 },
      anomalies: { orderBy: { detectedAt: 'desc' } },
      processingJobs: { orderBy: { createdAt: 'desc' }, take: 5 },
      user: { select: { name: true, email: true } },
      _count: { select: { anomalies: true, dataRows: true } },
    },
  });
  if (!dataset) throw new Error('Dataset not found');
  return dataset;
}

export async function deleteDataset(id: string) {
  await prisma.dataset.delete({ where: { id } });
}

export async function exportAnomaliesCSV(datasetId: string): Promise<string> {
  const anomalies = await prisma.anomaly.findMany({
    where: { datasetId },
    orderBy: { detectedAt: 'desc' },
  });

  const headers = ['Type', 'Severity', 'Message', 'Confidence', 'Column', 'Row', 'Detected At'];
  const rows = anomalies.map((a) => [
    a.type,
    a.severity,
    `"${a.message}"`,
    a.confidence.toFixed(3),
    a.columnName || '',
    a.rowIndex !== null ? a.rowIndex + 1 : '',
    a.detectedAt.toISOString(),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
