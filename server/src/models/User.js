import mongoose from 'mongoose';
import { ROLES } from '../utils/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 120,
    },
    // select:false means queries do NOT return the hash unless we ask for it
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.STUDENT,
    },
    hostelBlock: { type: String, trim: true, maxlength: 40 },
    roomNumber: { type: String, trim: true, maxlength: 20 },
  },
  { timestamps: true }
);

// Never leak the hash if a user document is converted to JSON by mistake
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);