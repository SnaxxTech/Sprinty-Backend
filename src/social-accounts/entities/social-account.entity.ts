import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    Unique,
  } from 'typeorm';
  import { User } from '../../users/entities/user.entity';
  
  export enum SocialProvider {
    GOOGLE = 'google',
    FACEBOOK = 'facebook',
    GITHUB = 'github',
    JIRA = 'jira',
  }
  
  @Entity('social_accounts')
  @Unique(['provider', 'providerId'])
  @Index(['userId'])
  export class SocialAccount {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ name: 'user_id' })
    userId: string;
  
    @Column({
      type: 'enum',
      enum: SocialProvider,
    })
    provider: SocialProvider;
  
    @Column({ name: 'provider_id' })
    providerId: string;
  
    @Column({ nullable: true })
    email: string;
  
    @Column({ name: 'access_token', nullable: true })
    accessToken: string;
  
    @Column({ name: 'refresh_token', nullable: true })
    refreshToken: string;
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  
    @ManyToOne(() => User, (user) => user.socialAccounts, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'user_id' })
    user: User;
  }