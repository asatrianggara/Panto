/**
 * =========================================================================
 * OtpService — MOCK IMPLEMENTATION
 * =========================================================================
 *
 * THIS IS A MOCK. Real SMS / email OTP dispatch is NOT implemented.
 *
 * How the mock works:
 *   1. After successful phone + PIN verification (login) or after a
 *      successful register, the caller issues a short-lived "otpToken"
 *      (a JWT with purpose='login-challenge', TTL ~5 min). That token
 *      ALONE cannot access protected routes — it has a different purpose
 *      claim than a real access token.
 *   2. The client then POSTs { otpToken, otp } to /api/auth/otp/verify.
 *   3. Verification rules for the MOCK:
 *        - otpToken must be valid and not expired.
 *        - The otp value must match one of the MASTER_BYPASS_CODES
 *          defined below. No per-user OTP is generated or stored yet.
 *   4. On success, a real access token (purpose='access') is minted and
 *      returned. The existing JwtStrategy accepts it unchanged.
 *
 * Bypass code(s) that mobile / web clients should use for demos:
 *   - "123456"  (master bypass — always accepted)
 *
 * TODO for the real implementation:
 *   - Generate a cryptographically random 6-digit code per challenge.
 *   - Store it hashed (bcrypt) with user id + expiry in a DB table
 *     (e.g. otp_challenges) and invalidate on use.
 *   - Rate-limit resend (e.g. 1 per 60s, max 5 per hour).
 *   - Dispatch via an SMS gateway (Twilio / Vonage / local PPOB vendor).
 *   - Track attempt count and lock out after N failed attempts.
 *   - Consider WhatsApp / email fallback channels.
 * =========================================================================
 */

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/** Master bypass codes accepted by the mock. Keep in sync with mobile/web. */
export const MASTER_BYPASS_CODES: ReadonlyArray<string> = ['123456'];

/** Lifetime of the login-challenge (otp) token, in seconds. */
export const OTP_TOKEN_TTL_SECONDS = 300; // 5 minutes

/** Purpose claim used to distinguish OTP challenge tokens from access tokens. */
export const OTP_TOKEN_PURPOSE = 'login-challenge';

export interface OtpTokenPayload {
  userId: string;
  phone: string;
  purpose: typeof OTP_TOKEN_PURPOSE;
}

export interface OtpChallenge {
  otpToken: string;
  phoneNumber: string;
  expiresInSeconds: number;
}

@Injectable()
export class OtpService {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Issue a short-lived otpToken after successful phone+PIN verification.
   * The returned token is NOT an access token — it has a distinct purpose
   * claim and is rejected by the standard JwtStrategy because the guard
   * loads users by payload.userId and does not inspect purpose, but the
   * lifetime is very short and the OTP verify step is what mints the
   * real access token. (We additionally validate the purpose claim on
   * the verify step.)
   */
  issueChallenge(userId: string, phone: string): OtpChallenge {
    const payload: OtpTokenPayload = {
      userId,
      phone,
      purpose: OTP_TOKEN_PURPOSE,
    };

    const otpToken = this.jwtService.sign(payload, {
      expiresIn: `${OTP_TOKEN_TTL_SECONDS}s`,
    });

    // Mocked "dispatch"
    console.log(
      `[OtpService] (MOCK) Issued OTP challenge for userId=${userId} phone=${phone}. ` +
        `Use bypass code: ${MASTER_BYPASS_CODES.join(', ')}`,
    );

    return {
      otpToken,
      phoneNumber: phone,
      expiresInSeconds: OTP_TOKEN_TTL_SECONDS,
    };
  }

  /**
   * Validate an existing otpToken and return its payload. Throws a 401
   * with code=OTP_EXPIRED if invalid/expired.
   */
  verifyOtpToken(otpToken: string): OtpTokenPayload {
    let payload: OtpTokenPayload;
    try {
      payload = this.jwtService.verify<OtpTokenPayload>(otpToken);
    } catch {
      throw new UnauthorizedException({
        message: 'OTP expired',
        code: 'OTP_EXPIRED',
      });
    }

    if (!payload || payload.purpose !== OTP_TOKEN_PURPOSE) {
      throw new UnauthorizedException({
        message: 'OTP expired',
        code: 'OTP_EXPIRED',
      });
    }

    return payload;
  }

  /**
   * Validate the OTP code itself against the mock bypass list.
   * Returns the decoded payload on success. Throws 401 with
   * code=INVALID_OTP on a wrong code.
   */
  verifyOtpCode(otpToken: string, otp: string): OtpTokenPayload {
    const payload = this.verifyOtpToken(otpToken);

    if (!/^\d{6}$/.test(otp)) {
      throw new BadRequestException({
        message: 'Invalid OTP',
        code: 'INVALID_OTP',
      });
    }

    if (!MASTER_BYPASS_CODES.includes(otp)) {
      throw new UnauthorizedException({
        message: 'Invalid OTP',
        code: 'INVALID_OTP',
      });
    }

    return payload;
  }

  /**
   * Re-issue a fresh otpToken for the same user/phone. Logs the "send".
   */
  resendChallenge(otpToken: string): OtpChallenge {
    const payload = this.verifyOtpToken(otpToken);
    console.log(
      `[OtpService] (MOCK) Resending OTP for userId=${payload.userId} phone=${payload.phone}`,
    );
    return this.issueChallenge(payload.userId, payload.phone);
  }
}
