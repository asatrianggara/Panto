// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  phone:            '',
  msisdn:           '',
  otp_refId:        '',
  device_id:        '',
  otp_token:        '',
  otp_ref_id_step2: '',
  pin:              '',
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

// ─── OTP Input ────────────────────────────────────────────────────────────────

function initOtpInputs() {
  const inp = document.getElementById('otp-single');
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') verifyOtp();
  });
}

function getOtpValue() {
  return document.getElementById('otp-single').value.trim();
}

function clearOtpInputs() {
  document.getElementById('otp-single').value = '';
}

// ─── PIN Input ────────────────────────────────────────────────────────────────

function updatePinDots() {
  const dots = document.querySelectorAll('#pin-dots span');
  dots.forEach((d, i) => d.classList.toggle('filled', i < state.pin.length));
}

function pinInput(digit) {
  if (state.pin.length >= 6) return;
  state.pin += digit;
  updatePinDots();
  addLog(`PIN digit entered (${state.pin.length}/6)`, 'debug');
  if (state.pin.length === 6) doLoginPin();
}

function pinBackspace() {
  state.pin = state.pin.slice(0, -1);
  updatePinDots();
  clearStatus('pin-login-status');
  addLog(`PIN digit removed (${state.pin.length}/6)`, 'debug');
}

function clearPin() {
  state.pin = '';
  updatePinDots();
}

// ─── Login: Step 1 — Request OTP ──────────────────────────────────────────────

async function requestOtp() {
  const phone = document.getElementById('inp-phone').value.trim();

  if (!phone) {
    addLog('Validation failed: phone number is empty', 'warn');
    toast('Please enter a phone number', 'error');
    return;
  }

  addLog(`[REQUEST] POST /api/login/otp — phone: ${phone}`, 'debug');
  setLoading('btn-request-otp', true);
  try {
    const res = await api('POST', '/api/login/otp', { phone });

    state.phone     = phone;
    state.msisdn    = res.msisdn;
    state.otp_refId = res.otp_refId;
    state.device_id = res.device_id;

    addLog(`[RESPONSE] OTP sent to ${res.msisdn}`, 'success', res);
    document.getElementById('otp-hint').textContent = `Code sent to ${res.msisdn}`;
    clearOtpInputs();
    goToStep('otp');
    setTimeout(() => document.getElementById('otp-single').focus(), 100);
  } catch (err) {
    addLog(`[ERROR] Request OTP failed: ${err.message}`, 'error', { error: err.message });
    toast(err.message, 'error');
  } finally {
    setLoading('btn-request-otp', false);
    addLog('[DEBUG] requestOtp() finished', 'debug');
  }
}

// ─── Login: Step 2 — Verify OTP ───────────────────────────────────────────────

async function verifyOtp() {
  const code = getOtpValue();

  if (!code) {
    addLog('Validation failed: OTP code is empty', 'warn');
    toast('Enter the OTP code', 'error');
    return;
  }

  addLog(`[REQUEST] POST /api/login/verify — otp_refId: ${state.otp_refId}, msisdn: ${state.msisdn}`, 'debug');
  setLoading('btn-verify-otp', true);
  try {
    const res = await api('POST', '/api/login/verify', {
      otp_refId: state.otp_refId,
      otp_code:  code,
      msisdn:    state.msisdn,
      device_id: state.device_id,
    });

    state.otp_token        = res.otp_token;
    state.otp_ref_id_step2 = res.otp_ref_id;

    addLog('[RESPONSE] OTP verified successfully', 'success', res);
    clearPin();
    clearStatus('pin-login-status');
    goToStep('pin');
  } catch (err) {
    addLog(`[ERROR] OTP verification failed: ${err.message}`, 'error', { error: err.message });
    toast(err.message, 'error');
    clearOtpInputs();
    document.getElementById('otp-single').focus();
  } finally {
    setLoading('btn-verify-otp', false);
    addLog('[DEBUG] verifyOtp() finished', 'debug');
  }
}

// ─── Login: Step 3 — PIN ──────────────────────────────────────────────────────

async function doLoginPin() {
  addLog('[REQUEST] POST /api/login/pin — submitting encrypted PIN', 'debug');
  showStatus('pin-login-status', 'Verifying PIN…', 'loading');
  try {
    const res = await api('POST', '/api/login/pin', {
      pin:        state.pin,
      otp_token:  state.otp_token,
      msisdn:     state.msisdn,
      otp_ref_id: state.otp_ref_id_step2,
      device_id:  state.device_id,
    });

    clearStatus('pin-login-status');
    addLog('[RESPONSE] Login successful — session established', 'success', res);
    toast('Logged in!', 'success');
    showScreen('screen-dashboard');
    loadBalance();
  } catch (err) {
    addLog(`[ERROR] PIN login failed: ${err.message}`, 'error', { error: err.message });
    showStatus('pin-login-status', err.message, 'error');
    clearPin();
  } finally {
    addLog('[DEBUG] doLoginPin() finished', 'debug');
  }
}

// ─── Balance ──────────────────────────────────────────────────────────────────

