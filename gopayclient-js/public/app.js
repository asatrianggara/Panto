// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  phone:     '',
  otp_token: '',
  loginType: 'otp_whatsapp',
  device_id: '',
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function fmt(amount) {
  return `Rp ${Number(amount).toLocaleString('id-ID')}`;
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function goToStep(name) {
  document.querySelectorAll('.login-step').forEach(s => s.classList.remove('active'));
  document.getElementById(`step-${name}`).classList.add('active');
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.querySelector('.btn-text').classList.toggle('hidden', loading);
  btn.querySelector('.btn-loader').classList.toggle('hidden', !loading);
}

function showStatus(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `status-msg ${type}`;
}

function clearStatus(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'status-msg hidden';
  el.textContent = '';
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
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? 'Unknown error');
  return data;
}

// ─── Login Type Toggle ────────────────────────────────────────────────────────

function setLoginType(type) {
  state.loginType = type;
  document.getElementById('type-wa').classList.toggle('active', type === 'otp_whatsapp');
  document.getElementById('type-sms').classList.toggle('active', type === 'sms');
  addLog(`[DEBUG] Login type set to: ${type}`, 'debug');
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
    ? `<pre class="log-json">${JSON.stringify(data, null, 2)}</pre>`
    : '';

  entry.innerHTML = `
    <div class="log-entry-inner">
      <div class="log-entry-header">
        <span class="log-dot ${type}"></span>
        <span class="log-text">${text}</span>
        <span class="log-time">${time}</span>
      </div>
      ${jsonBlock}
    </div>
  `;
  log.prepend(entry);
}

function clearLog() {
  const log = document.getElementById('activity-log');
  log.innerHTML = '<div class="log-empty">No activity yet</div>';
}

// ─── Login: Step 1 — Request OTP ──────────────────────────────────────────────

async function requestOtp() {
  const phone = document.getElementById('inp-phone').value.trim();
  if (!phone) {
    toast('Please enter a phone number', 'error');
    return;
  }

  addLog(`[REQUEST] POST /api/login/otp — phone: ${phone}, type: ${state.loginType}`, 'debug');
  setLoading('btn-request-otp', true);
  try {
    const res = await api('POST', '/api/login/otp', { phone, loginType: state.loginType });

    state.phone     = phone;
    state.otp_token = res.otp_token;
    state.device_id = res.device_id;

    const method = state.loginType === 'otp_whatsapp' ? 'WhatsApp' : 'SMS';
    addLog(`[RESPONSE] OTP sent via ${method}`, 'success', { otp_token: res.otp_token ? '***' : null, device_id: res.device_id });
    document.getElementById('otp-hint').textContent = `Code sent via ${method} to ${phone}`;
    document.getElementById('otp-input').value = '';
    clearStatus('verify-status');
    goToStep('otp');
    setTimeout(() => document.getElementById('otp-input').focus(), 100);
  } catch (err) {
    addLog(`[ERROR] Request OTP failed: ${err.message}`, 'error', { error: err.message });
    toast(err.message, 'error');
  } finally {
    setLoading('btn-request-otp', false);
  }
}

// ─── Login: Step 2 — Verify OTP ───────────────────────────────────────────────

async function verifyOtp() {
  const otp = document.getElementById('otp-input').value.trim();
  if (!otp) {
    toast('Enter the OTP code', 'error');
    return;
  }
  if (!state.otp_token) {
    toast('Session expired — request OTP again', 'error');
    goToStep('phone');
    return;
  }

  addLog(`[REQUEST] POST /api/login/verify — submitting OTP`, 'debug');
  setLoading('btn-verify-otp', true);
  showStatus('verify-status', 'Verifying…', 'loading');
  try {
    await api('POST', '/api/login/verify', { otp, otp_token: state.otp_token });
    clearStatus('verify-status');
    addLog('[RESPONSE] Login successful — session established', 'success');
    toast('Logged in!', 'success');
    showScreen('screen-dashboard');
    loadBalance();
  } catch (err) {
    addLog(`[ERROR] OTP verification failed: ${err.message}`, 'error', { error: err.message });
    showStatus('verify-status', err.message, 'error');
    document.getElementById('otp-input').value = '';
    document.getElementById('otp-input').focus();
  } finally {
    setLoading('btn-verify-otp', false);
  }
}

// ─── Balance ──────────────────────────────────────────────────────────────────

