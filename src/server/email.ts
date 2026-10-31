/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import nodemailer from 'nodemailer';

export interface EmailSendResult {
  success: boolean;
  providerConfigured: boolean;
  message: string;
  devOtp?: string;
  error?: string;
}

// Check if SMTP environment variables are configured
export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

// Create Nodemailer transport with Gmail support
function getMailTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host === 'smtp.gmail.com' || (user && user.includes('@gmail.com'))) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Send OTP verification email for account registration
 */
export async function sendRegistrationOtpEmail(
  toEmail: string,
  firstName: string,
  otp: string
): Promise<EmailSendResult> {
  const configured = isEmailConfigured();
  const from = process.env.SMTP_FROM || '"Synapse Reasoning Analytics" <noreply@reasoniq.app>';

  if (!configured) {
    console.info(`[Auth Email Service] SMTP is not configured. For local development/testing, OTP for ${toEmail} is: ${otp}`);
    return {
      success: true,
      providerConfigured: false,
      message: 'SMTP credentials not detected in .env. Setup instructions provided in .env.example. OTP displayed for local testing.',
      devOtp: otp,
    };
  }

  try {
    const transporter = getMailTransporter();
    await transporter.sendMail({
      from,
      to: toEmail,
      subject: 'Your Synapse Analytics Verification Code: ' + otp,
      text: `Hello ${firstName},\n\nYour 6-digit verification code is: ${otp}\n\nThis code expires in 5 minutes.\nDo not share this code with anyone.\n\nBest regards,\nSynapse Analytics Team`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #0f172a; font-size: 24px; font-weight: 800; margin: 0;">Synapse<span style="color: #6366f1;">Analytics</span></h1>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Competitive Reasoning & Analytical Exam Portal</p>
          </div>
          <p style="color: #334155; font-size: 15px;">Hello <strong>${firstName}</strong>,</p>
          <p style="color: #334155; font-size: 14px; line-height: 1.5;">Thank you for registering. Please enter the following 6-digit one-time password (OTP) to verify your email and activate your account:</p>
          <div style="margin: 24px 0; text-align: center;">
            <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #4338ca; background: #e0e7ff; padding: 12px 24px; border-radius: 8px; font-family: monospace;">${otp}</span>
          </div>
          <p style="color: #64748b; font-size: 13px;">⏱️ This verification code is single-use and will expire in <strong>5 minutes</strong>.</p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">If you did not request this verification, please safely ignore this email.</p>
        </div>
      `,
    });

    return {
      success: true,
      providerConfigured: true,
      message: 'Verification code sent to your email address.',
    };
  } catch (error: any) {
    console.error('[Auth Email Service] Error sending email via SMTP:', error);
    return {
      success: false,
      providerConfigured: true,
      message: 'Failed to deliver verification email via SMTP server.',
      error: error.message || 'SMTP Connection Error',
    };
  }
}

/**
 * Send Password Reset OTP email
 */
export async function sendPasswordResetOtpEmail(
  toEmail: string,
  otp: string
): Promise<EmailSendResult> {
  const configured = isEmailConfigured();
  const from = process.env.SMTP_FROM || '"Synapse Reasoning Analytics" <noreply@reasoniq.app>';

  if (!configured) {
    console.info(`[Auth Email Service] SMTP is not configured. For local testing, Password Reset OTP for ${toEmail} is: ${otp}`);
    return {
      success: true,
      providerConfigured: false,
      message: 'SMTP credentials not configured in .env. Reset OTP displayed for testing.',
      devOtp: otp,
    };
  }

  try {
    const transporter = getMailTransporter();
    await transporter.sendMail({
      from,
      to: toEmail,
      subject: 'Reset Your Synapse Analytics Password: ' + otp,
      text: `Hello,\n\nYour 6-digit password reset code is: ${otp}\n\nThis code expires in 10 minutes.\n\nBest regards,\nSynapse Analytics Team`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #0f172a; font-size: 24px; font-weight: 800; margin: 0;">Synapse<span style="color: #6366f1;">Analytics</span></h1>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Password Recovery</p>
          </div>
          <p style="color: #334155; font-size: 14px;">We received a request to reset your account password. Enter this verification code to proceed:</p>
          <div style="margin: 24px 0; text-align: center;">
            <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #dc2626; background: #fee2e2; padding: 12px 24px; border-radius: 8px; font-family: monospace;">${otp}</span>
          </div>
          <p style="color: #64748b; font-size: 13px;">⏱️ This code will expire in <strong>10 minutes</strong>.</p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">If you did not request a password reset, you can safely ignore this email.</p>
        </div>
      `,
    });

    return {
      success: true,
      providerConfigured: true,
      message: 'Password reset code sent to your email address.',
    };
  } catch (error: any) {
    console.error('[Auth Email Service] Error sending reset email via SMTP:', error);
    return {
      success: false,
      providerConfigured: true,
      message: 'Failed to deliver password reset email via SMTP.',
      error: error.message || 'SMTP Connection Error',
    };
  }
}
