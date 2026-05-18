import { prisma } from '../config/prisma';

export async function getDashboardMetrics() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalDatasets,
    totalAnomalies,
    unresolvedAnomalies,
    datasetsToday,
    processingJobs,
    latestDatasets,
    anomalyBySeverity,
    recentAlerts,
  ] = await Promise.all([
    prisma.dataset.count(),
    prisma.anomaly.count(),
    prisma.anomaly.count({ where: { resolved: false } }),
    prisma.dataset.count({ where: { createdAt: { gte: today } } }),
    prisma.processingJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { status: true, startedAt: true, completedAt: true },
    }),
    prisma.dataset.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        _count: { select: { anomalies: true } },
      },
    }),
    prisma.anomaly.groupBy({ by: ['severity'], _count: { id: true } }),
    prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { dataset: { select: { name: true } }, anomaly: { select: { type: true, confidence: true } } },
    }),
  ]);

  const completedJobs = processingJobs.filter(
    (j) => j.status === 'COMPLETED' && j.startedAt && j.completedAt
  );
  const avgProcessingMs =
    completedJobs.length > 0
      ? completedJobs.reduce((sum, j) => {
          const ms = j.completedAt!.getTime() - j.startedAt!.getTime();
          return sum + ms;
        }, 0) / completedJobs.length
      : 0;

  const failedJobs = processingJobs.filter((j) => j.status === 'FAILED').length;

  return {
    totalDatasets,
    totalAnomalies,
    unresolvedAnomalies,
    datasetsToday,
    avgProcessingMs: Math.round(avgProcessingMs),
    failedJobs,
    latestDatasets,
    anomalyBySeverity,
    recentAlerts,
  };
}

export async function getProcessingMetrics() {
  const jobs = await prisma.processingJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { dataset: { select: { name: true } } },
  });

  return jobs.map((j) => ({
    id: j.id,
    datasetName: j.dataset.name,
    status: j.status,
    progress: j.progress,
    processingTimeMs:
      j.startedAt && j.completedAt
        ? j.completedAt.getTime() - j.startedAt.getTime()
        : null,
    createdAt: j.createdAt,
  }));
}
