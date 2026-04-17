import { IsString, IsIn, Matches } from 'class-validator';

export class LinkWalletDto {
  @IsString()
  @IsIn(['gopay', 'ovo', 'dana', 'shopeepay', 'linkaja'])
  provider: 'gopay' | 'ovo' | 'dana' | 'shopeepay' | 'linkaja';

  @IsString()
  @Matches(/^08\d{8,12}$/, { message: 'Phone must be a valid Indonesian number starting with 08' })
  providerPhone: string;
}
