/* ============================================================
   CART.JS — Cart state management (localStorage + server sync)
   ============================================================ */
const Cart = (() => {
  const CART_KEY = 'vm_cart';

  function getItems() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
  }

  function saveItems(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    updateCartBadge();
    window.dispatchEvent(new CustomEvent('cart:updated', { detail: { items } }));
  }

  function add(productId, quantity = 1, productData = null) {
    const user = Auth?.getUser?.();
    if (user && user.role !== 'BUYER') {
      Toast.show('Use a buyer account to purchase products.', 'warning');
      return;
    }
    const items = getItems();
    const existing = items.find(i => i.productId === productId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({ productId, quantity, ...(productData || {}) });
    }
    saveItems(items);
    Toast.show('Item added to cart!', 'success', 'Cart Updated');
    updateCartBadge();
  }

  function remove(productId) {
    saveItems(getItems().filter(i => i.productId !== productId));
  }

  function updateQty(productId, quantity) {
    if (quantity < 1) { remove(productId); return; }
    const items = getItems();
    const item = items.find(i => i.productId === productId);
    if (item) { item.quantity = quantity; saveItems(items); }
  }

  function clear() { saveItems([]); }

  function getCount() { return getItems().reduce((sum, i) => sum + i.quantity, 0); }

  function getSubtotal() { return getItems().reduce((sum, i) => sum + ((i.price || 0) * i.quantity), 0); }

  function updateCartBadge() {
    const count = getCount();
    const badge = document.getElementById('cart-count');
    if (!badge) return;
    if (count > 0) { badge.textContent = count > 99 ? '99+' : count; badge.style.display = 'flex'; }
    else { badge.style.display = 'none'; }
  }

  // Sync local cart to server after login
  async function syncToServer() {
    if (!Auth.isLoggedIn() || Auth.getUser()?.role !== 'BUYER') return;
    const items = getItems();
    if (!items.length) return;
    try {
      await API.post('/api/cart/sync', { items });
    } catch {}
  }

  // Load cart from server (merge with local)
  async function loadFromServer() {
    if (!Auth.isLoggedIn() || Auth.getUser()?.role !== 'BUYER') return;
    try {
      const res = await API.get('/api/cart');
      if (res?.success && res.data?.items?.length) {
        const local = getItems();
        const merged = [...res.data.items];
        local.forEach(li => {
          if (!merged.find(si => si.productId === li.productId)) merged.push(li);
        });
        saveItems(merged);
      }
    } catch {}
  }

  // Group cart by vendor
  function groupByVendor() {
    const items = getItems();
    const groups = {};
    items.forEach(item => {
      const vId = item.vendorId || 'unknown';
      if (!groups[vId]) groups[vId] = { vendorId: vId, vendorName: item.vendorName || 'Seller', items: [] };
      groups[vId].items.push(item);
    });
    return Object.values(groups);
  }

  // Init
  function init() {
    updateCartBadge();
    if (Auth.isLoggedIn()) loadFromServer();
  }

  init();

  return { add, remove, updateQty, clear, getItems, getCount, getSubtotal, updateCartBadge, syncToServer, loadFromServer, groupByVendor };
})();

window.Cart = Cart;
