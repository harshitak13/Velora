/* ============================================================
   API.JS — Centralized fetch wrapper
   ============================================================ */
const API_BASE = window.API_BASE_URL || window.location.origin;

const API = {
  async request(method, path, body = null, opts = {}) {
    const token = Auth ? Auth.getToken() : null;
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = { method, headers, credentials: 'include' };
    if (body && method !== 'GET') config.body = JSON.stringify(body);

    let url = path.startsWith('http') ? path : `${API_BASE}${path}`;
    if (method === 'GET' && body) {
      const params = new URLSearchParams(body);
      url += (url.includes('?') ? '&' : '?') + params.toString();
    }

    try {
      const res = await fetch(url, config);

      // Token expired — try refresh
      if (res.status === 401 && Auth) {
        const refreshed = await Auth.refresh();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${Auth.getToken()}`;
          const retry = await fetch(url, { ...config, headers });
          return await retry.json();
        } else {
          Auth.logout();
          window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
      }

      const data = await res.json();
      return data;
    } catch (err) {
      console.error(`API ${method} ${path}:`, err);
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  },

  get(path, params = null)       { return this.request('GET', path, params); },
  post(path, body)               { return this.request('POST', path, body); },
  put(path, body)                { return this.request('PUT', path, body); },
  patch(path, body)              { return this.request('PATCH', path, body); },
  delete(path)                   { return this.request('DELETE', path); },

  async upload(path, formData) {
    const token = Auth ? Auth.getToken() : null;
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST', headers, body: formData, credentials: 'include'
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: 'Upload failed.' };
    }
  }
};

// Make globally available
window.API = API;
