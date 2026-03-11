import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Send password reset email
   * Currently mocked with console.log - replace with real email provider
   * (SendGrid, AWS SES, Nodemailer, etc.) in production
   */
  async sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
    try {
      // Mock implementation - replace with actual email service
      this.logger.log(`Sending password reset email to: ${email}`);
      this.logger.log(`Reset link: ${resetLink}`);
      
      console.log('=== PASSWORD RESET EMAIL ===');
      console.log(`To: ${email}`);
      console.log(`Subject: Reset Your Password`);
      console.log(`
Dear User,

You have requested to reset your password. Please click the link below to reset your password:

${resetLink}

This link will expire in 1 hour for security reasons.

If you did not request this password reset, please ignore this email.

Best regards,
Your App Team
      `);
      console.log('=============================');

      // TODO: Replace with actual email service implementation
      // Example with SendGrid:
      // await this.sendGridService.send({
      //   to: email,
      //   from: this.configService.get('FROM_EMAIL'),
      //   subject: 'Reset Your Password',
      //   html: this.generatePasswordResetEmailTemplate(resetLink),
      // });

      // Example with AWS SES:
      // await this.sesService.sendEmail({
      //   Source: this.configService.get('FROM_EMAIL'),
      //   Destination: { ToAddresses: [email] },
      //   Message: {
      //     Subject: { Data: 'Reset Your Password' },
      //     Body: { Html: { Data: this.generatePasswordResetEmailTemplate(resetLink) } },
      //   },
      // });

    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Generate HTML template for password reset email
   * This is a basic template - enhance with proper styling in production
   */
  private generatePasswordResetEmailTemplate(resetLink: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c3e50;">Reset Your Password</h2>
            <p>You have requested to reset your password. Click the button below to reset your password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #3498db; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 4px; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #7f8c8d;">${resetLink}</p>
            
            <p><strong>This link will expire in 1 hour for security reasons.</strong></p>
            
            <p>If you did not request this password reset, please ignore this email.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #7f8c8d; font-size: 12px;">
              This is an automated message, please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `;
  }
}