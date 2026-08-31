import { AlertTriangle } from "lucide-react";

export function GuardianPendingBanner({ guardianEmail }: { guardianEmail: string }) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
      <p>
        <span className="font-medium">Pending guardian confirmation.</span> We sent a confirmation
        link to <span className="font-medium">{guardianEmail}</span>. Your account works in the
        meantime, but some features stay limited until they confirm.
      </p>
    </div>
  );
}
