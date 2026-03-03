import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Response,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService, AuthResponse } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from '../../generated/prisma';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Register with email and password
   * POST /auth/register
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body(ValidationPipe) registerDto: RegisterDto,
  ): Promise<AuthResponse> {
    return this.authService.register(registerDto);
  }

  /**
   * Login with email and password
   * POST /auth/login
   */
  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  async login(@Request() req: { user: User }): Promise<AuthResponse> {
    return this.authService.login(req.user);
  }

  /**
   * Login with email and password (alternative endpoint with body validation)
   * POST /auth/login/credentials
   */
  @Post('login/credentials')
  @HttpCode(HttpStatus.OK)
  async loginWithCredentials(
    @Body(ValidationPipe) loginDto: LoginDto,
  ): Promise<AuthResponse> {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    return this.authService.login(user);
  }

  /**
   * Initiate Google OAuth login
   * GET /auth/google
   */
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // This route initiates the Google OAuth flow
    // The actual logic is handled by the GoogleStrategy
  }

  /**
   * Google OAuth callback
   * GET /auth/google/callback
   */
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @Request() req: { user: User },
    @Response() res: any,
  ) {
    // Generate JWT for the authenticated user
    const authResponse = await this.authService.login(req.user);
    
    // Option 1: Return JSON response
    // return authResponse;
    
    // Option 2: Set HTTP-only cookie and redirect (more secure)
    const secureCookie = this.authService.generateSecureCookie(authResponse.accessToken);
    res.setHeader('Set-Cookie', secureCookie);
    
    // Redirect to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/auth/success`);
  }

  /**
   * Get current user profile
   * GET /auth/profile
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: { user: User }) {
    return {
      user: req.user,
    };
  }

  /**
   * Logout (when using HTTP-only cookies)
   * POST /auth/logout
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Response() res: any) {
    // Clear the HTTP-only cookie
    res.setHeader(
      'Set-Cookie',
      'Authentication=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict; Secure',
    );
    
    return res.json({ message: 'Logged out successfully' });
  }

  /**
   * Refresh token endpoint (for future implementation)
   * POST /auth/refresh
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh() {
    // TODO: Implement refresh token logic
    // This would require storing refresh tokens in the database
    throw new Error('Refresh token functionality not implemented yet');
  }
}