"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BrandReportActions() {
  return (
    <Button type="button" variant="outline" className="rounded-lg" onClick={() => window.print()}>
      <Download className="h-4 w-4" />
      PDF downloaden
    </Button>
  );
}
