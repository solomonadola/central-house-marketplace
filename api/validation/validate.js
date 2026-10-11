import { errorHandler } from '../utils/error.js';

// Validates req.body against a Zod schema and replaces it with the parsed
// result, so unknown fields are stripped and values are coerced.
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.join('.');
    const message =
      // Zod's default 'Required' doesn't say which field; keep custom messages.
      issue.code === 'invalid_type' && issue.received === 'undefined' && issue.message === 'Required'
        ? `${field} is required`
        : issue.message;
    return next(errorHandler(400, message));
  }
  req.body = result.data;
  next();
};
