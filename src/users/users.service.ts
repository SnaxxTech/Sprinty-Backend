import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '../../generated/prisma';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export interface CreateUserData {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(userData: CreateUserData): Promise<User> {
    // Check if user already exists with this email
    if (userData.email) {
      const existingUser = await this.findByEmail(userData.email);
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (userData.password) {
      hashedPassword = await bcrypt.hash(userData.password, 12);
    }

    return this.prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        avatarUrl: userData.avatarUrl,
      },
      include: {
        socialAccounts: true,
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        socialAccounts: true,
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        socialAccounts: true,
      },
    });
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    if (!user.password) {
      return false;
    }
    return bcrypt.compare(password, user.password);
  }

  async updateEmailVerification(id: string, isVerified: boolean): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { isEmailVerified: isVerified },
      include: {
        socialAccounts: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, updateData: Partial<CreateUserData>): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        socialAccounts: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Generate and save password reset token
   * Returns the raw token (to be sent via email)
   */
  async generatePasswordResetToken(email: string): Promise<string | null> {
    const user = await this.findByEmail(email);
    if (!user) {
      // Return null but don't throw error to prevent email enumeration
      return null;
    }

    // Generate secure random token (32 bytes = 256 bits)
    const rawToken = crypto.randomBytes(32).toString('hex');
    
    // Hash the token before storing in database using SHA256
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    
    // Set expiration to 1 hour from now
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + 1);

    // Save hashed token and expiration in database
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: expirationTime,
      },
    });

    // Return raw token to be sent via email
    return rawToken;
  }

  /**
   * Find user by reset token and check if token is still valid
   */
  async findUserByResetToken(rawToken: string): Promise<User | null> {
    // Hash the incoming token to match against stored hash
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    
    return this.prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: {
          gt: new Date(), // Token must not be expired
        },
      },
      include: {
        socialAccounts: true,
      },
    });
  }

  /**
   * Reset user password and clear reset token
   */
  async resetPassword(rawToken: string, newPassword: string): Promise<boolean> {
    const user = await this.findUserByResetToken(rawToken);
    if (!user) {
      return false;
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token fields
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return true;
  }

  /**
   * Clear expired reset tokens (cleanup job)
   * This can be called periodically to clean up expired tokens
   */
  async clearExpiredResetTokens(): Promise<number> {
    const result = await this.prisma.user.updateMany({
      where: {
        resetPasswordExpires: {
          lt: new Date(),
        },
      },
      data: {
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return result.count;
  }

  // Remove sensitive fields from user object
  sanitizeUser(user: User): Omit<User, 'password' | 'resetPasswordToken'> {
    const { password, resetPasswordToken, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}