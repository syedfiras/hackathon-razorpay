import { getPayments } from "@/lib/data";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const payments = await getPayments({ take: 100 });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-sm text-zinc-500 mt-1">All payments — filter by status, method, failure reason. Test mode simulated.</p>
      </div>
      <TransactionsTable payments={payments as any[]} />
    </div>
  );
}
