import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  rowHref?: (row: T, index: number) => string | undefined;
  emptyState?: ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowHref,
  emptyState,
  className,
}: DataTableProps<T>) {
  if (rows.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-neutral-200 bg-white",
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr
              className="bg-neutral-50 text-left text-[11px] uppercase tracking-[0.14em] text-neutral-500"
            >
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 font-semibold",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const href = rowHref?.(row, i);
              return (
                <tr
                  key={rowKey(row, i)}
                  className={cn(
                    "border-t border-neutral-100 transition-colors",
                    href && "cursor-pointer hover:bg-neutral-50",
                  )}
                >
                  {columns.map((col) => {
                    const cell = col.cell(row, i);
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-3",
                          col.align === "right" && "text-right",
                          col.align === "center" && "text-center",
                          col.className,
                        )}
                      >
                        {href ? (
                          <Link href={href} className="block text-inherit no-underline">
                            {cell}
                          </Link>
                        ) : (
                          cell
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
