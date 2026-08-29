# Authentication Implementation Plan

## ✅ Step 1: User Model, Schema & DTOs - COMPLETED

### Schema Changes
- ✅ User schema updated with:
  - `isEmailVerified` - Track email verification status
  - `emailVerificationOtp` - Store hashed OTP
  - `otpExpiresAt` - OTP expiration timestamp
  - `loginAttempts` - Failed login counter
  - `lastLoginAttempt` - Last login attempt time
  - `lockedUntil` - Account lock timestamp
  - `refreshToken` - Optional refresh token storage

### DTOs Created
- ✅ RegisterDto - For user registration
- ✅ LoginDto - For user login
- ✅ VerifyEmailDto - For email verification with OTP
- ✅ AuthResponseDto - Standardized response formats
- ✅ UserResponseDto - User data response
- ✅ LoginResponseDto - Login response with token
- ✅ RegisterResponseDto - Registration response
- ✅ VerifyEmailResponseDto - Email verification response

### Utilities Created
- ✅ OtpUtils - Generate, hash, verify OTP
- ✅ EmailUtils - Email templates (OTP & Welcome)
- ✅ EmailService - Send emails (Gmail/Nodemailer)

### Environment Variables
- ✅ Updated .env.example with email config options

---

## 📋 Step 2: Register Endpoint - NEXT

### What it will do:
1. Accept email, password, firstName, lastName
2. Validate input using DTOs
3. Check if user already exists
4. Hash password with bcrypt
5. Generate 6-digit OTP
6. Save user with OTP (hashed) and expiry time
7. Send OTP to email
8. Return success message

### Response:
```json
{
  "success": true,
  "message": "Registration successful. Check your email for OTP.",
  "data": {
    "email": "user@example.com",
    "message": "Verification code sent. Valid for 10 minutes."
  }
}
```

---

## 📋 Step 3: Verify Email Endpoint

### What it will do:
1. Accept email and OTP
2. Find user by email
3. Check if OTP is expired
4. Compare provided OTP with hashed OTP
5. Update `isEmailVerified` to true
6. Clear OTP and expiry
7. Send welcome email
8. Return success

### Response:
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "email": "user@example.com",
    "isEmailVerified": true
  }
}
```

---

## 📋 Step 4: Login Endpoint

### What it will do:
1. Accept email and password
2. Validate input
3. Find user by email
4. Check if account is locked (loginAttempts >= 5)
5. Check if email is verified
6. Verify password
7. Reset loginAttempts on success
8. Generate JWT token
9. Return token and user data

### Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "isEmailVerified": true,
      "role": "user"
    }
  }
}
```

---

## 📋 Step 5: Authentication Middleware

### What it will do:
1. Check Authorization header for Bearer token
2. Validate JWT token
3. Extract user ID from token
4. Attach user to request object
5. Allow/deny access based on token validity

### Protected Routes:
```
GET /auth/profile
GET /products (coming soon)
POST /orders (coming soon)
etc.
```

---

## 📋 Step 6: Custom Decorators & Guards

### Create:
- ✅ JwtAuthGuard - Protect routes requiring auth
- ✅ @Public() - Skip auth for public routes
- ✅ @CurrentUser() - Inject current user to handlers

---

## 🗂️ File Structure (Will be created)

```
src/auth/
├── dto/
│   ├── index.ts
│   ├── register.dto.ts                    ✅
│   ├── login.dto.ts                       ✅
│   ├── verify-email.dto.ts                ✅
│   └── auth-response.dto.ts               ✅
├── services/
│   ├── email.service.ts                   ✅
│   └── auth.service.ts                    (will be updated)
├── schemas/
│   └── user.schema.ts                     ✅
├── strategies/
│   └── jwt.strategy.ts                    ✅
├── guards/
│   └── jwt-auth.guard.ts                  ✅
├── decorators/
│   ├── current-user.decorator.ts          (next)
│   └── public.decorator.ts                (next)
├── utils/
│   ├── otp.utils.ts                       ✅
│   └── email.utils.ts                     ✅
├── auth.module.ts                         (will be updated)
├── auth.controller.ts                     (will be updated)
└── IMPLEMENTATION_PLAN.md                 ✅
```

---

## 🚀 Next Actions

1. **Install new packages** - `npm install nodemailer @types/nodemailer`
2. **Update auth.service.ts** - Add register, verifyEmail, login methods
3. **Update auth.controller.ts** - Add endpoints for register, verify-email, login
4. **Update auth.module.ts** - Import EmailService
5. **Create decorators** - @Public() and @CurrentUser()
6. **Test endpoints** - Using Postman/curl

---

## 📝 Environment Setup

To enable email sending (optional for development):

1. Go to: https://myaccount.google.com/apppasswords
2. Generate an App Password (16 characters)
3. Add to `.env`:
```
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
```

Without this, emails will be logged to console (development mode).
