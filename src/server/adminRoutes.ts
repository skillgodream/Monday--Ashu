import { Express, Request, Response } from 'express';
import { authenticateRequest, requireRole } from './authMiddleware.js';
import { assignmentRepo } from '../db/repositories/assignmentRepo.js';

export function registerAdminRoutes(app: Express) {
  // Admin Operational Reporting
  app.get('/api/admin/reports', authenticateRequest, requireRole('admin'), async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organization_id;
      const assignments = await assignmentRepo.listByOrganization(orgId);
      
      const enriched = await Promise.all(assignments.map(async (a) => {
          const attempts = await assignmentRepo.listAttempts(orgId, a.id);
          return { ...a, attempts };
      }));

      return res.json({ success: true, reports: enriched });
    } catch (err: any) {
      return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message || 'Failed to fetch admin reports' });
    }
  });
}
