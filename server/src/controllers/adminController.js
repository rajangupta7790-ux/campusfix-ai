import * as service from '../services/adminService.js';
import { serializeComplaint } from '../utils/serializers.js';

const asAdmin = (c) => serializeComplaint(c, { admin: true });

export async function listAll(req, res) {
  const { items, pagination } = await service.listAll(req.validated.query);
  res.json({ success: true, data: { complaints: items.map(asAdmin), pagination } });
}

export async function changeStatus(req, res) {
  const c = await service.changeStatus(req.user, req.validated.params.id, req.validated.body);
  res.json({ success: true, data: { complaint: asAdmin(c) } });
}

export async function assign(req, res) {
  const c = await service.assign(req.user, req.validated.params.id, req.validated.body.assigneeId);
  res.json({ success: true, data: { complaint: asAdmin(c) } });
}

export async function classify(req, res) {
  const c = await service.classify(req.validated.params.id, req.validated.body);
  res.json({ success: true, data: { complaint: asAdmin(c) } });
}

export async function assignees(req, res) {
  const users = await service.listAssignees();
  res.json({
    success: true,
    data: { assignees: users.map((u) => ({ id: String(u._id), name: u.name, email: u.email })) },
  });
}

export async function stats(req, res) {
  res.json({ success: true, data: { stats: await service.getStats() } });
}