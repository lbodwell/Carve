import { createFileRoute } from "@tanstack/react-router";
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { SortingState } from "@tanstack/react-table";

import type { Discipline, Instructor } from "@/lib/ski-school/types";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InstructorFormDialog } from "@/features/instructors/instructor-form-dialog";
import { useSkiSchool } from "@/lib/ski-school/context";
import { matchesInstructorFilters } from "@/lib/ski-school/roster-filters";

export const Route = createFileRoute("/instructors")({
  component: InstructorsPage,
});

const col = createColumnHelper<Instructor>();

const INSTRUCTOR_DISCIPLINE_FILTER_LABELS: Record<string, string> = {
  all: "All",
  ski: "Ski",
  snowboard: "Snowboard",
};

function InstructorsPage() {
  const { instructors, removeInstructor } = useSkiSchool();
  const [query, setQuery] = useState("");
  const [discipline, setDiscipline] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Instructor | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  const filtered = useMemo(() => {
    return instructors.filter((i) =>
      matchesInstructorFilters(i, {
        query,
        discipline: discipline as "all" | Discipline,
      })
    );
  }, [instructors, query, discipline]);

  const columns = useMemo(
    () => [
      col.accessor("name", {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        size: 160,
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      col.accessor("disciplines", {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Disciplines" />
        ),
        size: 140,
        cell: (info) => (
          <div className="flex flex-wrap gap-1">
            {info.getValue().map((d) => (
              <Badge key={d} variant="outline">
                {d === "ski" ? "Ski" : "Snowboard"}
              </Badge>
            ))}
          </div>
        ),
      }),
      col.accessor("phone", {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Phone" />
        ),
        size: 110,
        cell: (info) => (
          <span className="text-muted-foreground">
            {info.getValue() || "—"}
          </span>
        ),
      }),
      col.accessor("email", {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Email" />
        ),
        size: 200,
        cell: (info) => (
          <span className="text-muted-foreground">
            {info.getValue() || "—"}
          </span>
        ),
      }),
      col.accessor("notes", {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Notes" />
        ),
        size: 260,
        cell: (info) => {
          const val = info.getValue().trim();
          if (!val) return <span className="text-muted-foreground">-</span>;
          return (
            <span className="line-clamp-2 leading-snug text-foreground/80">
              {val}
            </span>
          );
        },
      }),
      col.display({
        id: "actions",
        size: 100,
        enableSorting: false,
        cell: (info) => {
          const i = info.row.original;
          return (
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(i);
                  setDialogOpen(true);
                }}
                aria-label={`Edit ${i.name}`}
              >
                <Pencil />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Remove ${i.name} from the roster?`)) {
                    removeInstructor(i.id);
                  }
                }}
                aria-label={`Delete ${i.name}`}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </div>
          );
        },
      }),
    ],
    [removeInstructor]
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  return (
    <AppShell
      title="Instructors"
      description="Discipline tags and notes at a glance so you can pair the right coach with each group."
    >
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end">
          <div className="grid min-w-0 flex-1 gap-1">
            <label htmlFor="ins-search" className="text-xs font-medium">
              Search
            </label>
            <Input
              id="ins-search"
              placeholder="Name, notes, contact..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="grid w-full gap-1 sm:w-44">
            <label className="text-xs font-medium">Discipline</label>
            <Select
              value={discipline}
              items={INSTRUCTOR_DISCIPLINE_FILTER_LABELS}
              onValueChange={(v) => setDiscipline(v ?? "all")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="ski">Ski</SelectItem>
                  <SelectItem value="snowboard">Snowboard</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          type="button"
          className="shrink-0 gap-1"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus />
          Add instructor
        </Button>
      </div>

      <DataTable
        pagination
        table={table}
        onRowClick={(i) => {
          setEditing(i);
          setDialogOpen(true);
        }}
      />

      <InstructorFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
      />
    </AppShell>
  );
}
