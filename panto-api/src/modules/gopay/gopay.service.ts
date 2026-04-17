import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import { GoPayConfig, loadGoPayConfig } from './gopay.config';

// ─── Midtrans response types ─────────────────────────────────────────────────

export interface MidtransAction {
  name: string;
  method: 'GET' | 'POST';
  url: string;
}

export interface MidtransCreateAccountResponse {
  status_code: string;
  payment_type: 'gopay';
  account_status: 'PENDING';
  actions: MidtransAction[];
  metadata: { reference_id: string };
}

export interface MidtransGetAccountResponse {
  status_code: string;
  payment_type: 'gopay';
  account_status: 'ENABLED' | 'DISABLED' | 'PENDING' | 'EXPIRED';
  account_id: string;
  metadata?: {
    balance?: { value: string; currency: string };
    point_balance?: { value: string; currency: string };
  };
}

export interface MidtransChargeResponse {
  status_code: string;
  status_message: string;
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  currency: string;
  payment_type: 'gopay';
  transaction_time: string;
  transaction_status: string;
  actions: MidtransAction[];
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class GoPayService implements OnModuleInit {
  private readonly logger = new Logger(GoPayService.name);

  private config: GoPayConfig | null = null;
  private http: AxiosInstance | null = null;

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  onModuleInit() {
    this.config = loadGoPayConfig();

    if (!this.config) {
      this.logger.warn(
        'GoPay/Midtrans not initialized: MIDTRANS_SERVER_KEY is required in .env.',
      );
      return;
    }

    /**
     * Midtrans auth: HTTP Basic Auth
     * Username = serverKey, Password = "" (empty string)
     * Ref: https://github.com/Midtrans/midtrans-nodejs-client → httpClient.js
     */
    const basicAuth = Buffer.from(`${this.config.serverKey}:`).toString('base64');

    this.http = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30_000,
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json',
        'authorization': `Basic ${basicAuth}`,
      },
    });

    // ── Request interceptor ──────────────────────────────────────────────────
    this.http.interceptors.request.use((config) => {
      const method  = config.method?.toUpperCase() ?? 'GET';
      const url     = `${config.baseURL ?? ''}${config.url ?? ''}`;
      const body    = config.data ? JSON.stringify(config.data) : '(no body)';
      const headers = { ...config.headers };
      this.logger.log(`[http] → ${method} ${url}`);
      this.logger.log(`[http] → headers: ${JSON.stringify(headers)}`);
      this.logger.log(`[http] → body: ${body}`);
      return config;
    });

    // ── Response interceptor ─────────────────────────────────────────────────
    this.http.interceptors.response.use(
      (response) => {
        const method  = response.config.method?.toUpperCase() ?? '';
        const url     = response.config.url ?? '';
        const headers = JSON.stringify(response.headers);
        this.logger.log(`[http] ← ${response.status} ${method} ${url}`);
        this.logger.log(`[http] ← headers: ${headers}`);
        this.logger.log(`[http] ← body: ${JSON.stringify(response.data)}`);
        return response;
      },
      (error) => {
        const method    = error.config?.method?.toUpperCase() ?? '';
        const url       = error.config?.url ?? '';
        const status    = error.response?.status ?? 'NO_RESPONSE';
        const resHeaders = error.response?.headers ? JSON.stringify(error.response.headers) : '(none)';
        const resBody   = error.response?.data ? JSON.stringify(error.response.data) : '(none)';
        this.logger.error(`[http] ✗ ${status} ${method} ${url}`);
        this.logger.error(`[http] ✗ response headers: ${resHeaders}`);
        this.logger.error(`[http] ✗ response body: ${resBody}`);
        return Promise.reject(error);
      },
    );

    this.logger.log(
      `GoPay/Midtrans initialized [env=${this.config.env}] [base=${this.config.baseUrl}]`,
    );
  }

  isReady(): boolean {
    return !!this.config?.serverKey;
  }

  getConfig(): GoPayConfig | null {
    return this.config;
  }

  // ─── POST /v2/pay/account ─────────────────────────────────────────────────
  // Initiate GoPay tokenization account binding.
  //
  // phone_number format: local number WITHOUT country code prefix
  //   e.g. "08123456789" → phone_number: "8123456789", country_code: "62"
  // Ref: Midtrans Node.js SDK README gopay_partner example

  async initiateAccountBinding(
    phoneNumber: string,
  ): Promise<{ accountId: string; authUrl: string }> {
    const normalized = phoneNumber
      .replace(/^\+62/, '')
      .replace(/^62/, '')
      .replace(/^0/, '');

    const body = {
      payment_type: 'gopay',
      gopay_partner: {
        phone_number: normalized,
        country_code: '62',
        redirect_url: this.config!.redirectUrl,
      },
    };

    const basicAuth = Buffer.from(`${this.config!.serverKey}:`).toString('base64');
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
    };

    // this.logger.log(`[bind] POST /v2/pay/account → phone=${normalized}, redirect=${this.config!.redirectUrl}`);

    const res = await this.http!.post<MidtransCreateAccountResponse>('/v2/pay/account', body, { headers });
    const data = res.data;

    // Log raw response so we can inspect actual field names from Midtrans
    this.logger.log(`[bind] Midtrans raw response: ${JSON.stringify(data)}`);

    // Midtrans returns HTTP 200 even for errors — check body status_code
    const raw2 = data as unknown as Record<string, string>;
    const statusCode     = raw2.status_code ?? '';
    const statusMessage  = raw2.status_message ?? '';
    const channelCode    = raw2.channel_response_code ?? '';
    const channelMessage = raw2.channel_response_message ?? '';

    this.logger.log(
      `[bind] status_code=${statusCode} status_message="${statusMessage}" ` +
      `channel_response_code=${channelCode} channel_response_message="${channelMessage}"`,
    );

    if (statusCode !== '201') {
      // channel_response_code 2903 = GoPay Tokenization not enabled on this account.
      // Enable it at: Midtrans Dashboard → Settings → Payment Methods → GoPay (Tokenization toggle)
      const detail = channelMessage || statusMessage || `status_code ${statusCode}`;
      this.logger.error(
        `[bind] rejected — status_code=${statusCode} channel_code=${channelCode} detail="${detail}"`,
      );
      if (channelCode === '2903') {
        throw new Error(
          `GoPay Tokenization belum diaktifkan di akun Midtrans kamu. ` +
          `Aktifkan di Dashboard → Settings → Payment Methods → GoPay (toggle Tokenization). ` +
          `[channel_response_code: 2903]`,
        );
      }
      throw new Error(`Midtrans ${statusCode}${channelCode ? ` (channel ${channelCode})` : ''}: ${detail}`);
    }

    // account_id: Midtrans puts it in metadata.reference_id on the CREATE response
    const raw = data as unknown as Record<string, unknown>;
    const accountId = data.metadata?.reference_id || (raw.account_id as string) || '';

    // activation_url: deep-link / web URL the user opens in GoPay app
    const authUrl =
      data.actions?.find((a) => a.name === 'activation_url')?.url ||
      data.actions?.[0]?.url ||
      '';

    this.logger.log(`[bind] parsed accountId=${accountId}, authUrl=${authUrl}`);
    if (!accountId) this.logger.warn('[bind] accountId is empty — check raw response above');
    if (!authUrl)   this.logger.warn('[bind] authUrl is empty — check actions[] in raw response');

    return { accountId, authUrl };
  }

  // ─── GET /v2/pay/account/{accountId} ─────────────────────────────────────
  // Check binding status and balance.
  // Returns PENDING → ENABLED once user completes activation in GoPay app.

  async getAccount(accountId: string): Promise<MidtransGetAccountResponse> {
    const res = await this.http!.get<MidtransGetAccountResponse>(
      `/v2/pay/account/${accountId}`,
    );
    return res.data;
  }

  // Convenience: balance in integer Rupiah
  async balanceInquiry(accountId: string): Promise<number> {
    const account = await this.getAccount(accountId);
    const raw = account.metadata?.balance?.value ?? '0';
    return Math.floor(parseFloat(raw));
  }

  // ─── POST /v2/pay/account/{accountId}/unbind ──────────────────────────────
  // Unbind a linked GoPay tokenization account.
  // NOTE: POST with no request body (null) — per SDK source unlinkPaymentAccount()

  async accountUnbinding(accountId: string): Promise<void> {
    await this.http!.post(`/v2/pay/account/${accountId}/unbind`);
  }

  // ─── POST /v2/charge ──────────────────────────────────────────────────────
  // Charge a bound GoPay tokenization account directly.
  // Used by the transactions module once the account is linked.

  async charge(params: {
    orderId: string;
    amount: number;        // integer Rupiah, e.g. 50000
    accountId: string;
    callbackUrl?: string;
    customerPhone?: string;
  }): Promise<MidtransChargeResponse> {
    const body: Record<string, unknown> = {
      payment_type: 'gopay',
      transaction_details: {
        order_id: params.orderId,
        gross_amount: params.amount,
      },
      gopay: {
        account_id: params.accountId,
        enable_callback: true,
        callback_url: params.callbackUrl ?? this.config!.redirectUrl,
      },
    };

    if (params.customerPhone) {
      body.customer_details = { phone: params.customerPhone };
    }

    const res = await this.http!.post<MidtransChargeResponse>('/v2/charge', body);
    return res.data;
  }

  // ─── Webhook Signature Verification ──────────────────────────────────────
  // Midtrans notification signature formula (SHA512, hex-encoded):
  //   SHA512( orderId + statusCode + grossAmount + serverKey )
  //
  // Ref: Midtrans docs — Handling Notifications

  verifyWebhookSignature(
    orderId: string,
    statusCode: string,
    grossAmount: string,
    incomingSignature: string,
  ): boolean {
    if (!this.config?.serverKey) return true;
    const expected = crypto
      .createHash('sha512')
      .update(`${orderId}${statusCode}${grossAmount}${this.config.serverKey}`)
      .digest('hex');
    return expected === incomingSignature;
  }
}
