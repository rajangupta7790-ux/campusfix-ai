import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { ROLES } from '../utils/constants.js';
import { signToken, setAuthCookie, clearAuthCookie } from '../utils/token.js';

const BCRYPT_COST = 12;

// Used when the email does not exist, so login takes about the same time
// whether or not the account exists.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-1', BCRYPT_COST);

// An allowlist: only these fields ever leave the server
const toPublicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  hostelBlock: u.hostelBlock,
  roomNumber: u.roomNumber,
  createdAt: u.createdAt,
});

export async function register(req, res) {
  const { name, email, password, hostelBlock, roomNumber } = req.validated.body;
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  let user;
  try {
    // The role is fixed here. Nothing from the request can change it.
    user = await User.create({
      name,
      email,
      passwordHash,
      role: ROLES.STUDENT,
      hostelBlock,
      roomNumber,
    });
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
    }
    throw err;
  }

  setAuthCookie(res, signToken(user));
  res.status(201).json({ success: true, data: { user: toPublicUser(user) } });
}

export async function login(req, res) {
  const { email, password } = req.validated.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  const passwordOk = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

  // Same message for "no such email" and "wrong password"
  if (!user || !passwordOk) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  setAuthCookie(res, signToken(user));
  res.json({ success: true, data: { user: toPublicUser(user) } });
}

export async function logout(req, res) {
  // Invalidate every token issued to this user, then remove the cookie
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  clearAuthCookie(res);
  res.json({ success: true, data: { message: 'Logged out' } });
}

export async function me(req, res) {
  res.json({ success: true, data: { user: toPublicUser(req.user) } });
}