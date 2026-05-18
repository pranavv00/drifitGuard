import { AnomalyResult, DatasetRow } from '../dto/types';

/**
 * Z-Score based anomaly detection.
 * Detects values that are statistically far from the mean.
 * Threshold: |z| > 2.5 = anomaly
 */
export function detectZScoreAnomalies(
  rows: DatasetRow[],
  column: string
): AnomalyResult[] {
  const values = rows
    .map((r, i) => ({ value: Number(r[column]), index: i }))
    .filter((v) => !isNaN(v.value));

  if (values.length < 5) return [];

  const mean = values.reduce((s, v) => s + v.value, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v.value - mean, 2), 0) / values.length;
  const stddev = Math.sqrt(variance);

  if (stddev === 0) return [];

  const anomalies: AnomalyResult[] = [];

  values.forEach(({ value, index }) => {
    const zScore = (value - mean) / stddev;
    if (Math.abs(zScore) > 2.5) {
      const isSpike = zScore > 0;
      const pctChange = ((value - mean) / mean) * 100;
      anomalies.push({
        type: isSpike ? `${column} Spike` : `${column} Drop`,
        severity: Math.abs(zScore) > 4 ? 'CRITICAL' : Math.abs(zScore) > 3 ? 'HIGH' : 'MEDIUM',
        message: `${column} is ${Math.abs(pctChange).toFixed(1)}% ${isSpike ? 'above' : 'below'} the dataset average (z-score: ${zScore.toFixed(2)})`,
        confidence: Math.min(0.99, 0.7 + Math.abs(zScore) * 0.07),
        columnName: column,
        rowIndex: index,
        metadata: { zScore, mean, stddev, value, pctChange },
      });
    }
  });

  return anomalies;
}

/**
 * Moving average deviation detection.
 * Detects when a value deviates significantly from its N-day moving average.
 */
export function detectMovingAverageAnomalies(
  rows: DatasetRow[],
  column: string,
  windowSize = 7,
  threshold = 0.25
): AnomalyResult[] {
  const anomalies: AnomalyResult[] = [];

  for (let i = windowSize; i < rows.length; i++) {
    const windowValues = rows
      .slice(i - windowSize, i)
      .map((r) => Number(r[column]))
      .filter((v) => !isNaN(v));

    if (windowValues.length < 3) continue;

    const movingAvg = windowValues.reduce((s, v) => s + v, 0) / windowValues.length;
    const current = Number(rows[i][column]);
    if (isNaN(current) || movingAvg === 0) continue;

    const deviation = (current - movingAvg) / movingAvg;

    if (Math.abs(deviation) > threshold) {
      const isSpike = deviation > 0;
      const pctChange = deviation * 100;
      anomalies.push({
        type: isSpike ? `${column} Spike` : `${column} Drop`,
        severity: Math.abs(deviation) > 0.5 ? 'HIGH' : 'MEDIUM',
        message: `${column} ${isSpike ? 'surged' : 'dropped'} ${Math.abs(pctChange).toFixed(1)}% vs ${windowSize}-day moving average`,
        confidence: Math.min(0.97, 0.65 + Math.abs(deviation) * 0.5),
        columnName: column,
        rowIndex: i,
        metadata: { movingAvg, value: current, deviation: pctChange, windowSize },
      });
    }
  }

  return anomalies;
}

/**
 * Missing value detector — finds null/empty/undefined cells.
 */
export function detectMissingValues(rows: DatasetRow[], columns: string[]): AnomalyResult[] {
  const anomalies: AnomalyResult[] = [];
  const missingByColumn: Record<string, number[]> = {};

  rows.forEach((row, i) => {
    columns.forEach((col) => {
      const val = row[col];
      if (val === null || val === undefined || val === '' || val === 'null') {
        if (!missingByColumn[col]) missingByColumn[col] = [];
        missingByColumn[col].push(i);
      }
    });
  });

  Object.entries(missingByColumn).forEach(([col, indices]) => {
    const pct = (indices.length / rows.length) * 100;
    anomalies.push({
      type: 'Missing Values',
      severity: pct > 20 ? 'HIGH' : pct > 5 ? 'MEDIUM' : 'LOW',
      message: `Column '${col}' has ${indices.length} missing value(s) (${pct.toFixed(1)}% of rows)`,
      confidence: 1.0,
      columnName: col,
      rowIndex: indices[0],
      metadata: { missingCount: indices.length, pct, affectedRows: indices.slice(0, 10) },
    });
  });

  return anomalies;
}

/**
 * Duplicate row detector — uses JSON fingerprint hashing.
 */
export function detectDuplicateRows(rows: DatasetRow[]): AnomalyResult[] {
  const seen = new Map<string, number>();
  const duplicates: number[] = [];

  rows.forEach((row, i) => {
    const key = JSON.stringify(row);
    if (seen.has(key)) {
      duplicates.push(i);
    } else {
      seen.set(key, i);
    }
  });

  if (duplicates.length === 0) return [];

  return [
    {
      type: 'Duplicate Rows',
      severity: duplicates.length > 10 ? 'HIGH' : 'MEDIUM',
      message: `${duplicates.length} duplicate row(s) detected`,
      confidence: 1.0,
      metadata: { duplicateCount: duplicates.length, duplicateRows: duplicates.slice(0, 10) },
    },
  ];
}

/**
 * Day-over-day growth anomaly — detects sudden large percentage changes.
 */
export function detectGrowthAnomalies(
  rows: DatasetRow[],
  column: string,
  threshold = 0.3
): AnomalyResult[] {
  const anomalies: AnomalyResult[] = [];

  for (let i = 1; i < rows.length; i++) {
    const prev = Number(rows[i - 1][column]);
    const curr = Number(rows[i][column]);
    if (isNaN(prev) || isNaN(curr) || prev === 0) continue;

    const change = (curr - prev) / Math.abs(prev);
    if (Math.abs(change) > threshold) {
      anomalies.push({
        type: change > 0 ? `${column} Growth Spike` : `${column} Growth Drop`,
        severity: Math.abs(change) > 0.6 ? 'HIGH' : 'MEDIUM',
        message: `${column} changed ${(change * 100).toFixed(1)}% day-over-day at row ${i + 1}`,
        confidence: Math.min(0.95, 0.6 + Math.abs(change) * 0.5),
        columnName: column,
        rowIndex: i,
        metadata: { previous: prev, current: curr, changePct: change * 100 },
      });
    }
  }

  return anomalies;
}
