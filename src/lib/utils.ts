import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amountInPaise: number): string {
  const rupees = amountInPaise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

export function formatCurrencyCompact(amountInPaise: number): string {
  const rupees = amountInPaise / 100;
  if (rupees >= 10000000) return `₹${(rupees / 10000000).toFixed(1)}Cr`;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}k`;
  return formatCurrency(amountInPaise);
}

export function generateTxnId(): string {
  return `TXN_${Math.floor(100000 + Math.random() * 900000)}_${Date.now()
    .toString()
    .slice(-4)}`;
}

export function generateCustomerId(): string {
  return `CUS_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
