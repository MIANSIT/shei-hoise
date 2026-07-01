export interface BkashConfig {
  type: "bkash";
  label: "bKash";
  accountType: "Personal";
  number: string;
  charges: {
    priyo: { label: string; rate: number };
    regular: { label: string; rate: number };
  };
}

export interface NagadConfig {
  type: "nagad";
  label: "Nagad";
  accountType: "Personal";
  number: string;
  charges: {
    standard: { label: string; rate: number };
  };
}

export interface BankConfig {
  type: "bank";
  label: "Bank Transfer";
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
  routingNumber: string;
}

export type PaymentMethodConfig = BkashConfig | NagadConfig | BankConfig;

export const BKASH: BkashConfig = {
  type: "bkash",
  label: "bKash",
  accountType: "Personal",
  number: "01761867763",
  charges: {
    priyo: { label: "Priyo", rate: 0.0149 },
    regular: { label: "Regular", rate: 0.0185 },
  },
};

export const NAGAD: NagadConfig = {
  type: "nagad",
  label: "Nagad",
  accountType: "Personal",
  number: "01833228622",
  charges: {
    standard: { label: "Standard", rate: 0.013 },
  },
};

export const BANK: BankConfig = {
  type: "bank",
  label: "Bank Transfer",
  bankName: "Non-Resident Bangladeshis Commercial Bank (NRBC)",
  accountName: "SHAH NAWROSE",
  accountNumber: "012032000001758",
  branch: "Rajshahi",
  routingNumber: "260811934",
};

export const PAYMENT_METHODS = [BKASH, NAGAD, BANK] as const;

export function calcBkash(amount: number) {
  return {
    priyo: Math.round(amount * (1 + BKASH.charges.priyo.rate)),
    regular: Math.round(amount * (1 + BKASH.charges.regular.rate)),
  };
}

export function calcNagad(amount: number) {
  return Math.round(amount * (1 + NAGAD.charges.standard.rate));
}
