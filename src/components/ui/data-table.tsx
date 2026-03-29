import { flexRender } from "@tanstack/react-table";
import type { Table as TanstackTable } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PAGE_SIZES = [10, 20, 50] as const;

type DataTableProps<TData> = {
  table: TanstackTable<TData>;
  className?: string;
  onRowClick?: (row: TData) => void;
  isRowActive?: (row: TData) => boolean;
  /** Renders TanStack pagination controls below the table (requires `getPaginationRowModel` on the table). */
  pagination?: boolean;
};

function DataTablePaginationBar<TData>({
  table,
}: {
  table: TanstackTable<TData>;
}) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const rowCount = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const from = rowCount === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, rowCount);
  const pageSizeOptions = PAGE_SIZES.includes(
    pageSize as (typeof PAGE_SIZES)[number]
  )
    ? PAGE_SIZES
    : [...PAGE_SIZES, pageSize].sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-3 border-t border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        {rowCount === 0 ? "No results" : `Showing ${from}–${to} of ${rowCount}`}
      </p>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium whitespace-nowrap">
            Rows per page
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              if (v == null) return;
              table.setPageSize(Number.parseInt(v, 10));
            }}
          >
            <SelectTrigger className="h-7 w-20 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <span className="text-xs text-muted-foreground tabular-nums">
            Page {rowCount === 0 ? 0 : pageIndex + 1} of{" "}
            {Math.max(pageCount, 1)}
          </span>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DataTable<TData>({
  table,
  className,
  onRowClick,
  isRowActive,
  pagination = false,
}: DataTableProps<TData>) {
  const tableEl = (
    <table className="w-full text-xs">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id} className="border-b bg-muted/50">
            {headerGroup.headers.map((header) => (
              <th
                key={header.id}
                className="px-3 py-2 text-left font-semibold whitespace-nowrap text-muted-foreground"
                style={{
                  width:
                    header.getSize() !== 150 ? header.getSize() : undefined,
                }}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.length === 0 ? (
          <tr>
            <td
              colSpan={table.getAllColumns().length}
              className="px-3 py-8 text-center text-muted-foreground"
            >
              No results.
            </td>
          </tr>
        ) : (
          table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              data-active={isRowActive?.(row.original) ? true : undefined}
              className={cn(
                "border-b transition-colors last:border-b-0",
                onRowClick
                  ? "cursor-pointer hover:bg-muted/40"
                  : "hover:bg-muted/20",
                isRowActive?.(row.original) && "bg-primary/10"
              )}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2 align-top">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  if (pagination) {
    return (
      <div className={cn("overflow-hidden rounded-lg border", className)}>
        <div className="overflow-x-auto">{tableEl}</div>
        <DataTablePaginationBar table={table} />
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto rounded-lg border", className)}>
      {tableEl}
    </div>
  );
}

export { DataTable };
