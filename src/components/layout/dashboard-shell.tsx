import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface DashboardShellProps {
  sidebar: ReactNode;
  children: ReactNode;
  mobileChrome?: ReactNode;
  className?: string;
  mainClassName?: string;
}

export function DashboardShell({
  sidebar,
  children,
  mobileChrome,
  className,
  mainClassName,
}: DashboardShellProps) {
  return (
    <div className={cn("min-h-screen bg-white text-neutral-950", className)}>
      <div className="hidden lg:block">{sidebar}</div>
      {mobileChrome ? <div className="sticky top-0 z-40 lg:hidden">{mobileChrome}</div> : null}
      <main
        className={cn(
          "min-h-screen px-4 pb-28 pt-5 sm:px-5 lg:ml-72 lg:px-0 lg:py-16",
          mainClassName,
        )}
      >
        <div className="mx-auto w-full max-w-[1300px]">{children}</div>
      </main>
    </div>
  );
}
