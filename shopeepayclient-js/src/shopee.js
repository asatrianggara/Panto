const { ShopeePayApi, ShopeeMallApi, Configuration } = require('@mychaelgo/shopee');
const fs   = require('fs');
const path = require('path');

const SHOPEEPAY_BASE = 'https://api.gw.airpay.co.id';
const SHOPEEMALL_BASE = 'https://shopee.co.id';
const SESSION_FILE = path.join(__dirname, '..', '.session-shopee');

function randomHex(len = 16) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

class Shopee {
  constructor(shopeepayToken = null, shopeeMallCookie = null, deviceId = null) {
    this.shopeepayToken   = shopeepayToken;
    this.shopeeMallCookie = shopeeMallCookie;
    this.deviceId         = deviceId || randomHex(16);
  }

  get loggedIn() {
    return !!(this.shopeepayToken || this.shopeeMallCookie);
  }

  // ─── Configurations ───────────────────────────────────────────────────────

  _shopeepayConfig() {
    return new Configuration({
      basePath: SHOPEEPAY_BASE,
      apiKey:   this.shopeepayToken,
    });
  }

  _shopeeMallConfig() {
    return new Configuration({
      basePath: SHOPEEMALL_BASE,
      baseOptions: {
        headers: {
          cookie: this.shopeeMallCookie,
        },
      },
    });
  }

  // ─── Auth (manual token / cookie injection) ───────────────────────────────

  setShopeePayToken(token) {
    this.shopeepayToken = token || null;
    this._persistSession();
  }

  setShopeeMallCookie(cookie) {
    this.shopeeMallCookie = cookie || null;
    this._persistSession();
  }

  // ─── ShopeePay (Wallet) ───────────────────────────────────────────────────

  getWalletOverview() {
    if (!this.shopeepayToken) {
      return Promise.reject(new Error('ShopeePay token not configured'));
    }
    return new ShopeePayApi(this._shopeepayConfig())
      .getWalletOverview({
        getWalletOverviewRequest: {
          meta: {
            source:    'shopee',
            os:        1,
            device_id: this.deviceId,
          },
        },
      })
      .then(r => r.data);
  }

  // ─── Shopee Mall (Orders) ─────────────────────────────────────────────────
  // listType: 1=To Pay, 2=To Ship, 3=Completed, 4=Cancelled, 5=Refund

  getOrderList(listType = 3, limit = 20, offset = 0) {
    if (!this.shopeeMallCookie) {
      return Promise.reject(new Error('Shopee Mall cookie not configured'));
    }
    return new ShopeeMallApi(this._shopeeMallConfig())
      .getOrderList({ limit, listType, offset })
      .then(r => r.data);
  }

  getOrderDetail(orderId) {
    if (!this.shopeeMallCookie) {
      return Promise.reject(new Error('Shopee Mall cookie not configured'));
    }
    return new ShopeeMallApi(this._shopeeMallConfig())
      .getOrderDetail({ orderId: Number(orderId) })
      .then(r => r.data);
  }

  // ─── Session persistence ──────────────────────────────────────────────────

  _persistSession() {
    fs.writeFileSync(SESSION_FILE, JSON.stringify({
      shopeepayToken:   this.shopeepayToken,
      shopeeMallCookie: this.shopeeMallCookie,
      deviceId:         this.deviceId,
    }));
  }

  static loadSession() {
    try {
      if (fs.existsSync(SESSION_FILE)) {
        const s = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
        return new Shopee(s.shopeepayToken, s.shopeeMallCookie, s.deviceId);
      }
    } catch {}
    return new Shopee();
  }

  clearSession() {
    this.shopeepayToken   = null;
    this.shopeeMallCookie = null;
    try { if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE); } catch {}
  }
}

module.exports = Shopee;
