import { z } from 'zod';
import { STATUSES, CATEGORIES, PRIORITIES } from '../utils/constants.js';
import { optionalParam, pageParams } from './complaint.js';
import { objectIdSchema } from './common.js';

export const adminListQuerySchema = z.object({
  ...pageParams,
  status: optionalParam(z.enum(STATUSES)),
  category: optionalParam(z.enum(CATEGORIES)),
  priority: optionalParam(z.enum(PRIORITIES)),
  search: optionalParam(z.string().trim().max(100)),
});

export const statusChangeSchema = z.object({
  status: z.enum(STATUSES),
  note: optionalParam(z.string().trim().max(300)),
});

export const assignSchema = z.object({
  assigneeId: objectIdSchema,
});

export const classificationSchema = z
  .object({
    category: z.enum(CATEGORIES).optional(),
    priority: z.enum(PRIORITIES).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide a category or a priority',
  });