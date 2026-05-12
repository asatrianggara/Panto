// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  device_id: '',
  hasShopeePay: false,
  hasShopeeMall: false,
  authTab: 'shopeepay',
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function fmt(amount) {
  return `Rp ${Number(amount).toLocaleString('id-ID')}`;
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function setAuthTab(tab) {
  state.authTab = tab;
  document.getElementById('tab-shopeepay').classList.toggle('active', tab === 'shopeepay');
  document.getElementById('tab-shopeemall').classList.toggle('active', tab === 'shopeemall');
  document.getElementById('pane-shopeepay').classList.toggle('active', tab === 'shopeepay');
  document.getElementById('pane-shopeemall').classList.toggle('active', tab === 'shopeemall');
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.querySelector('.btn-text')?.classList.toggle('hidden', loading);
  btn.querySelector('.btn-loader')?.classList.toggle('hidden', !loading);
}

function toast(msg, type = 'info') {
  const region = document.getElementById('toast-region');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  region.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data;
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

function addLog(text, type = 'info', data = null) {
  const log = document.getElementById('activity-log');
  const empty = log.querySelector('.log-empty');
  if (empty) empty.remove();

  const entry = document.createElement('div');
  entry.className = 'log-entry';
  const now = new Date();
  const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const jsonBlock = data != null
    ? `<pre class="log-json">${escapeHtml(JSON.stringify(data, null, 2))}</pre>`
    : '';

  entry.innerHTML = `
    <div class="log-entry-inner">
      <div class="log-entry-header">
        <span class="log-dot ${type}"></span>
        <span class="log-text">${escapeHtml(text)}</span>
        <span class="log-time">${time}</span>
      </div>
      ${jsonBlock}
    </div>
  `;
  log.prepend(entry);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function clearLog() {
  const log = document.getElementById('activity-log');
  log.innerHTML = '<div class="log-empty">No activity yet</div>';
}

// ─── Auth: save tokens ────────────────────────────────────────────────────────

async function saveShopeePay() {
  const token = document.getElementById('inp-shopeepay').value.trim();
  if (!token) { toast('Paste a ShopeePay token', 'error'); return; }
  addLog('[REQUEST] POST /api/auth/shopeepay', 'debug');
  setLoading('btn-save-shopeepay', true);
  try {
    await api('POST', '/api/auth/shopeepay', { token });
    state.hasShopeePay = true;
    addLog('[RESPONSE] ShopeePay token saved', 'success');
    toast('ShopeePay token saved', 'success');
    document.getElementById('inp-shopeepay').value = '';
  } catch (err) {
    addLog(`[ERROR] Save ShopeePay token failed: ${err.message}`, 'error');
    toast(err.message, 'error');
  } finally {
    setLoading('btn-save-shopeepay', false);
  }
}

async function saveShopeeMall() {
  const cookie = document.getElementById('inp-shopeemall').value.trim();
  if (!cookie) { toast('Paste a Shopee Mall cookie', 'error'); return; }
  addLog('[REQUEST] POST /api/auth/shopeemall', 'debug');
  setLoading('btn-save-shopeemall', true);
  try {
    await api('POST', '/api/auth/shopeemall', { cookie });
    state.hasShopeeMall = true;
    addLog('[RESPONSE] Shopee Mall cookie saved', 'success');
    toast('Shopee Mall cookie saved', 'success');
    document.getElementById('inp-shopeemall').value = '';
  } catch (err) {
    addLog(`[ERROR] Save Shopee Mall cookie failed: ${err.message}`, 'error');
    toast(err.message, 'error');
  } finally {
    setLoading('btn-save-shopeemall', false);
  }
}

function enterDashboard() {
  if (!state.hasShopeePay && !state.hasShopeeMall) {
    toast('Configure at least one token first', 'error');
    return;
  }
  showScreen('screen-dashboard');
  if (state.hasShopeePay) loadWallet();
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

async function loadWallet() {
  if (!state.hasShopeePay) {
    toast('ShopeePay token not configured', 'error');
    showScreen('screen-login');
    setAuthTab('shopeepay');
    return;
  }
  addLog('[REQUEST] GET /api/wallet', 'info');
  document.getElementById('wallet-amount').textContent = '…';
  document.getElementById('coins-amount').textContent = '…';
  try {
    const data = await api('GET', '/api/wallet');
    const wallet = data?.data?.buyer_wallet?.wallet_balance;
    const balance = wallet?.balance ?? wallet?.amount;
    const currency = wallet?.currency ?? 'IDR';

    if (balance != null) {
      document.getElementById('wallet-amount').textContent = currency === 'IDR' ? fmt(balance) : `${currency} ${Number(balance).toLocaleString()}`;
      document.getElementById('wallet-sub').textContent = currency;
      addLog(`[INFO] ShopeePay Wallet: ${fmt(balance)}`, 'info');
    } else {
      document.getElementById('wallet-amount').textContent = '—';
      addLog('[WARN] No wallet balance in response', 'warn');
    }

    const coins = data?.data?.buyer_wallet?.coins?.amount
              ?? data?.data?.coins?.amount
              ?? data?.data?.buyer_wallet?.coin_balance;
    if (coins != null) {
      document.getElementById('coins-amount').textContent = Number(coins).toLocaleString('id-ID');
    } else {
      document.getElementById('coins-amount').textContent = '—';
    }

    addLog('[RESPONSE] Wallet loaded', 'success', data);
  } catch (err) {
    document.getElementById('wallet-amount').textContent = 'Error';
    document.getElementById('coins-amount').textContent  = 'Error';
    addLog(`[ERROR] Wallet fetch failed: ${err.message}`, 'error', { error: err.message });
    if (err.message.toLowerCase().includes('not configured')) {
      toast('Configure your ShopeePay token', 'error');
      showScreen('screen-login');
      setAuthTab('shopeepay');
    }
  }
}

// ─── Orders ───────────────────────────────────────────────────────────────────

async function loadOrders() {
  if (!state.hasShopeeMall) {
    toast('Shopee Mall cookie not configured', 'error');
    showScreen('screen-login');
    setAuthTab('shopeemall');
    return;
  }
  const listType = document.getElementById('orders-list-type').value;
  addLog(`[REQUEST] GET /api/orders?listType=${listType}`, 'info');
  document.getElementById('orders-section').classList.add('visible');
  const list = document.getElementById('orders-list');
  list.innerHTML = '<div class="orders-empty">Loading…</div>';

  try {
    const data  = await api('GET', `/api/orders?listType=${listType}&limit=20&offset=0`);
    const items = data?.data ?? [];

    if (!items.length) {
      list.innerHTML = '<div class="orders-empty">No orders found</div>';
      addLog('[INFO] No orders in response', 'info');
      return;
    }

    list.innerHTML = '';
    for (const order of items) {
      const orderId = order.order_id ?? order.orderid ?? order.id;
      const card = order.info_card ?? {};
      const product = card.product_info?.items?.[0]?.name
                    ?? card.product_info?.name
                    ?? card.shop_info?.name
                    ?? `Order ${orderId}`;
      const statusObj = order.status ?? {};
      const statusText = statusObj.status_label?.text ?? statusObj.text ?? statusObj.status ?? '—';
      const statusLower = String(statusText).toLowerCase();
      const statusClass = statusLower.includes('success') || statusLower.includes('selesai') || statusLower.includes('complete') ? 'success'
                        : statusLower.includes('cancel') || statusLower.includes('fail') ? 'failed' : '';

      const el = document.createElement('div');
      el.className = 'order-item';
      el.onclick = () => orderId && loadOrderDetail(orderId);
      el.innerHTML = `
        <div class="order-item-left">
          <div class="order-product">${escapeHtml(product)}</div>
          <div class="order-date">#${escapeHtml(String(orderId ?? '—'))}</div>
        </div>
        <span class="order-status ${statusClass}">${escapeHtml(statusText)}</span>
      `;
      list.appendChild(el);
    }

    addLog(`[RESPONSE] ${items.length} orders loaded`, 'success', data);
  } catch (err) {
    list.innerHTML = `<div class="orders-empty">${escapeHtml(err.message)}</div>`;
    addLog(`[ERROR] Orders fetch failed: ${err.message}`, 'error', { error: err.message });
    toast(err.message, 'error');
  }
}

function hideOrders() {
  document.getElementById('orders-section').classList.remove('visible');
}

async function loadOrderDetail(orderId) {
  addLog(`[REQUEST] GET /api/orders/${orderId}`, 'info');
  try {
    const data = await api('GET', `/api/orders/${orderId}`);
    addLog(`[RESPONSE] Order ${orderId} detail loaded`, 'success', data?.data ?? data);
    toast('Order detail in activity log', 'info');
  } catch (err) {
    addLog(`[ERROR] Order detail failed: ${err.message}`, 'error', { error: err.message });
    toast(err.message, 'error');
  }
}

function promptOrderDetail() {
  const id = prompt('Enter order ID:');
  if (id) loadOrderDetail(id.trim());
}

// ─── Logout ───────────────────────────────────────────────────────────────────

async function doLogout() {
  addLog('[REQUEST] POST /api/logout', 'info');
  try {
    await api('POST', '/api/logout');
    addLog('[RESPONSE] Session cleared', 'success');
  } catch (err) {
    addLog(`[WARN] Logout error: ${err.message}`, 'warn');
  }
  state.hasShopeePay = false;
  state.hasShopeeMall = false;
  toast('Session cleared', 'info');
  hideOrders();
  showScreen('screen-login');
  setAuthTab('shopeepay');
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  addLog('[DEBUG] app init — checking session', 'debug');

  try {
    const session = await api('GET', '/api/session');
    state.device_id     = session.deviceId;
    state.hasShopeePay  = !!session.hasShopeePay;
    state.hasShopeeMall = !!session.hasShopeeMall;

    if (session.loggedIn) {
      addLog(`[INFO] Existing session — shopeepay: ${session.hasShopeePay}, shopeemall: ${session.hasShopeeMall}, device_id: ${session.deviceId}`, 'info');
      showScreen('screen-dashboard');
      if (state.hasShopeePay) loadWallet();
    } else {
      addLog('[INFO] No active session — configure tokens', 'info');
      showScreen('screen-login');
    }
  } catch (err) {
    addLog(`[ERROR] Session check failed: ${err.message}`, 'error');
    showScreen('screen-login');
  }
}

document.addEventListener('DOMContentLoaded', init);
