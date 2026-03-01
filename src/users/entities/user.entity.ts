import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
  } from 'typeorm';
  import { Exclude } from 'class-transformer';
  import { SocialAccount } from '../../social-accounts/entities/social-account.entity';
  
  @Entity('users')
  export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ unique: true, nullable: true })
    email: string;
  
    @Column({ nullable: true })
    @Exclude()
    password: string;
  
    @Column({ name: 'first_name', nullable: true })
    firstName: string;
  
    @Column({ name: 'last_name', nullable: true })
    lastName: string;
  
    @Column({ name: 'avatar_url', nullable: true })
    avatarUrl: string;
  
    @Column({ name: 'is_email_verified', default: false })
    isEmailVerified: boolean;
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  
    @OneToMany(() => SocialAccount, (socialAccount) => socialAccount.user, {
      cascade: true,
    })
    socialAccounts: SocialAccount[];
  }