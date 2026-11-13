import axios from 'axios';

// The context registers a function here that runs when the session has expired
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

const api = axios.create({
  baseURL: '/api', // Vite forwards /api to the backend (see vite.config.js)
  withCredentials: true, // send the login cookie
  timeout: 15000,
  // The backend requires this header on every changing request (CSRF protection)
  headers: { 'X-Requested-With': 'CampusFixAI' },
});

// Failing to log in, or checking "who am I?" while logged out, is normal.
// Any other 401 means the session ended.
const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/me'];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url ?? '';
    if (status === 401 && !AUTH_PATHS.includes(url) && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default api;