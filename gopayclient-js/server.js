const express = require('express');
const path = require('path');
const GoPay = require('./src/gopay');

const app = express();
const PORT = process.env.PORT || 7001;

// ─── Logger ───────────────────────────────────────────────────────────────────

const LEVEL = { debug: '🔵 DEBUG', info: '⚪ INFO ', warn: '🟡 WARN ', error: '🔴 ERROR', success: '🟢 OK   ' };

function log(level, msg, data) {
  const prefix = LEVEL[level] ?? '     ';
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 23);
  const line = `[${ts}] ${prefix} | ${msg}`;
  if (data !== undefined) {
    console.log(line, '\n', JSON.stringify(data, null, 2));
  } else {
    console.log(line);
  }
}

app.use((req, res, next) => {
  const start = Date.now();
  log('debug', `→ ${req.method} ${req.path}`);
  const orig = res.json.bind(res);
  res.json = (body) => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'success';
    log(level, `← ${req.method} ${req.path} [${res.statusCode}] ${ms}ms`, body);
    return orig(body);
  };
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let gopay = GoPay.loadSession();

// ─── Session ──────────────────────────────────────────────────────────────────

app.get('/api/session', (req, res) => {
  res.json({ loggedIn: !!gopay.accessToken, deviceId: gopay.deviceId });
});

// ─── Login Step 1: Request OTP ────────────────────────────────────────────────

app.post('/api/login/otp', async (req, res) => {
  const { phone, loginType } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone required' });

  log('info', `login/otp — phone: ${phone}, type: ${loginType ?? 'otp_whatsapp'}`);
  try {
    gopay = new GoPay();
    const result = await gopay.loginRequest(phone, loginType ?? 'otp_whatsapp');
    log('success', `login/otp — otp_token received`);
    res.json({ otp_token: result?.otp_token, otp_expires_in: result?.otp_expires_in, device_id: gopay.deviceId });
  } catch (err) {
    log('error', `login/otp failed: ${err?.message ?? err}`, err);
    res.status(500).json({ error: err?.message ?? JSON.stringify(err) });
  }
});

// ─── Login Step 2: Verify OTP → Get Access Token ──────────────────────────────

app.post('/api/login/verify', async (req, res) => {
  const { otp, otp_token } = req.body;
  if (!otp || !otp_token) return res.status(400).json({ error: 'otp and otp_token required' });

  log('info', `login/verify — submitting OTP`);
  try {
    const result = await gopay.generateToken(otp, otp_token);
    log('success', `login/verify — access_token received`);
    res.json({ success: true });
  } catch (err) {
    log('error', `login/verify failed: ${err?.message ?? err}`, err);
    res.status(500).json({ error: err?.message ?? JSON.stringify(err) });
  }
});

// ─── Balance ──────────────────────────────────────────────────────────────────

app.get('/api/balance', async (req, res) => {
  if (!gopay.accessToken) return res.status(401).json({ error: 'Not logged in' });
  try {
    const data = await gopay.getBalances();
    res.json(data);
  } catch (err) {
    log('error', `balance failed: ${err?.message ?? err}`, err);
    res.status(500).json({ error: err?.message ?? JSON.stringify(err) });
  }
});

// ─── Profile ──────────────────────────────────────────────────────────────────

app.get('/api/profile', async (req, res) => {
  if (!gopay.accessToken) return res.status(401).json({ error: 'Not logged in' });
  try {
    const data = await gopay.getProfile();
    res.json(data);
  } catch (err) {
    log('error', `profile failed: ${err?.message ?? err}`, err);
    res.status(500).json({ error: err?.message ?? JSON.stringify(err) });
  }
});

// ─── Order History ────────────────────────────────────────────────────────────

app.get('/api/orders', async (req, res) => {
  if (!gopay.accessToken) return res.status(401).json({ error: 'Not logged in' });
  const { page = 1, limit = 20 } = req.query;
  try {
    const data = await gopay.getOrderHistory(Number(page), Number(limit));
    res.json(data);
  } catch (err) {
    log('error', `orders failed: ${err?.message ?? err}`, err);
    res.status(500).json({ error: err?.message ?? JSON.stringify(err) });
  }
});

// ─── Order Detail ─────────────────────────────────────────────────────────────

app.get('/api/orders/:id', async (req, res) => {
  if (!gopay.accessToken) return res.status(401).json({ error: 'Not logged in' });
  try {
    const data = await gopay.getOrderDetail(req.params.id);
    res.json(data);
  } catch (err) {
    log('error', `order detail failed: ${err?.message ?? err}`, err);
    res.status(500).json({ error: err?.message ?? JSON.stringify(err) });
  }
});

// ─── KYC Status ───────────────────────────────────────────────────────────────

app.get('/api/kyc', async (req, res) => {
  if (!gopay.accessToken) return res.status(401).json({ error: 'Not logged in' });
  try {
    const data = await gopay.getKycStatus();
    res.json(data);
  } catch (err) {
    log('error', `kyc failed: ${err?.message ?? err}`, err);
    res.status(500).json({ error: err?.message ?? JSON.stringify(err) });
  }
});

// ─── Bank Accounts ────────────────────────────────────────────────────────────

app.get('/api/bank-accounts', async (req, res) => {
  if (!gopay.accessToken) return res.status(401).json({ error: 'Not logged in' });
  try {
    const data = await gopay.getBankAccounts();
    res.json(data);
  } catch (err) {
    log('error', `bank-accounts failed: ${err?.message ?? err}`, err);
    res.status(500).json({ error: err?.message ?? JSON.stringify(err) });
  }
});

// ─── Logout ───────────────────────────────────────────────────────────────────

app.post('/api/logout', (req, res) => {
  gopay = new GoPay();
  log('info', `logout — session cleared, new device_id: ${gopay.deviceId}`);
  res.json({ success: true });
});

// ─── Catch-all → SPA ─────────────────────────────────────────────────────────

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  log('success', `GoPay Client running at http://localhost:${PORT}`);
  log('info', `Session on startup — loggedIn: ${!!gopay.accessToken}, device_id: ${gopay.deviceId}`);
});
