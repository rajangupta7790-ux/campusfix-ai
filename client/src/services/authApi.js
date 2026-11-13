import api from './api';

// Our backend answers { success, data: { user } }. These helpers return just the user.
export const register = async (payload) => (await api.post('/auth/register', payload)).data.data.user;
export const login = async (payload) => (await api.post('/auth/login', payload)).data.data.user;
export const logout = async () => {
  await api.post('/auth/logout');
};
export const getMe = async () => (await api.get('/auth/me')).data.data.user;