async function loadBalance() {
  addLog('[REQUEST] GET /api/balance', 'info');
  document.getElementById('wallet-amount').textContent = '…';
  document.getElementById('coins-amount').textContent = '…';
  try {
    const data = await api('GET', '/api/balance');
    const balances = data?.data?.balances ?? [];

    let walletSet = false;
    let coinsSet  = false;

    for (const b of balances) {
      const type  = (b.type ?? '').toUpperCase();
      const value = b.balance ?? 0;

      if (!walletSet && (type === 'GOPAY' || type === 'WALLET' || type === 'BALANCE')) {
        document.getElementById('wallet-amount').textContent = fmt(value);
        walletSet = true;
        addLog(`[INFO] GoPay Wallet: ${fmt(value)} (${b.type})`, 'info');
      } else if (!coinsSet && (type === 'COIN' || type === 'COINS' || type === 'GOPAY_COINS')) {
        document.getElementById('coins-amount').textContent = Number(value).toLocaleString('id-ID');
        coinsSet = true;
        addLog(`[INFO] GoPay Coins: ${Number(value).toLocaleString('id-ID')} (${b.type})`, 'info');
      }
    }

    if (!walletSet) {
      const first = balances[0];
      if (first) {
        document.getElementById('wallet-amount').textContent = fmt(first.balance ?? 0);
        addLog(`[INFO] Balance (${first.type}): ${fmt(first.balance ?? 0)}`, 'info');
      } else {
        document.getElementById('wallet-amount').textContent = '—';
        addLog('[WARN] No balance data in response', 'warn');
      }
    }
    if (!coinsSet) {
      document.getElementById('coins-amount').textContent = '—';
    }

    addLog('[RESPONSE] Balance loaded', 'success', data);
  } catch (err) {
    document.getElementById('wallet-amount').textContent = 'Error';
    document.getElementById('coins-amount').textContent  = 'Error';
    addLog(`[ERROR] Balance fetch failed: ${err.message}`, 'error', { error: err.message });
    if (err.message.toLowerCase().includes('not logged')) {
      toast('Session expired — please log in again', 'error');
      showScreen('screen-login');
    }
  }
}

// ─── Profile ──────────────────────────────────────────────────────────────────

async function loadProfile() {
  addLog('[REQUEST] GET /api/profile', 'info');
  try {
    const data = await api('GET', '/api/profile');
    addLog('[RESPONSE] Profile loaded', 'success', data?.data ?? data);
    toast('Profile loaded — see activity log', 'info');
  } catch (err) {
    addLog(`[ERROR] Profile fetch failed: ${err.message}`, 'error', { error: err.message });
    toast(err.message, 'error');
  }
}

// ─── Orders ───────────────────────────────────────────────────────────────────

async function loadOrders() {
  addLog('[REQUEST] GET /api/orders', 'info');
  document.getElementById('orders-section').classList.add('visible');
  const list = document.getElementById('orders-list');
  list.innerHTML = '<div class="orders-empty">Loading…</div>';

  try {
    const data  = await api('GET', '/api/orders');
    const items = data?.data ?? [];

    if (!items.length) {
      list.innerHTML = '<div class="orders-empty">No orders found</div>';
      addLog('[INFO] No orders in response', 'info');
      return;
    }

    list.innerHTML = '';
    for (const order of items) {
      const el = document.createElement('div');
      el.className = 'order-item';
      const statusClass = (order.status ?? '').toLowerCase().includes('success') ? 'success'
                        : (order.status ?? '').toLowerCase().includes('fail')    ? 'failed' : '';
      el.innerHTML = `
        <div class="order-item-left">
          <div class="order-product">${order.product ?? order.order_id ?? 'Order'}</div>
          <div class="order-date">${order.date ?? ''}</div>
        </div>
        <span class="order-status ${statusClass}">${order.status ?? '—'}</span>
      `;
      list.appendChild(el);
    }

    addLog(`[RESPONSE] ${items.length} orders loaded`, 'success', data);
  } catch (err) {
    list.innerHTML = `<div class="orders-empty">${err.message}</div>`;
    addLog(`[ERROR] Orders fetch failed: ${err.message}`, 'error', { error: err.message });
    toast(err.message, 'error');
  }
}

function hideOrders() {
  document.getElementById('orders-section').classList.remove('visible');
}

// ─── KYC ──────────────────────────────────────────────────────────────────────

async function loadKyc() {
  addLog('[REQUEST] GET /api/kyc', 'info');
  try {
    const data = await api('GET', '/api/kyc');
    const kyc  = data?.data ?? data;
    addLog(`[RESPONSE] KYC status: ${kyc?.status ?? '—'}, level: ${kyc?.verification_level ?? '—'}`, 'success', kyc);
    toast(`KYC: ${kyc?.status ?? 'see log'}`, 'info');
  } catch (err) {
    addLog(`[ERROR] KYC fetch failed: ${err.message}`, 'error', { error: err.message });
    toast(err.message, 'error');
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

async function doLogout() {
  addLog('[REQUEST] POST /api/logout', 'info');
  try {
    await api('POST', '/api/logout');
    addLog('[RESPONSE] Logout successful', 'success');
  } catch (err) {
    addLog(`[WARN] Logout error (clearing session anyway): ${err.message}`, 'warn');
  }
  toast('Logged out', 'info');
  showScreen('screen-login');
  goToStep('phone');
  document.getElementById('inp-phone').value = '';
  hideOrders();
  Object.assign(state, { phone: '', otp_token: '', device_id: '' });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  addLog('[DEBUG] app init — checking session', 'debug');

  document.getElementById('inp-phone').addEventListener('keydown', e => {
    if (e.key === 'Enter') requestOtp();
  });
  document.getElementById('otp-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') verifyOtp();
  });

  try {
    const session = await api('GET', '/api/session');
    if (session.loggedIn) {
      addLog(`[INFO] Existing session found — device_id: ${session.deviceId}`, 'info');
      showScreen('screen-dashboard');
      loadBalance();
    } else {
      addLog('[INFO] No active session — showing login', 'info');
      showScreen('screen-login');
    }
  } catch (err) {
    addLog(`[ERROR] Session check failed: ${err.message}`, 'error');
    showScreen('screen-login');
  }
}

document.addEventListener('DOMContentLoaded', init);
