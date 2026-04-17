import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { LinkWalletDto } from './dto/link-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
  ) {}

  async findByUser(userId: string): Promise<Wallet[]> {
    return this.walletRepo.find({ where: { userId }, order: { linkedAt: 'DESC' } });
  }

  async findById(id: string): Promise<Wallet | null> {
    return this.walletRepo.findOne({ where: { id } });
  }

  async linkWallet(userId: string, dto: LinkWalletDto): Promise<Wallet> {
    const existing = await this.walletRepo.findOne({
      where: { userId, provider: dto.provider },
    });
    if (existing) {
      throw new ConflictException(`${dto.provider} wallet already linked`);
    }

    const randomBalance = Math.floor(Math.random() * (500000 - 50000 + 1)) + 50000;

    const wallet = this.walletRepo.create({
      userId,
      provider: dto.provider,
      providerPhone: dto.providerPhone,
      balance: randomBalance,
      isActive: true,
      inRouting: true,
      lastSynced: new Date(),
    });

    return this.walletRepo.save(wallet);
  }

  async unlinkWallet(userId: string, walletId: string): Promise<void> {
    const wallet = await this.walletRepo.findOne({ where: { id: walletId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    if (wallet.userId !== userId) {
      throw new ForbiddenException('Not your wallet');
    }
    await this.walletRepo.remove(wallet);
  }

  async updateWallet(
    userId: string,
    walletId: string,
    dto: UpdateWalletDto,
  ): Promise<Wallet> {
    const wallet = await this.walletRepo.findOne({ where: { id: walletId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    if (wallet.userId !== userId) {
      throw new ForbiddenException('Not your wallet');
    }

    if (dto.inRouting !== undefined) wallet.inRouting = dto.inRouting;
    if (dto.balance !== undefined) wallet.balance = dto.balance;

    return this.walletRepo.save(wallet);
  }

  async getSummary(userId: string) {
    const wallets = await this.walletRepo.find({
      where: { userId, isActive: true },
    });

    const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
    const activeCount = wallets.filter((w) => w.inRouting).length;
    const providers = wallets.map((w) => w.provider);

    return {
      totalBalance,
      walletCount: wallets.length,
      activeWallets: activeCount,
      activeInRouting: activeCount,
      providers,
      totalSaved: 0,
    };
  }
}
