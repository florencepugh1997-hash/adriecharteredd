export type CurrencyCode =
  | "GBP"
  | "USD"
  | "EUR"
  | "CHF"
  | "CAD"
  | "AUD"
  | "JPY"
  | "AED"
  | "SGD"
  | "NZD"
  | "SEK"
  | "NOK"
  | "DKK"
  | "CNY"
  | "HKD";

export interface CurrencyConfig {
  code: CurrencyCode;
  name: string;
  symbol: string;
  flag: string;
}

export const CURRENCIES: CurrencyConfig[] = [
  { code: "GBP", name: "British Pound Sterling", symbol: "£", flag: "🇬🇧" },
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", flag: "🇨🇭" },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$", flag: "🇨🇦" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", flag: "🇦🇺" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", flag: "🇯🇵" },
  { code: "AED", name: "UAE Dirham", symbol: "AED", flag: "🇦🇪" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", flag: "🇸🇬" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", flag: "🇳🇿" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", flag: "🇸🇪" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", flag: "🇳🇴" },
  { code: "DKK", name: "Danish Krone", symbol: "kr", flag: "🇩🇰" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", flag: "🇨🇳" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", flag: "🇭🇰" },
];

export type OtpMethod = "email" | "whatsapp" | "sms";

export const BANKS = [
  "Barclays",
  "HSBC",
  "Lloyds",
  "NatWest",
  "Santander",
  "Halifax",
  "Nationwide",
  "Monzo",
  "Starling",
  "Revolut",
  "Metro Bank",
  "TSB",
  "Virgin Money",
  "Co-operative Bank",
  "First Direct",
  "Chase UK",
];

export interface User {
  _id?: string;
  fullName: string;
  email: string;
  phone: string;
  accountNumber: string;
  sortCode: string;
  currency: CurrencyCode;
  balance: number;
  isVerified: boolean;
  profilePhoto?: string;
  otp?: string;
  otpExpiry?: string;
  otpMethod?: OtpMethod;
  createdAt?: string;
}

export interface Transaction {
  _id?: string;
  userId: string;
  type: "credit" | "debit";
  amount: number;
  currency: CurrencyCode;
  recipientName?: string;
  recipientAccount?: string;
  recipientSortCode?: string;
  recipientBank?: string;
  description: string;
  reference: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
}
