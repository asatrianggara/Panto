const express = require('express');
const path = require('path');
const Shopee = require('./src/shopee');

const app = express();
const PORT = process.env.PORT || 7002;

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

app.use(express.json({ limit: '512kb' }));
app.use(express.static(path.join(__dirname, 'public')));

let shopee = Shopee.loadSession();

function errPayload(err) {
  return {
    status: err?.response?.status,
    data:   err?.response?.data,
    msg:    err?.message,
  };
}

// ─── Session ──────────────────────────────────────────────────────────────────

app.get('/api/session', (req, res) => {
  res.json({
    loggedIn:        shopee.loggedIn,
    deviceId:        shopee.deviceId,
    hasShopeePay:    !!shopee.shopeepayToken,
    hasShopeeMall:   !!shopee.shopeeMallCookie,
  });
});

// ─── Auth: configure tokens ───────────────────────────────────────────────────
// The Shopee SDK doesn't have an OTP login flow — auth is done by capturing
// tokens/cookies from the official app/web (SHOPEEPAY_TOKEN, SPC_EC cookie)
// and injecting them here.

app.post('/api/auth/shopeepay', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });
  shopee.setShopeePayToken(token);
  log('info', `auth/shopeepay — token configured`);
  res.json({ success: true });
});

app.post('/api/auth/shopeemall', (req, res) => {
  const { cookie } = req.body;
  if (!cookie) return res.status(400).json({ error: 'cookie required' });
  shopee.setShopeeMallCookie(cookie);
  log('info', `auth/shopeemall — cookie configured`);
  res.json({ success: true });
});

// ─── Wallet ───────────────────────────────────────────────────────────────────

app.get('/api/wallet', async (req, res) => {
  if (!shopee.shopeepayToken) return res.status(401).json({ error: 'ShopeePay token not configured' });
  try {
    const data = await shopee.getWalletOverview();
    res.json(data);
  } catch (err) {
    log('error', `wallet failed`, errPayload(err));
    res.status(500).json({ error: err?.response?.data?.message ?? err?.message ?? 'Unknown error' });
  }
});

// ─── Orders ───────────────────────────────────────────────────────────────────

app.get('/api/orders', async (req, res) => {
  if (!shopee.shopeeMallCookie) return res.status(401).json({ error: 'Shopee Mall cookie not configured' });
  const { listType = 3, limit = 20, offset = 0 } = req.query;
  try {
    const data = await shopee.getOrderList(Number(listType), Number(limit), Number(offset));
    res.json(data);
  } catch (err) {
    log('error', `orders failed`, errPayload(err));
    res.status(500).json({ error: err?.response?.data?.message ?? err?.message ?? 'Unknown error' });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  if (!shopee.shopeeMallCookie) return res.status(401).json({ error: 'Shopee Mall cookie not configured' });
  try {
    const data = await shopee.getOrderDetail(req.params.id);
    res.json(data);
  } catch (err) {
    log('error', `order detail failed`, errPayload(err));
    res.status(500).json({ error: err?.response?.data?.message ?? err?.message ?? 'Unknown error' });
  }
});

// ─── Logout ───────────────────────────────────────────────────────────────────

app.post('/api/logout', (req, res) => {
  shopee.clearSession();
  shopee = new Shopee();
  log('info', `logout — session cleared, new device_id: ${shopee.deviceId}`);
  res.json({ success: true });
});

// ─── Catch-all → SPA ─────────────────────────────────────────────────────────

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  log('success', `Shopee Client running at http://localhost:${PORT}`);
  log('info', `Session on startup — loggedIn: ${shopee.loggedIn}, shopeepay: ${!!shopee.shopeepayToken}, shopeemall: ${!!shopee.shopeeMallCookie}, device_id: ${shopee.deviceId}`);
});
