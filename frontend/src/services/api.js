const API_BASE = 'https://erp-inventory-sable.vercel.app/api/v1';

class ApiService {
  constructor() {
    this.baseURL = API_BASE;
  }

  getToken() {
    return localStorage.getItem('erp_token');
  }

  headers(isJson = true) {
    const h = {};
    if (isJson) h['Content-Type'] = 'application/json';
    const token = this.getToken();
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }

  async request(method, path, body = null) {
    const url = `${this.baseURL}${path}`;
    const options = { method, headers: this.headers() };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url, options);
    const data = await res.json();

    if (!res.ok) {
      const err = new Error(data.message || 'API request failed');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  get(path) { return this.request('GET', path); }
  post(path, body) { return this.request('POST', path, body); }
  put(path, body) { return this.request('PUT', path, body); }
  del(path) { return this.request('DELETE', path); }
}

const api = new ApiService();

// ── Auth ──
export const authAPI = {
  login: (creds) => api.post('/auth/login', creds),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// ── Users ──
export const usersAPI = {
  list: (params = '') => api.get(`/users?${params}`),
  get: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  remove: (id) => api.del(`/users/${id}`),
};

// ── Inventory ──
export const inventoryAPI = {
  list: (params = '') => api.get(`/inventory?${params}`),
  get: (id) => api.get(`/inventory/${id}`),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.put(`/inventory/${id}`, data),
  inward: (data) => api.post('/inventory/inward', data),
  issue: (data) => api.post('/inventory/issue', data),
  lowStock: () => api.get('/inventory/low-stock'),
  parseQR: (data) => api.post('/inventory/parse-qr', data),
  getQR: (itemCode, qty = 1) => api.get(`/inventory/qr/${itemCode}?qty=${qty}`),
};

// ── Transactions ──
export const transactionsAPI = {
  list: (params = '') => api.get(`/transactions?${params}`),
  byItem: (code, params = '') => api.get(`/transactions/item/${code}?${params}`),
  byUser: (id, params = '') => api.get(`/transactions/user/${id}?${params}`),
};

// ── Purchase ──
export const purchaseAPI = {
  list: (params = '') => api.get(`/purchase?${params}`),
  get: (id) => api.get(`/purchase/${id}`),
  create: (data) => api.post('/purchase', data),
  update: (id, data) => api.put(`/purchase/${id}`, data),
  receive: (id, data) => api.put(`/purchase/${id}/receive`, data),
};

// ── Quality ──
export const qualityAPI = {
  list: (params = '') => api.get(`/quality?${params}`),
  get: (id) => api.get(`/quality/${id}`),
  approve: (id, data) => api.put(`/quality/${id}/approve`, data),
  reject: (id, data) => api.put(`/quality/${id}/reject`, data),
};

// ── R&D ──
export const rndAPI = {
  createRequest: (data) => api.post('/rnd/request', data),
  listRequests: (params = '') => api.get(`/rnd/requests?${params}`),
  getRequest: (id) => api.get(`/rnd/request/${id}`),
  approve: (id, data) => api.put(`/rnd/request/${id}/approve`, data),
  reject: (id, data) => api.put(`/rnd/request/${id}/reject`, data),
  issue: (id) => api.put(`/rnd/request/${id}/issue`),
  usageLogs: (params = '') => api.get(`/rnd/usage-logs?${params}`),
};

// ── Audit ──
export const auditAPI = {
  logs: (params = '') => api.get(`/audit/logs?${params}`),
  userLogs: (id, params = '') => api.get(`/audit/logs/user/${id}?${params}`),
};

// ── Dashboard ──
export const dashboardAPI = {
  stats: () => api.get('/dashboard/stats'),
  topItems: (params = '') => api.get(`/dashboard/top-items?${params}`),
  departmentUsage: (params = '') => api.get(`/dashboard/department-usage?${params}`),
  staffActivity: (params = '') => api.get(`/dashboard/staff-activity?${params}`),
  prediction: (itemCode) => api.get(`/dashboard/stock-prediction/${itemCode}`),
};

// ── Scan ──
export const scanAPI = {
  scan: (qrData) => api.post('/scan', { qrData }),
};

export default api;
