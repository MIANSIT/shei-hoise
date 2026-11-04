import { z } from "zod";
import { MONEY_METHODS } from "./moneyBookTypes";

/*
 * Shared checks for the balance figures that the browser sends to be saved (a closed month, a daily
 * balance). Not a "use server" file: it exports plain values.
 */

export const MONEY = z.number().finite().min(-1_000_000_000_000).max(1_000_000_000_000);
export const COUNT = z.number().finite().min(0).max(100_000_000);

export const balanceSchema = z.object({
  inventoryAtCost: MONEY,
  inventoryAtSelling: MONEY,
  inventoryUnits: COUNT,
  itemsWithoutCost: COUNT,
  customerDue: MONEY,
  codWithCourier: MONEY,
  accountsPayable: MONEY.nullable(),
  supplierAdvance: MONEY,
});

export const cashSchema = z
  .object({
    methods: z.array(z.object({ method: z.enum(MONEY_METHODS), opening: MONEY, moved: MONEY, left: MONEY })).max(10),
    total: MONEY,
    fixedAssets: MONEY,
    loans: MONEY,
    // Copies saved before the Investor account existed do not have it.
    investorAccount: MONEY.optional(),
  })
  .nullable();
