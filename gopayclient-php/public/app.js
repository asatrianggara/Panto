// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  phone:        '',
  otp_token:    '',
  activeTab:    'gopay',
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

async function api(method, action, body, params) {
  let url = `/api.php?action=${action}`;
  if (params) {
    for (const [k, v] of Object.entries(params)) url += `&${k}=${encodeURIComponent(v)}`;
  }
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data;
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

function addLog(text, type = 'info', data = null) {
  const log   = document.getElementById('activity-log');
  const empty = log.querySelector('.log-empty');
  if (empty) empty.remove();

  const entry = document.createElement('div');
  entry.className = 'log-entry';
  const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const jsonBlock = data != null ? `<pre class="log-json">${JSON.stringify(data, null, 2)}</pre>` : '';

  entry.innerHTML = `
    <div class="log-entry-inner">
      <div class="log-entry-header">
        <span class="log-dot ${type}"></span>
        <span class="log-text">${text}</span>
        <span class="log-time">${time}</span>
      </div>
      ${jsonBlock}
    </div>`;
  log.prepend(entry);
}

function clearLog() {
  document.getElementById('activity-log').innerHTML = '<div class="log-empty">No activity yet</div>';
}

// ─── Data Section ─────────────────────────────────────────────────────────────

function showDataSection(title, content) {
  document.getElementById('data-section-title').textContent = title;
  document.getElementById('data-section-content').innerHTML = content;
  document.getElementById('data-section').classList.add('visible');
}

function hideDataSection() {
  document.getElementById('data-section').classList.remove('visible');
}

function jsonBlock(data) {
  return `<div class="json-viewer">${JSON.stringify(data, null, 2)}</div>`;
}

// ─── Login: Step 1 — Request OTP ──────────────────────────────────────────────

async function requestOtp() {
  const phone = document.getElementById('inp-phone').value.trim();
  if (!phone) { toast('Please enter a phone number', 'error'); return; }

  addLog(`[REQUEST] login_otp — phone: ${phone}`, 'debug');
  setLoading('btn-request-otp', true);
  try {
    const res = await api('POST', 'login_otp', { phone });
    state.phone     = phone;
    state.otp_token = res.otp_token;

    addLog(`[RESPONSE] OTP sent`, 'success', { otp_token: res.otp_token ? '***' : null });
    document.getElementById('otp-hint').textContent = `Code sent to ${phone}`;
    document.getElementById('otp-input').value = '';
    clearStatus('verify-status');
    goToStep('otp');
    setTimeout(() => document.getElementById('otp-input').focus(), 100);
  } catch (err) {
    addLog(`[ERROR] Request OTP failed: ${err.message}`, 'error');
    toast(err.message, 'error');
  } finally {
    setLoading('btn-request-otp', false);
  }
}

// ─── Login: Step 2 — Verify OTP ───────────────────────────────────────────────

async function verifyOtp() {
  const otp = document.getElementById('otp-input').value.trim();
  if (!otp) { toast('Enter the OTP code', 'error'); return; }
  if (!state.otp_token) { toast('Session expired — request OTP again', 'error'); goToStep('phone'); return; }

  addLog(`[REQUEST] login_verify — submitting OTP`, 'debug');
  setLoading('btn-verify-otp', true);
  showStatus('verify-status', 'Verifying…', 'loading');
  try {
    await api('POST', 'login_verify', { otp, otp_token: state.otp_token });
    clearStatus('verify-status');
    addLog('[RESPONSE] Login successful', 'success');
    toast('Logged in!', 'success');
    showScreen('screen-dashboard');
    loadBalance();
  } catch (err) {
    addLog(`[ERROR] OTP verification failed: ${err.message}`, 'error');
    showStatus('verify-status', err.message, 'error');
    document.getElementById('otp-input').value = '';
    document.getElementById('otp-input').focus();
  } finally {
    setLoading('btn-verify-otp', false);
  }
}

// ─── Balance ──────────────────────────────────────────────────────────────────

async function loadBalance() {
  addLog('[REQUEST] GET balance', 'info');
  document.getElementById('wallet-amount').textContent = '…';
  document.getElementById('coins-amount').textContent  = '…';
  try {
    const data     = await api('GET', 'balance');
    const balances = data?.data?.balances ?? [];

    let walletSet = false, coinsSet = false;
    for (const b of balances) {
      const t = (b.type ?? '').toUpperCase();
      if (!walletSet && (t === 'GOPAY' || t === 'WALLET' || t === 'BALANCE')) {
        document.getElementById('wallet-amount').textContent = fmt(b.balance ?? 0);
        document.getElementById('wallet-type').textContent   = b.type ?? '';
        walletSet = true;
        addLog(`[INFO] Wallet (${b.type}): ${fmt(b.balance ?? 0)}`, 'info');
      } else if (!coinsSet && (t === 'COIN' || t.includes('COIN'))) {
        document.getElementById('coins-amount').textContent = Number(b.balance ?? 0).toLocaleString('id-ID');
        coinsSet = true;
        addLog(`[INFO] Coins (${b.type}): ${Number(b.balance ?? 0).toLocaleString('id-ID')}`, 'info');
      }
    }

    if (!walletSet) {
      const first = balances[0];
      if (first) {
        document.getElementById('wallet-amount').textContent = fmt(first.balance ?? 0);
        document.getElementById('wallet-type').textContent   = first.type ?? '';
      } else {
        document.getElementById('wallet-amount').textContent = '—';
        addLog('[WARN] No balance data in response', 'warn');
      }
    }
    if (!coinsSet) document.getElementById('coins-amount').textContent = '—';

    addLog('[RESPONSE] Balance loaded', 'success', data);
  } catch (err) {
    document.getElementById('wallet-amount').textContent = 'Error';
    document.getElementById('coins-amount').textContent  = 'Error';
    addLog(`[ERROR] Balance fetch failed: ${err.message}`, 'error');
    if (err.message.includes('Not logged')) { toast('Session expired', 'error'); showScreen('screen-login'); }
  }
}

// ─── Profile ──────────────────────────────────────────────────────────────────

async function loadProfile() {
  addLog('[REQUEST] GET profile', 'info');
  try {
    const data = await api('GET', 'profile');
    addLog('[RESPONSE] Profile loaded', 'success', data?.data ?? data);
    showDataSection('Profile', jsonBlock(data?.data ?? data));
    toast('Profile loaded', 'info');
  } catch (err) {
    addLog(`[ERROR] Profile fetch failed: ${err.message}`, 'error');
    toast(err.message, 'error');
  }
}

// ─── Transaction History ──────────────────────────────────────────────────────

async function loadHistory() {
  addLog('[REQUEST] GET history', 'info');
  showDataSection('Transaction History', '<div class="section-empty">Loading…</div>');
  try {
    const data  = await api('GET', 'history');
    const items = data?.data ?? [];

    if (!items.length) {
      showDataSection('Transaction History', '<div class="section-empty">No transactions found</div>');
      addLog('[INFO] No transactions in response', 'info');
      return;
    }

    let html = '';
    for (const tx of items) {
      const statusClass = (tx.status ?? '').toLowerCase().includes('success') ? 'success'
                        : (tx.status ?? '').toLowerCase().includes('fail')    ? 'failed' : '';
      html += `
        <div class="history-item">
          <div class="history-left">
            <div class="history-product">${tx.product ?? tx.transaction_type ?? 'Transaction'}</div>
            <div class="history-date">${tx.date ?? tx.created_at ?? ''}</div>
          </div>
          <span class="history-status ${statusClass}">${tx.status ?? '—'}</span>
        </div>`;
    }
    showDataSection('Transaction History', html);
    addLog(`[RESPONSE] ${items.length} transactions loaded`, 'success', data);
  } catch (err) {
    showDataSection('Transaction History', `<div class="section-empty">${err.message}</div>`);
    addLog(`[ERROR] History fetch failed: ${err.message}`, 'error');
    toast(err.message, 'error');
  }
}

// ─── KYC ──────────────────────────────────────────────────────────────────────

async function loadKyc() {
  addLog('[REQUEST] GET kyc', 'info');
  try {
    const data = await api('GET', 'kyc');
    const kyc  = data?.data ?? data;
    addLog(`[RESPONSE] KYC status: ${kyc?.status ?? '—'}`, 'success', kyc);
    showDataSection('KYC Status', jsonBlock(kyc));
    toast(`KYC: ${kyc?.status ?? 'see data panel'}`, 'info');
  } catch (err) {
    addLog(`[ERROR] KYC fetch failed: ${err.message}`, 'error');
    toast(err.message, 'error');
  }
}

// ─── GoClub ───────────────────────────────────────────────────────────────────

async function loadGoClub() {
  addLog('[REQUEST] GET goclub', 'info');
  try {
    const data = await api('GET', 'goclub');
    addLog('[RESPONSE] GoClub membership loaded', 'success', data?.data ?? data);
    showDataSection('GoClub Membership', jsonBlock(data?.data ?? data));
    toast('GoClub data loaded', 'info');
  } catch (err) {
    addLog(`[ERROR] GoClub fetch failed: ${err.message}`, 'error');
    toast(err.message, 'error');
  }
}

// ─── PayLater ─────────────────────────────────────────────────────────────────

async function loadPayLater() {
  addLog('[REQUEST] GET paylater', 'info');
  try {
    const data = await api('GET', 'paylater');
    addLog('[RESPONSE] PayLater profile loaded', 'success', data?.data ?? data);
    showDataSection('PayLater Profile', jsonBlock(data?.data ?? data));
    toast('PayLater data loaded', 'info');
  } catch (err) {
    addLog(`[ERROR] PayLater fetch failed: ${err.message}`, 'error');
    toast(err.message, 'error');
  }
}

// ─── Bank List ────────────────────────────────────────────────────────────────

async function loadBankList() {
  addLog('[REQUEST] GET bank_list', 'info');
  try {
    const data  = await api('GET', 'bank_list');
    const banks = data?.data?.banks ?? data?.data ?? [];
    addLog(`[RESPONSE] ${Array.isArray(banks) ? banks.length : '?'} banks loaded`, 'success');

    if (Array.isArray(banks) && banks.length) {
      let html = '';
      for (const b of banks) {
        html += `
          <div class="history-item">
            <div class="history-left">
              <div class="history-product">${b.name ?? b.bank_name ?? '—'}</div>
              <div class="history-date">Code: ${b.code ?? b.bank_code ?? '—'}</div>
            </div>
          </div>`;
      }
      showDataSection('Bank List', html);
    } else {
      showDataSection('Bank List', jsonBlock(data?.data ?? data));
    }
  } catch (err) {
    addLog(`[ERROR] Bank list fetch failed: ${err.message}`, 'error');
    toast(err.message, 'error');
  }
}

// ─── Transfer Modal ───────────────────────────────────────────────────────────

function switchTab(tab) {
  state.activeTab = tab;
  document.getElementById('tab-gopay').classList.toggle('active', tab === 'gopay');
  document.getElementById('tab-bank').classList.toggle('active', tab === 'bank');
  document.getElementById('panel-gopay').classList.toggle('active', tab === 'gopay');
  document.getElementById('panel-bank').classList.toggle('active', tab === 'bank');
  clearStatus('transfer-gopay-status');
  clearStatus('transfer-bank-status');
}

async function doTransfer() {
  if (state.activeTab === 'gopay') {
    await doTransferGoPay();
  } else {
    await doTransferBank();
  }
}

async function doTransferGoPay() {
  const phone  = document.getElementById('tr-gopay-phone').value.trim();
  const amount = parseInt(document.getElementById('tr-gopay-amount').value, 10);
  const pin    = document.getElementById('tr-gopay-pin').value.trim();

  if (!phone || !amount || !pin) {
    showStatus('transfer-gopay-status', 'Phone, amount, and PIN are required', 'error');
    return;
  }

  addLog(`[REQUEST] transfer_gopay — to: ${phone}, amount: ${amount}`, 'info');
  setLoading('btn-transfer', true);
  clearStatus('transfer-gopay-status');
  try {
    const result = await api('POST', 'transfer_gopay', { phone, amount, pin });
    showStatus('transfer-gopay-status', 'Transfer successful!', 'success');
    addLog(`[RESPONSE] GoPay transfer of ${fmt(amount)} to ${phone} succeeded`, 'success', result);
    toast(`${fmt(amount)} sent to ${phone}`, 'success');
    setTimeout(() => { closeModal('modal-transfer'); loadBalance(); }, 1200);
  } catch (err) {
    addLog(`[ERROR] GoPay transfer failed: ${err.message}`, 'error');
    showStatus('transfer-gopay-status', err.message, 'error');
  } finally {
    setLoading('btn-transfer', false);
  }
}

async function doTransferBank() {
  const bankCode   = document.getElementById('tr-bank-code').value.trim();
  const bankNumber = document.getElementById('tr-bank-number').value.trim();
  const amount     = parseInt(document.getElementById('tr-bank-amount').value, 10);
  const pin        = document.getElementById('tr-bank-pin').value.trim();

  if (!bankCode || !bankNumber || !amount || !pin) {
    showStatus('transfer-bank-status', 'All fields are required', 'error');
    return;
  }

  addLog(`[REQUEST] transfer_bank — bank: ${bankCode}, account: ${bankNumber}, amount: ${amount}`, 'info');
  setLoading('btn-transfer', true);
  clearStatus('transfer-bank-status');
  try {
    const result = await api('POST', 'transfer_bank', { bank_code: bankCode, bank_number: bankNumber, amount, pin });
    showStatus('transfer-bank-status', 'Transfer submitted!', 'success');
    addLog(`[RESPONSE] Bank transfer of ${fmt(amount)} to ${bankCode}/${bankNumber} submitted`, 'success', result);
    toast(`${fmt(amount)} sent to ${bankCode} ${bankNumber}`, 'success');
    setTimeout(() => { closeModal('modal-transfer'); loadBalance(); }, 1200);
  } catch (err) {
    addLog(`[ERROR] Bank transfer failed: ${err.message}`, 'error');
    showStatus('transfer-bank-status', err.message, 'error');
  } finally {
    setLoading('btn-transfer', false);
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

async function doLogout() {
  addLog('[REQUEST] logout', 'info');
  try {
    await api('POST', 'logout');
    addLog('[RESPONSE] Logout successful', 'success');
  } catch (err) {
    addLog(`[WARN] Logout error: ${err.message}`, 'warn');
  }
  toast('Logged out', 'info');
  showScreen('screen-login');
  goToStep('phone');
  document.getElementById('inp-phone').value = '';
  hideDataSection();
  Object.assign(state, { phone: '', otp_token: '' });
}

// ─── Modal helpers ────────────────────────────────────────────────────────────

function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  clearStatus('transfer-gopay-status');
  clearStatus('transfer-bank-status');
}

function closeModalOutside(e, id) {
  if (e.target.id === id) closeModal(id);
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
    const session = await api('GET', 'session');
    if (session.loggedIn) {
      addLog('[INFO] Existing session found', 'info');
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
