import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/prisma';
import { csvQueue } from '../config/queue';

const router = Router();

router.get('/', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const jobs = await prisma.processingJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { dataset: { select: { name: true, sourceName: true } } },
    });
    res.json(jobs);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list jobs';
    res.status(500).json({ error: message });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const job = await prisma.processingJob.findUnique({
      where: { id: String(req.params.id) },
      include: { dataset: { select: { name: true } } },
    });

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    // Optionally get live bull job progress
    let bullProgress = job.progress;
    if (job.bullJobId && job.status === 'PROCESSING') {
      try {
        const bullJob = await csvQueue.getJob(String(job.bullJobId));
        if (bullJob) {
          const prog = await bullJob.progress;
          bullProgress = typeof prog === 'number' ? prog : bullProgress;
        }
      } catch {
        // Redis might be unavailable, use DB value
      }
    }

    res.json({ ...job, progress: bullProgress });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get job';
    res.status(500).json({ error: message });
  }
});

export default router;
