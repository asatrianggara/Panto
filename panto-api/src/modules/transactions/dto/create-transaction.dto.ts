import {
  IsInt,
  Min,
  Max,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SplitItemDto {
  @IsUUID()
  walletId: string;

  @IsInt()
  @Min(1)
  amount: number;
}

export class CreateTransactionDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsInt()
  @Min(1000)
  @Max(50000000)
  totalAmount: number;

  @IsString()
  merchantName: string;

  @IsOptional()
  @IsString()
  merchantCategory?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitItemDto)
  splits: SplitItemDto[];

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
