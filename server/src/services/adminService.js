import { Complaint } from '../models/Complaint.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { ROLES, STATUSES, CATEGORIES, PRIORITIES } from '../utils/constants.js';
import { loadDetail, buildPagination, LIST_POPULATE_FIELDS } from './complaintService.js';

// One step forward or one step back
const NEXT_STATUSES = {
  Open: ['Assigned'],
  Assigned: ['In Progress', 'Open'],
  'In Progress': ['Resolved', 'Assigned'],
  Resolved: ['In Progress'],
};

const notFound = () => new AppError(404, 'NOT_FOUND', 'Complaint not found');
const changedByOther = () =>
  new AppError(
    409,
    'CONFLICT',
    'This complaint was just changed by someone else. Please refresh and try again.'
  );

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function listAll({ page, limit, status, category, priority, search }) {
  // We build the filter ourselves from validated values only
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: pattern }, { description: pattern }];
  }

  const [items, total] = await Promise.all([
    Complaint.find(filter)
      .select('-statusHistory')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(LIST_POPULATE_FIELDS)
      .lean(),
    Complaint.countDocuments(filter),
  ]);

  return { items, pagination: buildPagination(page, limit, total) };
}

export async function changeStatus(admin, id, { status, note }) {
  const complaint = await Complaint.findById(id).select('status assignedTo');
  if (!complaint) throw notFound();

  const current = complaint.status;
  if (!NEXT_STATUSES[current].includes(status)) {
    throw new AppError(
      409,
      'INVALID_TRANSITION',
      `Cannot change status from "${current}" to "${status}". Allowed: ${NEXT_STATUSES[current].join(', ')}`
    );
  }
  if (status !== 'Open' && !complaint.assignedTo) {
    throw new AppError(409, 'NEEDS_ASSIGNEE', 'Assign this complaint before changing its status');
  }

  const entry = { status, changedBy: admin._id, changedAt: new Date() };
  if (note) entry.note = note;

  const update = { $set: { status }, $push: { statusHistory: entry } };
  if (status === 'Resolved') update.$set.resolvedAt = new Date();
  else update.$unset = { resolvedAt: '' };

  // The filter includes the status we read, so a parallel change makes this match nothing
  const updated = await Complaint.findOneAndUpdate({ _id: id, status: current }, update, {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!updated) throw changedByOther();

  return loadDetail(id);
}

export async function assign(admin, id, assigneeId) {
  const assignee = await User.findOne({ _id: assigneeId, role: ROLES.ADMIN }).select('name');
  if (!assignee) {
    throw new AppError(400, 'INVALID_ASSIGNEE', 'Complaints can only be assigned to an admin user');
  }

  const complaint = await Complaint.findById(id).select('status');
  if (!complaint) throw notFound();
  if (complaint.status === 'Resolved') {
    throw new AppError(409, 'ALREADY_RESOLVED', 'A resolved complaint cannot be reassigned');
  }

  // Assigning an Open complaint moves it to Assigned
  const newStatus = complaint.status === 'Open' ? 'Assigned' : complaint.status;

  const updated = await Complaint.findOneAndUpdate(
    { _id: id, status: complaint.status },
    {
      $set: { assignedTo: assignee._id, status: newStatus },
      $push: {
        statusHistory: {
          status: newStatus,
          changedBy: admin._id,
          note: `Assigned to ${assignee.name}`,
          changedAt: new Date(),
        },
      },
    },
    { returnDocument: 'after', runValidators: true }
  );
  if (!updated) throw changedByOther();

  return loadDetail(id);
}

export async function classify(id, { category, priority }) {
  // An admin decision. It also locks the complaint against student edits.
  const set = { reviewedByAdmin: true };
  if (category) set.category = category;
  if (priority) set.priority = priority;

  const updated = await Complaint.findByIdAndUpdate(
    id,
    { $set: set },
    { returnDocument: 'after', runValidators: true }
  );
  if (!updated) throw notFound();

  return loadDetail(id);
}

export async function listAssignees() {
  return User.find({ role: ROLES.ADMIN }).select('name email').sort({ name: 1 }).lean();
}

const dayKey = (daysAgo) =>
  new Date(Date.now() - daysAgo * 86400000).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
  });

const toCounts = (rows, keys) =>
  Object.fromEntries(keys.map((k) => [k, rows.find((r) => r._id === k)?.count ?? 0]));

const countBy = (field) => [{ $group: { _id: `$${field}`, count: { $sum: 1 } } }];

export async function getStats() {
  const since = new Date(Date.now() - 15 * 86400000);

  const [facets] = await Complaint.aggregate([
    {
      $facet: {
        total: [{ $count: 'count' }],
        byStatus: countBy('status'),
        byCategory: countBy('category'),
        byPriority: countBy('priority'),
        unassigned: [
          { $match: { assignedTo: null, status: { $ne: 'Resolved' } } },
          { $count: 'count' },
        ],
        unreviewed: [
          { $match: { reviewedByAdmin: false, status: { $ne: 'Resolved' } } },
          { $count: 'count' },
        ],
        daily: [
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' },
              },
              count: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);

  const perDay = new Map(facets.daily.map((d) => [d._id, d.count]));
  const daily = Array.from({ length: 14 }, (_, i) => {
    const date = dayKey(13 - i);
    return { date, count: perDay.get(date) ?? 0 };
  });

  return {
    total: facets.total[0]?.count ?? 0,
    unassigned: facets.unassigned[0]?.count ?? 0,
    unreviewed: facets.unreviewed[0]?.count ?? 0,
    byStatus: toCounts(facets.byStatus, STATUSES),
    byCategory: toCounts(facets.byCategory, CATEGORIES),
    byPriority: toCounts(facets.byPriority, PRIORITIES),
    daily,
  };
}