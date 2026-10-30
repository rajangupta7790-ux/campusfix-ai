import { AppError } from '../utils/AppError.js';

// Usage: validate({ body: schema, query: schema, params: schema })
// Validated data is stored in req.validated, so controllers never read raw input.
export const validate = (schemas) => (req, res, next) => {
  const validated = {};
  const problems = [];

  for (const part of ['body', 'query', 'params']) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part]);
    if (result.success) {
      validated[part] = result.data;
    } else {
      for (const issue of result.error.issues) {
        problems.push({
          field: [part, ...issue.path].join('.'),
          message: issue.message,
        });
      }
    }
  }

  if (problems.length > 0) {
    return next(new AppError(400, 'VALIDATION_ERROR', 'Invalid input', problems));
  }

  req.validated = validated;
  next();
};