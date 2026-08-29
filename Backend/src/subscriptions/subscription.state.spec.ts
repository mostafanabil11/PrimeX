import {
  canTransition,
  LEGAL_TRANSITIONS,
  SUBSCRIPTION_STATUSES,
  SubscriptionStatus,
} from './schemas/subscription.schema';

describe('subscription state machine', () => {
  it('allows a pending membership to be paid for or abandoned', () => {
    expect(canTransition('pending', 'active')).toBe(true);
    expect(canTransition('pending', 'cancelled')).toBe(true);
  });

  it('allows an active membership to freeze, expire or be cancelled', () => {
    expect(canTransition('active', 'frozen')).toBe(true);
    expect(canTransition('active', 'expired')).toBe(true);
    expect(canTransition('active', 'cancelled')).toBe(true);
  });

  it('allows a frozen membership to resume', () => {
    expect(canTransition('frozen', 'active')).toBe(true);
  });

  // The two endpoints. Anything reachable out of them would mean a membership
  // that was cancelled or ran out could quietly come back to life.
  it('treats expired and cancelled as terminal', () => {
    for (const status of SUBSCRIPTION_STATUSES) {
      expect(canTransition('expired', status)).toBe(false);
      expect(canTransition('cancelled', status)).toBe(false);
    }
  });

  // Renewing creates a new subscription rather than reviving the old one. If
  // this were allowed, the record of what someone paid for and when would be
  // silently rewritten on every renewal.
  it('does not let an expired membership be reactivated', () => {
    expect(canTransition('expired', 'active')).toBe(false);
  });

  it('does not let a pending membership skip payment into a frozen state', () => {
    expect(canTransition('pending', 'frozen')).toBe(false);
    expect(canTransition('pending', 'expired')).toBe(false);
  });

  it('does not let an active membership go back to pending', () => {
    expect(canTransition('active', 'pending')).toBe(false);
    expect(canTransition('frozen', 'pending')).toBe(false);
  });

  it('has no self-transitions', () => {
    for (const status of SUBSCRIPTION_STATUSES) {
      expect(canTransition(status, status)).toBe(false);
    }
  });

  it('covers every status and targets only real ones', () => {
    for (const status of SUBSCRIPTION_STATUSES) {
      expect(LEGAL_TRANSITIONS[status]).toBeDefined();
      for (const target of LEGAL_TRANSITIONS[status]) {
        expect(SUBSCRIPTION_STATUSES).toContain(target as SubscriptionStatus);
      }
    }
  });

  // Every state except the two terminal ones must be able to reach a terminal
  // one, or a membership could get stuck in it forever.
  it('lets every non-terminal state reach an end', () => {
    for (const status of ['pending', 'active', 'frozen'] as SubscriptionStatus[]) {
      const reachable = LEGAL_TRANSITIONS[status];
      expect(reachable.some(s => s === 'cancelled' || s === 'expired')).toBe(true);
    }
  });
});
