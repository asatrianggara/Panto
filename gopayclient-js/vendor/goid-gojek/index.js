'use strict';

/**
 * Local vendor implementation of @mychaelgo/goid-gojek
 * Mirrors the SDK surface from github.com/mychaelgo/gojek/sdk/goid-gojek-node
 * so require('@mychaelgo/goid-gojek') works without GitHub Package Registry auth.
 */

const axios = require('axios');

const BASE_URL = 'https://goid.gojekapi.com';

function deviceHeaders(p) {
  const h = { 'content-type': 'application/json' };
  if (p.xAppid)         h['x-appid']           = p.xAppid;
  if (p.xAppversion)    h['x-appversion']       = p.xAppversion;
  if (p.xDeviceos)      h['x-deviceos']         = p.xDeviceos;
  if (p.xPhonemake)     h['x-phonemake']        = p.xPhonemake;
  if (p.xPhonemodel)    h['x-phonemodel']       = p.xPhonemodel;
  if (p.xPlatform)      h['x-platform']         = p.xPlatform;
  if (p.xPushtokentype) h['x-pushtokentype']    = p.xPushtokentype;
  if (p.xUniqueid)      h['x-uniqueid']         = p.xUniqueid;
  if (p.xUserType)      h['x-user-type']        = p.xUserType;
  return h;
}

class TokenApi {
  // TokenApiLoginRequestRequest:
  //   xAppid, xAppversion, xDeviceos, xPhonemake, xPhonemodel,
  //   xPlatform, xPushtokentype, xUniqueid, xUserType
  //   loginRequestBody: { client_id, client_secret, country_code, login_type, magic_link_ref, phone_number }
  loginRequest(requestParameters = {}) {
    return axios({
      method:  'POST',
      url:     `${BASE_URL}/goid/login/request`,
      headers: deviceHeaders(requestParameters),
      data:    requestParameters.loginRequestBody ?? {},
      timeout: 30000,
    });
  }

  // TokenApiGenerateTokenRequest:
  //   xAppid, xAppversion, xDeviceos, xPhonemake, xPhonemodel,
  //   xPlatform, xPushtokentype, xUniqueid, xUserType
  //   generateTokenRequest: { client_id, client_secret, data: { otp, otp_token }, grant_type, scopes }
  generateToken(requestParameters = {}) {
    return axios({
      method:  'POST',
      url:     `${BASE_URL}/goid/token`,
      headers: deviceHeaders(requestParameters),
      data:    requestParameters.generateTokenRequest ?? {},
      timeout: 30000,
    });
  }
}

module.exports = { TokenApi };
