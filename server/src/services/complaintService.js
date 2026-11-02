import { Complaint } from '../models/Complaint.js';
import { AppError } from '../utils/AppError.js';
import { ROLES } from '../utils/constants.js';

const LIST_POPULATE = [
  { path: 'createdBy', select: 'name email hostelBlock roomNumber' },
  { path: 'assignedTo', select: 'name' },
];

const DETAIL_POPULATE = [...LIST_POPULATE, { path: 'statusHistory.changedBy', select: 'name' }];

export const buildPagination = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

export const LIST_POPULATE_FIELDS = LIST_POPULATE;

// One place that loads a complaint in its "detail" shape
export const loadDetail = (id) =>
  Complaint.findById(id).populate(DETAIL_POPULATE).lean();

export async function createComplaint(user, data) {
  // Pick fields by name. Nothing else from the request can get in.
  const { title, description, hostelBlock, roomNumber } = data;

  const complaint = await Complaint.create({
    title,
    description,
    hostelBlock,
    roomNumber,
    createdBy: user._id, // from the login, never from the form
    statusHistory: [{ status: 'Open', changedBy: user._id, note: 'Complaint submitted' }],
  });

  return loadDetail(complaint._id);
}

export async function listMine(user, { page, limit, status }) {
  const filter = { createdBy: user._id }; // ownership is part of every query
  if (status) filter.status = status;

  const [items, total] = await Promise.all([
    Complaint.find(filter)
      .select('-statusHistory')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(LIST_POPULATE)
      .lean(),
    Complaint.countDocuments(filter),
  ]);

  return { items, pagination: buildPagination(page, limit, total) };
}

export async function getComplaintFor(user, id) {
  const complaint = await loadDetail(id);
  const isAdmin = user.role === ROLES.ADMIN;
  const isOwner = String(complaint?.createdBy?._id) === String(user._id);

  // 404 (not 403) so we do not reveal that someone else's complaint exists
  if (!complaint || (!isAdmin && !isOwner)) {
    throw new AppError(404, 'NOT_FOUND', 'Complaint not found');
  }
  return complaint;
}

// Called when an owner-only atomic update matched nothing.
// Decide between "not yours or missing" and "too late to change".
async function explainMiss(id, userId, action) {
  const owned = await Complaint.exists({ _id: id, createdBy: userId });
  if (!owned) throw new AppError(404, 'NOT_FOUND', 'Complaint not found');
  throw new AppError(
    409,
    'NOT_EDITABLE',
    `This complaint can no longer be ${action} because it is already being handled`
  );
}

const OWNER_EDITABLE = (id, userId) => ({
  _id: id,
  createdBy: userId,
  status: 'Open',
  reviewedByAdmin: false,
});

export async function updateOwn(user, id, data) {
  const update = { $set: { ...data } };

  // If the text changed, any earlier AI suggestion is out of date
  if (data.title !== undefined || data.description !== undefined) {
    update.$set.ai = { status: 'pending' };
  }

  const updated = await Complaint.findOneAndUpdate(OWNER_EDITABLE(id, user._id), update, {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!updated) return explainMiss(id, user._id, 'edited');

  return loadDetail(updated._id);
}

export async function deleteOwn(user, id) {
  const deleted = await Complaint.findOneAndDelete(OWNER_EDITABLE(id, user._id));
  if (!deleted) return explainMiss(id, user._id, 'withdrawn');
}