import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User, UserSchema } from './schemas/user.schema';
import { Counter, CounterSchema } from '@/orders/schemas/counter.schema';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { ConfigService } from '@/config/config.service';
import { ConfigModule } from '@/config/config.module';
import { EmailService } from './services/email.service';
import { AuthListener } from './listeners/auth.listener';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      // The same domain-agnostic atomic sequence store invoice numbers use,
      // keyed separately — see nextMemberNumber() in auth.service.
      { name: Counter.name, schema: CounterSchema },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.jwtSecret,
        signOptions: { expiresIn: configService.jwtExpiration },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    // Constructed only when Google credentials are present. Passport's OAuth2
    // strategy throws from its constructor without a clientID, so registering
    // it unconditionally means an optional integration can prevent the entire
    // application from starting. Building it lazily keeps "Google not
    // configured" a disabled feature rather than a dead process — see
    // GoogleAuthGuard for what callers get instead.
    {
      provide: GoogleStrategy,
      useFactory: (configService: ConfigService) =>
        configService.isGoogleAuthConfigured ? new GoogleStrategy(configService) : null,
      inject: [ConfigService],
    },
    EmailService,
    AuthListener,
  ],
  exports: [AuthService, JwtModule, PassportModule, EmailService],
})
export class AuthModule {}
