import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FormatCurrencyOptions {
  currency?: string;
  showDecimals?: boolean;
}

export function formatCurrency(
  value?: number | null,
  currencyOrOptions: string | FormatCurrencyOptions = "THB",
) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  const options = typeof currencyOrOptions === "string"
    ? { currency: currencyOrOptions, showDecimals: true }
    : {
        currency: currencyOrOptions.currency ?? "THB",
        showDecimals: currencyOrOptions.showDecimals ?? true,
      };

  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: options.currency,
    minimumFractionDigits: options.showDecimals ? 2 : 0,
    maximumFractionDigits: options.showDecimals ? 2 : 0,
  }).format(value);
}

export function formatCompactNumber(value?: number | null) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value ?? 0);
}

const THAI_SHORT_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

export function parseDateInputValue(value?: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [yearValue, monthValue, dayValue] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(yearValue, monthValue - 1, dayValue));

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== yearValue ||
    parsed.getUTCMonth() !== monthValue - 1 ||
    parsed.getUTCDate() !== dayValue
  ) {
    return null;
  }

  return parsed;
}

export function formatThaiFlyerDate(value?: string | null) {
  const parsed = parseDateInputValue(value);

  if (!parsed) {
    return null;
  }

  const day = parsed.getUTCDate();
  const month = THAI_SHORT_MONTHS[parsed.getUTCMonth()] ?? "";
  const year = parsed.getUTCFullYear() + 543;
  return `${day} ${month} ${year}`;
}

export function formatThaiFlyerDateRange(startDate?: string | null, endDate?: string | null) {
  const startLabel = formatThaiFlyerDate(startDate);
  const endLabel = formatThaiFlyerDate(endDate);

  if (startLabel && endLabel) {
    return `${startLabel} - ${endLabel}`;
  }

  return startLabel ?? endLabel ?? null;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0E00-\u0E7F]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeSku(value?: string | null) {
  return (value ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function normalizeName(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function chunk<T>(items: T[], size: number) {
  const output: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }

  return output;
}

export function toPlainError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}
