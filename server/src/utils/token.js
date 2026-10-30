import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const AUTH_COOKIE = 'campusfix_token';

const cookieBase = {
  httpOnly: true, // JavaScript cannot read it
  secure: env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'lax',
  path: '/',
};

export function signToken(user) {
  return jwt.sign({ sub: user.id, tv: user.tokenVersion }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

export function setAuthCookie(res, token) {
  // The cookie expires at the same moment as the JWT
  const { exp } = jwt.decode(token);
  res.cookie(AUTH_COOKIE, token, { ...cookieBase, expires: new Date(exp * 1000) });
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, cookieBase);
}