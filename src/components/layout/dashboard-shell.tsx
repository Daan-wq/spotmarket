import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface DashboardShellProps {
  sidebar: ReactNode;
  children: ReactNode;
  mobileChrome?: ReactNode;
  className?: string;
  mainClassName?: string;
}

export const DASHBOARD_MOBILE_CHROME_WRAPPER_CLASS = "lg:hidden";

export const DASHBOARD_MAIN_CLASS =
  "min-h-screen px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 sm:px-5 lg:ml-72 lg:px-0 lg:py-16";

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
      {mobileChrome ? <div className={DASHBOARD_MOBILE_CHROME_WRAPPER_CLASS}>{mobileChrome}</div> : null}
      <main
        className={cn(
          DASHBOARD_MAIN_CLASS,
          mainClassName,
        )}
      >
        <div className="mx-auto w-full max-w-[1300px]">{children}</div>
      </main>
    </div>
  );
}
