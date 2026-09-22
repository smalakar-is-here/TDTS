import { useEffect, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Skeleton } from "../../ui/skeleton";
import { getEmployees, getTasks } from "../../../lib/api";
import { WorkloadDot } from "../WorkloadDot";
import { TaskDetailsModal } from "../TaskDetailsModal";
import {
  employees as fallbackEmployees,
  type Employee,
  type Task,
  type TaskStatus,
} from "../data";
import type { ScreenId } from "../AppShell";

export function TaskManagementScreen({
  onNavigate,
}: {
  onNavigate?: (id: ScreenId) => void;
}) {
  // Search and filtering states
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [sort, setSort] = useState("deadline");

  // Task and employee data
  const [selected, setSelected] = useState<Task | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [people, setPeople] = useState<Employee[]>(fallbackEmployees);

  // Load tasks and employees
  useEffect(() => {
    let active = true;

    Promise.all([getTasks(), getEmployees()])
      .then(([nextTasks, nextPeople]) => {
        if (!active) return;

        setTasks(nextTasks);
        setPeople(nextPeople);
      })
      .catch((error) => {
        toast.error("Could not load tasks", {
          id: "tasks-load-error",
          description:
            error instanceof Error ? error.message : "Unknown error",
        });

        setTasks([]);
      });

    return () => {
      active = false;
    };
  }, []);

  // Advanced search + status filtering + sorting
  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filteredTasks = (tasks ?? []).filter((task) => {
      const person =
        task.assigneeData ??
        people.find((employee) => employee.id === task.assignee);

      /*
       * Search can now match:
       * - Task title
       * - Project
       * - Status
       * - Priority
       * - Assignee name
       */
      const searchableText = [
        task.title,
        task.project,
        task.status,
        task.priority,
        person?.name ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        normalizedQuery.length === 0 ||
        searchableText.includes(normalizedQuery);

      const matchesStatus =
        statusFilter === "all" || task.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    return filteredTasks.slice().sort((a, b) => {
      if (sort === "priority") {
        const priorityOrder = {
          low: 1,
          medium: 2,
          high: 3,
        };

        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }

      if (sort === "assignee") {
        const personA =
          a.assigneeData ??
          people.find((employee) => employee.id === a.assignee);

        const personB =
          b.assigneeData ??
          people.find((employee) => employee.id === b.assignee);

        return (personA?.name ?? "").localeCompare(personB?.name ?? "");
      }

      return a.deadline.localeCompare(b.deadline);
    });
  }, [tasks, people, query, statusFilter, sort]);

  // Reset all filters
  const clearFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setSort("deadline");
  };

  const hasActiveFilters =
    query.trim().length > 0 || statusFilter !== "all";

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="tdts-page-title">Task Management</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Search, filter, sort and open every task in the workspace.
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

      {/* Main Task Card */}
      <div className="tdts-card mt-5 overflow-hidden">
        {/* Search and Filter Controls */}
        <div className="flex flex-wrap gap-3 border-b border-border-primary p-4">
          {/* Advanced Search */}
          <label className="relative min-w-60 flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />

            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by task, project, status, priority or assignee"
              className="pl-9"
            />
          </label>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | TaskStatus)
            }
            className="h-9 rounded-md border border-border-primary bg-background px-3 text-sm"
            aria-label="Filter tasks by status"
          >
            <option value="all">All Status</option>
            <option value="Backlog">Backlog</option>
            <option value="To-Do">To-Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Done">Done</option>
          </select>

          {/* Sorting */}
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="h-9 rounded-md border border-border-primary bg-background px-3 text-sm"
            aria-label="Sort tasks"
          >
            <option value="deadline">Sort: Deadline</option>
            <option value="priority">Sort: Priority</option>
            <option value="assignee">Sort: Assignee</option>
          </select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              className="h-9"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>

        {/* Result Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-primary bg-bg-faint px-4 py-3 text-xs text-muted-foreground">
          <span>
            {tasks === null
              ? "Loading tasks..."
              : `Showing ${rows.length} of ${tasks.length} tasks`}
          </span>

          {statusFilter !== "all" && (
            <span>
              Status filter:{" "}
              <strong className="text-foreground">{statusFilter}</strong>
            </span>
          )}
        </div>

        {/* Task Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-faint text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Assignee</th>
                <th className="px-4 py-3">Deadline</th>
              </tr>
            </thead>

            <tbody>
              {/* Loading State */}
              {tasks === null &&
                Array.from({ length: 6 }, (_, index) => (
                  <tr key={index}>
                    <td colSpan={5} className="px-4 py-2">
                      <Skeleton className="h-9 w-full" />
                    </td>
                  </tr>
                ))}

              {/* Empty State */}
              {tasks !== null && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Search className="h-8 w-8 opacity-50" />

                      <p className="font-medium text-foreground">
                        No tasks found
                      </p>

                      <p className="text-xs">
                        Try changing your search or status filter.
                      </p>

                      {hasActiveFilters && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={clearFilters}
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {/* Task Rows */}
              {tasks !== null &&
                rows.map((task) => {
                  const person =
                    task.assigneeData ??
                    people.find(
                      (employee) => employee.id === task.assignee
                    ) ??
                    fallbackEmployees[0];

                  return (
                    <tr
                      key={task.id}
                      onClick={() => setSelected(task)}
                      className="cursor-pointer border-t border-border-secondary hover:bg-bg-faint"
                    >
                      {/* Task */}
                      <td className="px-4 py-3 font-medium">
                        {task.title}

                        <div className="text-[10px] text-muted-foreground">
                          {task.project}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">{task.status}</td>

                      {/* Priority */}
                      <td className="px-4 py-3 capitalize">
                        {task.priority}
                      </td>

                      {/* Assignee */}
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <WorkloadDot workload={person.workload} />
                          {person.name}
                        </span>
                      </td>

                      {/* Deadline */}
                      <td className="px-4 py-3">{task.deadline}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task Details Modal */}
      <TaskDetailsModal
        task={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
        onDelegate={() => onNavigate?.("delegate-task")}
      />
    </div>
  );
}