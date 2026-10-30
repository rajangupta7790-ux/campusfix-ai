import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

// Everything below this line requires a logged-in admin
router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/ping', (req, res) => {
  res.json({ success: true, data: { message: 'Admin access confirmed' } });
});

export default router;