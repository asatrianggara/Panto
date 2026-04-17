import { IsString, Matches, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @Matches(/^08\d{8,12}$/, { message: 'Phone must be a valid Indonesian number starting with 08' })
  phone: string;

  @IsString()
  @Length(6, 6, { message: 'PIN must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'PIN must contain only digits' })
  pin: string;
}
