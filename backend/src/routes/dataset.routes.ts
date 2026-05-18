import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import * as datasetService from '../services/dataset.service';

const router = Router();

const upload = multer({
  dest: path.join(process.cwd(), 'uploads'),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

router.post(
  '/upload',
  authenticate,
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No CSV file uploaded' });
        return;
      }

      const name = req.body.name || req.file.originalname.replace('.csv', '');
      const sourceName = req.body.sourceName || 'manual_upload';

      const result = await datasetService.createDataset(
        name,
        sourceName,
        req.user!.userId,
        req.file.path
      );

      res.status(201).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      res.status(500).json({ error: message });
    }
  }
);

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await datasetService.listDatasets({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
      search: String(req.query.search || ''),
      status: String(req.query.status || ''),
      sortBy: String(req.query.sortBy || 'createdAt'),
      sortOrder: String(req.query.sortOrder || 'desc') as 'asc' | 'desc',
    });
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list datasets';
    res.status(500).json({ error: message });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const dataset = await datasetService.getDatasetById(String(req.params.id));
    res.json(dataset);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Dataset not found';
    res.status(404).json({ error: message });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await datasetService.deleteDataset(String(req.params.id));
    res.json({ message: 'Dataset deleted' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Delete failed';
    res.status(500).json({ error: message });
  }
});

router.get('/:id/export', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const csv = await datasetService.exportAnomaliesCSV(String(req.params.id));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=anomalies-${req.params.id}.csv`);
    res.send(csv);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Export failed';
    res.status(500).json({ error: message });
  }
});

export default router;
