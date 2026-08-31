"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button type="button" variant="outline" size="sm" className="gap-1.5 print:hidden" onClick={() => window.print()}>
      <Printer className="size-3.5" />
      Export as PDF
    </Button>
  );
}
