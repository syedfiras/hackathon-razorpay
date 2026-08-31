import { createClient } from "@supabase/supabase-js";

// Supabase seed — mirrors prisma/seed.ts but uses Supabase JS client
// Run: npm run db:seed  (tsx supabase/seed.ts)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("YOUR-PROJECT-REF") || supabaseUrl.includes("placeholder")) {
  console.error("❌ Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Indian synthetic data
const firstNames = [
  "Aarav","Vivaan","Aditya","Vikram","Arjun","Sai","Reyansh","Ayaan","Krishna","Ishaan",
  "Rahul","Ananya","Diya","Priya","Sneha","Kavya","Isha","Meera","Pooja","Nisha",
  "Amit","Suresh","Ramesh","Sanjay","Neha","Anjali","Riya","Shreya","Aditi","Karan",
  "Rohan","Siddharth","Harsh","Nikhil","Varun","Gaurav","Deepak","Manoj","Sunita","Lakshmi",
  "Kiran","Swati","Divya","Shalini","Rakesh","Vinay","Prakash","Ashok","Geeta","Seema",
];
const lastNames = [
  "Sharma","Verma","Gupta","Mehta","Patel","Singh","Kumar","Reddy","Nair","Iyer",
  "Joshi","Desai","Kapoor","Malhotra","Rao","Chopra","Bhat","Shetty","Agarwal","Jain",
  "Mishra","Yadav","Pandey","Trivedi","Chauhan","Khan","Ansari","Qureshi","Banerjee","Das",
];

const paymentMethods = ["upi","card","netbanking","wallet"] as const;
const failureReasons = ["insufficient_funds","bank_timeout","card_declined","expired_card","upi_failure"] as const;
const segments = ["new","returning","high_value","at_risk"] as const;

function pickWeighted<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a,b)=>a+b,0);
  let r = Math.random()*total;
  for(let i=0;i<items.length;i++){
    r -= weights[i];
    if(r<=0) return items[i];
  }
  return items[items.length-1];
}

function randomAmount(): number {
  const tiers = [
    { min: 29900, max: 99900, weight: 25 },
    { min: 100000, max: 499900, weight: 35 },
    { min: 500000, max: 1499000, weight: 20 },
    { min: 1500000, max: 4999900, weight: 15 },
    { min: 5000000, max: 9999000, weight: 5 },
  ];
  const tier = pickWeighted(tiers, tiers.map(t=>t.weight));
  return Math.floor(Math.random()*(tier.max - tier.min) + tier.min);
}

function randomDate(daysAgo: number): Date {
  const now = Date.now();
  const offset = Math.random()*daysAgo*24*60*60*1000;
  return new Date(now - offset);
}

