import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const make = (options) =>
  rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.NODE_ENV === 'test', // do not block automated tests
    handler: (req, res, next) =>
      next(new AppError(429, 'RATE_LIMITED', 'Too many requests. Please try again later.')),
    ...options,
  });

export const generalLimiter = make({ windowMs: 15 * 60 * 1000, limit: 300 });
export const authLimiter = make({ windowMs: 15 * 60 * 1000, limit: 20 });