/* ============================================================
   AUTH.JS — JWT storage, login, register, refresh, logout
   ============================================================ */
const Auth = (() => {
  const TOKEN_KEY    = 'vm_access_token';
  const USER_KEY     = 'vm_user';

  function getToken()  { return localStorage.getItem(TOKEN_KEY); }
  function getUser()   { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } }
  function isLoggedIn(){ return !!getToken() && !!getUser(); }
  function isSeller()  { return getUser()?.role === 'SELLER'; }
  function isAdmin()   { return getUser()?.role === 'ADMIN'; }
  function appPath(path) {
    if (/^https?:/i.test(path)) return path;
    const clean = path.replace(/^\/+/, '');
    const current = window.location.pathname.replace(/\\/g, '/');
    if (window.location.protocol === 'file:') {
      if (current.includes('/frontend/public/seller/') || current.includes('/frontend/public/admin/')) return '../' + clean;
      return clean;
    }
    return '/' + clean;
  }

  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    updateNavUI(user);
    applyRoleUI();
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  async function login(email, password) {
    const data = await postJson('/api/auth/login', { email, password });
    if (data.success && data.data?.accessToken) {
      setSession(data.data.accessToken, data.data.user);
    }
    return data;
  }

  async function register(payload) {
    const data = await postJson('/api/auth/register', payload);
    if (data.success && data.data?.accessToken) {
      setSession(data.data.accessToken, data.data.user);
    }
    return data;
  }

  async function postJson(path, payload) {
    const base = window.API_BASE_URL || 'http://localhost:3000';
    let res;
    try {
      res = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
    } catch (err) {
      throw new Error(`Could not reach backend at ${base}. Make sure npm run dev is running in /backend.`);
    }

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Backend returned a non-JSON response (${res.status}). Check the backend terminal.`);
    }

    return data;
  }

  async function refresh() {
    try {
      const res = await fetch(`${window.API_BASE_URL || 'http://localhost:3000'}/api/auth/refresh`, {
        method: 'POST', credentials: 'include'
      });
      const data = await res.json();
      if (data.success && data.data?.accessToken) {
        localStorage.setItem(TOKEN_KEY, data.data.accessToken);
        return true;
      }
      return false;
    } catch { return false; }
  }

  async function logout() {
    try {
      await fetch(`${window.API_BASE_URL || 'http://localhost:3000'}/api/auth/logout`, {
        method: 'POST', credentials: 'include',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
    } catch {}
    clearSession();
    window.location.href = appPath('login.html');
  }

  async function me() {
    const res = await API.get('/api/auth/me');
    if (res?.success) {
      localStorage.setItem(USER_KEY, JSON.stringify(res.data));
      updateNavUI(res.data);
      return res.data;
    }
    return null;
  }

  function requireAuth(role = null) {
    if (!isLoggedIn()) {
      window.location.href = `${appPath('login.html')}?redirect=${encodeURIComponent(window.location.pathname)}`;
      return false;
    }
    if (role && getUser()?.role !== role) {
      window.location.href = appPath('index.html');
      return false;
    }
    return true;
  }

  function updateNavUI(user) {
    const area = document.getElementById('nav-user-area');
    if (!area || !user) return;
    area.innerHTML = `
      <div class="dropdown" id="user-dropdown">
        <button class="nav-icon-btn" id="user-menu-btn" style="gap:var(--space-2);padding:0 var(--space-2);width:auto">
          <div class="avatar avatar-sm" style="background:var(--color-primary);color:var(--color-accent)">
            ${user.avatarUrl ? `<img src="${user.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : user.name.charAt(0).toUpperCase()}
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="dropdown-menu" id="user-menu">
          <div style="padding:var(--space-3);border-bottom:1px solid var(--color-border);margin-bottom:var(--space-2)">
            <div style="font-weight:600;font-size:var(--text-sm)">${user.name}</div>
            <div style="font-size:var(--text-xs);color:var(--color-text-sec)">${user.email}</div>
          </div>
          ${user.role === 'SELLER' ? `<a href="${appPath('seller/dashboard.html')}" class="dropdown-item">Seller Dashboard</a>` : ''}
          ${user.role === 'ADMIN'  ? `<a href="${appPath('admin/dashboard.html')}"  class="dropdown-item">Admin Panel</a>` : ''}
          ${user.role === 'BUYER' ? `<a href="${appPath('orders.html')}" class="dropdown-item">My Orders</a>` : ''}
          <a href="${appPath('notifications.html')}" class="dropdown-item">Notifications</a>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item danger" onclick="Auth.logout()">Sign out</button>
        </div>
      </div>
    `;
    document.getElementById('user-menu-btn')?.addEventListener('click', () => {
      document.getElementById('user-dropdown').classList.toggle('open');
    });
    document.addEventListener('click', e => {
      const dd = document.getElementById('user-dropdown');
      if (dd && !dd.contains(e.target)) dd.classList.remove('open');
    });
  }

  // Init — hydrate nav on page load
  function init() {
    const user = getUser();
    if (user) updateNavUI(user);
    applyRoleUI();
  }

  function applyRoleUI() {
    const user = getUser();
    document.body.dataset.role = user?.role || 'GUEST';
    document.querySelectorAll('[data-buyer-only]').forEach(el => {
      el.classList.toggle('hidden', user?.role === 'SELLER' || user?.role === 'ADMIN');
    });
    document.querySelectorAll('[data-seller-only]').forEach(el => {
      el.classList.toggle('hidden', user?.role !== 'SELLER');
    });
    document.querySelectorAll('[data-admin-only]').forEach(el => {
      el.classList.toggle('hidden', user?.role !== 'ADMIN');
    });
    document.querySelectorAll('[data-sell-cta]').forEach(el => {
      el.classList.toggle('hidden', user?.role === 'BUYER' || user?.role === 'SELLER' || user?.role === 'ADMIN');
    });
  }

  init();

  return { getToken, getUser, isLoggedIn, isSeller, isAdmin, login, register, refresh, logout, me, requireAuth, setSession, clearSession, appPath, applyRoleUI };
})();

window.Auth = Auth;
