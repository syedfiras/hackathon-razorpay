// Deterministic mock data generator — mirrors prisma/seed.ts but in-memory for demo fallback when DB not reachable
// Used when DATABASE_URL is not configured or DB unreachable

const firstNames = [
  "Aarav","Vivaan","Aditya","Vikram","Arjun","Sai","Reyansh","Ayaan","Krishna","Ishaan",
  "Rahul","Ananya","Diya","Priya","Sneha","Kavya","Isha","Meera","Pooja","Nisha",
  "Amit","Suresh","Ramesh","Sanjay","Neha","Anjali","Riya","Shreya","Aditi","Karan",
  "Rohan","Siddharth","Harsh","Nikhil","Varun","Gaurav","Deepak","Manoj","Sunita","Lakshmi",
];

const lastNames = [
  "Sharma","Verma","Gupta","Mehta","Patel","Singh","Kumar","Reddy","Nair","Iyer",
  "Joshi","Desai","Kapoor","Malhotra","Rao","Chopra","Bhat","Shetty","Agarwal","Jain",
];

const paymentMethods = ["upi","card","netbanking","wallet"] as const;
const failureReasons = ["insufficient_funds","bank_timeout","card_declined","expired_card","upi_failure"] as const;

function pickWeighted<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a,b)=>a+b,0);
  let r = Math.random()*total;
  for(let i=0;i<items.length;i++){ r-=weights[i]; if(r<=0) return items[i]; }
  return items[items.length-1];
}

function randomAmount(): number {
  const tiers = [
    { min: 29900, max: 99900, weight: 25 },
    { min: 100000, max: 499900, weight: 35 },
    { min: 500000, max: 1499000, weight: 20 },
    { min: 1500000, max: 4999900, weight: 15 },
  ];
  const tier = pickWeighted(tiers, tiers.map(t=>t.weight));
  return Math.floor(Math.random()*(tier.max - tier.min) + tier.min);
}

export interface MockCustomer {
  id: string; name: string; email: string; phone: string; segment: string;
  lifetimeValue: number; totalTransactions: number; successfulTransactions: number; previousFailures: number;
  createdAt: string;
}
export interface MockPayment {
  id: string; merchantId: string; customerId: string; customer: MockCustomer;
  razorpayPaymentId: string; amount: number; currency: string; paymentMethod: string; status: string; failureReason: string | null;
  createdAt: string; failedAt: string | null; recoveredAt: string | null;
}
export interface MockRecoveryCase {
  id: string; paymentId: string; payment: MockPayment; status: string; recoveryProbability: number; amountRecovered: number; lastAction: string; attemptCount: number; createdAt: string; updatedAt: string;
  decisions: any[]; actions: any[];
}

let cached: { customers: MockCustomer[]; payments: MockPayment[]; recoveryCases: MockRecoveryCase[] } | null = null;

