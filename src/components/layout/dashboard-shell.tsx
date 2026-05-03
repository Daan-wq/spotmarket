import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface DashboardShellProps {
  sidebar: ReactNode;
  children: ReactNode;
  className?: string;
  mainClassName?: string;
}

export function DashboardShell({
  sidebar,
  children,
  className,
  mainClassName,
}: DashboardShellProps) {
  return (
    <div className={cn("min-h-screen bg-white text-neutral-950", className)}>
      <div className="hidden lg:block">{sidebar}</div>
      <main className={cn("min-h-screen px-5 py-8 lg:ml-72 lg:px-0 lg:py-16", mainClassName)}>
        <div className="mx-auto w-full max-w-[1300px]">{children}</div>
      </main>
    </div>
  );
}
