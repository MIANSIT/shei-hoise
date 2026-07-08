/**
 * Steadfast's integration is code-complete but not yet verified against a
 * real, active Steadfast account (blocked on their account-activation/KYC
 * step). Kept hidden from store owners behind this flag until that's
 * confirmed working end-to-end — flip to true once verified; every place
 * that checks this flag updates automatically, no other code changes
 * needed.
 */
export const STEADFAST_LIVE = false;
