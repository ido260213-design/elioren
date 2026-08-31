import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AuthCard } from "@/components/auth-card";

export default async function GuardianConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const confirmed = status === "confirmed";

  return (
    <AuthCard title={confirmed ? "Guardian confirmed" : "Confirmation link invalid"}>
      <div className="flex flex-col items-center gap-4 text-center">
        {confirmed ? (
          <CheckCircle2 className="size-12 text-success" />
        ) : (
          <XCircle className="size-12 text-destructive" />
        )}
        <p className="text-sm text-muted-foreground">
          {confirmed
            ? "Thanks for confirming — the teen's account is now fully active."
            : "This confirmation link is invalid or has already been used."}
        </p>
        <Button asChild>
          <Link href="/">Back to HireUp</Link>
        </Button>
      </div>
    </AuthCard>
  );
}
