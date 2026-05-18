import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import * as anomalyService from '../services/anomaly.service';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await anomalyService.listAnomalies({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      severity: String(req.query.severity || ''),
      datasetId: String(req.query.datasetId || ''),
      dateFrom: String(req.query.dateFrom || ''),
      dateTo: String(req.query.dateTo || ''),
      resolved: String(req.query.resolved || ''),
    });
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list anomalies';
    res.status(500).json({ error: message });
  }
});

router.get('/stats', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const stats = await anomalyService.getAnomalyStats();
    res.json(stats);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get stats';
    res.status(500).json({ error: message });
  }
});

router.patch('/:id/resolve', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const anomaly = await anomalyService.resolveAnomaly(String(req.params.id));
    res.json(anomaly);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to resolve anomaly';
    res.status(500).json({ error: message });
  }
});

export default router;
