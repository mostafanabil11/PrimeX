import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserDocument } from './schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ConfigService } from '../config/config.service';
import { OtpUtils } from './utils/otp.utils';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GoogleProfile } from './interfaces/google-profile.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { DeviceInfo } from './interfaces/device-info.interface';
import { parseDurationToMs } from '@/common/utils/duration.util';
import { Counter, CounterDocument } from '@/orders/schemas/counter.schema';

import { EventEmitter2 } from '@nestjs/event-emitter';

// Front-desk member numbers. 1001 so the first member is four digits like
// every one after them, rather than "member 1".
const MEMBER_NUMBER_KEY = 'member-number';
const MEMBER_NUMBER_START = 1001;

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Counter.name) private counterModel: Model<CounterDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2
  ) {}

  /**
   * The next front-desk member number.
   *
   * Starts at 1001 so no member is ever "number 3" and every number is four
   * digits from day one — it gets read aloud at a counter and typed by hand.
   *
   * A single $inc on one document, which Mongo guarantees is atomic, so two
   * simultaneous registrations cannot be handed the same number without any
   * application-level locking. Same mechanism as invoice numbering, keyed
   * separately. The seed value is 1000 rather than 1001 because $inc returns
   * the value *after* incrementing.
   */
  // Public because JoinService needs it too: a member created by a website
  // reservation or at the front desk gets a number from the same sequence as
  // one who registered themselves. Duplicating the counter logic there would
  // be the one way to hand out the same number twice.
  async nextMemberNumber(): Promise<number> {
    const counter = await this.counterModel.findOneAndUpdate(
      { key: MEMBER_NUMBER_KEY },
      { $inc: { seq: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // A brand-new counter starts from 0, so the first call would otherwise
    // hand out 1. Bumped to the real starting point and re-read rather than
    // assumed, so a concurrent caller still cannot duplicate.
    if (counter.seq < MEMBER_NUMBER_START) {
      const bumped = await this.counterModel.findOneAndUpdate(
        { key: MEMBER_NUMBER_KEY, seq: { $lt: MEMBER_NUMBER_START } },
        { $set: { seq: MEMBER_NUMBER_START } },
        { new: true }
      );
      return bumped?.seq ?? counter.seq;
    }

    return counter.seq;
  }

  async register(registerDto: RegisterDto) {
    const { email, password, firstName, lastName } = registerDto;

    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = OtpUtils.generateOtp(6);
    const hashedOtp = await OtpUtils.hashOtp(otp);
    const otpExpiresAt = OtpUtils.getOtpExpiryTime(10);

    const user = new this.userModel({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      memberNumber: await this.nextMemberNumber(),
      emailVerificationOtp: hashedOtp,
      otpExpiresAt,
      isEmailVerified: false,
    });

    await user.save();

    this.eventEmitter.emit('user.registered', { email, firstName, otp });

    return {
      success: true,
      message: 'Registration successful. Check your email for OTP.',
      data: {
        email,
        message: 'Verification code sent. Valid for 10 minutes.',
      },
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { email, otp } = verifyEmailDto;

    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    if (!user.emailVerificationOtp) {
      throw new BadRequestException('No OTP found. Please register again.');
    }

    if (OtpUtils.isOtpExpired(user.otpExpiresAt)) {
      user.emailVerificationOtp = null;
      user.otpExpiresAt = null;
      await user.save();
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    const isOtpValid = await OtpUtils.verifyOtp(otp, user.emailVerificationOtp);
    if (!isOtpValid) {
      throw new BadRequestException('Invalid OTP. Please try again.');
    }

    user.isEmailVerified = true;
    user.emailVerificationOtp = null;
    user.otpExpiresAt = null;
    await user.save();

    this.eventEmitter.emit('user.verified', { email, firstName: user.firstName });

    return {
      success: true,
      message: 'Email verified successfully',
      data: {
        email,
        isEmailVerified: true,
      },
    };
  }

  private hashResetToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Refresh tokens are hashed with sha256, not bcrypt — bcrypt silently
  // truncates its input at 72 bytes, and these JWTs run well past that
  // (~250 chars, with only the tail — iat/exp/signature — varying between
  // issuances). bcrypt.compare() against a truncated hash would therefore
  // treat *any* refresh token ever issued to a user as a match for any
  // other, defeating rotation-based reuse detection entirely. sha256 has
  // no truncation and the token is already high-entropy, so no slow
  // password-style hash is needed here anyway.
  private hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Finds which of a user's sessions (if any) a presented refresh token
  // belongs to. Bounded by how many devices one person is signed in on —
  // nothing like the all-users scan resetPassword used to do.
  private findSessionIndex(user: UserDocument, refreshToken: string): number {
    const candidateHash = Buffer.from(this.hashRefreshToken(refreshToken));
    return user.sessions.findIndex(session => {
      const storedHash = Buffer.from(session.tokenHash);
      return (
        storedHash.length === candidateHash.length &&
        crypto.timingSafeEqual(storedHash, candidateHash)
      );
    });
  }

  private async generateTokens(user: UserDocument, deviceInfo: DeviceInfo) {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(
      { ...payload, type: 'access' },
      { expiresIn: this.configService.jwtExpiration }
    );

    // Signed (not opaque random) so refresh() can identify the user straight from
    // the cookie without a separate userId param — still hashed at rest below,
    // same as before, so a leaked DB row alone can't be replayed as a refresh token.
    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      { expiresIn: this.configService.jwtRefreshExpiration }
    );
    const hashedRefreshToken = this.hashRefreshToken(refreshToken);
    const now = new Date();

    // Drop anything already expired before adding this one — keeps the array
    // from growing forever across devices that never explicitly log out.
    user.sessions = user.sessions.filter(session => session.expiresAt > now);
    user.sessions.push({
      _id: new Types.ObjectId(),
      tokenHash: hashedRefreshToken,
      userAgent: deviceInfo.userAgent,
      ip: deviceInfo.ip,
      createdAt: now,
      expiresAt: new Date(
        now.getTime() + parseDurationToMs(this.configService.jwtRefreshExpiration)
      ),
    });
    await user.save();

    return { accessToken, refreshToken };
  }

  async login(loginDto: LoginDto, deviceInfo: DeviceInfo) {
    const { email, password } = loginDto;

    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Switched off by an admin — a staff member who has left, typically. The
    // message is deliberately vague: whoever is typing may not be the person
    // the account belongs to.
    if (!user.isActive) {
      throw new UnauthorizedException('This account is no longer active.');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }

    if (user.lockedUntil && new Date() < user.lockedUntil) {
      throw new UnauthorizedException('Account is locked. Try again later.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      user.lastLoginAttempt = new Date();

      if (user.loginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();
        throw new UnauthorizedException('Too many failed attempts. Account locked for 15 minutes.');
      }

      await user.save();
      throw new UnauthorizedException('Invalid email or password');
    }

    user.loginAttempts = 0;
    user.lastLoginAttempt = new Date();
    user.lockedUntil = null;

    const { accessToken, refreshToken } = await this.generateTokens(user, deviceInfo);

    return {
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: user.isEmailVerified,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
    };
  }

  async refresh(refreshToken: string, deviceInfo: DeviceInfo) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Access denied');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Access denied');
    }

    const user = await this.userModel.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Access denied');
    }

    // Checked on every rotation, not just at login. Without this a deactivated
    // account would keep renewing itself indefinitely — the access token is
    // short-lived, but the refresh loop is not, so this is what actually ends
    // a session. Deactivating also clears sessions, which kills it instantly;
    // this is the backstop for a token issued in the same moment.
    if (!user.isActive) {
      throw new UnauthorizedException('Access denied');
    }

    const sessionIndex = this.findSessionIndex(user, refreshToken);
    if (sessionIndex === -1) {
      throw new UnauthorizedException('Access denied');
    }

    // Rotation: this device's old refresh token is consumed here and
    // generateTokens() below issues it a fresh one — every other device's
    // session is untouched.
    user.sessions.splice(sessionIndex, 1);

    const tokens = await this.generateTokens(user, deviceInfo);
    return {
      success: true,
      message: 'Tokens refreshed',
      data: tokens,
    };
  }

  async logout(userId: string, refreshToken: string | undefined) {
    const user = await this.userModel.findById(userId);
    if (user && refreshToken) {
      // Only end *this* device's session — signing out on the phone
      // shouldn't sign out the desktop too.
      const sessionIndex = this.findSessionIndex(user, refreshToken);
      if (sessionIndex !== -1) {
        user.sessions.splice(sessionIndex, 1);
        await user.save();
      }
    }

    return {
      success: true,
      message: 'Logout successful',
      data: null,
    };
  }

  async googleLogin(profile: GoogleProfile, deviceInfo: DeviceInfo) {
    const { googleId, email, displayName } = profile;
    const [firstName, ...lastNameParts] = displayName.split(' ');
    const lastName = lastNameParts.join(' ');

    // Repeat sign-in: this Google account has already been linked to a user
    // here before, so there's nothing left to verify.
    let user = await this.userModel.findOne({ googleId });

    if (!user) {
      user = await this.userModel.findOne({ email });

      if (!user) {
        user = new this.userModel({
          email,
          firstName: firstName || 'User',
          lastName: lastName || '',
          password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10),
          memberNumber: await this.nextMemberNumber(),
          isEmailVerified: true,
          googleId,
          authProvider: 'google',
          role: 'member',
        });
      } else {
        // A local account already owns this email but was never linked to
        // this Google account. Google itself just proved the signed-in
        // person controls the mailbox — that's real proof of ownership.
        // But if the local account was still unverified, its password may
        // have been set by someone else entirely (e.g. an attacker
        // pre-registering the victim's email to plant a password they
        // control). Verified-Google-owner now takes over the account, and
        // that stale, unproven password is invalidated rather than trusted.
        if (!user.isEmailVerified) {
          user.password = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
        }
        user.googleId = googleId;
        user.authProvider = 'google';
        user.isEmailVerified = true;
      }
    }

    const { accessToken, refreshToken } = await this.generateTokens(user, deviceInfo);

    return {
      success: true,
      message: 'Google login successful',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: user.isEmailVerified,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
    };
  }

  // Whitelisted, not blacklisted: only what the client actually needs, so a
  // new internal field added to the schema later doesn't automatically leak
  // (loginAttempts, lockedUntil, otpExpiresAt etc. were previously exposed
  // this way).
  async validateUser(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      return null;
    }

    return {
      _id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isEmailVerified: user.isEmailVerified,
      role: user.role,
      authProvider: user.authProvider,
      createdAt: user.createdAt,
    };
  }

  /**
   * The full member profile, for the settings screen only.
   *
   * Deliberately separate from validateUser, which backs the session check on
   * every page load. Medical notes and an emergency contact have no business
   * travelling with a "who am I" request — they are fetched when someone
   * opens the page that edits them, and nowhere else.
   */
  async getMemberProfile(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    return {
      success: true,
      message: 'Profile retrieved',
      data: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        emergencyContact: user.emergencyContact,
        fitnessGoals: user.fitnessGoals,
        medicalNotes: user.medicalNotes,
        emailClassReminders: user.emailClassReminders,
        emailMarketing: user.emailMarketing,
        referralCode: user.referralCode,
        // Whether a coach still needs to sign this member off. Shown so it is
        // not a surprise at the door.
        parQFlagged: user.parQ?.hasFlag === true && !user.parQ?.clearedByStaffAt,
      },
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    user.firstName = dto.firstName;
    user.lastName = dto.lastName;

    // Only the keys actually sent are applied. A member editing their phone
    // number must not blank an emergency contact they filled in when they
    // joined, which is what assigning every field unconditionally would do.
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.dateOfBirth !== undefined) {
      user.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    }
    if (dto.gender !== undefined) user.gender = dto.gender;
    if (dto.fitnessGoals !== undefined) user.fitnessGoals = dto.fitnessGoals;
    if (dto.medicalNotes !== undefined) user.medicalNotes = dto.medicalNotes;
    if (dto.emailClassReminders !== undefined) {
      user.emailClassReminders = dto.emailClassReminders;
    }
    if (dto.emailMarketing !== undefined) user.emailMarketing = dto.emailMarketing;

    if (
      dto.emergencyContactName !== undefined ||
      dto.emergencyContactPhone !== undefined ||
      dto.emergencyContactRelationship !== undefined
    ) {
      user.emergencyContact = {
        name: dto.emergencyContactName ?? user.emergencyContact?.name ?? null,
        phone: dto.emergencyContactPhone ?? user.emergencyContact?.phone ?? null,
        relationship:
          dto.emergencyContactRelationship ?? user.emergencyContact?.relationship ?? null,
      };
    }

    await user.save();

    return {
      success: true,
      message: 'Profile updated',
      data: await this.validateUser(userId),
    };
  }

  // Invalidates every session (this device included) on success — the same
  // "assume the old password may be compromised" posture as a reset, so a
  // stolen refresh token can't outlive the password that was just changed.
  // The client re-authenticates with the new password afterward.
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.authProvider === 'google') {
      throw new BadRequestException(
        'This account signs in with Google and has no separate password to change'
      );
    }

    const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    user.sessions = [];
    await user.save();

    return {
      success: true,
      message: 'Password changed — please sign in again',
      data: null,
    };
  }

  async resendOtp(email: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const otp = OtpUtils.generateOtp(6);
    const hashedOtp = await OtpUtils.hashOtp(otp);
    const otpExpiresAt = OtpUtils.getOtpExpiryTime(10);

    user.emailVerificationOtp = hashedOtp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    this.eventEmitter.emit('user.resend-otp', { email, firstName: user.firstName, otp });

    return {
      success: true,
      message: 'New OTP sent to your email',
      data: {
        email,
      },
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    const user = await this.userModel.findOne({ email });

    if (!user) {
      return {
        success: true,
        message: 'If the email exists, a password reset link has been sent.',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = this.hashResetToken(resetToken);

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    this.eventEmitter.emit('user.forgot-password', {
      email,
      firstName: user.firstName,
      resetToken,
    });

    return {
      success: true,
      message: 'If the email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    const targetUser = await this.userModel.findOne({
      resetPasswordToken: this.hashResetToken(token),
      resetPasswordExpiresAt: { $gt: new Date() },
    });

    if (!targetUser) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    targetUser.password = await bcrypt.hash(newPassword, 10);
    targetUser.resetPasswordToken = null;
    targetUser.resetPasswordExpiresAt = null;
    targetUser.lockedUntil = null;
    targetUser.loginAttempts = 0;

    await targetUser.save();

    return {
      success: true,
      message: 'Password has been reset successfully',
    };
  }
}
