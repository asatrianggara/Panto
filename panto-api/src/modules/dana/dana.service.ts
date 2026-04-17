import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Dana } from 'dana-node';
import { WidgetUtils } from 'dana-node/widget/v1';
import { loadDanaConfig, DanaConfig } from './dana.config';

const DEFAULT_DEVICE_ID = 'panto-server-001';

@Injectable()
export class DanaService implements OnModuleInit {
  private readonly logger = new Logger(DanaService.name);
  private client: Dana;
  private config: DanaConfig;
  private initialized = false;

  onModuleInit() {
    try {
      this.config = loadDanaConfig();
      // SDK reads X_PARTNER_ID and PRIVATE_KEY from env for WidgetUtils
      process.env.X_PARTNER_ID = this.config.clientId;
      if (this.config.privateKey) {
        process.env.PRIVATE_KEY = this.config.privateKey;
      }

      this.client = new Dana({
        partnerId: this.config.clientId,
        privateKey: this.config.privateKey,
        origin: this.config.origin,
        env: this.config.env,
        clientSecret: this.config.clientSecret,
        debugMode: 'true',
      });
      this.initialized = true;
      this.logger.log(`DANA SDK initialized (env: ${this.config.env})`);
    } catch (err) {
      this.logger.warn(
        `DANA SDK not initialized: ${(err as Error).message}. Set DANA_CLIENT_ID in .env to enable.`,
      );
    }
  }

  isReady(): boolean {
    return this.initialized;
  }

  getClient(): Dana {
    if (!this.initialized) {
      throw new Error('DANA SDK is not initialized. Check your .env configuration.');
    }
    return this.client;
  }

  getMerchantId(): string {
    return this.config.merchantId;
  }

  // ──────────────────────────────────────────────
  // OAuth URL builder for initial account binding
  // Uses SDK's WidgetUtils which handles seamlessSign
  // ──────────────────────────────────────────────

  buildOAuthUrl(
    redirectUrl: string,
    phoneNumber?: string,
    mode: 'API' | 'DEEPLINK' = 'DEEPLINK',
  ): string {
    const oauthUrl = WidgetUtils.generateOauthUrl(
      {
        redirectUrl,
        externalId: `panto-${Date.now()}`,
        merchantId: this.config.merchantId,
        mode,
        seamlessData: phoneNumber
          ? { mobileNumber: phoneNumber }
          : undefined,
      },
      this.config.privateKey,
    );

    this.logger.log(`Generated OAuth URL (${mode}): ${oauthUrl.slice(0, 150)}...`);
    return oauthUrl;
  }

  // ──────────────────────────────────────────────
  // Account Linking (OAuth flow)
  // Step 1: applyOTT — get one-time token for DANA auth page
  // Step 2: applyToken — exchange authCode for accessToken
  // ──────────────────────────────────────────────

  async applyOTT(accessToken: string) {
    const client = this.getClient();
    const res = await client.widgetApi.applyOTT({
      userResources: ['OTT'],
      additionalInfo: {
        accessToken,
        deviceId: DEFAULT_DEVICE_ID,
      },
    });
    this.logger.log(`applyOTT response: ${JSON.stringify(res)}`);
    return res;
  }

  async applyToken(authCode: string) {
    const client = this.getClient();
    const res = await client.widgetApi.applyToken({
      grantType: 'AUTHORIZATION_CODE',
      authCode,
      additionalInfo: {},
    });
    this.logger.log(`applyToken response: ${JSON.stringify(res)}`);
    return res;
  }

  async accountUnbinding(accessToken: string, tokenId: string) {
    const client = this.getClient();
    const res = await client.widgetApi.accountUnbinding({
      merchantId: this.config.merchantId,
      tokenId,
      additionalInfo: {
        accessToken,
        deviceId: DEFAULT_DEVICE_ID,
      },
    });
    this.logger.log(`accountUnbinding response: ${JSON.stringify(res)}`);
    return res;
  }

  // ──────────────────────────────────────────────
  // Balance Inquiry
  // ──────────────────────────────────────────────

  async balanceInquiry(accessToken: string) {
    const client = this.getClient();
    const res = await client.widgetApi.balanceInquiry({
      additionalInfo: {
        accessToken,
        deviceId: DEFAULT_DEVICE_ID,
      },
    });
    this.logger.log(`balanceInquiry response: ${JSON.stringify(res)}`);
    return res;
  }

  // ──────────────────────────────────────────────
  // User Profile
  // ──────────────────────────────────────────────

