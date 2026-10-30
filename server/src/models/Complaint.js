import mongoose from 'mongoose';
import {
  CATEGORIES,
  PRIORITIES,
  STATUSES,
  AI_STATUSES,
} from '../utils/constants.js';

const { ObjectId } = mongoose.Schema.Types;

// What the AI said. Kept separate from the final fields on purpose.
const aiSchema = new mongoose.Schema(
  {
    category: { type: String, enum: CATEGORIES },
    priority: { type: String, enum: PRIORITIES },
    summary: { type: String, trim: true, maxlength: 300 },
    status: { type: String, enum: AI_STATUSES, default: 'pending' },
    errorMessage: { type: String, maxlength: 300 },
    generatedAt: { type: Date },
  },
  { _id: false }
);

// One entry per status change
const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: STATUSES, required: true },
    changedBy: { type: ObjectId, ref: 'User', required: true },
    note: { type: String, trim: true, maxlength: 300 },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    hostelBlock: { type: String, required: true, trim: true, maxlength: 40 },
    roomNumber: { type: String, required: true, trim: true, maxlength: 20 },

    // FINAL values the admin works with (safe defaults if AI fails)
    category: { type: String, enum: CATEGORIES, default: 'Other' },
    priority: { type: String, enum: PRIORITIES, default: 'Medium' },
    status: { type: String, enum: STATUSES, default: 'Open' },

    createdBy: { type: ObjectId, ref: 'User', required: true },
    assignedTo: { type: ObjectId, ref: 'User' },

    ai: { type: aiSchema, default: () => ({}) },
    reviewedByAdmin: { type: Boolean, default: false },

    statusHistory: { type: [statusHistorySchema], default: [] },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes: each one matches a real query we will run later
complaintSchema.index({ createdBy: 1, createdAt: -1 }); // "my complaints", newest first
complaintSchema.index({ status: 1, createdAt: -1 }); // admin filter by status
complaintSchema.index({ category: 1 }); // admin filter and category chart
complaintSchema.index({ priority: 1 }); // admin filter and priority sort
complaintSchema.index({ createdAt: -1 }); // default admin list order
complaintSchema.index({ title: 'text', description: 'text' }); // search box

export const Complaint = mongoose.model('Complaint', complaintSchema);