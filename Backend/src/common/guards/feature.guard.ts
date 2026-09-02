import { Injectable, CanActivate, ExecutionContext, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_KEY, FeatureName } from '../decorators/feature.decorator';
import { ConfigService } from '@/config/config.service';

const GETTERS: Record<FeatureName, (config: ConfigService) => boolean> = {
  membershipSales: config => config.membershipSalesEnabled,
  membershipTracking: config => config.membershipTrackingEnabled,
  classBooking: config => config.classBookingEnabled,
  memberAccounts: config => config.memberAccountsEnabled,
};

// Enforces @Feature(...) at the API boundary. This is the backend half of the
// showcase-mode pattern in Frontend/src/lib/features.ts: a whole capability
// (membership sales, class booking, member accounts) can be switched off
// without touching the module graph, deleting a route, or letting a client
// that skips the UI reach a controller the site no longer advertises.
//
// NotFoundException, not Forbidden — same reasoning as requireShop() on the
// frontend: to the outside world these routes genuinely do not exist while
// the flag is off, not "exist but refused".
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredFeatures = this.reflector.getAllAndOverride<FeatureName[]>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredFeatures || requiredFeatures.length === 0) {
      return true;
    }

    // Any named feature being on is enough. Most controllers only ever name
    // one, but the rule is "any", not "all", so a controller straddling two
    // capabilities reads the same way as one that only needs a single flag.
    const anyEnabled = requiredFeatures.some(feature => GETTERS[feature](this.configService));
    if (!anyEnabled) {
      throw new NotFoundException();
    }

    return true;
  }
}
