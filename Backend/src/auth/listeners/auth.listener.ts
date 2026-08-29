import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailService } from '../services/email.service';
import { EmailUtils } from '../utils/email.utils';
import { ConfigService } from '@/config/config.service';

@Injectable()
export class AuthListener {
  constructor(
    private emailService: EmailService,
    private configService: ConfigService
  ) {}

  @OnEvent('user.registered')
  async handleUserRegisteredEvent(payload: { email: string; firstName: string; otp: string }) {
    const emailTemplate = EmailUtils.generateOtpEmailTemplate(payload.firstName, payload.otp);
    await this.emailService.sendOtpEmail(
      payload.email,
      payload.firstName,
      payload.otp,
      emailTemplate
    );
  }

  @OnEvent('user.verified')
  async handleUserVerifiedEvent(payload: { email: string; firstName: string }) {
    const emailTemplate = EmailUtils.generateWelcomeEmailTemplate(payload.firstName);
    await this.emailService.sendWelcomeEmail(payload.email, payload.firstName, emailTemplate);
  }

  @OnEvent('user.resend-otp')
  async handleUserResendOtpEvent(payload: { email: string; firstName: string; otp: string }) {
    const emailTemplate = EmailUtils.generateOtpEmailTemplate(payload.firstName, payload.otp);
    await this.emailService.sendOtpEmail(
      payload.email,
      payload.firstName,
      payload.otp,
      emailTemplate
    );
  }

  @OnEvent('user.forgot-password')
  async handleUserForgotPasswordEvent(payload: {
    email: string;
    firstName: string;
    resetToken: string;
  }) {
    const resetUrl = new URL('/reset-password', this.configService.frontendUrl);
    resetUrl.searchParams.set('token', payload.resetToken);
    const emailTemplate = EmailUtils.generatePasswordResetEmailTemplate(
      payload.firstName,
      resetUrl.toString()
    );
    await this.emailService.sendPasswordResetEmail(payload.email, payload.firstName, emailTemplate);
  }
}