export function generateMockData(): { customers: MockCustomer[]; payments: MockPayment[]; recoveryCases: MockRecoveryCase[] } {
  if(cached) return cached;

  const customers: MockCustomer[] = [];
  for(let i=0;i<120;i++){
    const first = firstNames[Math.floor(Math.random()*firstNames.length)];
    const last = lastNames[Math.floor(Math.random()*lastNames.length)];
    const segment = pickWeighted(["new","returning","high_value","at_risk"], [20,40,20,20]);
    customers.push({
      id: `cus_${String(i).padStart(4,"0")}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
      phone: `+91${Math.floor(7000000000+Math.random()*2000000000)}`,
      segment,
      lifetimeValue: segment==="high_value"? Math.floor(5000000+Math.random()*5000000) : Math.floor(100000+Math.random()*3000000),
      totalTransactions: Math.floor(5+Math.random()*25),
      successfulTransactions: 0,
      previousFailures: Math.floor(Math.random()*4),
      createdAt: new Date(Date.now()-Math.random()*30*24*60*60*1000).toISOString(),
    });
  }

  // fix successful counts
  customers.forEach(c => {
    c.successfulTransactions = Math.max(0, c.totalTransactions - c.previousFailures - Math.floor(Math.random()*2));
  });

  const payments: MockPayment[] = [];
  const recoveryCases: MockRecoveryCase[] = [];

  for(let i=0;i<650;i++){
    const customer = customers[Math.floor(Math.random()*customers.length)];
    const amount = randomAmount();
    const method = pickWeighted([...paymentMethods] as string[], [45,35,12,8]);
    const isFailed = Math.random()<0.35;
    const failureReason = isFailed ? pickWeighted([...failureReasons] as string[], [25,30,20,10,15]) : null;
    const status = isFailed ? "failed" : "captured";
    const createdAt = new Date(Date.now()-Math.random()*30*24*60*60*1000);
    const failedAt = isFailed ? new Date(createdAt.getTime()+Math.floor(Math.random()*60000)) : null;
    const id = `pay_${String(i).padStart(6,"0")}`;
    const payment: MockPayment = {
      id,
      merchantId: "merchant_demo",
      customerId: customer.id,
      customer,
      razorpayPaymentId: `pay_${Math.random().toString(36).slice(2,10)}`,
      amount,
      currency: "INR",
      paymentMethod: method,
      status: isFailed ? "failed" : status,
      failureReason,
      createdAt: createdAt.toISOString(),
      failedAt: failedAt?.toISOString() || null,
      recoveredAt: null,
    };
    payments.push(payment);

    if(isFailed && Math.random()<0.85){
      const willRecover = Math.random()<0.64;
      const recoveryProb = (() => {
        const base: Record<string,number> = { bank_timeout:0.85, upi_failure:0.6, insufficient_funds:0.55, card_declined:0.45, expired_card:0.3 };
        let p = base[failureReason!]||0.5;
        if(customer.segment==="high_value") p+=0.1;
        if(customer.segment==="returning") p+=0.05;
        return Math.max(0.05, Math.min(0.95, p+(willRecover?0.12:-0.08)));
      })();
      const rcStatus = willRecover ? "recovered" : (Math.random()<0.5 ? "failed" : "in_progress");
      if(willRecover){
        payment.status = "recovered";
        payment.recoveredAt = new Date(failedAt!.getTime()+Math.random()*24*60*60*1000).toISOString();
      }
      const rc: MockRecoveryCase = {
        id: `rc_${String(recoveryCases.length).padStart(6,"0")}`,
        paymentId: payment.id,
        payment,
        status: rcStatus,
        recoveryProbability: Math.round(recoveryProb*100)/100,
        amountRecovered: willRecover? amount: 0,
        lastAction: failureReason==="expired_card"?"create_payment_link": failureReason==="bank_timeout"?"retry_payment":"create_payment_link",
        attemptCount: willRecover?1: Math.floor(Math.random()*2)+1,
        createdAt: failedAt!.toISOString(),
        updatedAt: (willRecover ? payment.recoveredAt! : new Date().toISOString()),
        decisions: [{
          model: "meta-llama/llama-3.1-8b-instruct:free",
          decision: failureReason==="bank_timeout"?"retry_payment":"create_payment_link",
          confidence: Math.round((0.7+Math.random()*0.2)*100)/100,
          reasoning: failureReason==="bank_timeout"?"Transient bank timeout with returning customer — immediate retry high success.":"Card declined — avoid retries, use payment link.",
          recoveryProbability: Math.round(recoveryProb*100)/100,
          policyVerdict: "allowed",
          executedAction: failureReason==="bank_timeout"?"retry_payment":"create_payment_link",
        }],
        actions: [
          { type:"diagnose", status:"success", createdAt: failedAt!.toISOString() },
          { type:"get_history", status:"success", createdAt: new Date(failedAt!.getTime()+1000).toISOString() },
          { type:"calculate_probability", status:"success", createdAt: new Date(failedAt!.getTime()+2000).toISOString() },
          { type:"ai_decision", status:"success", createdAt: new Date(failedAt!.getTime()+3000).toISOString() },
          { type:"policy_validation", status:"success", createdAt: new Date(failedAt!.getTime()+4000).toISOString() },
          { type: failureReason==="bank_timeout"?"retry_payment":"create_payment_link", status: willRecover?"success":"failed", createdAt: new Date(failedAt!.getTime()+5000).toISOString() },
        ]
      };
      recoveryCases.push(rc);
    }
  }

  cached = { customers, payments, recoveryCases };
  return cached;
}

export function getMockKPIs(){
  const { payments, recoveryCases } = generateMockData();
  const failedPayments = payments.filter(p=>p.status==="failed"||p.status==="recovered").length;
  const successfulRecoveries = recoveryCases.filter(r=>r.status==="recovered").length;
  const revenueAtRisk = payments.filter(p=>p.status==="failed"||p.status==="recovered").reduce((a,p)=>a+p.amount,0);
  const revenueRecovered = recoveryCases.filter(r=>r.status==="recovered").reduce((a,r)=>a+r.amountRecovered,0);
  const recoveryRate = failedPayments? (successfulRecoveries/failedPayments)*100 : 0;
  const avgRecovery = successfulRecoveries ? revenueRecovered/successfulRecoveries : 0;
  return {
    revenueAtRisk,
    revenueRecovered,
    recoveryRate: Math.round(recoveryRate*10)/10,
    failedPayments,
    successfulRecoveries,
    averageRecoveryAmount: Math.round(avgRecovery),
    totalPayments: payments.length,
  };
}
