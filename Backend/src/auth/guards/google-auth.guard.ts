import { Injectable, ExecutionContext, ServiceUnavailableException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@/config/config.service';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Without credentials the strategy was never registered (see AuthModule),
    // and Passport would fail with "Unknown authentication strategy" — a
    // 500 that reads like a bug rather than a deployment missing an optional
    // setting. Say what is actually wrong, and point at the alternative that
    // does work.
    if (!this.configService.isGoogleAuthConfigured) {
      throw new ServiceUnavailableException(
        'Google sign-in is not available. Please sign in with your email and password instead.'
      );
    }

    return super.canActivate(context);
  }
}
