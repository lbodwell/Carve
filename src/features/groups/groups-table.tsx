import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ExternalLink, Trash2 } from "lucide-react";
import { useMemo } from "react";

import type { LessonGroup, LessonTimeSlot } from "@/lib/ski-school/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { useSkiSchool } from "@/lib/ski-school/context";

type GroupsTableProps = {
  activeGroupId: string | null;
  onOpenInBuilder: (groupId: string) => void;
};

const col = createColumnHelper<LessonGroup>();

function timeLabel(t: LessonTimeSlot) {
  return t === "FULL_DAY" ? "Full day" : t;
}

function GroupsTable({ activeGroupId, onOpenInBuilder }: GroupsTableProps) {
  const { groups, getInstructor, removeGroup } = useSkiSchool();

  const columns = useMemo(
    () => [
      col.accessor("day", {
        header: "Day",
        size: 56,
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      accessorTimeSlot("time"),
      col.accessor("level", {
        header: "Lvl",
        size: 48,
        cell: (info) => (
          <Badge variant="outline" className="font-mono">
            Lv{info.getValue()}
          </Badge>
        ),
      }),
      col.accessor("ageRange", {
        header: "Ages",
        size: 52,
        cell: (info) => (
          <span className="font-mono text-[0.625rem] text-muted-foreground">
            {info.getValue()}
          </span>
        ),
      }),
      col.display({
        id: "lead",
        header: "Lead",
        size: 140,
        cell: (info) => {
          const g = info.row.original;
          const name =
            g.leadInstructorId != null
              ? (getInstructor(g.leadInstructorId)?.name ?? "—")
              : "—";
          return <span className="text-foreground/90">{name}</span>;
        },
      }),
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
        header: "Notes",
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
                  onOpenInBuilder(g.id);
                }}
              >
                <ExternalLink />
                Open
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
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
                <Trash2 className="size-3 text-destructive" />
              </Button>
            </div>
          );
        },
      }),
    ],
    [getInstructor, onOpenInBuilder, removeGroup]
  );

  const table = useReactTable({
    data: groups,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div>
          <h2 className="text-xs font-semibold">All groups</h2>
          <p className="mt-0.5 text-[0.625rem] leading-snug text-muted-foreground">
            Row click or Open loads the group in the builder below.
          </p>
        </div>
        <Badge variant="secondary">{groups.length} total</Badge>
      </div>
      <div className="p-2">
        <DataTable
          pagination
          table={table}
          onRowClick={(g) => onOpenInBuilder(g.id)}
          isRowActive={(g) => g.id === activeGroupId}
        />
      </div>
    </div>
  );
}

function accessorTimeSlot(accessorKey: "time") {
  return col.accessor(accessorKey, {
    header: "Time",
    size: 72,
    cell: (info) => (
      <span className="text-muted-foreground">
        {timeLabel(info.getValue())}
      </span>
    ),
  });
}

export { GroupsTable };
