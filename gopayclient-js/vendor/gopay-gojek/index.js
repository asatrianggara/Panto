'use strict';

/**
 * Local vendor implementation of @mychaelgo/gopay-gojek
 * Mirrors the SDK surface from github.com/mychaelgo/gojek/sdk/gopay-gojek-node
 * so require('@mychaelgo/gopay-gojek') works without GitHub Package Registry auth.
 */

const axios = require('axios');

const BASE_URL = 'https://customer.gopayapi.com';

// ─── Configuration ────────────────────────────────────────────────────────────

class Configuration {
  constructor(params = {}) {
    this.accessToken = params.accessToken ?? null;
    this.basePath    = params.basePath    ?? BASE_URL;
  }
}

// ─── Header builder ───────────────────────────────────────────────────────────

function deviceHeaders(p, accessToken) {
  const h = { 'content-type': 'application/json' };
  if (p.xAppid)           h['x-appid']           = p.xAppid;
  if (p.xAppversion)      h['x-appversion']       = p.xAppversion;
  if (p.xDeviceos)        h['x-deviceos']         = p.xDeviceos;
  if (p.xPhonemake)       h['x-phonemake']        = p.xPhonemake;
  if (p.xPhonemodel)      h['x-phonemodel']       = p.xPhonemodel;
  if (p.xPlatform)        h['x-platform']         = p.xPlatform;
  if (p.xPushtokentype)   h['x-pushtokentype']    = p.xPushtokentype;
  if (p.xUniqueid)        h['x-uniqueid']         = p.xUniqueid;
  if (p.xUserType)        h['x-user-type']        = p.xUserType;
  if (p.gojekCountryCode) h['gojek-country-code'] = p.gojekCountryCode;
  if (accessToken)        h['Authorization']      = `Bearer ${accessToken}`;
  return h;
}

// ─── BaseAPI ──────────────────────────────────────────────────────────────────

class BaseAPI {
  constructor(configuration) {
    this.configuration = configuration ?? new Configuration();
  }

  _request(config) {
    return axios({ ...config, timeout: 30000 });
  }

  _headers(p) {
    return deviceHeaders(p, this.configuration.accessToken);
  }

  get _base() {
    return this.configuration.basePath;
  }
}

// ─── PaymentApi ───────────────────────────────────────────────────────────────
// Methods: getBalances, getPaymentOptions
// Request params: xAppid, xAppversion, xDeviceos, xPhonemake, xPhonemodel,
//   xPlatform, xPushtokentype, xUniqueid, xUserType, gojekCountryCode

class PaymentApi extends BaseAPI {
  getBalances(requestParameters = {}) {
    return this._request({
      method:  'GET',
      url:     `${this._base}/v1/payment-options/balances`,
      headers: this._headers(requestParameters),
    });
  }

  getPaymentOptions(requestParameters = {}) {
    return this._request({
      method:  'GET',
      url:     `${this._base}/v1/payment-options/profiles`,
      headers: this._headers(requestParameters),
    });
  }
}

// ─── UserApi ──────────────────────────────────────────────────────────────────
// Methods: getUserProfile, getUserKycStatus, getOrderHistory, getOrderDetails, getFilterConfig
// getOrderHistory extra params: countryCode, page, limit, skipInProgress, lowerBound, upperBound
// getOrderDetails extra params: orderId (required), countryCode

class UserApi extends BaseAPI {
  getUserProfile(requestParameters = {}) {
    return this._request({
      method:  'GET',
      url:     `${this._base}/v1/users/profile`,
      headers: this._headers(requestParameters),
    });
  }

  getUserKycStatus(requestParameters = {}) {
    return this._request({
      method:  'GET',
      url:     `${this._base}/v1/users/kyc/status`,
      headers: this._headers(requestParameters),
    });
  }

  getOrderHistory(requestParameters = {}) {
    const { page, limit, countryCode, skipInProgress, lowerBound, upperBound } = requestParameters;
    const params = {};
    if (page !== undefined)         params.page          = page;
    if (limit !== undefined)        params.limit         = limit;
    if (countryCode)                params.countryCode   = countryCode;
    if (skipInProgress !== undefined) params.skipInProgress = skipInProgress;
    if (lowerBound)                 params.lowerBound    = lowerBound;
    if (upperBound)                 params.upperBound    = upperBound;

    return this._request({
      method:  'GET',
      url:     `${this._base}/v1/users/order-history`,
      params,
      headers: this._headers(requestParameters),
    });
  }

  getOrderDetails(requestParameters = {}) {
    const { orderId, countryCode } = requestParameters;
    const params = {};
    if (countryCode) params.countryCode = countryCode;

    return this._request({
      method:  'GET',
      url:     `${this._base}/v1/users/order-history/${encodeURIComponent(orderId)}/details`,
      params,
      headers: this._headers(requestParameters),
    });
  }

  getFilterConfig(requestParameters = {}) {
    return this._request({
      method:  'GET',
      url:     `${this._base}/v1/users/order-history/filter-config`,
      headers: this._headers(requestParameters),
    });
  }
}

// ─── BankAccountApi ───────────────────────────────────────────────────────────
// Methods: getBankAccounts
// Request params: page, pageSize, sortBy, descending, showWithdrawalBlockStatus + device headers

class BankAccountApi extends BaseAPI {
  getBankAccounts(requestParameters = {}) {
    const { page, pageSize, sortBy, descending, showWithdrawalBlockStatus } = requestParameters;
    const params = {};
    if (page !== undefined)                     params.page                     = page;
    if (pageSize !== undefined)                 params.pageSize                 = pageSize;
    if (sortBy)                                 params.sortBy                   = sortBy;
    if (descending !== undefined)               params.descending               = descending;
    if (showWithdrawalBlockStatus !== undefined) params.showWithdrawalBlockStatus = showWithdrawalBlockStatus;

    return this._request({
      method:  'GET',
      url:     `${this._base}/v1/bank-accounts`,
      params,
      headers: this._headers(requestParameters),
    });
  }
}

// ─── WithdrawalApi ────────────────────────────────────────────────────────────
// Methods: getServiceFee
// Request params: amount, type + device headers

class WithdrawalApi extends BaseAPI {
  getServiceFee(requestParameters = {}) {
    const { amount, type } = requestParameters;
    const params = {};
    if (amount !== undefined) params.amount = amount;
    if (type)                 params.type   = type;

    return this._request({
      method:  'GET',
      url:     `${this._base}/v1/withdrawals/service-fee`,
      params,
      headers: this._headers(requestParameters),
    });
  }
}

module.exports = { Configuration, PaymentApi, UserApi, BankAccountApi, WithdrawalApi };
