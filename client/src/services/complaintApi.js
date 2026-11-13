import api from './api';

// All complaint calls live here. Pages never call Axios directly.
export const createComplaint = async (payload) =>
  (await api.post('/complaints', payload)).data.data.complaint;

// Returns { complaints, pagination }
export const listMyComplaints = async (params) =>
  (await api.get('/complaints/mine', { params })).data.data;

export const getComplaint = async (id) =>
  (await api.get(`/complaints/${id}`)).data.data.complaint;

export const withdrawComplaint = async (id) => {
  await api.delete(`/complaints/${id}`);
};