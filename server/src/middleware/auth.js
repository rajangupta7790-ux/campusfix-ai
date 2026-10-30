import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AUTH_COOKIE } from '../utils/token.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Please log in to continue');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError(401, 'TOKEN_EXPIRED', 'Your session expired. Please log in again');
    }
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid session. Please log in again');
  }

  if (!mongoose.isValidObjectId(payload.sub)) {
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid session. Please log in again');
  }

  // The database decides who this user is and what role they have
  const user = await User.findById(payload.sub);
  if (!user || user.tokenVersion !== payload.tv) {
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid session. Please log in again');
  }

  req.user = user;
  next();
});

// Usage: authorize('admin') after authenticate
export const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'Please log in to continue'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to do this'));
    }
    next();
  };