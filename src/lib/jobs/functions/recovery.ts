import { inngest } from "../inngest";
import { recoveryEngine } from "@/lib/recovery/engine";

// Inngest v4: createFunction({ id, triggers: [{ event }] }, handler)
export const handleFailedPayment = inngest.createFunction(
  { id: "handle-failed-payment", triggers: [{ event: "payment.failed" }] } as any,
  async ({ event, step }: any) => {
    const { recoveryCaseId } = event.data as { recoveryCaseId: string };
    await step.run("run-recovery-engine", async () => {
      return recoveryEngine.run(recoveryCaseId);
    });
    return { recoveryCaseId, status: "processed" };
  }
);

export const retryRecovery = inngest.createFunction(
  { id: "retry-recovery", triggers: [{ event: "recovery.retry" }] } as any,
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
