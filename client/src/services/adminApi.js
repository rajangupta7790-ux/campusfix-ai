import api from './api';

export const getStats = async () => (await api.get('/admin/stats')).data.data.stats;

// Returns { complaints, pagination }
export const listComplaints = async (params) =>
  (await api.get('/admin/complaints', { params })).data.data;

export const getAssignees = async () => (await api.get('/admin/assignees')).data.data.assignees;

export const changeStatus = async (id, body) =>
  (await api.patch(`/admin/complaints/${id}/status`, body)).data.data.complaint;

export const assignComplaint = async (id, assigneeId) =>
  (await api.patch(`/admin/complaints/${id}/assign`, { assigneeId })).data.data.complaint;

export const classifyComplaint = async (id, body) =>
  (await api.patch(`/admin/complaints/${id}/classification`, body)).data.data.complaint;

export const retryAi = async (id) =>
  (await api.post(`/admin/complaints/${id}/ai-retry`)).data.data.complaint;