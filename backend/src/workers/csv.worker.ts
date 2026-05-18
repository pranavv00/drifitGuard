import { Worker, Job } from 'bullmq';
import { parse } from 'csv-parse';
import * as fs from 'fs';
import { redisConnection } from '../config/queue';
import { prisma } from '../config/prisma';
import {
  detectZScoreAnomalies,
  detectMovingAverageAnomalies,
  detectMissingValues,
  detectDuplicateRows,
  detectGrowthAnomalies,
} from '../detection';
import { DatasetRow, AnomalyResult } from '../dto/types';

interface CsvJobData {
  datasetId: string;
  jobId: string;
  filePath: string;
}

async function processJob(job: Job<CsvJobData>): Promise<void> {
  const { datasetId, jobId, filePath } = job.data;

  try {
    // Update job to processing
    await prisma.processingJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING', startedAt: new Date(), progress: 5 },
    });

    await prisma.dataset.update({
      where: { id: datasetId },
      data: { status: 'PROCESSING' },
    });

    await job.updateProgress(10);

    // Parse CSV
    const rows = await parseCSV(filePath);
    if (rows.length === 0) throw new Error('CSV file is empty or invalid');

    const columns = Object.keys(rows[0]);
    await job.updateProgress(25);

    // Store rows in DB (batch insert)
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize).map((row, offset) => ({
        datasetId,
        rowIndex: i + offset,
        rowData: row,
      }));
      await prisma.dataRow.createMany({ data: batch });
    }

    await prisma.processingJob.update({ where: { id: jobId }, data: { progress: 50 } });
    await job.updateProgress(50);

    // Run anomaly detection
    const numericColumns = columns.filter((col) => {
      const sample = rows.slice(0, 5).map((r) => Number(r[col])).filter((v) => !isNaN(v));
      return sample.length > 0 && col.toLowerCase() !== 'date';
    });

    const allAnomalies: AnomalyResult[] = [];

    // Missing values (all columns)
    allAnomalies.push(...detectMissingValues(rows, columns));

    // Duplicate rows
    allAnomalies.push(...detectDuplicateRows(rows));

    // Per numeric column
    for (const col of numericColumns) {
      allAnomalies.push(...detectZScoreAnomalies(rows, col));
      allAnomalies.push(...detectMovingAverageAnomalies(rows, col));
      allAnomalies.push(...detectGrowthAnomalies(rows, col));
    }

    // Deduplicate anomalies (same type + column + row)
    const seen = new Set<string>();
    const dedupedAnomalies = allAnomalies.filter((a) => {
      const key = `${a.type}:${a.columnName}:${a.rowIndex}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    await job.updateProgress(75);

    // Store anomalies and create alerts
    for (const anomaly of dedupedAnomalies) {
      const created = await prisma.anomaly.create({
        data: {
          datasetId,
          type: anomaly.type,
          severity: anomaly.severity,
          message: anomaly.message,
          confidence: anomaly.confidence,
          columnName: anomaly.columnName,
          rowIndex: anomaly.rowIndex,
          metadata: anomaly.metadata ? JSON.parse(JSON.stringify(anomaly.metadata)) : undefined,
        },
      });

      await prisma.alert.create({
        data: {
          anomalyId: created.id,
          datasetId,
          title: `${anomaly.type} detected`,
          severity: anomaly.severity,
        },
      });
    }

    // Calculate health score
    const criticalCount = dedupedAnomalies.filter((a) => a.severity === 'CRITICAL').length;
    const highCount = dedupedAnomalies.filter((a) => a.severity === 'HIGH').length;
    const mediumCount = dedupedAnomalies.filter((a) => a.severity === 'MEDIUM').length;
    const healthScore = Math.max(
      0,
      100 - criticalCount * 25 - highCount * 15 - mediumCount * 5
    );

    // Complete job
    await prisma.dataset.update({
      where: { id: datasetId },
      data: {
        status: 'COMPLETED',
        rowCount: rows.length,
        columnNames: columns,
        healthScore,
      },
    });

    await prisma.processingJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', progress: 100, completedAt: new Date() },
    });

    await job.updateProgress(100);

    // Clean up temp file
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    console.log(`✅ Job ${job.id} completed: ${dedupedAnomalies.length} anomalies found`);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Job ${job.id} failed:`, errMsg);

    await prisma.processingJob.update({
      where: { id: jobId },
      data: { status: 'FAILED', errorMessage: errMsg, completedAt: new Date() },
    });

    await prisma.dataset.update({
      where: { id: datasetId },
      data: { status: 'FAILED' },
    });

    throw error;
  }
}

function parseCSV(filePath: string): Promise<DatasetRow[]> {
  return new Promise((resolve, reject) => {
    const rows: DatasetRow[] = [];
    fs.createReadStream(filePath)
      .pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          cast: (value) => {
            if (value === '' || value === 'null' || value === 'NULL') return null;
            const num = Number(value);
            return isNaN(num) ? value : num;
          },
        })
      )
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

// Start the worker
export function startCsvWorker() {
  const worker = new Worker<CsvJobData>('csv-processing', processJob, {
    connection: redisConnection,
    concurrency: 3,
  });

  worker.on('completed', (job) => {
    console.log(`✅ CSV Worker: Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ CSV Worker: Job ${job?.id} failed:`, err.message);
  });

  worker.on('progress', (job, progress) => {
    console.log(`⏳ Job ${job.id}: ${progress}%`);
  });

  console.log('🚀 CSV Worker started');
  return worker;
}
