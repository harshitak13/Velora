/* ============================================================
   SOCKET.JS — Socket.io client, real-time events
   ============================================================ */
const SocketClient = (() => {
  let socket = null;
  const SOCKET_URL = window.SOCKET_URL || window.location.origin;

  function money(cents) {
    return ((Number(cents) || 0) / 100).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function connect() {
    if (!Auth.isLoggedIn() || socket?.connected) return;
    const token = Auth.getToken();

    // Dynamically load socket.io client if not present
    if (typeof io === 'undefined') {
      const s = document.createElement('script');
      s.src = `${SOCKET_URL}/socket.io/socket.io.js`;
      s.onload = () => _init(token);
      document.head.appendChild(s);
    } else {
      _init(token);
    }
  }

  function _init(token) {
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      socket.emit('join:room', Auth.getUser()?.id);
    });

    socket.on('disconnect', reason => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', err => {
      console.warn('[Socket] Connection error:', err.message);
    });

    // ── Order events (Buyer) ──
    socket.on('order:status_updated', ({ orderId, status, message }) => {
      Notifications.add({
        title: 'Order Update',
        body: message || `Order #${orderId.slice(-6).toUpperCase()} is now ${status}`,
        type: 'order_update',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
      Toast.show(message || `Order status: ${status}`, 'info', 'Order Update');
      window.dispatchEvent(new CustomEvent('order:updated', { detail: { orderId, status } }));
    });

    socket.on('order:shipped', ({ orderId, trackingNumber }) => {
      Notifications.add({
        title: 'Your Order Has Shipped!',
        body: `Order #${orderId.slice(-6).toUpperCase()} — Tracking: ${trackingNumber}`,
        type: 'order_update',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
      Toast.show(`Your order shipped! Tracking: ${trackingNumber}`, 'success', 'Shipped 🚚');
    });

    // ── Sale events (Seller) ──
    socket.on('order:new_sale', ({ orderId, items, total }) => {
      Notifications.add({
        title: '🎉 New Sale!',
        body: `You have a new order — ${money(total)}`,
        type: 'new_sale',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
      Toast.show(`New sale! ${money(total)}`, 'success', '🎉 New Order');
      window.dispatchEvent(new CustomEvent('seller:new_sale', { detail: { orderId, items, total } }));
    });

    socket.on('payout:completed', ({ amount, period }) => {
      Notifications.add({
        title: 'Payout Received',
        body: `${money(amount)} for ${period} has been sent to your account.`,
        type: 'payout',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
      Toast.show(`Payout of ${money(amount)} completed!`, 'success', 'Payout 💰');
    });

    // ── General notifications ──
    socket.on('notification:new', ({ title, body, type }) => {
      Notifications.add({ title, body, type, isRead: false, createdAt: new Date().toISOString() });
    });
  }

  function disconnect() {
    socket?.disconnect();
    socket = null;
  }

  function emit(event, data) {
    socket?.emit(event, data);
  }

  // Auto-connect if logged in
  if (Auth.isLoggedIn()) {
    document.addEventListener('DOMContentLoaded', connect);
  }

  return { connect, disconnect, emit };
})();

window.SocketClient = SocketClient;
