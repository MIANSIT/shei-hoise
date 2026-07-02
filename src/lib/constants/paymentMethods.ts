export interface BkashConfig {
  type: "bkash";
  label: "bKash";
  accountType: "Personal";
  number: string;
}

export interface NagadConfig {
  type: "nagad";
  label: "Nagad";
  accountType: "Personal";
  number: string;
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
};

export const NAGAD: NagadConfig = {
  type: "nagad",
  label: "Nagad",
  accountType: "Personal",
  number: "01833228622",
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
