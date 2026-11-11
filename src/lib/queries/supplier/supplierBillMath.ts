export type BillStatus = "paid" | "part" | "unpaid";

/** One bill from the supplier ledger. */
export interface RawBill {
  id: string;
  supplierId: string;
  /** YYYY-MM-DD */
  date: string;
  /** Used only to keep bills from the same day in the order they were entered. */
  createdAt: string;
  amount: number;
  purchaseId: string | null;
  /** The branch that received the goods; null when it was not recorded. */
  branchId?: string | null;
}

export interface RawPayment {
  supplierId: string;
  amount: number;
  /** The branch whose bills this payment (or credit) is applied to first; null = not tied to a branch, applied to the oldest bills. */
  targetBranchId?: string | null;
  /** The bill this payment was made for: it pays that bill first, up to the bill's amount. The rest is applied as any other payment. */
  forBillId?: string | null;
}

/** What Receive stock saved about a purchase: the number on the paper bill and when it must be paid. */
export interface PurchaseMeta {
  billNo: string | null;
  /** YYYY-MM-DD */
  dueDate: string | null;
  /** Storage path of the photo of the paper bill, if one was added. */
  attachment?: string | null;
}

export interface BillRow {
  id: string;
  supplierId: string;
  date: string;
  billNo: string | null;
  dueDate: string | null;
  amount: number;
  paid: number;
  left: number;
  status: BillStatus;
  /** Still unpaid after its pay-by date. */
  overdue: boolean;
  /** Days since the bill date (0 when the bill is fully paid). */
  ageDays: number;
  /** Entered before Receive stock existed: no bill number, due date or lines. */
  legacy: boolean;
  /** The purchase behind the bill; null for a legacy bill. */
  purchaseId: string | null;
  /** Storage path of the photo of the paper bill; null when none. */
  attachment: string | null;
  /** The branch that received the goods; null for a bill with no branch (an older bill typed by hand). */
  branchId: string | null;
}

export interface BillSummary {
  /** What is still owed to suppliers (never negative). */
  payable: number;
  overdue: number;
  /** Owed on bills whose pay-by date falls in the next 7 days. */
  dueSoon: number;
  /** Paid above all bills; kept as an advance with that supplier. */
  advance: number;
  openBills: number;
  /** What is owed, by how old the bill is. */
  aging: { upTo30: number; from31To60: number; over60: number };
}

const EPSILON = 0.005;

const addDaysToDate = (isoDate: string, days: number): string => {
  const date = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const dayNumber = (isoDate: string): number => Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000);

/**
 * Works out, bill by bill, how much of each is paid.
 *
 * A supplier's payments are applied to that supplier's bills oldest first (first in, first out), the way a
 * statement is normally read, but a payment that names a branch is applied to that branch's bills first:
 * branch A's bills are paid by the payments meant for branch A, oldest first. What a branch's payments
 * cannot use (more than its bills, or a payment that names no branch, such as an investor's) is applied to
 * the supplier's oldest bills in any branch. Payments above all bills are returned as an advance.
 * @param today the store's today, YYYY-MM-DD
 * @returns every bill with its paid and left amounts and status, plus the totals
 */
