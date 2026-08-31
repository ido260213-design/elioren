import type { Metadata } from "next";

import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JobPostForm } from "./job-post-form";

export const metadata: Metadata = { title: "Post a job" };

export default async function NewJobPage() {
  const { profile } = await requireRole(["employer", "business"]);

  return (
    <DashboardShell role={profile.role} email={profile.email}>
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>Post a job</CardTitle>
          </CardHeader>
          <CardContent>
            <JobPostForm />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
