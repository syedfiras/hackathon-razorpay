import { inngest } from "../inngest";
import { recoveryEngine } from "@/lib/recovery/engine";

// Inngest v4 API: createFunction(opts, handler)  — opts may include triggers
// We use `as any` to stay compatible across versions
export const handleFailedPayment: any = (inngest as any).createFunction(
  { id: "handle-failed-payment" },
  { event: "payment.failed" },
  async ({ event, step }: any) => {
    const { recoveryCaseId } = event.data as { recoveryCaseId: string };
    await step.run("run-recovery-engine", async () => {
      return recoveryEngine.run(recoveryCaseId);
    });
    return { recoveryCaseId, status: "processed" };
  }
);

export const retryRecovery: any = (inngest as any).createFunction(
  { id: "retry-recovery" },
  { event: "recovery.retry" },
  async ({ event, step }: any) => {
    const { recoveryCaseId } = event.data as { recoveryCaseId: string };
    await step.sleep("wait-before-retry", "30m");
    await step.run("retry-engine", async () => {
      return recoveryEngine.run(recoveryCaseId);
    });
    return { recoveryCaseId, status: "retried" };
  }
);

export const functions = [handleFailedPayment, retryRecovery];
