import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SocialAccount, OAuthProvider, User } from '../../generated/prisma';

/** SocialAccount with user relation included (from findUnique with include) */
export type SocialAccountWithUser = SocialAccount & { user: User };

export interface CreateSocialAccountData {
  userId: string;
  provider: OAuthProvider;
  providerId: string;
  email?: string;
  accessToken?: string;
  refreshToken?: string;
}

@Injectable()
export class SocialAccountsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateSocialAccountData): Promise<SocialAccount> {
    return this.prisma.socialAccount.create({
      data,
      include: {
        user: true,
      },
    });
  }

  async findByProviderAndId(
    provider: OAuthProvider,
    providerId: string,
  ): Promise<SocialAccountWithUser | null> {
    return this.prisma.socialAccount.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId,
        },
      },
      include: {
        user: {
          include: {
            socialAccounts: true,
          },
        },
      },
    });
  }

  async findByUserId(userId: string): Promise<SocialAccount[]> {
    return this.prisma.socialAccount.findMany({
      where: { userId },
      include: {
        user: true,
      },
    });
  }

  async updateTokens(
    id: string,
    accessToken?: string,
    refreshToken?: string,
  ): Promise<SocialAccount> {
    return this.prisma.socialAccount.update({
      where: { id },
      data: {
        accessToken,
        refreshToken,
        updatedAt: new Date(),
      },
      include: {
        user: true,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.socialAccount.delete({
      where: { id },
    });
  }

  async deleteByProviderAndUserId(
    provider: OAuthProvider,
    userId: string,
  ): Promise<void> {
    await this.prisma.socialAccount.deleteMany({
      where: {
        provider,
        userId,
      },
    });
  }
}