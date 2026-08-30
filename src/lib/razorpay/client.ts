import Razorpay from "razorpay";
import { env } from "@/lib/env";

let razorpayInstance: Razorpay | null = null;

export function getRazorpayClient(): Razorpay | null {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    console.warn("[Razorpay] Keys not configured — running in simulated mode");
    return null;
  }
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
}

export function isRazorpayConfigured(): boolean {
  return !!env.RAZORPAY_KEY_ID && !!env.RAZORPAY_KEY_SECRET;
}
