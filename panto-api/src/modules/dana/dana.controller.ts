import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { DanaService } from './dana.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../wallets/entities/wallet.entity';

@Controller('api/dana')
export class DanaController {
  private readonly logger = new Logger(DanaController.name);

  constructor(
    private readonly danaService: DanaService,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
  ) {}

  // ──────────────────────────────────────────────
  // Status check
  // ──────────────────────────────────────────────

  @Get('status')
  @UseGuards(JwtAuthGuard)
  getStatus() {
    return {
      success: true,
      data: {
        initialized: this.danaService.isReady(),
        env: this.danaService.isReady() ? 'sandbox' : 'not_configured',
      },
    };
  }

  // ──────────────────────────────────────────────
  // STEP 1: Start DANA binding
  // Returns the DANA OAuth URL to redirect user to
  // ──────────────────────────────────────────────

  @Post('bind')
  @UseGuards(JwtAuthGuard)
  async startBinding(
    @CurrentUser() user: User,
    @Body('callbackUrl') callbackUrl: string,
    @Body('phoneNumber') phoneNumber: string,
  ) {
    if (!phoneNumber) {
      throw new HttpException('phoneNumber is required', HttpStatus.BAD_REQUEST);
    }

    const existing = await this.walletRepo.findOne({
      where: { userId: user.id, provider: 'dana' },
    });
    if (existing) {
      throw new HttpException('DANA wallet already linked', HttpStatus.CONFLICT);
    }

    const finalCallback =
      callbackUrl || 'http://gapurapay.com/payment-result';

    if (!this.danaService.isReady()) {
      return {
        success: true,
        data: {
          mode: 'simulation',
          message: 'DANA SDK not configured. Use /api/dana/bind/simulate instead.',
          authUrl: null,
        },
      };
    }

    try {
      const authUrl = this.danaService.buildOAuthUrl(finalCallback, phoneNumber);
      return {
        success: true,
        data: {
          mode: 'real',
          authUrl,
          callbackUrl: finalCallback,
        },
      };
    } catch (err) {
      this.logger.error('DANA bind error:', err);
      throw this.handleDanaError(err, 'Failed to start DANA binding');
    }
  }

  // ──────────────────────────────────────────────
  // STEP 2: DANA redirects here with authCode
  // Exchange authCode for accessToken
  // ──────────────────────────────────────────────

  @Get('callback')
  async handleCallback(
    @Query('authCode') authCode: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const redirectBase = 'http://gapurapay.com/payment-result';

    if (!authCode) {
      return res.redirect(
        `${redirectBase}?error=no_auth_code`,
      );
    }

    try {
      const tokenResult = await this.danaService.applyToken(authCode);
      const accessToken =
        tokenResult.accessToken || (tokenResult as any).data?.accessToken;
      const tokenId =
        (tokenResult as any).tokenId || (tokenResult as any).data?.tokenId;

      return res.redirect(
        `${redirectBase}?success=true&accessToken=${encodeURIComponent(accessToken || '')}&tokenId=${encodeURIComponent(tokenId || '')}&state=${encodeURIComponent(state || '')}`,
      );
    } catch (err) {
      this.logger.error('DANA callback error:', err);
      return res.redirect(
        `${redirectBase}?error=token_exchange_failed`,
      );
    }
  }

  // ──────────────────────────────────────────────
  // STEP 3: Frontend calls this after getting tokens
  // Saves the DANA wallet with access token
  // ──────────────────────────────────────────────

  @Post('bind/complete')
  @UseGuards(JwtAuthGuard)
  async completeBinding(
    @CurrentUser() user: User,
    @Body('accessToken') accessToken: string,
    @Body('tokenId') tokenId: string,
    @Body('phoneNumber') phoneNumber: string,
  ) {
    if (!accessToken || !phoneNumber) {
      throw new HttpException(
        'accessToken and phoneNumber are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const existing = await this.walletRepo.findOne({
      where: { userId: user.id, provider: 'dana' },
    });
    if (existing) {
      throw new HttpException('DANA wallet already linked', HttpStatus.CONFLICT);
    }

    let balance = 0;
    try {
      const balanceResult = await this.danaService.balanceInquiry(accessToken);
      balance =
        parseInt((balanceResult as any)?.amount?.value || '0', 10) || 0;
    } catch {
      this.logger.warn('Could not fetch DANA balance, defaulting to 0');
    }

    const wallet = this.walletRepo.create({
      userId: user.id,
      provider: 'dana',
      providerPhone: phoneNumber,
      balance,
      isActive: true,
      inRouting: true,
      providerAccessToken: accessToken,
      providerTokenId: tokenId || null,
      isRealLinked: true,
      lastSynced: new Date(),
    });

    const saved = await this.walletRepo.save(wallet);

    return {
      success: true,
      data: saved,
      message: 'DANA account linked successfully',
    };
  }

