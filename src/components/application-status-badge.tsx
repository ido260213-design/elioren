import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus } from "@/lib/supabase/database.types";

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }> = {
  applied: { label: "Applied", variant: "secondary" },
  viewed: { label: "Viewed", variant: "outline" },
  interview: { label: "Interview", variant: "warning" },
  accepted: { label: "Accepted", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const { label, variant } = STATUS_CONFIG[status];
  return <Badge variant={variant}>{label}</Badge>;
}
