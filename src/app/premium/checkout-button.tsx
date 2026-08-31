"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { startPremiumCheckout, openBillingPortal } from "@/lib/actions/premium";

export function CheckoutButton({ label = "Upgrade to Premium" }: { label?: string }) {
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  return (
    <div>
      <Button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await startPremiumCheckout();
            if (result?.error) setError(result.error);
          })
        }
      >
        {isPending ? "Starting checkout..." : label}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function ManageBillingButton() {
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  return (
    <div>
      <Button
        variant="outline"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await openBillingPortal();
            if (result?.error) setError(result.error);
          })
        }
      >
        {isPending ? "Opening..." : "Manage billing"}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
