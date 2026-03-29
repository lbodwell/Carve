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

import type { StudentFilterOptions } from "@/lib/ski-school/roster-filters";
import type {Discipline, Student} from "@/lib/ski-school/types";
import {
  
  
  formatFullName
} from "@/lib/ski-school/types";
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
import { StudentFormDialog } from "@/features/students/student-form-dialog";
import { useSkiSchool } from "@/lib/ski-school/context";
import {
  hasMeaningfulMedicalInfo,
  matchesStudentFilters,
} from "@/lib/ski-school/roster-filters";

export const Route = createFileRoute("/students")({ component: StudentsPage });

const col = createColumnHelper<Student>();

const STUDENT_TABLE_LEVEL_FILTER_LABELS: Record<string, string> = {
  all: "All levels",
  ...Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((lv) => [String(lv), `Level ${lv}`] as const)
  ),
};

const STUDENT_AGE_BAND_LABELS: Record<string, string> = {
  all: "All ages",
  "4-6": "Ages 4–6",
  "7-12": "Ages 7–12",
};

const STUDENT_MEDICAL_LABELS: Record<string, string> = {
  all: "Medical: any",
  has: "Has medical",
  urgent: "Urgent only",
};

function StudentsPage() {
  const { students, removeStudent } = useSkiSchool();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<string>("all");
  const [ageBand, setAgeBand] = useState<string>("all");
  const [medical, setMedical] = useState<string>("all");
  const [discipline, setDiscipline] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  const filterOpts: StudentFilterOptions = useMemo(
    () => ({
      query,
      level,
      ageBand: ageBand as StudentFilterOptions["ageBand"],
      medical: medical as StudentFilterOptions["medical"],
      discipline: discipline === "all" ? undefined : (discipline as Discipline),
    }),
    [query, level, ageBand, medical, discipline]
  );

  const filtered = useMemo(() => {
    return students.filter((s) => matchesStudentFilters(s, filterOpts));
  }, [students, filterOpts]);

  const columns = useMemo(
    () => [
      col.accessor("firstName", {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="First name" />
        ),
        size: 110,
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      col.accessor("lastName", {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Last name" />
        ),
        size: 120,
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      col.accessor("age", {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Age" />
        ),
        size: 50,
      }),
      col.accessor("level", {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Level" />
        ),
        size: 60,
        cell: (info) => (
          <Badge variant="outline" className="font-mono">
            Lv{info.getValue()}
          </Badge>
        ),
      }),
      col.accessor("discipline", {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Discipline" />
        ),
        size: 72,
        cell: (info) => (
          <Badge variant="secondary">
            {info.getValue() === "ski" ? "Ski" : "Snow"}
          </Badge>
        ),
      }),
      col.accessor("medicalInfo", {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Medical" />
        ),
        size: 160,
        cell: (info) => {
          const val = info.getValue().trim();
          if (!hasMeaningfulMedicalInfo(info.getValue())) {
            return <span className="text-muted-foreground">-</span>;
          }
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
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Parent" />
        ),
        size: 120,
      }),
      col.accessor("parentPhone", {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Phone" />
        ),
        size: 100,
        cell: (info) => (
          <span className="text-muted-foreground">
            {info.getValue() || "—"}
          </span>
        ),
      }),
      col.accessor("parentEmail", {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Email" />
        ),
        size: 160,
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
        enableSorting: false,
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
                aria-label={`Edit ${formatFullName(s)}`}
              >
                <Pencil />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    window.confirm(
                      `Remove ${formatFullName(s)} from the roster?`
                    )
                  ) {
                    removeStudent(s.id);
                  }
                }}
                aria-label={`Delete ${formatFullName(s)}`}
              >
                <Trash2 aria-hidden />
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
      title="Students"
      description="Full roster with medical context, parent contacts, and placement notes at a glance."
    >
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="grid min-w-0 flex-1 gap-1 sm:min-w-[12rem]">
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
          <div className="grid w-full gap-1 sm:w-36">
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
          <div className="grid w-full gap-1 sm:w-36">
            <label className="text-xs font-medium">Age range</label>
            <Select
              value={ageBand}
              items={STUDENT_AGE_BAND_LABELS}
              onValueChange={(v) => setAgeBand(v ?? "all")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All ages</SelectItem>
                  <SelectItem value="4-6">Ages 4–6</SelectItem>
                  <SelectItem value="7-12">Ages 7–12</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="grid w-full gap-1 sm:w-40">
            <label className="text-xs font-medium">Medical</label>
            <Select
              value={medical}
              items={STUDENT_MEDICAL_LABELS}
              onValueChange={(v) => setMedical(v ?? "all")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="has">Has note</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="grid w-full gap-1 sm:w-32">
            <label className="text-xs font-medium">Discipline</label>
            <Select
              value={discipline}
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
