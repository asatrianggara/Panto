import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { GoPayService } from './gopay.service';

@Controller('api/gopay')
export class GoPayController {
  private readonly logger = new Logger(GoPayController.name);

  constructor(
    private readonly gopayService: GoPayService,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
  ) {}

  // ─── Health / Status ─────────────────────────────────────────────────────────

  @Get('status')
  @UseGuards(JwtAuthGuard)
  getStatus() {
    const cfg = this.gopayService.getConfig();
    return {
      success: true,
      data: {
        initialized: this.gopayService.isReady(),
        env: cfg?.env ?? 'not configured',
        gateway: 'midtrans',
      },
    };
  }

  // ─── Step 1: Initiate Account Binding ────────────────────────────────────────
  // POST /api/gopay/bind
  // Body: { phoneNumber: string }
  // Returns activation URL to open in GoPay app

  @Post('bind')
  @UseGuards(JwtAuthGuard)
  async startBind(
    @Body() body: { phoneNumber: string },
    @CurrentUser() user: User,
  ) {
    if (!body.phoneNumber) {
      throw new HttpException(
        { success: false, message: 'phoneNumber wajib diisi' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const existing = await this.walletRepo.findOne({
      where: { userId: user.id, provider: 'gopay' },
    });
    if (existing) {
      throw new HttpException(
        { success: false, message: 'GoPay sudah terhubung ke akun ini' },
        HttpStatus.CONFLICT,
      );
    }

    if (!this.gopayService.isReady()) {
      return {
        success: true,
        data: {
          mode: 'simulate',
          message: 'MIDTRANS_SERVER_KEY belum dikonfigurasi. Gunakan mode simulasi.',
        },
      };
    }

    try {
      this.logger.log(`[bind] start — userId=${user.id} phone=${body.phoneNumber}`);

      const { accountId, authUrl } = await this.gopayService.initiateAccountBinding(
        body.phoneNumber,
      );

      this.logger.log(`[bind] success — accountId=${accountId} authUrl=${authUrl}`);
      return { success: true, data: { mode: 'real', authUrl, accountId } };
    } catch (err) {
      this.logger.error(`[bind] Midtrans error: ${this.extractErrorDetail(err)}`);
      throw this.wrapError(err, 'Gagal memulai binding GoPay via Midtrans');
    }
  }

  // ─── Step 2: OAuth Callback (GoPay/Midtrans redirects here) ──────────────────
  // GET /api/gopay/callback
  // Query: account_id, result (success | failed)

  @Get('callback')
  async handleCallback(
    @Query('account_id') accountId: string,
    @Query('result') result: string,
    @Res() res: Response,
  ) {
    const frontendBase =
      this.gopayService.getConfig()?.frontendCallbackUrl ??
      'http://localhost:5173/gopay/callback';

    if (result === 'failed' || !accountId) {
      return res.redirect(
        `${frontendBase}?error=${encodeURIComponent(result === 'failed' ? 'binding_failed' : 'no_account_id')}`,
      );
    }

    return res.redirect(
      `${frontendBase}?success=true&accountId=${encodeURIComponent(accountId)}`,
    );
  }

  // ─── Step 3: Complete Binding (confirm + save wallet) ────────────────────────
  // POST /api/gopay/bind/complete
  // Body: { accountId: string, phoneNumber: string }

  @Post('bind/complete')
  @UseGuards(JwtAuthGuard)
  async completeBind(
    @Body() body: { accountId: string; phoneNumber: string },
    @CurrentUser() user: User,
  ) {
    if (!body.accountId || !body.phoneNumber) {
      throw new HttpException(
        { success: false, message: 'accountId dan phoneNumber wajib diisi' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const existing = await this.walletRepo.findOne({
      where: { userId: user.id, provider: 'gopay' },
    });
    if (existing) {
      throw new HttpException(
        { success: false, message: 'GoPay sudah terhubung' },
        HttpStatus.CONFLICT,
      );
    }

    try {
      // Confirm account is ENABLED and fetch balance
      const account = await this.gopayService.getAccount(body.accountId);

      if (account.account_status !== 'ENABLED') {
        throw new HttpException(
          {
            success: false,
            message: `Akun GoPay belum aktif (status: ${account.account_status})`,
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      const balance = Math.floor(
        parseFloat(account.metadata?.balance?.value ?? '0'),
      );

      const wallet = this.walletRepo.create({
        userId: user.id,
        provider: 'gopay',
        providerPhone: body.phoneNumber,
        balance,
        isActive: true,
        inRouting: true,
        isRealLinked: true,
        providerAccessToken: body.accountId, // store accountId as the token reference
        lastSynced: new Date(),
      });

      const saved = await this.walletRepo.save(wallet);
      return { success: true, data: saved };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw this.wrapError(err, 'Gagal menyimpan koneksi GoPay');
    }
  }

  // ─── Simulate Binding (no Midtrans credentials configured) ───────────────────

  @Post('bind/simulate')
  @UseGuards(JwtAuthGuard)
  async simulateBind(
    @Body() body: { phoneNumber: string },
    @CurrentUser() user: User,
  ) {
    const existing = await this.walletRepo.findOne({
      where: { userId: user.id, provider: 'gopay' },
    });
    if (existing) {
      throw new HttpException(
        { success: false, message: 'GoPay sudah terhubung' },
        HttpStatus.CONFLICT,
      );
    }

    const balance = Math.floor(Math.random() * (500_000 - 50_000 + 1)) + 50_000;
    const wallet = this.walletRepo.create({
      userId: user.id,
      provider: 'gopay',
      providerPhone: body.phoneNumber,
      balance,
      isActive: true,
      inRouting: true,
      isRealLinked: false,
    });

    const saved = await this.walletRepo.save(wallet);
    return { success: true, data: saved };
  }

  // ─── Balance Sync ─────────────────────────────────────────────────────────────

  @Post('balance')
  @UseGuards(JwtAuthGuard)
  async syncBalance(@CurrentUser() user: User) {
    const wallet = await this.walletRepo.findOne({
      where: { userId: user.id, provider: 'gopay' },
    });
    if (!wallet) {
      throw new HttpException(
        { success: false, message: 'GoPay belum terhubung' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (!wallet.isRealLinked || !wallet.providerAccessToken) {
      const balance = Math.floor(Math.random() * (500_000 - 900 + 1)) + 900;
      await this.walletRepo.update(wallet.id, { balance, lastSynced: new Date() });
      return { success: true, data: { balance, mode: 'simulated' } };
    }

    try {
      // providerAccessToken stores the Midtrans account_id
      const balance = await this.gopayService.balanceInquiry(wallet.providerAccessToken);
      await this.walletRepo.update(wallet.id, { balance, lastSynced: new Date() });
      return { success: true, data: { balance, mode: 'real' } };
    } catch (err) {
      this.logger.warn('GoPay live balance fetch failed, returning cached', err);
      return { success: true, data: { balance: wallet.balance, mode: 'cached' } };
    }
  }

  // ─── Unbind ───────────────────────────────────────────────────────────────────

  @Post('unbind')
  @UseGuards(JwtAuthGuard)
  async unbind(@CurrentUser() user: User) {
    const wallet = await this.walletRepo.findOne({
      where: { userId: user.id, provider: 'gopay' },
    });
    if (!wallet) {
      throw new HttpException(
        { success: false, message: 'GoPay belum terhubung' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (wallet.isRealLinked && wallet.providerAccessToken) {
      try {
        await this.gopayService.accountUnbinding(wallet.providerAccessToken);
      } catch (err) {
        this.logger.warn('GoPay Midtrans unbind failed, proceeding with local delete', err);
      }
    }

    await this.walletRepo.delete(wallet.id);
    return { success: true, message: 'GoPay berhasil diputuskan' };
  }

  // ─── Webhook (Midtrans payment notifications) ─────────────────────────────────

  @Post('webhook/notify')
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    const { order_id, status_code, gross_amount, signature_key } = req.body ?? {};

    if (
      !this.gopayService.verifyWebhookSignature(
        order_id,
        status_code,
        gross_amount,
        signature_key,
      )
    ) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    this.logger.log(`GoPay webhook: order=${order_id} status=${status_code}`);
    // TODO: update transaction status in DB based on order_id + transaction_status
    return res.json({ success: true });
  }

  // ─── Error Helper ─────────────────────────────────────────────────────────────

  private extractErrorDetail(err: unknown): string {
    type ApiErr = { response?: { data?: { error_messages?: string[]; message?: string }; status?: number }; message?: string };
    const e = err as ApiErr;
    const data = e?.response?.data;
    const httpStatus = e?.response?.status;
    const detail = data?.error_messages?.[0] ?? data?.message ?? (err as Error)?.message ?? 'unknown';
    return httpStatus ? `HTTP ${httpStatus} — ${detail}` : detail;
  }

  private wrapError(err: unknown, context: string): HttpException {
    return new HttpException(
      { success: false, message: context, error: this.extractErrorDetail(err) },
      HttpStatus.BAD_GATEWAY,
    );
  }
}
