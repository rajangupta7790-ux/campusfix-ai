import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createComplaintLimiter } from '../middleware/rateLimiters.js';
import { idParamsSchema } from '../validators/common.js';
import {
  createComplaintSchema,
  updateComplaintSchema,
  myListQuerySchema,
} from '../validators/complaint.js';
import {
  createComplaint,
  listMine,
  getOne,
  updateOne,
  deleteOne,
} from '../controllers/complaintController.js';
import { ROLES } from '../utils/constants.js';

const router = Router();
const student = authorize(ROLES.STUDENT);

router.use(authenticate); // everything here needs a login

router.post(
  '/',
  student,
  createComplaintLimiter,
  validate({ body: createComplaintSchema }),
  asyncHandler(createComplaint)
);

// "/mine" must come BEFORE "/:id", or Express would treat "mine" as an id
router.get('/mine', student, validate({ query: myListQuerySchema }), asyncHandler(listMine));

router.get('/:id', validate({ params: idParamsSchema }), asyncHandler(getOne));

router.patch(
  '/:id',
  student,
  validate({ params: idParamsSchema, body: updateComplaintSchema }),
  asyncHandler(updateOne)
);

router.delete('/:id', student, validate({ params: idParamsSchema }), asyncHandler(deleteOne));

export default router;  