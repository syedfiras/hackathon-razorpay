import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL required"),
  DIRECT_URL: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default("meta-llama/llama-3.1-8b-instruct:free"),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
});

function getEnv() {
  const parsed = envSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
  });
  if (!parsed.success) {
    // In production we still want to start even if some optional vars missing
    // so we warn instead of throwing for optional fields
    console.warn("Env validation warnings:", parsed.error.flatten());
  }
  return {
    DATABASE_URL: process.env.DATABASE_URL || "",
    DIRECT_URL: process.env.DIRECT_URL,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
    OPENROUTER_MODEL:
      process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free",
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "",
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || "",
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || "",
  };
}

export const env = getEnv();
export const isOpenRouterConfigured = () => !!env.OPENROUTER_API_KEY;
export const isRazorpayConfigured = () =>
  !!env.RAZORPAY_KEY_ID && !!env.RAZORPAY_KEY_SECRET;
export const isDatabaseConfigured = () =>
  !!env.DATABASE_URL && !env.DATABASE_URL.includes("YOUR-PROJECT-REF");
