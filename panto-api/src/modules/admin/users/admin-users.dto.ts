import { IsBooleanString, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../common/pagination.dto';

export class ListUsersQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(['free', 'plus'])
  tier?: 'free' | 'plus';

  @IsOptional()
  @IsBooleanString()
  isActive?: string;
}
