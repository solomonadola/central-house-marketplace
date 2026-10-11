// `code` is an optional machine-readable reason the client can act on,
// e.g. AUTH_REQUIRED to sign the user out.
export const errorHandler = (statusCode, message, code) => {
  const error = new Error();
  error.statusCode = statusCode;
  error.message = message;
  if (code) error.code = code;
  return error;
};
