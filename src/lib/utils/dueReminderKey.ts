/** Key of one Customer Dues row: a customer, and the branch for stores with branches. */
export const dueReminderKey = (customerId: string, branchId: string | null): string =>
  `${customerId}:${branchId ?? ""}`;
