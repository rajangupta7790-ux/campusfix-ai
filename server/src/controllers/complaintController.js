import * as service from '../services/complaintService.js';
import { serializeComplaint } from '../utils/serializers.js';
import { ROLES } from '../utils/constants.js';

export async function createComplaint(req, res) {
  const complaint = await service.createComplaint(req.user, req.validated.body);
  res.status(201).json({ success: true, data: { complaint: serializeComplaint(complaint) } });
}

export async function listMine(req, res) {
  const { items, pagination } = await service.listMine(req.user, req.validated.query);
  res.json({
    success: true,
    data: { complaints: items.map((c) => serializeComplaint(c)), pagination },
  });
}

export async function getOne(req, res) {
  const complaint = await service.getComplaintFor(req.user, req.validated.params.id);
  const admin = req.user.role === ROLES.ADMIN;
  res.json({ success: true, data: { complaint: serializeComplaint(complaint, { admin }) } });
}

export async function updateOne(req, res) {
  const complaint = await service.updateOwn(req.user, req.validated.params.id, req.validated.body);
  res.json({ success: true, data: { complaint: serializeComplaint(complaint) } });
}

export async function deleteOne(req, res) {
  await service.deleteOwn(req.user, req.validated.params.id);
  res.json({ success: true, data: { message: 'Complaint deleted' } });
}