import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { idParamsSchema } from '../validators/common.js';
import { aiRetryLimiter } from '../middleware/rateLimiters.js';
import {
  adminListQuerySchema,
  statusChangeSchema,
  assignSchema,
  classificationSchema,
} from '../validators/admin.js';
import {
  listAll,
  changeStatus,
  assign,
  classify,
  assignees,
  stats,
  aiRetry,
} from '../controllers/adminController.js';
import { ROLES } from '../utils/constants.js';


const router = Router();

// Everything below this line requires a logged-in admin
router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/ping', (req, res) => {
  res.json({ success: true, data: { message: 'Admin access confirmed' } });
});

router.get('/complaints', validate({ query: adminListQuerySchema }), asyncHandler(listAll));

router.patch(
  '/complaints/:id/status',
  validate({ params: idParamsSchema, body: statusChangeSchema }),
  asyncHandler(changeStatus)
);

router.patch(
  '/complaints/:id/assign',
  validate({ params: idParamsSchema, body: assignSchema }),
  asyncHandler(assign)
);

router.patch(
  '/complaints/:id/classification',
  validate({ params: idParamsSchema, body: classificationSchema }),
  asyncHandler(classify)
);

router.get('/assignees', asyncHandler(assignees));
router.get('/stats', asyncHandler(stats));
router.post(
  '/complaints/:id/ai-retry',
  aiRetryLimiter,
  validate({ params: idParamsSchema }),
  asyncHandler(aiRetry)
);

export default router;