"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BrandReportActions() {
  return (
    <Button type="button" variant="outline" className="rounded-lg" onClick={() => window.print()}>
      <Printer className="h-4 w-4" />
      Printen
    </Button>
  );
}