async function loadBalance() {
  addLog('[REQUEST] GET /api/balance', 'info');
  document.getElementById('cash-amount').textContent = '…';
  document.getElementById('points-amount').textContent = '…';
  try {
    const data = await api('GET', '/api/balance');

    if (data?.['001']) {
      const cash = data['001'];
      document.getElementById('cash-amount').textContent = fmt(cash.card_balance ?? 0);
      document.getElementById('cash-account').textContent = cash.card_no ?? '';
      addLog(`[INFO] OVO Cash: ${fmt(cash.card_balance ?? 0)} — account: ${cash.card_no ?? '-'}`, 'info');
    } else {
      document.getElementById('cash-amount').textContent = '—';
      addLog('[WARN] OVO Cash data not found in response', 'warn');
    }

    if (data?.['600']) {
      const pts = data['600'];
      document.getElementById('points-amount').textContent =
        Number(pts.card_balance ?? 0).toLocaleString('id-ID');
      addLog(`[INFO] OVO Points: ${Number(pts.card_balance ?? 0).toLocaleString('id-ID')} pts`, 'info');
    } else {
      document.getElementById('points-amount').textContent = '—';
      addLog('[WARN] OVO Points data not found in response', 'warn');
    }

    addLog('[RESPONSE] Balance loaded', 'success', data);
  } catch (err) {
    document.getElementById('cash-amount').textContent = 'Error';
    document.getElementById('points-amount').textContent = 'Error';
    addLog(`[ERROR] Balance fetch failed: ${err.message}`, 'error', { error: err.message });
    if (err.message.toLowerCase().includes('not logged')) {
      addLog('[WARN] Session expired — redirecting to login', 'warn');
      toast('Session expired — please log in again', 'error');
      showScreen('screen-login');
    }
  } finally {
    addLog('[DEBUG] loadBalance() finished', 'debug');
  }
}

// ─── Transfer ─────────────────────────────────────────────────────────────────

async function doTransfer() {
  const to     = document.getElementById('tr-phone').value.trim();
  const amount = parseInt(document.getElementById('tr-amount').value, 10);
  const msg    = document.getElementById('tr-message').value.trim();

  addLog(`[DEBUG] doTransfer() called — to: ${to || '(empty)'}, amount: ${amount || '(empty)'}`, 'debug');

  if (!to) {
    addLog('[WARN] Validation failed: recipient phone is empty', 'warn');
    showStatus('transfer-status', 'Recipient phone required', 'error');
    return;
  }
  if (!amount || amount < 10000) {
    addLog(`[WARN] Validation failed: amount ${amount} is below minimum (10000)`, 'warn');
    showStatus('transfer-status', 'Minimum transfer is Rp 10.000', 'error');
    return;
  }

  addLog(`[REQUEST] POST /api/transfer — to: ${to}, amount: ${amount}, message: "${msg || '(none)'}"`, 'info');
  setLoading('btn-transfer', true);
  clearStatus('transfer-status');
  try {
    const result = await api('POST', '/api/transfer', { to, amount, message: msg });
    showStatus('transfer-status', 'Transfer successful!', 'success');
    addLog(`[RESPONSE] Transfer of ${fmt(amount)} to ${to} succeeded`, 'success', result);
    toast(`${fmt(amount)} sent to ${to}`, 'success');
    setTimeout(() => { closeModal('modal-transfer'); loadBalance(); }, 1200);
  } catch (err) {
    addLog(`[ERROR] Transfer failed: ${err.message}`, 'error', { error: err.message });
    showStatus('transfer-status', err.message, 'error');
  } finally {
    setLoading('btn-transfer', false);
    addLog('[DEBUG] doTransfer() finished', 'debug');
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

async function doLogout() {
  addLog('[REQUEST] POST /api/logout', 'info');
  try {
    await api('POST', '/api/logout');
    addLog('[RESPONSE] Logout successful', 'success');
  } catch (err) {
    addLog(`[WARN] Logout request failed (session cleared anyway): ${err.message}`, 'warn');
  }
  toast('Logged out', 'info');
  showScreen('screen-login');
  goToStep('phone');
  document.getElementById('inp-phone').value = '';
  addLog('[INFO] Navigated to login screen', 'info');
}

// ─── Switch Account ───────────────────────────────────────────────────────────

function showSwitchAccount() {
  addLog('[INFO] Switch account requested — clearing session state', 'info');
  closeModal('modal-transfer');
  showScreen('screen-login');
  goToStep('phone');
  document.getElementById('inp-phone').value = '';
  toast('Enter new account details', 'info');
}

// ─── Modal helpers ────────────────────────────────────────────────────────────

function openModal(id) {
  document.getElementById(id).classList.add('open');
  clearStatus('transfer-status');
  addLog(`[DEBUG] Modal opened: ${id}`, 'debug');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  addLog(`[DEBUG] Modal closed: ${id}`, 'debug');
}

function closeModalOutside(e, id) {
  if (e.target.id === id) closeModal(id);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  addLog('[DEBUG] app init — checking session', 'debug');
  initOtpInputs();

  document.getElementById('inp-phone').addEventListener('keydown', e => {
    if (e.key === 'Enter') requestOtp();
  });

  try {
    addLog('[REQUEST] GET /api/session', 'debug');
    const session = await api('GET', '/api/session');
    addLog('[RESPONSE] Session check', 'debug', session);

    if (session.loggedIn) {
      addLog(`[INFO] Existing session found — device_id: ${session.deviceId}`, 'info');
      showScreen('screen-dashboard');
      loadBalance();
    } else {
      addLog('[INFO] No active session — showing login', 'info');
      showScreen('screen-login');
    }
  } catch (err) {
    addLog(`[ERROR] Session check failed: ${err.message}`, 'error', { error: err.message });
    showScreen('screen-login');
  }
}

document.addEventListener('DOMContentLoaded', init);
