// Backend validation errors look like { field: 'body.email', message: '...' }
export function parseApiError(err) {
  const apiError = err.response?.data?.error;

  if (apiError) {
    const fields = {};
    if (Array.isArray(apiError.details)) {
      for (const d of apiError.details) {
        const key = String(d.field).split('.').slice(1).join('.');
        if (key && !fields[key]) fields[key] = d.message;
      }
    }
    return { message: apiError.message, fields };
  }

  if (err.code === 'ECONNABORTED') {
    return { message: 'The server took too long to answer. Please try again.', fields: {} };
  }
  if (err.request) {
    return { message: 'Cannot reach the server. Check your connection and try again.', fields: {} };
  }
  return { message: 'Something went wrong. Please try again.', fields: {} };
}