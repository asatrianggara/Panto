const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const BASE_URL   = 'https://api.ovo.id/';
const AUTH_URL   = 'https://agw.ovo.id/';
const AWS_URL    = 'https://apigw01.aws.ovo.id/';

const APP_VERSION = '3.32.1';
const OS_NAME     = 'Android';
const OS_VERSION  = '7.1.1';
const CLIENT_ID   = 'ovo_android';
const USER_AGENT  = 'OVO/17256 CFNetwork/1240.0.4 Darwin/20.5.0';

const TRANSFER_OVO  = 'trf_ovo';
const TRANSFER_BANK = 'trf_other_bank';

const SESSION_FILE = path.join(__dirname, '..', '.session-v2');

const DEFAULT_HEADERS = {
  'App-Version': APP_VERSION,
  'User-Agent':  USER_AGENT,
  'OS':          OS_NAME,
  'OS-Version':  OS_VERSION,
  'client-id':   CLIENT_ID,
};

function makeClient(baseURL) {
  const instance = axios.create({ baseURL, timeout: 30000, headers: { ...DEFAULT_HEADERS } });
  instance.interceptors.response.use(
    res => res.data,
    err => {
      const data = err.response?.data;
      const status = err.response?.status;
      console.error(`[HTTP ${status}]`, JSON.stringify(data, null, 2));
      return Promise.reject(data ?? err);
    }
  );
  return instance;
}

const authHttp = makeClient(AUTH_URL);
const ovoHttp  = makeClient(BASE_URL);
const awsHttp  = makeClient(AWS_URL);

class OVOID {
  /**
   * @param {string} [authToken] — pass the token from a previous loginSecurityCode() call
   * @param {string} [deviceId]  — reuse a known device ID; a new UUID is generated if omitted
   */
  constructor(authToken = null, deviceId = null) {
    this.authToken = authToken;
    this.deviceId  = deviceId || uuidv4();
  }

  // ─── Phone normalization ──────────────────────────────────────────────────