  async queryUserProfile(accessToken: string) {
    const client = this.getClient();
    const res = await client.widgetApi.queryUserProfile({
      accessToken,
      userResources: ['BALANCE', 'MASK_DANA_ID', 'FULLNAME'],
    });
    this.logger.log(`queryUserProfile response: ${JSON.stringify(res)}`);
    return res;
  }

  // ══════════════════════════════════════════════
  // PAYMENT GATEWAY API
  // ══════════════════════════════════════════════

  async createOrder(params: {
    partnerReferenceNo: string;
    amount: number;
    payMethod?: string;
    payOption?: string;
    validMinutes?: number;
    notifyUrl?: string;
    returnUrl?: string;
  }) {
    const client = this.getClient();
    const d = new Date(Date.now() + (params.validMinutes || 25) * 60000);
    const validUpTo = d.toISOString().slice(0, 19) + '+07:00';
    const notifyUrl = params.notifyUrl || this.config.origin + '/finish-payment';
    const returnUrl = params.returnUrl || this.config.origin + '/payment-result';

    const res = await client.paymentGatewayApi.createOrder({
      partnerReferenceNo: params.partnerReferenceNo,
      merchantId: this.config.merchantId,
      amount: { value: params.amount.toFixed(2), currency: 'IDR' },
      validUpTo,
      payOptionDetails: [
        {
          payMethod: (params.payMethod || 'BALANCE') as any,
          payOption: (params.payOption || '') as any,
          transAmount: { value: params.amount.toFixed(2), currency: 'IDR' },
        },
      ],
      urlParams: [
        { url: notifyUrl, type: 'NOTIFICATION' as any, isDeeplink: 'N' },
        { url: returnUrl, type: 'PAY_RETURN' as any, isDeeplink: 'N' },
      ],
      additionalInfo: {
        mcc: '5411',
        envInfo: {
          sourcePlatform: 'IPG' as any,
          terminalType: 'WEB' as any,
          orderTerminalType: 'WEB' as any,
        },
      },
    });
    this.logger.log(`createOrder response: ${JSON.stringify(res)}`);
    return res;
  }

  async queryPayment(partnerReferenceNo: string) {
    const client = this.getClient();
    const res = await client.paymentGatewayApi.queryPayment({
      originalPartnerReferenceNo: partnerReferenceNo,
      merchantId: this.config.merchantId,
      serviceCode: '54',
    });
    this.logger.log(`queryPayment response: ${JSON.stringify(res)}`);
    return res;
  }

  async cancelOrder(partnerReferenceNo: string, reason?: string) {
    const client = this.getClient();
    const res = await client.paymentGatewayApi.cancelOrder({
      originalPartnerReferenceNo: partnerReferenceNo,
      merchantId: this.config.merchantId,
      reason: reason || 'Cancelled by merchant',
    });
    this.logger.log(`cancelOrder response: ${JSON.stringify(res)}`);
    return res;
  }

  async refundOrder(params: {
    originalPartnerReferenceNo: string;
    partnerRefundNo: string;
    refundAmount: number;
    reason?: string;
  }) {
    const client = this.getClient();
    const res = await client.paymentGatewayApi.refundOrder({
      originalPartnerReferenceNo: params.originalPartnerReferenceNo,
      merchantId: this.config.merchantId,
      partnerRefundNo: params.partnerRefundNo,
      refundAmount: { value: params.refundAmount.toFixed(2), currency: 'IDR' },
      reason: params.reason || 'Refund by merchant',
    });
    this.logger.log(`refundOrder response: ${JSON.stringify(res)}`);
    return res;
  }

  async consultPay() {
    const client = this.getClient();
    const res = await client.paymentGatewayApi.consultPay({
      merchantId: this.config.merchantId,
      amount: { value: '0.00', currency: 'IDR' },
      additionalInfo: {
        envInfo: {
          sourcePlatform: 'IPG' as any,
          terminalType: 'WEB' as any,
        },
      },
    });
    this.logger.log(`consultPay response: ${JSON.stringify(res)}`);
    return res;
  }

  // ──────────────────────────────────────────────
  // DANA Account Inquiry (Disbursement)
  // ──────────────────────────────────────────────

  async danaAccountInquiry(phoneNumber: string) {
    const client = this.getClient();
    const formatted = phoneNumber.startsWith('0')
      ? '62' + phoneNumber.slice(1)
      : phoneNumber;

    const res = await client.disbursementApi.danaAccountInquiry({
      customerNumber: formatted,
      amount: { value: '0.00', currency: 'IDR' },
      additionalInfo: {
        fundType: 'AGENT_TOPUP_FOR_USER_SETTLE',
      },
    });
    this.logger.log(`danaAccountInquiry response: ${JSON.stringify(res)}`);
    return res;
  }
}
