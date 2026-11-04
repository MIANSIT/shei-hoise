/** sent: in transit, left the sender; received: confirmed by the receiving branch; cancelled: taken back by the sender. */
export type BranchTransferStatus = "sent" | "received" | "cancelled";

/** The payment methods that hold a branch's money. */
export const TRANSFER_METHODS = ["cash", "mobile_banking", "bank_transfer"] as const;
export type TransferMethod = (typeof TRANSFER_METHODS)[number];

export interface BranchTransfer {
  id: string;
  fromBranchId: string;
  toBranchId: string;
  amount: number;
  method: TransferMethod;
  /** YYYY-MM-DD: the day it was sent. */
  date: string;
  note: string | null;
  status: BranchTransferStatus;
  /** YYYY-MM-DD: the day the receiving branch confirmed it. */
  receivedDate: string | null;
}

export interface SendBranchTransferInput {
  fromBranchId: string;
  toBranchId: string;
  amount: number;
  method: TransferMethod;
  date: string;
  note?: string;
}

export interface BranchTransferResult {
  success: boolean;
  error?: string;
}
