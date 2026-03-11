import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { SocialAccountsService } from '../social-accounts/social-accounts.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { User, OAuthProvider } from '../../generated/prisma';
import type { SocialAccountWithUser } from '../social-accounts/social-accounts.service';

export interface AuthResponse {
  user: Omit<User, 'password'>;
  accessToken: string;
}

export interface OAuthProfile {
  email?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  accessToken?: string;
  refreshToken?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private socialAccountsService: SocialAccountsService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    try {
      const user = await this.usersService.create({
        email: registerDto.email,
        password: registerDto.password,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
      });

      const accessToken = this.generateJwtToken(user);
      
      return {
        user: this.usersService.sanitizeUser(user),
        accessToken,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new Error('Registration failed');
    }
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      return null;
    }

    const isPasswordValid = await this.usersService.validatePassword(user, password);
    
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async login(user: User): Promise<AuthResponse> {
    const accessToken = this.generateJwtToken(user);
    
    return {
      user: this.usersService.sanitizeUser(user),
      accessToken,
    };
  }

  /**
   * Generic OAuth validation handler
   * Handles linking existing users or creating new ones
   */
  async validateOAuthLogin(
    provider: OAuthProvider,
    providerId: string,
    profile: OAuthProfile,
  ): Promise<User> {
    // 1. Check if social account already exists
    const existingSocialAccount = await this.socialAccountsService.findByProviderAndId(
      provider,
      providerId,
    );

    if (existingSocialAccount) {
      // Update tokens if provided
      if (profile.accessToken || profile.refreshToken) {
        await this.socialAccountsService.updateTokens(
          existingSocialAccount.id,
          profile.accessToken,
          profile.refreshToken,
        );
      }
      return (existingSocialAccount as SocialAccountWithUser).user;
    }

    // 2. Check if user exists with the same email
    let user: User | null = null;
    if (profile.email) {
      user = await this.usersService.findByEmail(profile.email);
    }

    // 3. Create new user if doesn't exist
    if (!user) {
      user = await this.usersService.create({
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatarUrl: profile.avatarUrl,
        // No password for OAuth-only users
      });
    }

    // 4. Create social account link
    await this.socialAccountsService.create({
      userId: user.id,
      provider,
      providerId,
      email: profile.email,
      accessToken: profile.accessToken,
      refreshToken: profile.refreshToken,
    });

    // Return updated user with social accounts
    return this.usersService.findById(user.id) as Promise<User>;
  }

  private generateJwtToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
    };

    const expiresInRaw = this.configService.get<string>('JWT_EXPIRES_IN', '86400');
    const expiresInSeconds = parseInt(expiresInRaw, 10) || 86400;
    return this.jwtService.sign(payload, {
      expiresIn: expiresInSeconds,
    });
  }

  /**
   * Generate a secure HTTP-only cookie for JWT
   * Use this for enhanced security in production
   */
  generateSecureCookie(token: string): string {
    return `Authentication=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict; Secure`;
  }

  /**
   * Extract JWT from HTTP-only cookie
   * Use this when implementing cookie-based authentication
   */
  extractTokenFromCookie(cookieHeader: string): string | null {
    if (!cookieHeader) return null;
    
    const cookies = cookieHeader.split(';');
    const authCookie = cookies.find(cookie => 
      cookie.trim().startsWith('Authentication=')
    );
    
    if (!authCookie) return null;
    
    return authCookie.split('=')[1];
  }

  /**
   * Handle forgot password request
   * Always returns success to prevent email enumeration attacks
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    try {
      // Generate reset token (returns null if user doesn't exist)
      const resetToken = await this.usersService.generatePasswordResetToken(email);
      
      if (resetToken) {
        // Build reset link with raw token
        const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
        const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
        
        // Send reset email
        await this.mailService.sendPasswordResetEmail(email, resetLink);
      }

      // Always return success message to prevent email enumeration
      // Don't reveal whether the email exists or not
      return {
        message: 'If an account with that email exists, we have sent a password reset link.',
      };
    } catch (error) {
      // Log error for monitoring but still return success message
      console.error('Forgot password error:', error);
      
      return {
        message: 'If an account with that email exists, we have sent a password reset link.',
      };
    }
  }

  /**
   * Handle password reset with token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, password } = resetPasswordDto;

    try {
      const success = await this.usersService.resetPassword(token, password);
      
      if (!success) {
        throw new UnauthorizedException('Invalid or expired reset token');
      }

      return {
        message: 'Password has been reset successfully. You can now login with your new password.',
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      // Log unexpected errors
      console.error('Reset password error:', error);
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }
}