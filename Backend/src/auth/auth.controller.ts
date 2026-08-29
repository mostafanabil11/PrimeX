import {
  Controller,
  Post,
  Patch,
  Body,
  UseGuards,
  Get,
  Request,
  Res,
  HttpCode,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  ResendOtpDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
  ChangePasswordDto,
} from './dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Response } from 'express';
import { RequestUser } from './interfaces/request-user.interface';
import { GoogleProfile } from './interfaces/google-profile.interface';
import { DeviceInfo } from './interfaces/device-info.interface';
import { ConfigService } from '@/config/config.service';
import { parseDurationToMs } from '@/common/utils/duration.util';
import { Feature } from '@/common/decorators/feature.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService
  ) {}

  // In development the API and the site share localhost, so they are same-site
  // and Lax works (and keeps a little CSRF protection for free). Deployed,
  // they sit on different domains — a Vercel one and an API one — which makes
  // every request cross-site, and a Lax cookie is simply not sent on those.
  // Login would appear to succeed and every request after it would arrive
  // signed out. SameSite=None is what allows the cookie through, and browsers
  // only accept None together with Secure.
  private get cookieOptions() {
    const isProduction = this.configService.nodeEnv === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
      path: '/',
    };
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const base = this.cookieOptions;

    res.cookie('accessToken', accessToken, {
      ...base,
      maxAge: parseDurationToMs(this.configService.jwtExpiration),
    });
    res.cookie('refreshToken', refreshToken, {
      ...base,
      maxAge: parseDurationToMs(this.configService.jwtRefreshExpiration),
    });
  }

  // Clearing a cookie only works when the attributes match the ones it was set
  // with, so this deliberately reuses the same options rather than passing a
  // bare path — otherwise sign-out would silently leave the session cookie in
  // place in production.
  private clearAuthCookies(res: Response) {
    res.clearCookie('accessToken', this.cookieOptions);
    res.clearCookie('refreshToken', this.cookieOptions);
  }

  private getDeviceInfo(req: any): DeviceInfo {
    return {
      userAgent: req.headers?.['user-agent'] ?? null,
      ip: req.ip ?? null,
    };
  }

  // Gated on memberAccounts, not the whole controller — login, refresh and
  // password reset must keep working with public registration switched off,
  // since staff still sign in through this same controller to reach /admin.
  @Public()
  @Feature('memberAccounts')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @HttpCode(201)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('verify-email')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify email with OTP' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('resend-otp')
  @HttpCode(200)
  @ApiOperation({ summary: 'Resend OTP to email' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.resendOtp(resendOtpDto.email);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(
    @Body() loginDto: LoginDto,
    @Request() req: any,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.login(loginDto, this.getDeviceInfo(req));
    this.setAuthCookies(res, result.data.accessToken, result.data.refreshToken);
    return {
      success: result.success,
      message: result.message,
      data: { user: result.data.user },
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh access token (reads refreshToken cookie)' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  async refresh(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }
    const result = await this.authService.refresh(refreshToken, this.getDeviceInfo(req));
    this.setAuthCookies(res, result.data.accessToken, result.data.refreshToken);
    return {
      success: result.success,
      message: result.message,
      data: null,
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth login redirect' })
  async googleAuth() {}

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleAuthRedirect(@Request() req: any, @Res() res: Response) {
    const result = await this.authService.googleLogin(
      req.user as GoogleProfile,
      this.getDeviceInfo(req)
    );
    this.setAuthCookies(res, result.data.accessToken, result.data.refreshToken);
    res.redirect(this.configService.frontendUrl);
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  async getProfile(@CurrentUser() user: RequestUser) {
    return {
      success: true,
      message: 'Profile retrieved',
      data: await this.authService.validateUser(user.userId),
    };
  }

  // Separate from GET profile above, which every page load hits for the
  // session check. This one carries the member's health information, so it is
  // fetched only by the screen that edits it.
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'The full member profile, for the settings screen' })
  async getMemberProfile(@CurrentUser() user: RequestUser) {
    return this.authService.getMemberProfile(user.userId);
  }

  @Patch('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the member profile' })
  async updateProfile(@CurrentUser() user: RequestUser, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.userId, dto);
  }

  @Post('change-password')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password (signs out every device, this one included)' })
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.changePassword(user.userId, dto);
    this.clearAuthCookies(res);
    return result;
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(
    @CurrentUser() user: RequestUser,
    @Request() req: any,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.logout(user.userId, req.cookies?.refreshToken);
    this.clearAuthCookies(res);
    return result;
  }
}
