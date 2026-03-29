import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  GraduationCap,
  Users,
  UsersRound,
} from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import type { ChartConfig } from "@/components/ui/chart";
import { AppShell } from "@/components/layout/app-shell";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useSkiSchool } from "@/lib/ski-school/context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Dashboard });

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  href,
  linkLabel,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  href?: string;
  linkLabel?: string;
  accent?: "warning";
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle>{label}</CardTitle>
          <Icon
            className={cn(
              "mt-0.5 size-4 shrink-0",
              accent === "warning"
                ? "text-destructive"
                : "text-muted-foreground"
            )}
          />
        </div>
        <CardDescription>{sub}</CardDescription>
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            "font-heading text-3xl font-semibold tabular-nums",
            accent === "warning" && "text-destructive"
          )}
        >
          {value}
        </p>
        {href && linkLabel ? (
          <Link
            to={href}
            className={cn(
              buttonVariants({ variant: "ghost", size: "xs" }),
              "mt-3 -ml-2 gap-0.5 no-underline"
            )}
          >
            {linkLabel}
            <ArrowRight />
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { students, instructors, groups } = useSkiSchool();

  const assignedStudentIds = useMemo(
    () => new Set(groups.flatMap((g) => g.studentIds)),
    [groups]
  );
  const unassignedCount = students.filter(
    (s) => !assignedStudentIds.has(s.id)
  ).length;

  // Students by level
  const levelConfig = {
    count: { label: "Students", color: "var(--chart-1)" },
  } satisfies ChartConfig;
  const levelData = useMemo(() => {
    const counts: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
    };
    for (const s of students) counts[s.level] = (counts[s.level] || 0) + 1;
    return Object.entries(counts).map(([lv, count]) => ({
      level: `Lv${lv}`,
      count,
    }));
  }, [students]);

  // Groups by weekday
  const dayConfig = {
    groups: { label: "Groups", color: "var(--chart-2)" },
  } satisfies ChartConfig;
  const dayData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of WEEKDAYS) counts[d] = 0;
    for (const g of groups) counts[g.day] = (counts[g.day] ?? 0) + 1;
    return WEEKDAYS.map((d) => ({ day: d, groups: counts[d] ?? 0 }));
  }, [groups]);

  // Groups and students by age range
  const ageConfig = {
    groups: { label: "Groups", color: "var(--chart-3)" },
    students: { label: "Students", color: "var(--chart-1)" },
  } satisfies ChartConfig;
  const ageData = useMemo(() => {
    const groupCounts: Record<string, number> = { "4-6": 0, "7-12": 0 };
    const studentCounts: Record<string, number> = { "4-6": 0, "7-12": 0 };
    for (const g of groups) {
      groupCounts[g.ageRange] = (groupCounts[g.ageRange] || 0) + 1;
      // count students in this group toward its age range
      studentCounts[g.ageRange] =
        (studentCounts[g.ageRange] || 0) + g.studentIds.length;
    }
    return (["4-6", "7-12"] as const).map((ar) => ({
      ageRange: ar,
      groups: groupCounts[ar],
      students: studentCounts[ar],
    }));
  }, [groups]);

  // Instructor discipline breakdown
  const disciplineConfig = {
    ski: { label: "Ski", color: "var(--chart-2)" },
    snowboard: { label: "Snowboard", color: "var(--chart-4)" },
    both: { label: "Both", color: "var(--chart-5)" },
  } satisfies ChartConfig;
  const disciplineData = useMemo(() => {
    let ski = 0,
      snowboard = 0,
      both = 0;
    for (const i of instructors) {
      const hasSki = i.disciplines.includes("ski");
      const hasSb = i.disciplines.includes("snowboard");
      if (hasSki && hasSb) both++;
      else if (hasSki) ski++;
      else snowboard++;
    }
    return [
      { discipline: "Ski only", count: ski, fill: "var(--chart-2)" },
      {
        discipline: "Snowboard only",
        count: snowboard,
        fill: "var(--chart-4)",
      },
      { discipline: "Both", count: both, fill: "var(--chart-5)" },
    ];
  }, [instructors]);

  // Coverage: assigned vs unassigned students
  const coverageConfig = {
    assigned: { label: "Assigned", color: "var(--chart-1)" },
    unassigned: { label: "Unassigned", color: "var(--chart-3)" },
  } satisfies ChartConfig;
  const coverageData = useMemo(
    () => [
      {
        label: "Assigned",
        value: assignedStudentIds.size,
        fill: "var(--chart-1)",
      },
      {
        label: "Unassigned",
        value: unassignedCount,
        fill: "var(--chart-3)",
      },
    ],
    [assignedStudentIds.size, unassignedCount]
  );

  return (
    <AppShell
      title="Operations dashboard"
      description="Manage students and instructors, then build lesson groups with drag-and-drop placement. All data is stored locally in this MVP."
    >
      <div className="flex flex-col gap-6">
        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Students"
            value={students.length}
            sub="on file"
            icon={Users}
            href="/students"
            linkLabel="Open roster"
          />
          <StatCard
            label="Instructors"
            value={instructors.length}
            sub="on file"
            icon={GraduationCap}
            href="/instructors"
            linkLabel="Open roster"
          />
          <StatCard
            label="Lesson groups"
            value={groups.length}
            sub="scheduled"
            icon={UsersRound}
            href="/groups"
            linkLabel="Build groups"
          />
          <StatCard
            label="Unassigned students"
            value={unassignedCount}
            sub={`${assignedStudentIds.size} placed, ${unassignedCount} waiting`}
            icon={AlertCircle}
            accent={unassignedCount > 0 ? "warning" : undefined}
            href="/groups"
            linkLabel="Go to groups"
          />
        </div>

        {/* Charts row 1 */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Students by level */}
          <Card>
            <CardHeader>
              <CardTitle>Students by level</CardTitle>
              <CardDescription>
                Distribution of ability levels across all {students.length}{" "}
                students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={levelConfig} className="h-44 w-full">
                <BarChart
                  data={levelData}
                  margin={{
                    top: 4,
                    right: 4,
                    left: -20,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="level"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="count"
                    fill="var(--chart-1)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Groups by day of week */}
          <Card>
            <CardHeader>
              <CardTitle>Groups by day</CardTitle>
              <CardDescription>
                How lesson groups are spread across the week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={dayConfig} className="h-44 w-full">
                <BarChart
                  data={dayData}
                  margin={{
                    top: 4,
                    right: 4,
                    left: -20,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="groups"
                    fill="var(--chart-2)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts row 2 */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Age range breakdown */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Groups &amp; students by age range</CardTitle>
              <CardDescription>4–6 year olds vs 7–12 year olds</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={ageConfig} className="h-44 w-full">
                <BarChart
                  data={ageData}
                  margin={{
                    top: 4,
                    right: 4,
                    left: -20,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="ageRange"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="groups"
                    fill="var(--chart-3)"
                    radius={[4, 4, 0, 0]}
                    name="Groups"
                  />
                  <Bar
                    dataKey="students"
                    fill="var(--chart-1)"
                    radius={[4, 4, 0, 0]}
                    name="Students"
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Student placement donut */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Student placement</CardTitle>
              <CardDescription>
                {assignedStudentIds.size} assigned · {unassignedCount}{" "}
                unassigned
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <ChartContainer
                config={coverageConfig}
                className="h-44 w-full max-w-[240px]"
              >
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        nameKey="label"
                        hideIndicator={false}
                      />
                    }
                  />
                  <Pie
                    data={coverageData}
                    dataKey="value"
                    nameKey="label"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={3}
                  >
                    {coverageData.map((entry) => (
                      <Cell key={entry.label} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Instructor discipline breakdown */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Instructor disciplines</CardTitle>
              <CardDescription>
                Ski-only, snowboard-only, and dual-certified
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <ChartContainer
                config={disciplineConfig}
                className="h-44 w-full max-w-[240px]"
              >
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        nameKey="discipline"
                        hideIndicator={false}
                      />
                    }
                  />
                  <Pie
                    data={disciplineData}
                    dataKey="count"
                    nameKey="discipline"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={3}
                  >
                    {disciplineData.map((entry) => (
                      <Cell key={entry.discipline} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
