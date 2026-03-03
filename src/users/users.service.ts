import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '../../generated/prisma';
import * as bcrypt from 'bcrypt';

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

  // Remove sensitive fields from user object
  sanitizeUser(user: User): Omit<User, 'password'> {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}