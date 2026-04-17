import { IsInt, Min, Max, IsString, IsOptional } from 'class-validator';

export class CalculateSplitDto {
  @IsInt()
  @Min(1000)
  @Max(50000000)
  amount: number;

  @IsString()
  merchantName: string;

  @IsOptional()
  @IsString()
  merchantCategory?: string;
}
