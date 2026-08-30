import { getRazorpayClient } from "./client";

export async function createPaymentLink(params: {
  amount: number; // in paise
  currency?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  description?: string;
}) {
  const client = getRazorpayClient();
  if (!client) {
    // Simulated
    return {
      simulated: true,
      id: `plink_sim_${Date.now()}`,
      short_url: `https://rzp.io/l/sim_${Math.random().toString(36).slice(2, 8)}`,
      status: "created",
      amount: params.amount,
    };
  }
  try {
    // Razorpay payment link API
    const res = await (client as any).paymentLink.create({
      amount: params.amount,
      currency: params.currency || "INR",
      description: params.description || "RecoverAI Payment Link",
      customer: {
        name: params.customerName,
        email: params.customerEmail,
        contact: params.customerPhone || "+919999999999",
      },
      notify: { sms: false, email: false },
      reminder_enable: true,
      notes: { source: "recoverai" },
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/recovery`,
      callback_method: "get",
    });
    return res;
  } catch (e) {
    console.warn("[Razorpay] createPaymentLink failed", e);
    return {
      simulated: true,
      error: String(e),
      short_url: `https://rzp.io/l/sim_${Math.random().toString(36).slice(2, 8)}`,
    };
  }
}
