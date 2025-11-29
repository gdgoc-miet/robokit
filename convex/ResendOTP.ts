import Resend from '@auth/core/providers/resend';
import {Resend as ResendAPI} from 'resend';

// Simple random string generator for OTPs
function generateOTP(length: number = 8): string {
  const chars = '0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

// OTP for email verification during signup
export const ResendOTP = Resend({
  id: 'resend-otp',
  apiKey: process.env.AUTH_RESEND_KEY,
  async generateVerificationToken() {
    return generateOTP(8);
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async sendVerificationRequest({identifier: email, provider, token}: any) {
    const resend = new ResendAPI(provider.apiKey);
    const {error} = await resend.emails.send({
      from: 'RobKit <noreply@robkit.dev>',
      to: [email],
      subject: 'Verify your email for RobKit',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">Welcome to RobKit! 🤖</h1>
          <p style="color: #666; font-size: 16px;">Please verify your email address to complete your registration.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="color: #333; font-size: 14px; margin-bottom: 10px;">Your verification code is:</p>
            <p style="font-size: 32px; font-weight: bold; color: #4F46E5; letter-spacing: 4px; margin: 0;">${
          token}</p>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center;">This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Failed to send verification email:', error);
      throw new Error('Could not send verification email');
    }
  },
});

// OTP for password reset
export const ResendOTPPasswordReset = Resend({
  id: 'resend-otp-reset',
  apiKey: process.env.AUTH_RESEND_KEY,
  async generateVerificationToken() {
    return generateOTP(8);
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async sendVerificationRequest({identifier: email, provider, token}: any) {
    const resend = new ResendAPI(provider.apiKey);
    const {error} = await resend.emails.send({
      from: 'RobKit <noreply@robkit.dev>',
      to: [email],
      subject: 'Reset your RobKit password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">Password Reset 🔐</h1>
          <p style="color: #666; font-size: 16px;">You requested to reset your password for RobKit.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="color: #333; font-size: 14px; margin-bottom: 10px;">Your password reset code is:</p>
            <p style="font-size: 32px; font-weight: bold; color: #DC2626; letter-spacing: 4px; margin: 0;">${
          token}</p>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center;">This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Failed to send password reset email:', error);
      throw new Error('Could not send password reset email');
    }
  },
});
