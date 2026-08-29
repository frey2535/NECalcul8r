import { useMemo } from 'react';

/**
 * Derives access state from user object based on access_type + access_status rules.
 * Returns: { canAccess, status, accessType, daysLeft, isExpired, isDisabled, blockReason }
 */
export function useTrialStatus(user) {
  return useMemo(() => {
    if (!user) return { canAccess: false, status: 'unknown', accessType: null, daysLeft: 0, isExpired: false, isDisabled: false, blockReason: null };

    // Admins always have full access
    if (user.role === 'admin') {
      return { canAccess: true, status: 'active', accessType: 'permanent', daysLeft: Infinity, isExpired: false, isDisabled: false, blockReason: null };
    }

    const accessStatus = user.access_status || 'trial';
    const accessType = user.access_type || 'trial';

    // Rule 1: disabled is always blocked
    if (accessStatus === 'disabled') {
      return { canAccess: false, status: 'disabled', accessType, daysLeft: 0, isExpired: false, isDisabled: true, blockReason: 'disabled' };
    }

    // Rule 2: permanent access type is always allowed
    if (accessType === 'permanent') {
      return { canAccess: true, status: 'active', accessType, daysLeft: Infinity, isExpired: false, isDisabled: false, blockReason: null };
    }

    // Rule 3: paid — allowed while subscription_status is active
    if (accessType === 'paid') {
      const subActive = user.subscription_status === 'active' || user.subscription_status === 'trialing';
      if (!subActive) {
        return { canAccess: false, status: 'expired', accessType, daysLeft: 0, isExpired: true, isDisabled: false, blockReason: 'subscription_inactive' };
      }
      return { canAccess: true, status: 'active', accessType, daysLeft: Infinity, isExpired: false, isDisabled: false, blockReason: null };
    }

    // Rule 4: buildrpro_included — allowed while company account is active (we trust access_status = active)
    if (accessType === 'buildrpro_included') {
      if (accessStatus !== 'active') {
        return { canAccess: false, status: 'expired', accessType, daysLeft: 0, isExpired: true, isDisabled: false, blockReason: 'buildrpro_inactive' };
      }
      return { canAccess: true, status: 'active', accessType, daysLeft: Infinity, isExpired: false, isDisabled: false, blockReason: null };
    }

    // Rule 5: app_store — allowed if access_status = active (entitlement verified externally)
    if (accessType === 'app_store') {
      if (accessStatus !== 'active') {
        return { canAccess: false, status: 'expired', accessType, daysLeft: 0, isExpired: true, isDisabled: false, blockReason: 'app_store_inactive' };
      }
      return { canAccess: true, status: 'active', accessType, daysLeft: Infinity, isExpired: false, isDisabled: false, blockReason: null };
    }

    // Rule 6: trial — allowed only until trial_end_date
    if (!user.trial_end_date) {
      // No trial date yet — allow temporarily (backend sets it soon)
      return { canAccess: true, status: 'trial', accessType: 'trial', daysLeft: 30, isExpired: false, isDisabled: false, blockReason: null };
    }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const endDate = new Date(user.trial_end_date); endDate.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0 || accessStatus === 'expired') {
      return { canAccess: false, status: 'expired', accessType: 'trial', daysLeft: 0, isExpired: true, isDisabled: false, blockReason: 'trial_expired' };
    }

    return { canAccess: true, status: 'trial', accessType: 'trial', daysLeft, isExpired: false, isDisabled: false, blockReason: null };
  }, [user]);
}