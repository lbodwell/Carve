import { createFileRoute } from "@tanstack/react-router";
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import type { Student } from "@/lib/ski-school/types";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudentFormDialog } from "@/features/students/student-form-dialog";
import { useSkiSchool } from "@/lib/ski-school/context";

export const Route = createFileRoute("/students")({ component: StudentsPage });

const col = createColumnHelper<Student>();

const STUDENT_TABLE_LEVEL_FILTER_LABELS: Record<string, string> = {
  all: "All levels",
  ...Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((lv) => [String(lv), `Level ${lv}`] as const)
  ),
};

function StudentsPage() {
  const { students, removeStudent } = useSkiSchool();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      if (level !== "all" && String(s.level) !== level) return false;
      if (!q) return true;
      const hay =
        `${s.name} ${s.notes} ${s.parentName} ${s.medicalInfo} ${s.parentPhone} ${s.parentEmail}`.toLowerCase();
      return hay.includes(q);
    });
  }, [students, query, level]);

  const columns = useMemo(
    () => [
      col.accessor("name", {
        header: "Name",
        size: 140,
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      col.accessor("age", {
        header: "Age",
        size: 50,
      }),
      col.accessor("level", {
        header: "Level",
        size: 60,
        cell: (info) => (
          <Badge variant="outline" className="font-mono">
            Lv{info.getValue()}
          </Badge>
        ),
      }),
      col.accessor("medicalInfo", {
        header: "Medical",
        size: 160,
        cell: (info) => {
          const val = info.getValue().trim();
          if (!val) return <span className="text-muted-foreground">-</span>;
          const lower = val.toLowerCase();
          const urgent =
            lower.includes("epi") ||
            lower.includes("allerg") ||
            lower.includes("diabet");
          return (
            <span className={urgent ? "font-medium text-destructive" : ""}>
              {val}
            </span>
          );
        },
      }),
      col.accessor("parentName", {
        header: "Parent",
        size: 120,
      }),
      col.accessor("parentPhone", {
        header: "Phone",
        size: 100,
        cell: (info) => (
          <span className="text-muted-foreground">
            {info.getValue() || "—"}
          </span>
        ),
      }),
      col.accessor("parentEmail", {
        header: "Email",
        size: 160,
        cell: (info) => (
          <span className="text-muted-foreground">
            {info.getValue() || "—"}
          </span>
        ),
      }),
      col.accessor("notes", {
        header: "Notes",
        size: 200,
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
        cell: (info) => {
          const s = info.row.original;
          return (
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(s);
                  setDialogOpen(true);
                }}
                aria-label={`Edit ${s.name}`}
              >
                <Pencil />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Remove ${s.name} from the roster?`)) {
                    removeStudent(s.id);
                  }
                }}
                aria-label={`Delete ${s.name}`}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </div>
          );
        },
      }),
    ],
    [removeStudent]
  );

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  return (
    <AppShell
      title="Students"
      description="Full roster with medical context, parent contacts, and placement notes at a glance."
    >
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end">
          <div className="grid min-w-0 flex-1 gap-1">
            <label htmlFor="student-search" className="text-xs font-medium">
              Search
            </label>
            <Input
              id="student-search"
              placeholder="Name, parent, medical, notes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="grid w-full gap-1 sm:w-44">
            <label className="text-xs font-medium">Level</label>
            <Select
              value={level}
              items={STUDENT_TABLE_LEVEL_FILTER_LABELS}
              onValueChange={(v) => setLevel(v ?? "all")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All levels</SelectItem>
                  {[1, 2, 3, 4, 5, 6].map((lv) => (
                    <SelectItem key={lv} value={String(lv)}>
                      Level {lv}
                    </SelectItem>
                  ))}
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
          Add student
        </Button>
      </div>

      <DataTable
        pagination
        table={table}
        onRowClick={(s) => {
          setEditing(s);
          setDialogOpen(true);
        }}
      />

      <StudentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
      />
    </AppShell>
  );
}
