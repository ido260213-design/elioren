import type { Metadata } from "next";
import Link from "next/link";
import { Flag, ShieldCheck } from "lucide-react";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminOverviewPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();

  const [{ count: pendingVerifications }, { count: openReports }] = await Promise.all([
    supabase.from("verification_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);

  return (
    <AdminShell>
      <h1 className="mb-6 text-2xl font-bold">Admin overview</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/verification">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-base">
                <ShieldCheck className="size-4 text-primary" />
                Verification queue
              </CardTitle>
              <CardDescription>{pendingVerifications ?? 0} pending requests</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/reports">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-base">
                <Flag className="size-4 text-destructive" />
                Reports queue
              </CardTitle>
              <CardDescription>{openReports ?? 0} open reports</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </AdminShell>
  );
}
