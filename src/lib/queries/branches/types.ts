/** Plan feature key that turns branches on for a store (subscription_plans.features). */
export const MULTI_BRANCH_FEATURE = "multi_branch";
/** Plan limit key for how many branches a store may have (-1 = unlimited). */
export const MAX_BRANCHES_LIMIT = "max_branches";

export interface BranchItem {
  id: string;
  name: string;
  code: string | null;
  priority: number;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  /** Units available across all products in this branch (owner view only). */
  unitsInStock: number;
  /** Units held for pending orders in this branch (owner view only). */
  unitsReserved: number;
}

export type BranchSetup =
  | {
      ok: true;
      /** The store's plan includes multi_branch. */
      featureEnabled: boolean;
      /** Branches have been turned on (at least one exists). */
      branchesOn: boolean;
      isOwner: boolean;
      /** -1 = unlimited */
      maxBranches: number;
      /** For staff: only the branches they're assigned to. */
      branches: BranchItem[];
      /** Staff limited to some branches can't pick "All branches". */
      canSeeAllBranches: boolean;
    }
  | { ok: false; error: string };

export type TransferStatus = "draft" | "sent" | "received" | "cancelled";

export interface TransferItem {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  quantity: number;
  /** Set once this line has been received into the target branch. */
  receivedAt: string | null;
}

export interface TransferListItem {
  id: string;
  transferNumber: string;
  fromBranchId: string;
  fromBranchName: string;
  toBranchId: string;
  toBranchName: string;
  status: TransferStatus;
  note: string | null;
  itemCount: number;
  unitCount: number;
  createdAt: string;
  sentAt: string | null;
  receivedAt: string | null;
  items?: TransferItem[];
}

export interface BranchStockOption {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  available: number;
}

export type BranchActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };
