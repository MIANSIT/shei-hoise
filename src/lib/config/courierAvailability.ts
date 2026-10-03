/**
 * Steadfast's integration is code-complete but not yet verified against a
 * real, active Steadfast account (blocked on their account-activation/KYC
 * step). Kept hidden from store owners behind this flag until that's
 * confirmed working end-to-end — flip to true once verified; every place
 * that checks this flag updates automatically, no other code changes
 * needed.
 */
export const STEADFAST_LIVE = false;

/**
 * Paperfly's cancel-order endpoint answers "invalid" for every request
 * format, even on a live pending parcel that create/track work fine for
 * (awaiting Paperfly support). The "Cancel shipment" button stays hidden
 * until that's resolved — flip to true once a real cancel succeeds.
 */
export const PAPERFLY_CANCEL_ENABLED = false;
