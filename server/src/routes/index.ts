import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { requireAuth } from '../middleware/auth';
import * as auth from '../controllers/authController';
import * as core from '../controllers/coreController';
import * as tender from '../controllers/tenderController';

const upload = multer({
  dest: path.join(process.cwd(), 'uploads'),
  limits: { fileSize: 25 * 1024 * 1024 },
});

export const router = Router();

router.post('/auth/login', auth.login);
router.get('/auth/me', requireAuth, auth.me);

router.use(requireAuth);

router.get('/overview', core.overview);
router.get('/notifications', core.notifications);
router.get('/departments', core.departments);
router.get('/search', core.search);
router.get('/memory', core.memory);

router.get('/projects', core.projects);
router.get('/projects/:id', core.projectDetail);

router.get('/approvals', core.approvals);
router.get('/approvals/:projectId/:key', core.approvalDetail);
router.get('/approvals/:projectId/:key/impact', core.impact);
router.get('/approvals/:projectId/:key/dossier', core.dossier);

router.get('/windows', core.windows);
router.get('/windows/:id/blockers', core.windowBlockers);

router.post('/simulate', core.simulate);

router.get('/escalations', core.escalations);
router.post('/escalations', core.raiseEscalation);
router.patch('/escalations/:id', core.updateEscalation);

router.get('/tenders', core.tenders);
router.get('/tenders/:id', core.tenderDetail);
router.post('/tenders/upload', upload.single('file'), tender.uploadTender);
router.post('/tenders/match', tender.matchTenders);
