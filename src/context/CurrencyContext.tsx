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
const TAX_OVERRIDES_KEY = "truegear_tax_overrides";

function getInitialCurrency(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || "USD";
  } catch {
    return "USD";
  }
}

function getInitialTaxOverrides(): Record<string, number> {
  try {
    const raw = localStorage.getItem(TAX_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

interface CurrencyContextValue {
  currency: string;
  setCurrency: (code: string) => void;
  formatCurrency: (amount: number) => string;
  currencyOption: CurrencyOption;
  taxConfig: TaxConfig;
  setTaxPercentage: (percentage: number) => void;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState(getInitialCurrency);
  const [taxOverrides, setTaxOverrides] = useState<Record<string, number>>(getInitialTaxOverrides);

  const currencyOption = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];
  const defaultTax = CURRENCY_TAX_MAP[currency] || { label: "Tax", percentage: 10 };
  const taxConfig: TaxConfig = {
    label: defaultTax.label,
    percentage: taxOverrides[currency] ?? defaultTax.percentage,
  };

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // ignore
    }
  }, []);

  const setTaxPercentage = useCallback((percentage: number) => {
    setTaxOverrides((prev) => {
      const updated = { ...prev, [currency]: percentage };
      try {
        localStorage.setItem(TAX_OVERRIDES_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, [currency]);

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
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency, currencyOption, taxConfig, setTaxPercentage }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
