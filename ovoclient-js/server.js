const express = require('express');
const path = require('path');
const OVOID = require('./src/ovoid');

const app = express();
const PORT = process.env.PORT || 7000;

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

// Request/response middleware
app.use((req, res, next) => {
  const start = Date.now();
  log('debug', `→ ${req.method} ${req.path}`, req.body && Object.keys(req.body).length ? req.body : undefined);
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

// In-memory session store (single user)
let ovoid = OVOID.loadSession();

// ─── Session ──────────────────────────────────────────────────────────────────

app.get('/api/session', (req, res) => {
  res.json({
    loggedIn: !!ovoid.authToken,
    deviceId: ovoid.deviceId,
  });
});

// ─── Login Step 1: Request OTP ────────────────────────────────────────────────

app.post('/api/login/otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    log('warn', 'login/otp — missing phone field');
    return res.status(400).json({ error: 'phone required' });
  }

  log('info', `login/otp — requesting OTP for phone: ${phone}`);
  try {
    ovoid = new OVOID();
    log('debug', `login/otp — new OVOID instance, device_id: ${ovoid.deviceId}`);
    const result = await ovoid.login2FA(phone);
    log('success', `login/otp — OTP sent, msisdn: ${result.msisdn}, otp_refId: ${result.otp_refId}`);
    res.json({
      msisdn:    result.msisdn,
      otp_refId: result.otp_refId,
      device_id: result.device_id,
    });
  } catch (err) {
    log('error', `login/otp — login2FA failed: ${err?.message ?? err}`, err);
    res.status(500).json({ error: err?.message ?? JSON.stringify(err) });
  }
});

// ─── Login Step 2: Verify OTP ─────────────────────────────────────────────────

app.post('/api/login/verify', async (req, res) => {
  const { otp_refId, otp_code, msisdn, device_id } = req.body;
  if (!otp_refId || !otp_code || !msisdn || !device_id) {
    log('warn', 'login/verify — missing required fields', { otp_refId, otp_code: !!otp_code, msisdn, device_id });
    return res.status(400).json({ error: 'otp_refId, otp_code, msisdn, device_id required' });
  }

  log('info', `login/verify — verifying OTP for msisdn: ${msisdn}, refId: ${otp_refId}`);
  try {
    const result = await ovoid.login2FAVerify(otp_refId, otp_code, msisdn, device_id);
    log('success', `login/verify — OTP valid, otp_token: ${result?.otp_token ? '***' : 'N/A'}`);
    res.json(result);
  } catch (err) {
    log('error', `login/verify — login2FAVerify failed: ${err?.message ?? err}`, err);
    res.status(500).json({ error: err?.message ?? JSON.stringify(err) });
  }
});

// ─── Login Step 3: PIN ────────────────────────────────────────────────────────

app.post('/api/login/pin', async (req, res) => {
  const { pin, otp_token, msisdn, otp_ref_id, device_id } = req.body;
  if (!pin || !otp_token || !msisdn || !otp_ref_id || !device_id) {
    log('warn', 'login/pin — missing required fields', { pin: !!pin, otp_token: !!otp_token, msisdn, otp_ref_id, device_id });
    return res.status(400).json({ error: 'pin, otp_token, msisdn, otp_ref_id, device_id required' });
  }

  log('info', `login/pin — attempting PIN login for msisdn: ${msisdn}`);
  try {
    const auth = await ovoid.loginSecurityCode(pin, otp_token, msisdn, otp_ref_id, device_id);
    log('success', `login/pin — login successful, customer_token: ${auth?.customer_token ? '***' : 'N/A'}`);
    res.json({ success: true, auth });
  } catch (err) {
    log('error', `login/pin — loginSecurityCode failed: ${err?.message ?? err}`, err);
    res.status(500).json({ error: err?.message ?? JSON.stringify(err) });
  }
});

// ─── Balance ──────────────────────────────────────────────────────────────────

app.get('/api/balance', async (req, res) => {
  log('info', ovoid);
  if (!ovoid.authToken) {
    log('warn', 'balance — no authToken, rejecting request');
    return res.status(401).json({ error: 'Not logged in' });
  }

  log('info', 'balance — fetching wallet inquiry');
  try {
    const data   = await ovoid.getBalance();
    const cash   = data?.['001']?.card_balance ?? 'N/A';
    const points = data?.['600']?.card_balance ?? 'N/A';
    log('success', `balance — cash: ${cash}, points: ${points}`);
    res.json(data);
  } catch (err) {
    log('error', `balance — getBalance failed: ${err?.message ?? err}`, err);
    res.status(500).json({ error: err?.message ?? JSON.stringify(err) });
  }
});

// ─── Transfer ─────────────────────────────────────────────────────────────────

app.post('/api/transfer', async (req, res) => {
  if (!ovoid.authToken) {
    log('warn', 'transfer — no authToken, rejecting request');
    return res.status(401).json({ error: 'Not logged in' });
  }

  const { to, amount, message } = req.body;
  if (!to || !amount) {
    log('warn', 'transfer — missing to or amount', { to, amount });
    return res.status(400).json({ error: 'to and amount required' });
  }

  log('info', `transfer — initiating OVO transfer to: ${to}, amount: ${amount}, message: "${message ?? ''}"`);
  try {
    const result = await ovoid.transferOvo(to, Number(amount), message ?? '');
    log('success', `transfer — transfer completed to ${to} for ${amount}`);
    res.json(result);
  } catch (err) {
    log('error', `transfer — transferOvo failed: ${err?.message ?? err}`, err);
    res.status(500).json({ error: err?.message ?? JSON.stringify(err) });
  }
});

// ─── Logout ───────────────────────────────────────────────────────────────────

app.post('/api/logout', async (req, res) => {
  if (!ovoid.authToken) {
    log('warn', 'logout — no active session');
    return res.status(401).json({ error: 'Not logged in' });
  }

  log('info', 'logout — calling OVO logout endpoint');
  try {
    await ovoid.logout();
    log('success', 'logout — OVO logout acknowledged');
  } catch (err) {
    log('warn', `logout — OVO logout endpoint error (clearing session anyway): ${err?.message ?? err}`);
  }

  ovoid = new OVOID();
  log('debug', `logout — new OVOID instance created, device_id: ${ovoid.deviceId}`);
  res.json({ success: true });
});

// ─── Catch-all → SPA ─────────────────────────────────────────────────────────

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  log('success', `OVO Client running at http://localhost:${PORT}`);
  log('info',    `Session on startup — loggedIn: ${!!ovoid.authToken}, device_id: ${ovoid.deviceId}`);
});
