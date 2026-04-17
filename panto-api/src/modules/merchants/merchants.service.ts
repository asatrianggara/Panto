import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Merchant } from './entities/merchant.entity';

@Injectable()
export class MerchantsService {
  constructor(
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
  ) {}

  findAll(): Promise<Merchant[]> {
    return this.merchantRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Merchant> {
    const merchant = await this.merchantRepo.findOne({ where: { id } });
    if (!merchant) throw new NotFoundException('Merchant not found');
    return merchant;
  }

  buildQrPayload(merchant: Merchant) {
    return {
      type: 'panto-merchant',
      merchantId: merchant.id,
      merchantName: merchant.name,
      merchantCategory: merchant.category,
      totalBill: merchant.defaultBill || null,
      issuedAt: new Date().toISOString(),
    };
  }
}