async function main() {
  console.log("🌱 Seeding RecoverAI via Supabase...");

  // Clean existing — order matters due to FK cascades
  console.log("Cleaning old data...");
  await supabase.from("recovery_actions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("agent_decisions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("recovery_cases").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("failure_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("payment_attempts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("payments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("customers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("webhook_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("merchants").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  const { data: merchant, error: mErr } = await supabase.from("merchants").insert({
    name: "Razorpay Demo Store",
    email: "merchant@recoverai.demo",
    razorpay_key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_demo",
  }).select().single();
  if (mErr) throw mErr;
  console.log(`Merchant: ${(merchant as any).id}`);

  // Customers - 120 (batch insert for speed)
  const customerRows = [];
  for(let i=0;i<120;i++){
    const first = firstNames[Math.floor(Math.random()*firstNames.length)];
    const last = lastNames[Math.floor(Math.random()*lastNames.length)];
    const name = `${first} ${last}`;
    const email = `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`;
    const phone = `+91${Math.floor(7000000000 + Math.random()*2000000000)}`;
    const segment = pickWeighted([...segments], [20,40,20,20]);
    let lifetimeValue = 0;
    if(segment==="high_value") lifetimeValue = Math.floor(5000000 + Math.random()*5000000);
    else if(segment==="returning") lifetimeValue = Math.floor(1000000 + Math.random()*4000000);
    else if(segment==="new") lifetimeValue = Math.floor(10000 + Math.random()*500000);
    else lifetimeValue = Math.floor(50000 + Math.random()*1000000);

    customerRows.push({
      merchant_id: (merchant as any).id,
      name, email, phone, segment,
      lifetime_value: lifetimeValue,
      total_transactions: 0,
      successful_transactions: 0,
      previous_failures: 0,
    });
  }
  const { data: customers, error: cErr } = await supabase.from("customers").insert(customerRows).select();
  if (cErr) throw cErr;
  console.log(`Created ${(customers as any[]).length} customers`);

  // Payments - 650 (need to track customer stats locally to avoid 650 extra updates)
  const customerStats: Record<string, { total: number; success: number; failures: number }> = {};
  (customers as any[]).forEach(c => { customerStats[c.id] = { total: 0, success: 0, failures: 0 }; });

  let failedCount = 0;
  let recoveredCount = 0;

  for(let i=0;i<650;i++){
    const customer = (customers as any[])[Math.floor(Math.random()*(customers as any[]).length)];
    const amount = randomAmount();
    const method = pickWeighted([...paymentMethods], [45,35,12,8]);
    const isFailed = Math.random() < 0.35;
    const failureReason = isFailed ? pickWeighted([...failureReasons], [25,30,20,10,15]) : null;
    const status = isFailed ? "failed" : (Math.random()<0.92 ? "captured" : "authorized");
    const createdAt = randomDate(30);
    const failedAt = isFailed ? new Date(createdAt.getTime() + Math.floor(Math.random()*60000)) : null;

    const { data: payment, error: pErr } = await supabase.from("payments").insert({
      merchant_id: (merchant as any).id,
      customer_id: customer.id,
      razorpay_payment_id: `pay_${Math.random().toString(36).slice(2,12)}`,
      razorpay_order_id: `order_${Math.random().toString(36).slice(2,12)}`,
      amount,
      currency: "INR",
      payment_method: method,
      status,
      failure_reason: failureReason,
      failed_at: failedAt?.toISOString() || null,
      created_at: createdAt.toISOString(),
      updated_at: (failedAt || createdAt).toISOString(),
    }).select().single();
    if (pErr) throw pErr;

    // Track stats locally
    customerStats[customer.id].total += 1;
    if (isFailed) customerStats[customer.id].failures += 1;
    else customerStats[customer.id].success += 1;

    await supabase.from("payment_attempts").insert({
      payment_id: (payment as any).id,
      attempt_no: 1,
      status: isFailed ? "failed" : "success",
      error_code: isFailed ? failureReason : null,
      gateway_response: isFailed ? { error: failureReason, code: "GATEWAY_ERROR" } : { status: "captured" },
      created_at: createdAt.toISOString(),
    });

    if(isFailed){
      await supabase.from("failure_events").insert({
        payment_id: (payment as any).id,
        code: failureReason!,
        reason: getFailureReasonLabel(failureReason!),
        gateway_response: { reason: failureReason, timestamp: createdAt.toISOString() },
        created_at: failedAt!.toISOString(),
      });

      if(Math.random()<0.85){
        const willRecover = Math.random() < 0.64;
        const recoveredAt = willRecover ? new Date(failedAt!.getTime() + Math.floor(Math.random()*3600000*24)) : null;
        const recoveryProb = calculateProb(failureReason!, method, customer.segment);
        const finalProb = willRecover ? Math.min(0.95, recoveryProb + 0.15) : Math.max(0.1, recoveryProb - 0.1);
        const rcStatus = willRecover ? "recovered" : (Math.random()<0.4 ? "failed" : (Math.random()<0.5 ? "in_progress" : "open"));

        const { data: recoveryCase } = await supabase.from("recovery_cases").insert({
          payment_id: (payment as any).id,
          merchant_id: (merchant as any).id,
          status: rcStatus,
          recovery_probability: Math.round(finalProb*100)/100,
          amount_recovered: willRecover ? amount : 0,
          last_action: getLastAction(failureReason!),
          attempt_count: willRecover ? 1 : Math.floor(Math.random()*2)+1,
          max_attempts: 3,
          created_at: failedAt!.toISOString(),
          updated_at: (recoveredAt || new Date()).toISOString(),
        }).select().single();

        if(willRecover){
          await supabase.from("payments").update({ status: "recovered", recovered_at: recoveredAt!.toISOString(), updated_at: recoveredAt!.toISOString() }).eq("id", (payment as any).id);
          // Update local stats: recovered counts as success later
          customerStats[customer.id].success += 1;
          recoveredCount++;
        }
        failedCount++;

        const decision = getDecisionForReason(failureReason!);
        const model = pickWeighted(
          ["meta-llama/llama-3.1-8b-instruct:free","google/gemini-flash-1.5-8b:free","fallback/deterministic"],
          [50,30,20]
        );
        const confidence = 0.65 + Math.random()*0.25;
        await supabase.from("agent_decisions").insert({
          recovery_case_id: (recoveryCase as any).id,
          model,
          input_context: {
            transaction: { id: (payment as any).id, amount, payment_method: method, failure_reason: failureReason },
            customer: { id: customer.id, segment: customer.segment, total_transactions: customerStats[customer.id].total }
          },
          decision: decision,
          confidence: Math.round(confidence*100)/100,
          reasoning: getReasoning(failureReason!, customer.segment),
          recovery_probability: Math.round(finalProb*100)/100,
          fallback_action: decision==="retry_payment" ? "create_payment_link" : "send_reminder",
          max_attempts: decision==="retry_payment" ? 2 : 1,
          policy_verdict: Math.random()<0.85 ? "allowed" : "overridden",
          policy_reason: Math.random()<0.85 ? "Policy validation passed." : "Overridden due to max attempts.",
          executed_action: decision,
          created_at: new Date(failedAt!.getTime() + 1000).toISOString(),
        });

        const actions = [
          { type: "diagnose", status: "success" },
          { type: "get_history", status: "success" },
          { type: "calculate_probability", status: "success" },
          { type: "ai_decision", status: "success" },
          { type: "policy_validation", status: "success" },
          { type: decision, status: willRecover ? "success" : (rcStatus==="failed"?"failed":"success") },
        ];
        for(let idx=0; idx<actions.length; idx++){
          await supabase.from("recovery_actions").insert({
            recovery_case_id: (recoveryCase as any).id,
            type: actions[idx].type,
            status: actions[idx].status,
            output: { step: idx, simulated: true },
            is_simulated: true,
            created_at: new Date(failedAt!.getTime() + (idx+1)*1000).toISOString(),
          });
        }

        if(decision==="create_payment_link" || decision==="retry_payment"){
          await supabase.from("notifications").insert({
            recovery_case_id: (recoveryCase as any).id,
            channel: "in_app",
            recipient: customer.email,
            template: willRecover ? "payment_link_sent" : "recovery_reminder",
            payload: { amount, method },
            status: "sent",
            sent_at: new Date(failedAt!.getTime() + 5000).toISOString(),
          });
        }
      }
    }

    if (i % 100 === 0) console.log(`Progress ${i}/650`);
  }

  // Batch update customer stats
  console.log("Updating customer stats...");
  for (const cid of Object.keys(customerStats)) {
    const s = customerStats[cid];
    await supabase.from("customers").update({
      total_transactions: s.total,
      successful_transactions: s.success,
      previous_failures: s.failures,
      updated_at: new Date().toISOString(),
    }).eq("id", cid);
  }

  console.log(`Failed: ${failedCount}, Recovered: ${recoveredCount}, Recovery Rate: ${failedCount ? ((recoveredCount/failedCount)*100).toFixed(1):0}%`);

  // Webhook events sample
  for(let i=0;i<10;i++){
    await supabase.from("webhook_events").insert({
      razorpay_event_id: `evt_${Math.random().toString(36).slice(2,14)}`,
      event: pickWeighted(["payment.failed","payment.captured","payment.authorized"], [40,40,20]),
      payload: { simulated: true, index: i },
      signature_valid: true,
      processed: Math.random()<0.9,
      processed_at: randomDate(2).toISOString(),
    });
  }

  console.log("✅ Seed completed");
}

function getFailureReasonLabel(reason: string): string {
  const map: Record<string,string> = {
    insufficient_funds: "Insufficient funds in customer account",
    bank_timeout: "Bank gateway timeout — no response from issuer",
    card_declined: "Card declined by issuing bank",
    expired_card: "Card expired — invalid expiry date",
    upi_failure: "UPI transaction failed — collect request expired",
  };
  return map[reason] || reason;
}

function calculateProb(reason: string, method: string, segment: string): number {
  const base: Record<string,number> = {
    bank_timeout: 0.85, upi_failure: 0.6, insufficient_funds: 0.55, card_declined: 0.45, expired_card: 0.3
  };
  let p = base[reason] || 0.5;
  if(segment==="high_value") p+=0.1;
  if(segment==="returning") p+=0.05;
  if(segment==="at_risk") p-=0.1;
  return Math.max(0.05, Math.min(0.95, p));
}

function getLastAction(reason: string): string {
  const map: Record<string,string> = {
    bank_timeout: "retry_payment",
    upi_failure: "retry_payment",
    insufficient_funds: "wait_and_retry",
    card_declined: "create_payment_link",
    expired_card: "create_payment_link",
  };
  return map[reason] || "create_payment_link";
}

function getDecisionForReason(reason: string): string {
  return getLastAction(reason);
}

function getReasoning(reason: string, segment: string): string {
  if(reason==="bank_timeout") return `Transient bank timeout with ${segment} customer — immediate retry has high success likelihood.`;
  if(reason==="insufficient_funds") return `Insufficient funds requires waiting for balance refresh; fallback to payment link for ${segment} segment.`;
  if(reason==="card_declined") return `Card declined — avoid repeated retries, offer alternative payment method via secure link.`;
  if(reason==="expired_card") return `Expired card cannot be retried — generate payment link and request updated card details.`;
  return `UPI failure may be transient network issue; retry once then fallback to link for ${segment} customer.`;
}

main()
  .catch((e)=>{ console.error(e); process.exit(1); });
