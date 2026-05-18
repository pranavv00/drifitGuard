import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import * as metricsService from '../services/metrics.service';

const router = Router();

router.get('/summary', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const metrics = await metricsService.getDashboardMetrics();
    res.json(metrics);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get metrics';
    res.status(500).json({ error: message });
  }
});

router.get('/processing', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const metrics = await metricsService.getProcessingMetrics();
    res.json(metrics);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get processing metrics';
    res.status(500).json({ error: message });
  }
});

export default router;
