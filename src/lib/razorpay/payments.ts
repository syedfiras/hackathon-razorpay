import { getRazorpayClient } from "./client";

export async function fetchPayment(paymentId: string) {
  const client = getRazorpayClient();
  if (!client) return { simulated: true, id: paymentId };
  try {
    return await client.payments.fetch(paymentId);
  } catch (e) {
    console.warn("[Razorpay] fetchPayment failed", e);
    return null;
  }
}

export async function fetchPayments(opts?: { count?: number; skip?: number }) {
  const client = getRazorpayClient();
  if (!client) return { items: [], simulated: true };
  try {
    const res = await (client.payments as any).all({
      count: opts?.count || 20,
      skip: opts?.skip || 0,
    });
    return res;
  } catch (e) {
    console.warn("[Razorpay] fetchPayments failed", e);
    return { items: [], error: String(e) };
  }
}

export async function createOrder(amountPaise: number, currency = "INR", receipt?: string) {
  const client = getRazorpayClient();
  if (!client) return { simulated: true, id: `order_sim_${Date.now()}`, amount: amountPaise };
  try {
    return await client.orders.create({
      amount: amountPaise,
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
    });
  } catch (e) {
    console.warn("[Razorpay] createOrder failed", e);
    return { simulated: true, error: String(e) };
  }
}