  _normalizeMsisdn(msisdn) {
    const clean = String(msisdn).replace(/\s+/g, '');
    if (clean.startsWith('+')) return clean;
    if (clean.startsWith('62')) return `+${clean}`;
    if (clean.startsWith('0')) return `+62${clean.slice(1)}`;
    return `+62${clean}`;
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────

  /**
   * Step 1: Send OTP SMS to the phone number.
   * POST https://agw.ovo.id/v3/user/accounts/otp
   * Returns { otp_refId, device_id }
   */
  async login2FA(mobilePhone, deviceId) {
    const device_id = deviceId || this.deviceId;
    this.deviceId = device_id;
    const msisdn = this._normalizeMsisdn(mobilePhone);

    const data = {
      channel_code: 'ovo_android',
      device_id,
      msisdn,
      otp: {
        locale:   'ID',
        sms_hash: 'm9mj4ctIVR8',
      },
    };

    const res = await authHttp.post('v3/user/accounts/otp', data);
    return {
      otp_refId: res?.data?.otp?.otp_ref_id,
      device_id,
      msisdn,
    };
  }

  /**
   * Step 2: Validate OTP code received via SMS.
   * POST https://agw.ovo.id/v3/user/accounts/otp/validation
   * Returns the otp object: { otp_ref_id, type, expires_at, otp_token }
   */
  async login2FAVerify(refId, verificationCode, mobilePhone, device_id) {
    const data = {
      channel_code: 'ovo_android',
      device_id:    device_id || this.deviceId,
      msisdn:       this._normalizeMsisdn(mobilePhone),
      otp: {
        otp:        verificationCode,
        otp_ref_id: refId,
        type:       'LOGIN',
      },
    };

    const res = await authHttp.post('v3/user/accounts/otp/validation', data);
    return res?.data?.otp;
  }

  /**
   * Step 3: Login with security PIN + OTP token.
   * POST https://agw.ovo.id/v3/user/accounts/login
   *
   * Payload encrypted as: LOGIN|PIN|timestamp|deviceId|phone|deviceId|otpRefId
   * Stores authToken on success for subsequent calls.
   * Returns data.auth from the response.
   */
  async loginSecurityCode(securityCode, otp_token, mobilePhone, otpRefId, device_id, pushId = 'XXXXXXXXXX') {
    const did    = device_id || this.deviceId;
    const msisdn = this._normalizeMsisdn(mobilePhone);
    const encryptedValue = await this._encryptRSA(securityCode, did, msisdn, otpRefId);

    const data = {
      channel_code: 'ovo_android',
      credentials: {
        otp_token,
        password: {
          format: 'rsa',
          value:  encryptedValue,
        },
      },
      device_id:            did,
      msisdn,
      push_notification_id: pushId,
    };

    const res = await authHttp.post('v3/user/accounts/login', data);
    const auth = res?.data?.auth;

    if (auth?.access_token) {
      this.authToken = `${auth.token_type ?? 'Bearer'} ${auth.access_token}`;
      this._persistSession();
      console.log('[+] Logged in — session saved to .session-v2');
    }

    return auth;
  }

  // ─── Profile / Balance ────────────────────────────────────────────────────

  /**
   * GET https://api.ovo.id/v3.0/api/front/
   * Returns the full profile object.
   */
  getProfile() {
    return ovoHttp.get('v3.0/api/front/', { headers: this._authHeaders() }).then(resp => resp.profile);
  }

  /**
   * GET https://api.ovo.id/wallet/inquiry
   * type: 'cash' → OVO Cash (001), 'point' → OVO Points (600), omit → full object
   */
  getBalance(type) {
    return ovoHttp.get('wallet/inquiry', { headers: this._authHeaders() }).then(resp => {
      if (type === 'cash')  return resp.data?.['001'];
      if (type === 'point') return resp.data?.['600'];
      return resp.data;
    });
  }

  getBudget() {
    return ovoHttp.get('v1.0/budget/detail', { headers: this._authHeaders() });
  }

  getUnreadHistory() {
    return ovoHttp.get('v1.0/notification/status/count/UNREAD', { headers: this._authHeaders() });
  }

  getAllNotification() {
    return ovoHttp.get('v1.0/notification/status/all', { headers: this._authHeaders() });
  }

  getWalletTransaction(page, limit = 10) {
    return ovoHttp.get('wallet/v2/transaction', {
      params:  { page, limit, productType: '001' },
      headers: this._authHeaders(),
    });
  }

  getRefBank() {
    return ovoHttp.get('v1.0/reference/master/ref_bank', { headers: this._authHeaders() });
  }

  // ─── Transfer ─────────────────────────────────────────────────────────────

  /**
   * Verify that a phone number is a registered OVO account.
   * POST https://api.ovo.id/v1.1/api/auth/customer/isOVO
   */
  isOVO(totalAmount, mobilePhone) {
    return ovoHttp.post('v1.1/api/auth/customer/isOVO',
      { totalAmount, mobile: this._normalizeMsisdn(mobilePhone) },
      { headers: this._authHeaders() }
    );
  }

  /**
   * Transfer OVO Cash to another OVO user.
   * POST https://api.ovo.id/v1.0/api/customers/transfer
   * Minimum: Rp 10.000
   */
  async transferOvo(to_mobilePhone, amount, message = '') {
    if (amount < 10000) throw new Error('Minimal 10.000');

    const trxId = await this._generateTrxId(amount, TRANSFER_OVO);
    return ovoHttp.post('v1.0/api/customers/transfer',
      {
        amount,
        message: message || 'Sent from ovoid-nodejs',
        to:      this._normalizeMsisdn(to_mobilePhone),
        trxId,
      },
      { headers: this._authHeaders() }
    );
  }

  /**
   * Inquiry before bank transfer.
   * POST https://api.ovo.id/transfer/inquiry
   */
  transferInquiry(accountNo, amount, bankCode, bankName, message = '') {
    return ovoHttp.post('transfer/inquiry',
      { accountNo, amount, bankCode, bankName, message },
      { headers: this._authHeaders() }
    );
  }

  /**
   * Transfer OVO Cash to a bank account.
   * POST https://api.ovo.id/transfer/direct
   * Minimum: Rp 10.000
   */
  async transferBank(accountName, accountNo, accountNoDestination, amount, bankCode, bankName, message = '', notes = '') {
    if (amount < 10000) throw new Error('Minimal 10.000');

    const transactionId = await this._generateTrxId(amount, TRANSFER_BANK);
    return ovoHttp.post('transfer/direct',
      {
        accountName,
        accountNo,
        accountNoDestination,
        amount,
        bankCode,
        bankName,
        message:       message || 'Sent from ovoid-nodejs',
        notes:         notes   || 'Sent from ovoid-nodejs',
        transactionId,
      },
      { headers: this._authHeaders() }
    );
  }

  // ─── Billpay ──────────────────────────────────────────────────────────────

  getBillers() {
    return awsHttp.get('gpdm/ovo/ID/v2/billpay/get-billers', {
      params:  { categoryID: '5C6' },
      headers: this._authHeaders(),
    });
  }

  getDenominationByProductId(product_id) {
    return awsHttp.get(`gpdm/ovo/ID/v1/billpay/get-denominations/${product_id}`, {
      headers: this._authHeaders(),
    });
  }

  billerInquiry(billerId, customerId, denomId, productId) {
    return awsHttp.post('gpdm/ovo/ID/v1/billpay/inquiry',
      {
        biller_id:        String(billerId),
        customer_id:      customerId,
        denomination_id:  denomId,
        payment_method:   ['001'],
        phone_number:     customerId,
        product_id:       String(productId),
        period:           0,
      },
      { headers: this._authHeaders() }
    );
  }

  customerUnlock(securityCode) {
    return ovoHttp.post('v1.0/api/auth/customer/unlock',
      { appVersion: APP_VERSION, securityCode },
      { headers: this._authHeaders() }
    );
  }

  pay(billerId, customerId, order_id, productId) {
    return awsHttp.post('gpdm/ovo/ID/v1/billpay/pay',
      {
        biller_id:      billerId,
        customer_id:    customerId,
        order_id,
        payment_method: ['001'],
        phone_number:   customerId,
        product_id:     productId,
      },
      { headers: this._authHeaders() }
    );
  }

  payCheckStatus(orderId) {
    return awsHttp.post('gpdm/ovo/ID/v1/billpay/checkstatus',
      { order_reference: orderId },
      { headers: this._authHeaders() }
    );
  }

  logout() {
    return ovoHttp.get('v1.0/api/auth/customer/logout', { headers: this._authHeaders() });
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  _authHeaders() {
    return { Authorization: this.authToken, ...DEFAULT_HEADERS };
  }

  async _generateTrxId(amount, actionMark) {
    const res = await ovoHttp.post('v1.0/api/auth/customer/genTrxId',
      { actionMark, amount },
      { headers: this._authHeaders() }
    );
    return res?.trxId ?? res?.data?.trxId;
  }

  /**
   * Encrypts the login payload using the server's RSA public key.
   * Payload: LOGIN|securityCode|timestamp|deviceId|phone|deviceId|otpRefId
   */
  async _encryptRSA(securityCode, deviceId, phoneNumber, otpRefId) {
    const keysRes = await authHttp.get('v3/user/public_keys');
    const publicKey = keysRes?.data?.keys?.[0]?.key;
    if (!publicKey) throw new Error('No RSA public key from server');

    const timestamp = Date.now();
    const payload = `LOGIN|${securityCode}|${timestamp}|${deviceId}|${phoneNumber}|${deviceId}|${otpRefId}`;

    return crypto.publicEncrypt(
      { key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING },
      Buffer.from(payload, 'utf8')
    ).toString('base64');
  }

  // ─── Session persistence ──────────────────────────────────────────────────

  _persistSession() {
    fs.writeFileSync(SESSION_FILE, JSON.stringify({
      authToken: this.authToken,
      deviceId:  this.deviceId,
    }));
  }

  static loadSession() {
    try {
      if (fs.existsSync(SESSION_FILE)) {
        const s = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
        return new OVOID(s.authToken, s.deviceId);
      }
    } catch {}
    return new OVOID();
  }
}

module.exports = OVOID;