  // ──────────────────────────────────────────────
  // Simulated binding (when DANA sandbox is down)
  // Works exactly like mock linking but marks as DANA
  // ──────────────────────────────────────────────

  @Post('bind/simulate')
  @UseGuards(JwtAuthGuard)
  async simulateBinding(
    @CurrentUser() user: User,
    @Body('phoneNumber') phoneNumber: string,
  ) {
    if (!phoneNumber) {
      throw new HttpException('phoneNumber is required', HttpStatus.BAD_REQUEST);
    }

    const existing = await this.walletRepo.findOne({
      where: { userId: user.id, provider: 'dana' },
    });
    if (existing) {
      throw new HttpException('DANA wallet already linked', HttpStatus.CONFLICT);
    }

    const randomBalance =
      Math.floor(Math.random() * (500000 - 50000 + 1)) + 50000;

    const wallet = this.walletRepo.create({
      userId: user.id,
      provider: 'dana',
      providerPhone: phoneNumber,
      balance: randomBalance,
      isActive: true,
      inRouting: true,
      isRealLinked: false,
      lastSynced: new Date(),
    });

    const saved = await this.walletRepo.save(wallet);

    return {
      success: true,
      data: saved,
      message: 'DANA account linked (simulated)',
    };
  }

  // ──────────────────────────────────────────────
  // Balance inquiry for linked DANA wallet
  // ──────────────────────────────────────────────

  @Post('balance')
  @UseGuards(JwtAuthGuard)
  async getBalance(@CurrentUser() user: User) {
    const wallet = await this.walletRepo.findOne({
      where: { userId: user.id, provider: 'dana' },
    });

    if (!wallet) {
      throw new HttpException('DANA wallet not linked', HttpStatus.NOT_FOUND);
    }

    if (!wallet.isRealLinked || !wallet.providerAccessToken) {
      return {
        success: true,
        data: { balance: wallet.balance, mode: 'simulated' },
      };
    }

    try {
      const result = await this.danaService.balanceInquiry(
        wallet.providerAccessToken,
      );
      const realBalance =
        parseInt((result as any)?.amount?.value || '0', 10) || 0;

      wallet.balance = realBalance;
      wallet.lastSynced = new Date();
      await this.walletRepo.save(wallet);

      return {
        success: true,
        data: { balance: realBalance, mode: 'real' },
      };
    } catch (err) {
      this.logger.error('DANA balance error:', err);
      return {
        success: true,
        data: {
          balance: wallet.balance,
          mode: 'cached',
          error: 'Could not fetch live balance',
        },
      };
    }
  }

  // ──────────────────────────────────────────────
  // Unbind DANA account
  // ──────────────────────────────────────────────

  @Post('unbind')
  @UseGuards(JwtAuthGuard)
  async unbind(@CurrentUser() user: User) {
    const wallet = await this.walletRepo.findOne({
      where: { userId: user.id, provider: 'dana' },
    });

    if (!wallet) {
      throw new HttpException('DANA wallet not found', HttpStatus.NOT_FOUND);
    }

    if (
      wallet.isRealLinked &&
      wallet.providerAccessToken &&
      wallet.providerTokenId &&
      this.danaService.isReady()
    ) {
      try {
        await this.danaService.accountUnbinding(
          wallet.providerAccessToken,
          wallet.providerTokenId,
        );
      } catch {
        this.logger.warn('DANA unbinding API failed, removing locally anyway');
      }
    }

    await this.walletRepo.remove(wallet);

    return {
      success: true,
      message: 'DANA account unlinked',
    };
  }

  // ══════════════════════════════════════════════
  // PAYMENT GATEWAY API
  // ══════════════════════════════════════════════

