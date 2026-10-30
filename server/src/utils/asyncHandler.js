// Express 5 already forwards rejected promises to the error handler,
// but this wrapper keeps our controllers explicit and works the same everywhere.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);