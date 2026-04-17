import { IsString, Matches, Length, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Matches(/^08\d{8,12}$/, { message: 'Phone must be a valid Indonesian number starting with 08' })
  phone: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @Length(6, 6, { message: 'PIN must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'PIN must contain only digits' })
  pin: string;
}
