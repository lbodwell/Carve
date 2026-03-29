import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ExternalLink, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { SortingState } from "@tanstack/react-table";

import type {LessonGroup, LessonTimeSlot, Weekday} from "@/lib/ski-school/types";
import {
  
  
  
  formatFullName
} from "@/lib/ski-school/types";
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
import { useSkiSchool } from "@/lib/ski-school/context";

type GroupsTableProps = {
  activeGroupId: string | null;
  onOpenInBuilder: (group: LessonGroup) => void;
};

const WEEKDAYS: Array<Weekday> = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

const TIME_OPTIONS: Array<{ value: LessonTimeSlot; label: string }> = [
  { value: "AM", label: "AM" },
  { value: "PM", label: "PM" },
  { value: "FULL_DAY", label: "Full day" },
];

const col = createColumnHelper<LessonGroup>();

function timeLabel(t: LessonTimeSlot) {
  return t === "FULL_DAY" ? "Full day" : t;
}

function GroupsTable({ activeGroupId, onOpenInBuilder }: GroupsTableProps) {
  const { groups, getInstructor, removeGroup } = useSkiSchool();
  const [query, setQuery] = useState("");
  const [dayFilter, setDayFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("all");
  const [sorting, setSorting] = useState<SortingState>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups.filter((g) => {
      if (dayFilter !== "all" && g.day !== dayFilter) return false;
      if (timeFilter !== "all" && g.time !== timeFilter) return false;
      if (levelFilter !== "all" && String(g.level) !== levelFilter) return false;
      if (disciplineFilter !== "all" && g.discipline !== disciplineFilter) {
        return false;
      }
      if (!q) return true;
      const lead =
        g.leadInstructorId != null
          ? getInstructor(g.leadInstructorId)
          : undefined;
      const leadName = lead ? formatFullName(lead) : "";
      const hay =
        `${g.day} ${g.time} ${g.discipline} ${g.level} ${g.ageRange} ${leadName} ${g.notes} ${g.studentIds.length} ${g.instructorIds.length}`
          .toLowerCase()
          .replaceAll("_", " ");
      return hay.includes(q);
    });
  }, [
    groups,
    dayFilter,
    timeFilter,
    levelFilter,
    disciplineFilter,
    query,
    getInstructor,
  ]);

  const columns = useMemo(
    () => [
      col.accessor("day", {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Day" />
        ),
        size: 56,
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      col.accessor("time", {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Time" />
        ),
        size: 72,
        cell: (info) => (
          <span className="text-muted-foreground">
            {timeLabel(info.getValue())}
          </span>
        ),
        sortingFn: (a, b) =>
          String(a.original.time).localeCompare(String(b.original.time)),
      }),
      col.accessor("discipline", {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Discipline" />
        ),
        size: 72,
        cell: (info) => (
          <Badge variant="outline">
            {info.getValue() === "ski" ? "Ski" : "Snow"}
          </Badge>
        ),
      }),
      col.accessor("level", {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Lvl" />
        ),
        size: 48,
        cell: (info) => (
          <Badge variant="outline" className="font-mono">
            Lv{info.getValue()}
          </Badge>
        ),
      }),
      col.accessor("ageRange", {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Ages" />
        ),
        size: 52,
        cell: (info) => (
          <span className="font-mono text-[0.625rem] text-muted-foreground">
            {info.getValue()}
          </span>
        ),
      }),
      col.accessor(
        (row) => {
          const ins =
            row.leadInstructorId != null
              ? getInstructor(row.leadInstructorId)
              : undefined;
          return ins ? formatFullName(ins) : "";
        },
        {
          id: "lead",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Lead" />
          ),
          size: 140,
          cell: (info) => {
            const g = info.row.original;
            const ins =
              g.leadInstructorId != null
                ? getInstructor(g.leadInstructorId)
                : undefined;
            const name = ins ? formatFullName(ins) : "—";
            return <span className="text-foreground/90">{name}</span>;
          },
        }
      ),
      col.display({
        id: "counts",
        header: "Roster",
        size: 150,
        cell: (info) => {
          const g = info.row.original;
          const ic = g.instructorIds.length;
          const sc = g.studentIds.length;
          return (
            <span className="text-[0.625rem] leading-snug text-muted-foreground">
              {ic} instructor{ic === 1 ? "" : "s"} · {sc} student
              {sc === 1 ? "" : "s"}
            </span>
          );
        },
      }),
      col.accessor("notes", {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Notes" />
        ),
        size: 180,
        cell: (info) => {
          const val = info.getValue().trim();
          if (!val) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="line-clamp-2 text-[0.625rem] leading-snug text-foreground/80">
              {val}
            </span>
          );
        },
      }),
      col.display({
        id: "actions",
        size: 108,
        enableSorting: false,
        cell: (info) => {
          const g = info.row.original;
          return (
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="gap-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenInBuilder(g);
                }}
              >
                <ExternalLink />
                Open
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    typeof window !== "undefined" &&
                    window.confirm("Delete this lesson group?")
                  ) {
                    removeGroup(g.id);
                  }
                }}
                aria-label="Delete group"
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
          );
        },
      }),
    ],
    [getInstructor, onOpenInBuilder, removeGroup]
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
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-2 border-b border-border px-3 py-2 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="grid min-w-[8rem] flex-1 gap-1">
          <label htmlFor="groups-search" className="text-xs font-medium">
            Search
          </label>
          <Input
            id="groups-search"
            placeholder="Day, lead, notes, counts…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="text-xs"
          />
        </div>
        <div className="grid w-full gap-1 sm:w-24">
          <span className="text-xs font-medium">Day</span>
          <Select value={dayFilter} onValueChange={(v) => setDayFilter(v ?? "all")}>
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All</SelectItem>
                {WEEKDAYS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="grid w-full gap-1 sm:w-28">
          <span className="text-xs font-medium">Time</span>
          <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v ?? "all")}>
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All</SelectItem>
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="grid w-full gap-1 sm:w-24">
          <span className="text-xs font-medium">Level</span>
          <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v ?? "all")}>
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All</SelectItem>
                {[1, 2, 3, 4, 5, 6].map((lv) => (
                  <SelectItem key={lv} value={String(lv)}>
                    Lv{lv}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="grid w-full gap-1 sm:w-28">
          <span className="text-xs font-medium">Discipline</span>
          <Select
            value={disciplineFilter}
            onValueChange={(v) => setDisciplineFilter(v ?? "all")}
          >
            <SelectTrigger className="h-8 w-full text-xs">
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
        <Badge variant="secondary" className="shrink-0 self-end sm:mb-0.5">
          {filtered.length} match{filtered.length !== 1 ? "es" : ""}
        </Badge>
      </div>
      <div className="px-2 pb-2">
        <DataTable
          pagination
          table={table}
          onRowClick={(g) => onOpenInBuilder(g)}
          isRowActive={(g) => g.id === activeGroupId}
        />
      </div>
    </div>
  );
}

export { GroupsTable };
