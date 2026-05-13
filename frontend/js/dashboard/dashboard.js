/* ============================================================
   DASHBOARD.JS - Shared helpers for seller/admin pages
   ============================================================ */
const Dashboard = (() => {
  function init(requiredRole) {
    if (window.Auth && requiredRole && !Auth.requireAuth(requiredRole)) return false;

    const path = window.location.pathname.replace(/\\/g, '/');
    document.querySelectorAll('.dashboard-nav a').forEach(link => {
      const href = link.getAttribute('href') || '';
      const normalized = href.replace('../', '/').replace('./', '/');
      const isActive = path.endsWith(href) || path.endsWith(normalized);
      link.classList.toggle('active', isActive);
    });

    document.querySelectorAll('[data-sidebar-toggle]').forEach(btn => {
      btn.addEventListener('click', () => document.body.classList.toggle('dashboard-sidebar-open'));
    });

    document.querySelectorAll('[data-sidebar-close]').forEach(el => {
      el.addEventListener('click', () => document.body.classList.remove('dashboard-sidebar-open'));
    });

    const user = Auth?.getUser?.();
    const nameEl = document.querySelector('[data-dashboard-user-name]');
    const roleEl = document.querySelector('[data-dashboard-user-role]');
    const avatarEl = document.querySelector('[data-dashboard-avatar]');
    if (user) {
      if (nameEl) nameEl.textContent = user.name || 'Velora user';
      if (roleEl) roleEl.textContent = user.role || requiredRole || '';
      if (avatarEl) avatarEl.textContent = (user.name || user.email || 'V').charAt(0).toUpperCase();
    }

    return true;
  }

  function money(cents) {
    return ((Number(cents) || 0) / 100).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function compact(value) {
    return Number(value || 0).toLocaleString('en-IN');
  }

  function date(value) {
    if (!value) return 'Today';
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function statusBadge(status) {
    const value = String(status || 'PENDING').toUpperCase();
    const map = {
      ACTIVE: 'badge-success',
      APPROVED: 'badge-success',
      PAID: 'badge-success',
      DELIVERED: 'badge-success',
      OPEN: 'badge-warning',
      PENDING: 'badge-warning',
      PROCESSING: 'badge-accent',
      SHIPPED: 'badge-accent',
      REVIEW: 'badge-accent',
      SUSPENDED: 'badge-error',
      CANCELLED: 'badge-error',
      REJECTED: 'badge-error',
      REFUNDED: 'badge-gray',
      DRAFT: 'badge-gray'
    };
    return `<span class="badge ${map[value] || 'badge-gray'}">${value.replaceAll('_', ' ')}</span>`;
  }

  function setMetric(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function bindTableSearch(inputId, tableId) {
    const input = document.getElementById(inputId);
    const table = document.getElementById(tableId);
    if (!input || !table) return;
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      table.querySelectorAll('tbody tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }

  function notify(message, type = 'info') {
    if (window.Toast) Toast.show(message, type);
  }

  return { init, money, compact, date, statusBadge, setMetric, bindTableSearch, notify };
})();

window.Dashboard = Dashboard;
