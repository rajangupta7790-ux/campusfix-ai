import { z } from 'zod';
import { STATUSES } from '../utils/constants.js';

const text = (min, max, label) =>
  z.string().trim().min(min, `${label} is too short`).max(max, `${label} is too long`);

export const createComplaintSchema = z.object({
  title: text(5, 120, 'Title'),
  description: text(10, 2000, 'Description'),
  hostelBlock: text(1, 40, 'Hostel block'),
  roomNumber: text(1, 20, 'Room number'),
});

// Same fields, all optional, but at least one must be present
export const updateComplaintSchema = createComplaintSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

// An empty value from a form (for example "?status=") counts as "not provided"
export const optionalParam = (schema) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

// Pagination with a hard maximum, so nobody can ask for 1,000,000 rows
export const pageParams = {
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
};

export const myListQuerySchema = z.object({
  ...pageParams,
  status: optionalParam(z.enum(STATUSES)),
});