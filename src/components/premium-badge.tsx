import { Crown } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function PremiumBadge() {
  return (
    <Badge className="gap-1 border-transparent bg-gradient-to-r from-amber-400 to-yellow-500 text-black">
      <Crown className="size-3" />
      Premium
    </Badge>
  );
}
