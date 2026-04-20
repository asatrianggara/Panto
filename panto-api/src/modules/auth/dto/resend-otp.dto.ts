import { IsString, IsNotEmpty } from 'class-validator';

export class ResendOtpDto {
  @IsString()
  @IsNotEmpty()
  otpToken: string;
}
