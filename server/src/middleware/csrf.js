import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const allowedOrigin = new URL(env.CLIENT_URL).origin;

export function csrfGuard(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get('origin');
  if (origin && origin !== allowedOrigin) {
    return next(new AppError(403, 'CSRF_ORIGIN', 'Request origin is not allowed'));
  }

  if (req.get('x-requested-with') !== 'CampusFixAI') {
    return next(new AppError(403, 'CSRF_HEADER', 'Missing required request header'));
  }

  next();
}