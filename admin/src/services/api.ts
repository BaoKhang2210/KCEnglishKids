const BASE_URL = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('kc_admin_token') || localStorage.getItem('kc_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const api = {
  async get(endpoint: string) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  },

  async post(endpoint: string, body: any) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  },

  async patch(endpoint: string, body?: any) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  },

  async delete(endpoint: string) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  }
};

export const authApi = {
  adminLogin: (payload: { email: string; password: string }) =>
    api.post('/auth/admin-login', payload),
  getMe: () => api.get('/auth/me')
};

export const adminApi = {
  getDashboardStats: () => api.get('/admin/dashboard'),
  getCurriculum: () => api.get('/admin/curriculum'),
  getUsers: (role?: string, search?: string) => {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (search) params.append('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get(`/admin/users${query}`);
  },
  createTeacher: (data: { name: string; username: string; email: string; password: string; contact?: string; avatar?: string }) =>
    api.post('/admin/teachers', data),
  createChild: (data: {
    name: string;
    pin: string;
    dob?: string;
    avatar?: string;
    assignedClass?: string;
    email?: string;
    contact?: string;
    password?: string;
  }) =>
    api.post('/admin/children', data),
  toggleUserStatus: (id: string) =>
    api.patch(`/admin/users/${id}/status`),
  getAuditLogs: () =>
    api.get('/admin/audit-logs'),
  toggleTopicStatus: (id: string) =>
    api.patch(`/admin/topics/${id}/status`)
};
