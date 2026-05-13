/* ============================================================
   NOTIFICATIONS.JS - Toast system + notification bell
   ============================================================ */
const Toast = (() => {
  function getContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  const ICONS = {
    success: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    error: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  };

  function show(message, type = 'info', title = null, duration = 4000) {
    const id = 'toast-' + Date.now();
    const el = document.createElement('div');
    el.id = id;
    el.className = `toast toast-${type}`;
    el.innerHTML = `
      ${ICONS[type] || ICONS.info}
      <div class="toast-content">
        <div class="toast-title">${title || { success:'Success', error:'Error', warning:'Warning', info:'Info' }[type]}</div>
        <div class="toast-body">${message}</div>
      </div>
      <button class="toast-dismiss" onclick="Toast.dismiss('${id}')" aria-label="Dismiss">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;
    getContainer().appendChild(el);
    if (duration > 0) setTimeout(() => dismiss(id), duration);
    return id;
  }

  function dismiss(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('removing');
    setTimeout(() => el.remove(), 300);
  }

  return { show, dismiss };
})();

window.Toast = Toast;

const Notifications = (() => {
  let items = [];
  let unread = 0;

  function updateBadge() {
    const dot = document.getElementById('notif-dot');
    if (dot) dot.style.display = unread > 0 ? 'block' : 'none';
  }

  function add(notification) {
    items.unshift(notification);
    if (!notification.isRead) unread += 1;
    updateBadge();
    renderPanel();
  }

  async function markAllRead() {
    items.forEach(item => item.isRead = true);
    unread = 0;
    updateBadge();
    renderPanel();
    if (window.Auth && Auth.isLoggedIn()) {
      try { await API.patch('/api/notifications', {}); } catch {}
    }
  }

  function renderPanel() {
    const list = document.getElementById('notif-list');
    if (!list) return;
    if (!items.length) {
      list.innerHTML = `
        <div class="empty-state notif-empty">
          <div class="empty-icon">${iconSvg('empty')}</div>
          <p>No notifications yet</p>
        </div>`;
      return;
    }
    list.innerHTML = items.slice(0, 6).map(item => `
      <div class="notif-item ${item.isRead ? '' : 'unread'}">
        <div class="notif-icon notif-${item.type || 'system'}">${iconSvg(item.type)}</div>
        <div class="notif-content">
          <div class="notif-title">${escapeHtml(item.title || 'Notification')}</div>
          <div class="notif-body">${escapeHtml(item.body || '')}</div>
          <div class="notif-time">${timeAgo(item.createdAt)}</div>
        </div>
        ${!item.isRead ? '<div class="notif-dot"></div>' : ''}
      </div>
    `).join('');
  }

  async function load() {
    if (!window.Auth || !Auth.isLoggedIn()) return;
    try {
      const res = await API.get('/api/notifications?limit=20');
      if (res?.success) {
        items = res.data || [];
        unread = items.filter(item => !item.isRead).length;
        updateBadge();
        renderPanel();
      }
    } catch {}
  }

  function timeAgo(dateStr) {
    if (!dateStr) return 'Just now';
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'Just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
  }

  function getItems() {
    return items;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('notif-btn');
    if (!btn) return;
    const panel = document.getElementById('notif-panel') || (() => {
      const p = document.createElement('div');
      p.id = 'notif-panel';
      p.className = 'notif-panel';
      p.innerHTML = `
        <div class="notif-panel-header">
          <span>Notifications</span>
          <button class="btn btn-ghost btn-sm" onclick="Notifications.markAllRead()">Mark read</button>
        </div>
        <div class="notif-list" id="notif-list"><div class="empty-state notif-empty"><div class="empty-icon">${iconSvg('empty')}</div><p>No notifications yet</p></div></div>
        <div class="notif-panel-footer"><a href="${window.Auth ? Auth.appPath('notifications.html') : 'notifications.html'}">Notification page</a></div>
      `;
      document.getElementById('notif-dropdown')?.appendChild(p);
      return p;
    })();

    btn.addEventListener('click', event => {
      event.stopPropagation();
      const isOpen = panel.classList.toggle('open');
      if (isOpen) load();
    });
    document.addEventListener('click', event => {
      const dropdown = document.getElementById('notif-dropdown');
      if (dropdown && !dropdown.contains(event.target)) panel.classList.remove('open');
    });
    load();
  });

  function iconSvg(type) {
    const icons = {
      order_update: '<svg viewBox="0 0 24 24"><path d="M21 8v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"/><path d="M7 8V6a5 5 0 0 1 10 0v2"/><path d="M3 8h18"/></svg>',
      new_sale: '<svg viewBox="0 0 24 24"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"/></svg>',
      payout: '<svg viewBox="0 0 24 24"><path d="M3 7h18v10H3z"/><path d="M7 12h.01M17 12h.01"/><circle cx="12" cy="12" r="3"/></svg>',
      report: '<svg viewBox="0 0 24 24"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
      approval: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/><path d="M21 12a9 9 0 1 1-3-6.7"/></svg>',
      system: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v4h1"/></svg>',
      empty: '<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>'
    };
    return icons[type] || icons.system;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  return { add, markAllRead, load, renderPanel, getItems, timeAgo };
})();

window.Notifications = Notifications;
