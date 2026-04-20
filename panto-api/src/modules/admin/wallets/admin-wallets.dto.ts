import { IsBooleanString, IsIn, IsOptional } from 'class-validator';
import { PaginationDto } from '../common/pagination.dto';

const PROVIDERS = ['gopay', 'ovo', 'dana', 'shopeepay', 'linkaja'] as const;

export class ListWalletsQueryDto extends PaginationDto {
  @IsOptional()
  @IsIn(PROVIDERS as unknown as string[])
  provider?: (typeof PROVIDERS)[number];

  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @IsOptional()
  @IsBooleanString()
  isRealLinked?: string;
}
