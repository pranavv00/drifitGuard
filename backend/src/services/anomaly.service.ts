import { prisma } from '../config/prisma';
import { AnomalyListQuery, PaginatedResponse } from '../dto/types';
import { Anomaly } from '@prisma/client';

export async function listAnomalies(
  query: AnomalyListQuery
): Promise<PaginatedResponse<Anomaly>> {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (query.severity) where.severity = query.severity.toUpperCase();
  if (query.datasetId) where.datasetId = query.datasetId;
  if (query.resolved !== undefined) where.resolved = query.resolved === 'true';
  if (query.dateFrom || query.dateTo) {
    where.detectedAt = {};
    if (query.dateFrom) (where.detectedAt as Record<string, unknown>).gte = new Date(query.dateFrom);
    if (query.dateTo) (where.detectedAt as Record<string, unknown>).lte = new Date(query.dateTo);
  }

  const [data, total] = await Promise.all([
    prisma.anomaly.findMany({
      where,
      skip,
      take: limit,
      orderBy: { detectedAt: 'desc' },
      include: {
        dataset: { select: { name: true, sourceName: true } },
      },
    }),
    prisma.anomaly.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function resolveAnomaly(id: string) {
  return prisma.anomaly.update({
    where: { id },
    data: { resolved: true },
  });
}

export async function getAnomalyStats() {
  const [total, bySeverity, byType] = await Promise.all([
    prisma.anomaly.count(),
    prisma.anomaly.groupBy({ by: ['severity'], _count: true }),
    prisma.anomaly.groupBy({ by: ['type'], _count: true, orderBy: { _count: { id: 'desc' } }, take: 5 }),
  ]);
  return { total, bySeverity, byType };
}