export function allocateSupplierPayments(
  bills: readonly RawBill[],
  payments: readonly RawPayment[],
  meta: Readonly<Record<string, PurchaseMeta>>,
  today: string,
  /** The supplier's own pays-within days, used when a bill has no pay-by date; null = the supplier has no terms, so the bill is never due. */
  termsDays: (supplierId: string) => number | null = () => null,
): { rows: BillRow[]; summary: BillSummary } {
  const sorted = [...bills].sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)));
  const todayNumber = dayNumber(today);

  // Pass 0: a payment made for a named bill pays that bill first (never above what it still needs). A refund
  // (negative amount), a bill of another supplier, or the part above the bill is applied like any other payment.
  const paidByBill = new Map<string, number>();
  const billById = new Map(sorted.map((b) => [b.id, b]));
  for (const bill of sorted) paidByBill.set(bill.id, 0);
  const remaining: { supplierId: string; amount: number; targetBranchId?: string | null }[] = [];
  for (const p of payments) {
    const bill = p.forBillId ? billById.get(p.forBillId) : undefined;
    if (bill && bill.supplierId === p.supplierId && p.amount > 0) {
      const take = Math.min(p.amount, Math.max(bill.amount - (paidByBill.get(bill.id) ?? 0), 0));
      paidByBill.set(bill.id, (paidByBill.get(bill.id) ?? 0) + take);
      if (p.amount - take > EPSILON) remaining.push({ supplierId: p.supplierId, amount: p.amount - take, targetBranchId: p.targetBranchId });
    } else {
      remaining.push(p);
    }
  }

  // Per supplier: money meant for a branch's bills, and money meant for any bill (the pool).
  const targeted = new Map<string, Map<string, number>>();
  const pool = new Map<string, number>();
  for (const p of remaining) {
    if (p.targetBranchId) {
      const perBranch = targeted.get(p.supplierId) ?? new Map<string, number>();
      perBranch.set(p.targetBranchId, (perBranch.get(p.targetBranchId) ?? 0) + p.amount);
      targeted.set(p.supplierId, perBranch);
    } else {
      pool.set(p.supplierId, (pool.get(p.supplierId) ?? 0) + p.amount);
    }
  }

  // Pass 1: a branch's own payments pay that branch's bills, oldest first.
  for (const bill of sorted) {
    const perBranch = bill.branchId ? targeted.get(bill.supplierId) : undefined;
    const have = bill.branchId && perBranch ? (perBranch.get(bill.branchId) ?? 0) : 0;
    const open = bill.amount - (paidByBill.get(bill.id) ?? 0);
    const take = Math.min(Math.max(have, 0), Math.max(open, 0));
    if (take > 0 && bill.branchId && perBranch) perBranch.set(bill.branchId, have - take);
    paidByBill.set(bill.id, (paidByBill.get(bill.id) ?? 0) + take);
  }
  // What a branch could not use goes to the pool.
  for (const [supplierId, perBranch] of targeted) {
    for (const left of perBranch.values()) if (left > 0) pool.set(supplierId, (pool.get(supplierId) ?? 0) + left);
  }
  // Pass 2: the pool pays what is still open, oldest first, in any branch.
  for (const bill of sorted) {
    const available = pool.get(bill.supplierId) ?? 0;
    const open = bill.amount - (paidByBill.get(bill.id) ?? 0);
    const take = Math.min(Math.max(available, 0), Math.max(open, 0));
    if (take > 0) {
      pool.set(bill.supplierId, available - take);
      paidByBill.set(bill.id, (paidByBill.get(bill.id) ?? 0) + take);
    }
  }

  const rows: BillRow[] = sorted.map((bill) => {
    const paid = paidByBill.get(bill.id) ?? 0;
    const left = Math.round((bill.amount - paid) * 100) / 100;
    const purchase = bill.purchaseId ? meta[bill.purchaseId] : undefined;
    const days = purchase?.dueDate ? null : termsDays(bill.supplierId);
    const dueDate = purchase?.dueDate ?? (days ? addDaysToDate(bill.date, days) : null);
    const isOpen = left > EPSILON;
    const status: BillStatus = !isOpen ? "paid" : paid > EPSILON ? "part" : "unpaid";

    return {
      id: bill.id,
      supplierId: bill.supplierId,
      date: bill.date,
      billNo: purchase?.billNo ?? null,
      dueDate,
      amount: bill.amount,
      paid: Math.round(paid * 100) / 100,
      left: isOpen ? left : 0,
      status,
      overdue: isOpen && dueDate !== null && dueDate < today,
      ageDays: isOpen ? Math.max(todayNumber - dayNumber(bill.date), 0) : 0,
      legacy: !bill.purchaseId,
      purchaseId: bill.purchaseId ?? null,
      attachment: purchase?.attachment ?? null,
      branchId: bill.branchId ?? null,
    };
  });

  let advance = 0;
  for (const left of pool.values()) if (left > EPSILON) advance += left;
  const summary = summarizeBillRows(rows, advance, today);
  return { rows, summary };
}

/**
 * The totals for a set of bills: what is owed, overdue, due in the next 7 days and ageing.
 * Used for every bill, and for one branch's bills only (goods received at that branch).
 * @param advance paid above all bills; only meaningful for the whole store, so a branch passes 0
 * @param today the store's today, YYYY-MM-DD
 */
export function summarizeBillRows(rows: readonly BillRow[], advance: number, today: string): BillSummary {
  const todayNumber = dayNumber(today);
  const inSevenDays = todayNumber + 7;
  const summary: BillSummary = {
    payable: 0,
    overdue: 0,
    dueSoon: 0,
    advance,
    openBills: 0,
    aging: { upTo30: 0, from31To60: 0, over60: 0 },
  };
  for (const row of rows) {
    if (row.left <= EPSILON) continue;
    summary.payable += row.left;
    summary.openBills += 1;
    if (row.overdue) summary.overdue += row.left;
    if (row.dueDate && !row.overdue && dayNumber(row.dueDate) <= inSevenDays) summary.dueSoon += row.left;
    if (row.ageDays <= 30) summary.aging.upTo30 += row.left;
    else if (row.ageDays <= 60) summary.aging.from31To60 += row.left;
    else summary.aging.over60 += row.left;
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    ...summary,
    payable: round(summary.payable),
    overdue: round(summary.overdue),
    dueSoon: round(summary.dueSoon),
    advance: round(summary.advance),
    aging: {
      upTo30: round(summary.aging.upTo30),
      from31To60: round(summary.aging.from31To60),
      over60: round(summary.aging.over60),
    },
  };
}
