import { z } from "zod";

export const tickerSymbolSchema = z
  .string()
  .trim()
  .min(1, "Ticker symbol is required")
  .max(10, "Ticker symbol is too long")
  .transform((value) => value.toUpperCase().replace(/[^A-Z.]/g, ""))
  .refine((value) => value.length >= 1, "Ticker symbol is invalid");

export function normalizeTickerSymbol(value: string) {
  return tickerSymbolSchema.parse(value);
}
