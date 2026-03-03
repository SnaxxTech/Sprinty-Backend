# Sprinty Backend - Authentication System

A production-ready NestJS authentication system with Prisma, PostgreSQL, and OAuth support.

## Features

- ✅ Email/Password Registration & Login
- ✅ Google OAuth Authentication
- ✅ JWT-based Authentication
- ✅ Extensible OAuth Provider System
- ✅ Clean Architecture with Prisma
- ✅ HTTP-only Cookie Support
- ✅ Input Validation
- ✅ Secure Password Hashing (bcrypt)

## Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Passport.js + JWT
- **Validation**: class-validator
- **Password Hashing**: bcrypt

## Project Structure

```
src/
├── auth/
│   ├── dto/
│   │   ├── register.dto.ts
│   │   └── login.dto.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── local-auth.guard.ts
│   │   └── google-auth.guard.ts
│   ├── strategies/
│   │   ├── jwt.strategy.ts
│   │   ├── local.strategy.ts
│   │   └── google.strategy.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── users/
│   ├── users.service.ts
│   └── users.module.ts
├── social-accounts/
│   ├── social-accounts.service.ts
│   └── social-accounts.module.ts
├── prisma/
│   ├── prisma.service.ts
│   └── prisma.module.ts
└── app.module.ts

prisma/
└── schema.prisma
```

## Environment Variables

Create a `.env` file in the root directory:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/sprinty_db?schema=public"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="86400"

# Google OAuth Configuration
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3001/auth/google/callback"

# Frontend URL (for OAuth redirects)
FRONTEND_URL="http://localhost:3000"

# Server Configuration
PORT=3001
NODE_ENV="development"
```

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup PostgreSQL Database**
   ```bash
   # Create database
   createdb sprinty_db
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

4. **Setup Google OAuth** (Optional)
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs: `http://localhost:3001/auth/google/callback`
   - Copy Client ID and Client Secret to `.env`

5. **Run Database Migrations**
   ```bash
   npx prisma db push
   ```

6. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

7. **Start the Application**
   ```bash
   npm run start:dev
   ```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register with email/password | No |
| POST | `/auth/login` | Login with email/password | No |
| GET | `/auth/google` | Initiate Google OAuth | No |
| GET | `/auth/google/callback` | Google OAuth callback | No |
| GET | `/auth/profile` | Get current user profile | Yes |
| POST | `/auth/logout` | Logout (clear cookies) | No |

### Example Requests

**Register**
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Login**
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Protected Route**
```bash
curl -X GET http://localhost:3001/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Database Schema

### User Model
```prisma
model User {
  id              String   @id @default(uuid())
  email           String?  @unique
  password        String?
  firstName       String?
  lastName        String?
  avatarUrl       String?
  isEmailVerified Boolean  @default(false)
  socialAccounts  SocialAccount[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### SocialAccount Model
```prisma
model SocialAccount {
  id           String        @id @default(uuid())
  userId       String
  provider     OAuthProvider
  providerId   String
  email        String?
  accessToken  String?
  refreshToken String?
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  
  @@unique([provider, providerId])
  @@index([userId])
}
```

## Adding New OAuth Providers

To add a new OAuth provider (e.g., Facebook, GitHub):

1. **Update Prisma Schema**
   ```prisma
   enum OAuthProvider {
     google
     facebook  // Add new provider
     github
     jira
   }
   ```

2. **Create Strategy**
   ```typescript
   // src/auth/strategies/facebook.strategy.ts
   @Injectable()
   export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
     constructor(
       private configService: ConfigService,
       private authService: AuthService,
     ) {
       super({
         clientID: configService.get<string>('FACEBOOK_CLIENT_ID'),
         clientSecret: configService.get<string>('FACEBOOK_CLIENT_SECRET'),
         callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL'),
         scope: ['email'],
       });
     }

     async validate(accessToken: string, refreshToken: string, profile: any) {
       return this.authService.validateOAuthLogin(
         OAuthProvider.facebook,
         profile.id,
         {
           email: profile.emails?.[0]?.value,
           firstName: profile.name?.givenName,
           lastName: profile.name?.familyName,
           avatarUrl: profile.photos?.[0]?.value,
           accessToken,
           refreshToken,
         },
       );
     }
   }
   ```

3. **Add Routes to Controller**
   ```typescript
   @Get('facebook')
   @UseGuards(FacebookAuthGuard)
   async facebookAuth() {}

   @Get('facebook/callback')
   @UseGuards(FacebookAuthGuard)
   async facebookCallback(@Request() req, @Response() res) {
     // Same logic as Google callback
   }
   ```

4. **Register in Module**
   ```typescript
   providers: [
     // ... existing providers
     FacebookStrategy,
   ],
   ```

## Security Features

- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Security**: Configurable expiration and secret
- **HTTP-only Cookies**: Optional secure cookie implementation
- **Input Validation**: class-validator for all DTOs
- **SQL Injection Protection**: Prisma ORM with parameterized queries
- **CORS Configuration**: Configurable for production

## Production Considerations

1. **Environment Variables**: Use strong, unique values for production
2. **Database**: Use connection pooling and SSL
3. **JWT Secret**: Use a cryptographically secure random string
4. **HTTPS**: Always use HTTPS in production
5. **Rate Limiting**: Implement rate limiting for auth endpoints
6. **Email Verification**: Implement email verification for new registrations
7. **Password Reset**: Add password reset functionality
8. **Refresh Tokens**: Implement refresh token rotation

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run start:dev

# Run tests
npm run test

# Run e2e tests
npm run test:e2e

# Build for production
npm run build
```

## License

This project is licensed under the UNLICENSED License.