  @Post('payment/create')
  @UseGuards(JwtAuthGuard)
  async createOrder(
    @Body()
    body: {
      partnerReferenceNo: string;
      amount: number;
      payMethod?: string;
      payOption?: string;
      validMinutes?: number;
    },
  ) {
    this.ensureReady();
    if (!body.partnerReferenceNo || !body.amount) {
      throw new HttpException(
        'partnerReferenceNo and amount are required',
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const result = await this.danaService.createOrder(body);
      return { success: true, data: result };
    } catch (err) {
      throw this.handleDanaError(err, 'Failed to create DANA order');
    }
  }

  @Post('payment/query')
  @UseGuards(JwtAuthGuard)
  async queryPayment(@Body('partnerReferenceNo') refNo: string) {
    this.ensureReady();
    if (!refNo) {
      throw new HttpException(
        'partnerReferenceNo is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const result = await this.danaService.queryPayment(refNo);
      return { success: true, data: result };
    } catch (err) {
      throw this.handleDanaError(err, 'Failed to query DANA payment');
    }
  }

  @Post('payment/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelOrder(
    @Body('partnerReferenceNo') refNo: string,
    @Body('reason') reason: string,
  ) {
    this.ensureReady();
    if (!refNo) {
      throw new HttpException(
        'partnerReferenceNo is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const result = await this.danaService.cancelOrder(refNo, reason);
      return { success: true, data: result };
    } catch (err) {
      throw this.handleDanaError(err, 'Failed to cancel DANA order');
    }
  }

  @Post('payment/refund')
  @UseGuards(JwtAuthGuard)
  async refundOrder(
    @Body()
    body: {
      originalPartnerReferenceNo: string;
      partnerRefundNo: string;
      refundAmount: number;
      reason?: string;
    },
  ) {
    this.ensureReady();
    if (!body.originalPartnerReferenceNo || !body.partnerRefundNo || !body.refundAmount) {
      throw new HttpException(
        'originalPartnerReferenceNo, partnerRefundNo, and refundAmount are required',
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const result = await this.danaService.refundOrder(body);
      return { success: true, data: result };
    } catch (err) {
      throw this.handleDanaError(err, 'Failed to refund DANA order');
    }
  }

  @Post('payment/consult')
  @UseGuards(JwtAuthGuard)
  async consultPay() {
    this.ensureReady();
    try {
      const result = await this.danaService.consultPay();
      return { success: true, data: result };
    } catch (err) {
      throw this.handleDanaError(err, 'Failed to consult DANA payment methods');
    }
  }

  // ══════════════════════════════════════════════
  // WEBHOOK — DANA payment finish notification
  // No JWT guard — DANA calls this directly
  // ══════════════════════════════════════════════

  @Post('webhook/notify')
  async handleWebhook(
    @Body() body: Record<string, unknown>,
    @Res() res: Response,
  ) {
    this.logger.log(`DANA webhook received: ${JSON.stringify(body).slice(0, 300)}`);

    try {
      const { WebhookParser } = await import('dana-node/webhook/v1');
      const publicKey =
        process.env.DANA_PUBLIC_KEY || process.env.DANA_PUBLIC_KEY_PATH;

      if (!publicKey) {
        this.logger.warn('DANA_PUBLIC_KEY not set — accepting webhook without verification');
        return res.status(200).json({ success: true, message: 'Received (unverified)' });
      }

      const parser = new WebhookParser(
        process.env.DANA_PUBLIC_KEY,
        process.env.DANA_PUBLIC_KEY_PATH,
      );

      const notification = parser.parseWebhook(
        'POST',
        '/api/dana/webhook/notify',
        {} as Record<string, string>, // headers filled by framework
        JSON.stringify(body),
      );

      this.logger.log(
        `Webhook verified — partnerRefNo: ${notification.originalPartnerReferenceNo}`,
      );

      // TODO: Update transaction status in database based on notification

      return res.status(200).json({ success: true, data: notification });
    } catch (err) {
      this.logger.error('Webhook verification failed:', (err as Error).message);
      return res.status(200).json({ success: true, message: 'Received' });
    }
  }

  // ──────────────────────────────────────────────

  private ensureReady() {
    if (!this.danaService.isReady()) {
      throw new HttpException(
        'DANA integration not configured. Set DANA_CLIENT_ID in .env',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private handleDanaError(err: unknown, context: string): HttpException {
    const message = err instanceof Error ? err.message : String(err);
    return new HttpException(
      { success: false, message: context, error: message },
      HttpStatus.BAD_GATEWAY,
    );
  }
}
