import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
  locale: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: "INR", symbol: "₹", label: "Indian Rupee (₹)", locale: "en-IN" },
  { code: "USD", symbol: "$", label: "US Dollar ($)", locale: "en-US" },
  { code: "EUR", symbol: "€", label: "Euro (€)", locale: "de-DE" },
  { code: "GBP", symbol: "£", label: "British Pound (£)", locale: "en-GB" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham (د.إ)", locale: "ar-AE" },
];

export interface TaxConfig {
  label: string;
  percentage: number;
}

const CURRENCY_TAX_MAP: Record<string, TaxConfig> = {
  INR: { label: "GST", percentage: 18 },
  AED: { label: "VAT", percentage: 5 },
  USD: { label: "Tax", percentage: 10 },
  EUR: { label: "VAT", percentage: 20 },
  GBP: { label: "VAT", percentage: 20 },
};

const STORAGE_KEY = "truegear_currency";

function getInitialCurrency(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || "INR";
  } catch {
    return "INR";
  }
}

interface CurrencyContextValue {
  currency: string;
  setCurrency: (code: string) => void;
  formatCurrency: (amount: number) => string;
  currencyOption: CurrencyOption;
  taxConfig: TaxConfig;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState(getInitialCurrency);

  const currencyOption = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];
  const taxConfig = CURRENCY_TAX_MAP[currency] || { label: "Tax", percentage: 10 };

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // ignore
    }
  }, []);

  const formatCurrency = useCallback(
    (amount: number) => {
      return new Intl.NumberFormat(currencyOption.locale, {
        style: "currency",
        currency: currencyOption.code,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
    },
    [currencyOption]
  );

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency, currencyOption, taxConfig }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
