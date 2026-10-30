import mongoose from 'mongoose';
import { env } from '../config/env.js';

export function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
}

// Express recognizes an error handler by its 4 parameters
export function errorHandler(err, req, res, next) {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong';
  let details;

  if (err.isOperational) {
    // An error we threw on purpose with AppError
    ({ statusCode, code, message, details } = err);
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Invalid data';
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    code = 'INVALID_ID';
    message = 'Invalid id';
  } else if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE';
    message = 'A record with this value already exists';
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Request body is not valid JSON';
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request body is too large';
  }

  // Log unexpected errors only. Expected ones are normal.
  if (statusCode >= 500) console.error(err);

  const body = { success: false, error: { code, message } };
  if (details) body.error.details = details;
  // Stack traces are shown only in development
  if (env.NODE_ENV === 'development' && statusCode >= 500) {
    body.error.stack = err.stack;
  }

  res.status(statusCode).json(body);
}