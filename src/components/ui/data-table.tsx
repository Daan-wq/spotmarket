"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/cn";

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
  className?: string;
  rowHref?: (row: T) => string | undefined;
  /**
   * Force virtualization on/off. Default: auto-enable when rows.length >= 100.
   * Virtualized rendering scrolls inside a fixed-height container; only visible
   * rows touch the DOM. Pre-virtualized rows render as plain <tbody>.
   */
  virtualize?: boolean;
  /** Container height when virtualized. Default 600px. */
  virtualHeight?: number;
  /** Estimated row height for the virtualizer. Default 48px. */
  estimatedRowHeight?: number;
}

const VIRTUALIZE_AUTO_THRESHOLD = 50;

export function DataTable<T>(props: DataTableProps<T>) {
  const {
    columns,
    rows,
    rowKey,
    onRowClick,
    emptyState,
    className,
    virtualize,
  } = props;

  if (rows.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const shouldVirtualize =
    virtualize ?? rows.length >= VIRTUALIZE_AUTO_THRESHOLD;

  if (shouldVirtualize) {
    return <VirtualizedDataTable {...props} />;
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
            {rows.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-t border-neutral-100 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-neutral-50",
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      col.className,
                    )}
                  >
                    {col.cell(row, i)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VirtualizedDataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  className,
  virtualHeight = 600,
  estimatedRowHeight = 48,
}: DataTableProps<T>) {
  const parentRef = React.useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 8,
  });

  const items = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = items.length > 0 ? items[0].start : 0;
  const paddingBottom = items.length > 0 ? totalSize - items[items.length - 1].end : 0;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-neutral-200 bg-white",
        className,
      )}
    >
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: virtualHeight }}
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
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
            {paddingTop > 0 && (
              <tr aria-hidden="true">
                <td colSpan={columns.length} style={{ height: paddingTop, padding: 0, border: 0 }} />
              </tr>
            )}
            {items.map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <tr
                  key={rowKey(row, virtualRow.index)}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-t border-neutral-100 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-neutral-50",
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        col.className,
                      )}
                    >
                      {col.cell(row, virtualRow.index)}
                    </td>
                  ))}
                </tr>
              );
            })}
            {paddingBottom > 0 && (
              <tr aria-hidden="true">
                <td colSpan={columns.length} style={{ height: paddingBottom, padding: 0, border: 0 }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
