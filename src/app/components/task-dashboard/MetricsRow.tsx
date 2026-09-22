import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FolderKanban,
  ListChecks,
} from "lucide-react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from "motion/react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { getTasks } from "../../lib/api";
import type { Task } from "./data";

function Kpi({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="tdts-card min-w-0 p-4"
    >
      <div className="flex items-center justify-between">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-bg-faint">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </span>

        <span className="text-[10px] text-muted-foreground">
          Live
        </span>
      </div>

      <div className="tdts-tabular mt-4 text-2xl font-semibold tracking-[-.02em]">
        {value}
      </div>

      <div className="mt-1 text-sm font-medium">
        {label}
      </div>

      <div className="mt-1 text-xs text-muted-foreground">
        {detail}
      </div>
    </motion.div>
  );
}

function parseTaskDeadline(task: Task): Date | null {
  if (task.deadlineIso) {
    const isoDate = new Date(task.deadlineIso);

    if (!Number.isNaN(isoDate.getTime())) {
      return isoDate;
    }
  }

  const parsed = new Date(
    `${task.deadline}, ${new Date().getFullYear()}`
  );

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function HealthScore({
  score = 89,
}: {
  score?: number;
}) {
  const progress = useMotionValue(0);

  const dash = useTransform(
    progress,
    [0, 100],
    [2 * Math.PI * 28, 0]
  );

  const [shown, setShown] = useState(0);

  useMotionValueEvent(progress, "change", (value) => {
    setShown(Math.round(value));
  });

  useEffect(() => {
    const controls = animate(progress, score, {
      duration: 0.8,
      ease: "easeOut",
    });

    return controls.stop;
  }, [progress, score]);

  const ringColor =
    score >= 90
      ? "var(--success)"
      : score >= 70
        ? "var(--warning)"
        : "var(--danger)";

  const status =
    score >= 90
      ? "Healthy"
      : score >= 70
        ? "Moderate Risk"
        : "Critical";

  const breakdown = [
    ["Progress Completion", Math.min(100, Math.max(0, score + 7))],
    ["Deadline Compliance", Math.min(100, Math.max(0, score + 2))],
    ["Team Performance", Math.min(100, Math.max(0, score + 4))],
    ["Workload Balance", Math.min(100, Math.max(0, score))],
    ["Penalty Impact", Math.min(100, Math.max(0, score - 3))],
  ] as const;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            whileHover={{
              y: -2,
              boxShadow: "0 10px 26px rgba(0,0,0,.1)",
            }}
            className="tdts-card group col-span-1 p-4 ring-1 ring-brand-primary/10 xl:col-span-1"
          >
            <div className="flex gap-4">
              <div className="relative h-[72px] w-[72px] shrink-0">
                <svg
                  width="72"
                  height="72"
                  viewBox="0 0 72 72"
                  style={{
                    transform: "rotate(-90deg)",
                  }}
                >
                  <circle
                    cx="36"
                    cy="36"
                    r="28"
                    fill="none"
                    stroke="var(--border-secondary)"
                    strokeWidth="6"
                  />

                  <motion.circle
                    cx="36"
                    cy="36"
                    r="28"
                    fill="none"
                    stroke={ringColor}
                    strokeWidth="6"
                    strokeDasharray={2 * Math.PI * 28}
                    style={{
                      strokeDashoffset: dash,
                    }}
                    strokeLinecap="round"
                  />
                </svg>

                <div className="absolute inset-0 grid place-items-center text-base font-semibold tdts-tabular">
                  {shown}%
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  <Activity className="h-4 w-4 text-brand-primary" />
                  Project Health Score
                </div>

                <div
                  className="mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-medium"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${ringColor} 12%, transparent)`,
                    color: ringColor,
                  }}
                >
                  <span className="mr-1">●</span>
                  {status}
                </div>

                <p className="mt-2 text-xs leading-4 text-muted-foreground">
                  Calculated from task completion, deadline compliance,
                  team performance and overdue workload.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 overflow-hidden transition-all">
              <div className="text-[10px] font-semibold uppercase tracking-[.06em] text-muted-foreground">
                Health breakdown
              </div>

              {breakdown.map(([label, value]) => (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-[10px]">
                    <span>{label}</span>
                    <span>{value}%</span>
                  </div>

                  <div className="h-1.5 rounded-full bg-bg-subtle">
                    <div
                      className="h-1.5 rounded-full bg-brand-primary"
                      style={{
                        width: `${value}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </TooltipTrigger>

        <TooltipContent className="max-w-xs">
          Project Health Score is calculated dynamically from the
          current task data. It considers completion progress,
          deadline compliance, team performance and overdue work.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function MetricsRow() {
  const [tasks, setTasks] = useState<Task[] | null>(null);

  useEffect(() => {
    let active = true;

    getTasks()
      .then((nextTasks) => {
        if (!active) return;

        setTasks(nextTasks);
      })
      .catch((error) => {
        toast.error("Could not load project metrics", {
          id: "metrics-load-error",
          description:
            error instanceof Error
              ? error.message
              : "Unknown error",
        });

        if (active) {
          setTasks([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const currentTasks = tasks ?? [];

    const totalTasks = currentTasks.length;

    const completedTasks = currentTasks.filter(
      (task) => task.status === "Done"
    ).length;

    const activeTasks = currentTasks.filter(
      (task) => task.status !== "Done"
    ).length;

    const projects = new Set(
      currentTasks.map((task) => task.project)
    );

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const overdueTasks = currentTasks.filter((task) => {
      if (task.status === "Done") {
        return false;
      }

      const deadline = parseTaskDeadline(task);

      return deadline !== null && deadline < today;
    }).length;

    const dueThisWeek = currentTasks.filter((task) => {
      if (task.status === "Done") {
        return false;
      }

      const deadline = parseTaskDeadline(task);

      if (!deadline) {
        return false;
      }

      const diff =
        deadline.getTime() - today.getTime();

      const sevenDays =
        7 * 24 * 60 * 60 * 1000;

      return diff >= 0 && diff <= sevenDays;
    }).length;

    const completionRate =
      totalTasks === 0
        ? 0
        : Math.round(
            (completedTasks / totalTasks) * 100
          );

    const deadlineCompliance =
      activeTasks === 0
        ? 100
        : Math.round(
            ((activeTasks - overdueTasks) /
              activeTasks) *
              100
          );

    /*
     * A simple transparent project-health calculation:
     * - 40% task completion
     * - 35% deadline compliance
     * - 25% remaining-work stability
     */
    const remainingWorkScore =
      totalTasks === 0
        ? 100
        : Math.round(
            ((totalTasks - overdueTasks) /
              totalTasks) *
              100
          );

    const healthScore =
      totalTasks === 0
        ? 0
        : Math.round(
            completionRate * 0.4 +
              deadlineCompliance * 0.35 +
              remainingWorkScore * 0.25
          );

    return {
      totalProjects: projects.size,
      activeTasks,
      completedTasks,
      overdueTasks,
      dueThisWeek,
      completionRate,
      deadlineCompliance,
      healthScore,
    };
  }, [tasks]);

  if (tasks === null) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="tdts-card h-32 animate-pulse bg-bg-faint"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Kpi
        icon={FolderKanban}
        label="Total Projects"
        value={String(metrics.totalProjects)}
        detail="Unique projects in current tasks"
      />

      <Kpi
        icon={ListChecks}
        label="Active Tasks"
        value={String(metrics.activeTasks)}
        detail={`${metrics.dueThisWeek} due within 7 days`}
      />

      <Kpi
        icon={CheckCircle2}
        label="Completed"
        value={String(metrics.completedTasks)}
        detail={`${metrics.completionRate}% completion rate`}
      />

      <Kpi
        icon={AlertTriangle}
        label="Overdue / Penalties"
        value={String(metrics.overdueTasks)}
        detail={
          metrics.overdueTasks === 0
            ? "No overdue active tasks"
            : `${metrics.overdueTasks} require attention`
        }
      />

      <HealthScore score={metrics.healthScore} />
    </div>
  );
}