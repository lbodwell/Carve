import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { z } from "zod";

import { AppShell } from "@/components/layout/app-shell";
import { GroupBuilder } from "@/features/groups/group-builder";
import { GroupsTable } from "@/features/groups/groups-table";
import { useSkiSchool } from "@/lib/ski-school/context";

const groupsSearchSchema = z.object({
  groupId: z.string().optional(),
});

export const Route = createFileRoute("/groups")({
  validateSearch: (raw) => groupsSearchSchema.parse(raw),
  component: GroupsPage,
});

function GroupsPage() {
  const { groups, getGroup } = useSkiSchool();
  const { groupId } = Route.useSearch();
  const navigate = Route.useNavigate();

  const selectedGroupId = useMemo(() => {
    if (groupId && getGroup(groupId)) return groupId;
    return groups[0]?.id ?? null;
  }, [groupId, groups, getGroup]);

  useEffect(() => {
    if (groupId && !getGroup(groupId)) {
      navigate({ search: {}, replace: true });
    }
  }, [groupId, getGroup, navigate]);

  const setSelectedGroupId = (id: string | null) => {
    navigate({
      search: id ? { groupId: id } : {},
      replace: true,
    });
  };

  return (
    <AppShell
      title="Lesson groups"
      description="Scan all groups in the table, then open one in the builder to assign instructors and students. Medical flags, levels, disciplines, and notes stay visible on every card."
    >
      <div className="flex flex-col gap-3">
        <GroupsTable
          activeGroupId={selectedGroupId}
          onOpenInBuilder={setSelectedGroupId}
        />
        <GroupBuilder
          selectedGroupId={selectedGroupId}
          onSelectedGroupIdChange={setSelectedGroupId}
        />
      </div>
    </AppShell>
  );
}
