import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, ListChecks, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../ui/button";
import { getTasks } from "../../../lib/api";
import { MetricsRow } from "../MetricsRow";
import { KanbanBoard } from "../KanbanBoard";
import { GanttWidget } from "../GanttWidget";
import { LeaderboardPanel } from "../LeaderboardPanel";
import { TaskDetailsModal } from "../TaskDetailsModal";
import type { Task } from "../data";
import type { ScreenId } from "../AppShell";

function SummaryCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: typeof ListChecks;
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border-primary bg-surface-bg p-4">
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-bg-faint">
          <Icon className="h-4 w-4 text-brand-primary" />
        </span>

        <span className="tdts-tabular text-2xl font-semibold">
          {value}
        </span>
      </div>

      <div className="mt-3 text-sm font-semibold">{label}</div>

      <div className="mt-1 text-xs text-muted-foreground">
        {description}
      </div>
    </div>
  );
}

function TaskOverview({ tasks }: { tasks: Task[] }) {
  const summary = useMemo(() => {
    const total = tasks.length;

    const backlog = tasks.filter(
      (task) => task.status === "Backlog"
    ).length;

    const todo = tasks.filter(
      (task) => task.status === "To-Do"
    ).length;

    const inProgress = tasks.filter(
      (task) => task.status === "In Progress"
    ).length;

    const completed = tasks.filter(
      (task) => task.status === "Done"
    ).length;

    const completionRate =
      total === 0 ? 0 : Math.round((completed / total) * 100);

    return {
      total,
      backlog,
      todo,
      inProgress,
      completed,
      completionRate,
    };
  }, [tasks]);

  return (
    <section className="tdts-card mt-5 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">
            Task Overview
          </h2>

          <p className="mt-1 text-xs text-muted-foreground">
            Current task distribution and overall completion progress.
          </p>
        </div>

        <div className="text-right">
          <div className="tdts-tabular text-2xl font-semibold">
            {summary.completionRate}%
          </div>

          <div className="text-[10px] text-muted-foreground">
            Overall completion
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          icon={ListChecks}
          label="Total Tasks"
          value={summary.total}
          description="All workspace tasks"
        />

        <SummaryCard
          icon={Clock3}
          label="Backlog"
          value={summary.backlog}
          description="Waiting to start"
        />

        <SummaryCard
          icon={Clock3}
          label="To-Do"
          value={summary.todo}
          description="Ready to work on"
        />

        <SummaryCard
          icon={Clock3}
          label="In Progress"
          value={summary.inProgress}
          description="Currently being worked on"
        />

        <SummaryCard
          icon={CheckCircle2}
          label="Completed"
          value={summary.completed}
          description="Successfully completed"
        />
      </div>

      {/* Completion Progress */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium">
            Completion Progress
          </span>

          <span className="tdts-tabular text-muted-foreground">
            {summary.completed} of {summary.total} tasks completed
          </span>
        </div>

        <div className="h-2.5 overflow-hidden rounded-full bg-bg-subtle">
          <div
            className="h-full rounded-full bg-brand-primary transition-all duration-500"
            style={{
              width: `${summary.completionRate}%`,
            }}
          />
        </div>

        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          <span>
            {summary.total - summary.completed} tasks remaining
          </span>

          <span>
            {summary.completionRate}% complete
          </span>
        </div>
      </div>
    </section>
  );
}

export function DashboardScreen({
  onNavigate,
}: {
  onNavigate?: (id: ScreenId) => void;
}) {
  const [task, setTask] = useState<Task | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);

  useEffect(() => {
    let active = true;

    getTasks()
      .then((nextTasks) => {
        if (!active) return;

        setTasks(nextTasks);
      })
      .catch((error) => {
        toast.error("Could not load dashboard tasks", {
          id: "dashboard-tasks-error",
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

  return (
    <div className="grid gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="tdts-page-title">
            Project Alpha
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Everything important, without hunting through tabs.
          </p>
        </div>

        <Button
          className="bg-brand-primary text-white"
          onClick={() => onNavigate?.("create-task")}
        >
          <Plus />
          Create Task
        </Button>
      </div>

      {/* Existing KPI Metrics */}
      <MetricsRow />

      {/* New Task Summary */}
      {tasks === null ? (
        <section className="tdts-card mt-0 p-5">
          <div className="h-5 w-40 animate-pulse rounded bg-bg-faint" />

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-xl bg-bg-faint"
              />
            ))}
          </div>
        </section>
      ) : (
        <TaskOverview tasks={tasks} />
      )}

      {/* Main Dashboard Widgets */}
      <div className="grid gap-5 xl:grid-cols-[3fr_2fr]">
        <KanbanBoard
          onOpenTask={setTask}
          onCreateTask={() => onNavigate?.("create-task")}
        />

        <GanttWidget />
      </div>

      {/* Leaderboard */}
      <LeaderboardPanel />

      {/* Task Details Modal */}
      <TaskDetailsModal
        task={task}
        open={Boolean(task)}
        onOpenChange={(open) =>
          !open && setTask(null)
        }
        onDelegate={() =>
          onNavigate?.("delegate-task")
        }
      />
    </div>
  );
}