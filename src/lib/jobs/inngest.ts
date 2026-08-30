import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "recoverai",
  name: "RecoverAI",
});

// Event types
export type RecoveryEvents = {
  "payment.failed": {
    data: {
      paymentId: string;
      recoveryCaseId: string;
    };
  };
  "recovery.retry": {
    data: {
      recoveryCaseId: string;
    };
  };
};
