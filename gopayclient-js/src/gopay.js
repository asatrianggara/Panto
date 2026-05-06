const { Configuration, PaymentApi, UserApi, BankAccountApi } = require('@mychaelgo/gopay-gojek');
const { TokenApi } = require('@mychaelgo/goid-gojek');
const fs   = require('fs');
const path = require('path');

const CLIENT_ID     = 'gojek:consumer:app';
const CLIENT_SECRET = 'pGwQ7oi8bKqqwvid09UrjqpkMEHklb';
const SESSION_FILE  = path.join(__dirname, '..', '.session-gopay');

function randomHex(len = 16) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

const DEVICE_HEADERS = {
  xAppid:           'com.gojek.app',
  xAppversion:      '4.59.1',
  xDeviceos:        'Android,10',
  xPhonemake:       'Samsung',
  xPhonemodel:      'GT-S7500',
  xPlatform:        'Android',
  xPushtokentype:   'FCM',
  xUserType:        'customer',
  gojekCountryCode: 'ID',
};

class GoPay {
  constructor(accessToken = null, refreshToken = null, deviceId = null) {
    this.accessToken  = accessToken;
    this.refreshToken = refreshToken;
    this.deviceId     = deviceId || randomHex(16);
  }

  _deviceHeaders() {
    return { ...DEVICE_HEADERS, xUniqueid: this.deviceId };
  }

  _config() {
    return new Configuration({ accessToken: this.accessToken });
  }

  // ─── Auth (GoID) ──────────────────────────────────────────────────────────

  async loginRequest(phone, loginType = 'otp_whatsapp') {
    const res = await new TokenApi().loginRequest({
      ...this._deviceHeaders(),
      loginRequestBody: {
        client_id:      CLIENT_ID,
        client_secret:  CLIENT_SECRET,
        country_code:   '+62',
        login_type:     loginType,
        phone_number:   phone,
        magic_link_ref: '',
      },
    });
    return res.data;
  }

  async generateToken(otp, otpToken) {
    const res = await new TokenApi().generateToken({
      ...this._deviceHeaders(),
      generateTokenRequest: {
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type:    'otp',
        data:          { otp, otp_token: otpToken },
        scopes:        [],
      },
    });
    const data = res.data;
    if (data?.access_token) {
      this.accessToken  = data.access_token;
      this.refreshToken = data.refresh_token ?? null;
      this._persistSession();
    }
    return data;
  }

  // ─── GoPay API ────────────────────────────────────────────────────────────

  getBalances() {
    return new PaymentApi(this._config())
      .getBalances(this._deviceHeaders())
      .then(r => r.data);
  }

  getProfile() {
    return new UserApi(this._config())
      .getUserProfile(this._deviceHeaders())
      .then(r => r.data);
  }

  getOrderHistory(page = 1, limit = 20) {
    return new UserApi(this._config())
      .getOrderHistory({ ...this._deviceHeaders(), page, limit, countryCode: 'ID' })
      .then(r => r.data);
  }

  getOrderDetail(orderId) {
    return new UserApi(this._config())
      .getOrderDetails({ ...this._deviceHeaders(), orderId, countryCode: 'ID' })
      .then(r => r.data);
  }

  getKycStatus() {
    return new UserApi(this._config())
      .getUserKycStatus(this._deviceHeaders())
      .then(r => r.data);
  }

  getBankAccounts(page = 1, limit = 20) {
    return new BankAccountApi(this._config())
      .getBankAccounts({ ...this._deviceHeaders(), page, pageSize: limit })
      .then(r => r.data);
  }

  getPaymentOptions() {
    return new PaymentApi(this._config())
      .getPaymentOptions(this._deviceHeaders())
      .then(r => r.data);
  }

  getFilterConfig() {
    return new UserApi(this._config())
      .getFilterConfig(this._deviceHeaders())
      .then(r => r.data);
  }

  // ─── Session persistence ──────────────────────────────────────────────────

  _persistSession() {
    fs.writeFileSync(SESSION_FILE, JSON.stringify({
      accessToken:  this.accessToken,
      refreshToken: this.refreshToken,
      deviceId:     this.deviceId,
    }));
  }

  static loadSession() {
    try {
      if (fs.existsSync(SESSION_FILE)) {
        const s = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
        return new GoPay(s.accessToken, s.refreshToken, s.deviceId);
      }
    } catch {}
    return new GoPay();
  }
}

module.exports = GoPay;
