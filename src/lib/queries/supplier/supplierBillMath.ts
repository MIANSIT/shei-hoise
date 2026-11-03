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
}

export interface RawPayment {
  supplierId: string;
  amount: number;
}

/** What Receive stock saved about a purchase: the number on the paper bill and when it must be paid. */
export interface PurchaseMeta {
  billNo: string | null;
  /** YYYY-MM-DD */
  dueDate: string | null;
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

const dayNumber = (isoDate: string): number => Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000);

/**
 * Works out, bill by bill, how much of each is paid. Payments are not tied to a
 * bill when they are entered, so each supplier's payments are applied to that
 * supplier's oldest bills first (first in, first out), the way a statement is
 * normally read. Payments above all bills are returned as an advance.
 * @param today the store's today, YYYY-MM-DD
 * @returns every bill with its paid and left amounts and status, plus the totals
 */
export function allocateSupplierPayments(
  bills: readonly RawBill[],
  payments: readonly RawPayment[],
  meta: Readonly<Record<string, PurchaseMeta>>,
  today: string,
): { rows: BillRow[]; summary: BillSummary } {
  const paidBySupplier = new Map<string, number>();
  for (const p of payments) paidBySupplier.set(p.supplierId, (paidBySupplier.get(p.supplierId) ?? 0) + p.amount);

  const sorted = [...bills].sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)));
  const remaining = new Map(paidBySupplier);
  const todayNumber = dayNumber(today);

  const rows: BillRow[] = sorted.map((bill) => {
    const available = remaining.get(bill.supplierId) ?? 0;
    const paid = Math.min(Math.max(available, 0), bill.amount);
    remaining.set(bill.supplierId, available - paid);

    const left = Math.round((bill.amount - paid) * 100) / 100;
    const purchase = bill.purchaseId ? meta[bill.purchaseId] : undefined;
    const dueDate = purchase?.dueDate ?? null;
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
    };
  });

  const inSevenDays = todayNumber + 7;
  const summary: BillSummary = {
    payable: 0,
    overdue: 0,
    dueSoon: 0,
    advance: 0,
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
  for (const left of remaining.values()) if (left > EPSILON) summary.advance += left;

  const round = (n: number) => Math.round(n * 100) / 100;
  summary.payable = round(summary.payable);
  summary.overdue = round(summary.overdue);
  summary.dueSoon = round(summary.dueSoon);
  summary.advance = round(summary.advance);
  summary.aging = {
    upTo30: round(summary.aging.upTo30),
    from31To60: round(summary.aging.from31To60),
    over60: round(summary.aging.over60),
  };
  return { rows, summary };
}
