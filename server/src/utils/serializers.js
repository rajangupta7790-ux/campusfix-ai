const idOf = (v) => (v ? String(v._id ?? v) : null);

// Works only for populated users (they have a name). Anything else becomes null.
const person = (u) => (u && u.name ? { id: idOf(u), name: u.name } : null);

export function serializeComplaint(c, { admin = false } = {}) {
  const out = {
    id: idOf(c),
    title: c.title,
    description: c.description,
    hostelBlock: c.hostelBlock,
    roomNumber: c.roomNumber,
    category: c.category,
    priority: c.priority,
    status: c.status,
    assignedTo: person(c.assignedTo),
    resolvedAt: c.resolvedAt ?? null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };

  if (c.statusHistory) {
    out.statusHistory = c.statusHistory.map((h) => ({
      status: h.status,
      note: h.note ?? null,
      changedAt: h.changedAt,
      changedBy: person(h.changedBy),
    }));
  }

  // AI details and review flags are for admins only
  if (admin) {
    out.createdBy =
      c.createdBy && c.createdBy.name
        ? {
            id: idOf(c.createdBy),
            name: c.createdBy.name,
            email: c.createdBy.email,
            hostelBlock: c.createdBy.hostelBlock ?? null,
            roomNumber: c.createdBy.roomNumber ?? null,
          }
        : null;
    out.ai = c.ai
      ? {
          category: c.ai.category ?? null,
          priority: c.ai.priority ?? null,
          summary: c.ai.summary ?? null,
          status: c.ai.status,
          errorMessage: c.ai.errorMessage ?? null,
          generatedAt: c.ai.generatedAt ?? null,
        }
      : null;
    out.reviewedByAdmin = c.reviewedByAdmin;
  }

  return out;
}