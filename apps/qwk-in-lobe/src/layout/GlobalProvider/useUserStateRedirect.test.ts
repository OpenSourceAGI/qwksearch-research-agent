import { describe, expect, it } from 'vitest';

import { shouldDeferOnboardingRedirect } from './useUserStateRedirect';

describe('shouldDeferOnboardingRedirect', () => {
  it('never sends the homepage to onboarding, so the home chat works at once', () => {
    expect(shouldDeferOnboardingRedirect('/')).toBe(true);
  });

  it('defers on invite routes so invited users can accept before onboarding', () => {
    expect(shouldDeferOnboardingRedirect('/invite/abc')).toBe(true);
    expect(shouldDeferOnboardingRedirect('/invite/abc/')).toBe(true);
  });

  it('defers on possible workspace slug routes', () => {
    expect(shouldDeferOnboardingRedirect('/acme')).toBe(true);
    expect(shouldDeferOnboardingRedirect('/acme/settings/members')).toBe(true);
  });

  it('never sends an open chat to onboarding, so a reload shows the conversation', () => {
    expect(shouldDeferOnboardingRedirect('/agent/agt_1/tpc_1')).toBe(true);
    expect(shouldDeferOnboardingRedirect('/agent')).toBe(true);
    expect(shouldDeferOnboardingRedirect('/group/grp_1')).toBe(true);
  });

  it('does not defer on other personal app routes', () => {
    expect(shouldDeferOnboardingRedirect('/projects')).toBe(false);
    expect(shouldDeferOnboardingRedirect('/settings/profile')).toBe(false);
  });
});
