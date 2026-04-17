import { IsOptional, IsBoolean, IsInt, Min } from 'class-validator';

export class UpdateWalletDto {
  @IsOptional()
  @IsBoolean()
  inRouting?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  balance?: number;
}
