import type { Ref } from "react";
import { useEffect, useMemo, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import { motion } from "motion/react";
import { GripVertical, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Employee, Task, TaskStatus } from "./data";
import { employees as fallbackEmployees } from "./data";
import { getEmployees, getTasks, updateTask } from "../../lib/api";
import { AppAvatar } from "./AppAvatar";
import { WorkloadDot } from "./WorkloadDot";
import { Skeleton } from "../ui/skeleton";

const ITEM = "TDTS_TASK";
const statuses: TaskStatus[] = ["Backlog", "To-Do", "In Progress", "Done"];
const tone = { low: "bg-bg-faint text-muted-foreground", medium: "bg-amber-500/10 text-amber-600", high: "bg-red-500/10 text-red-600" } as const;

function TaskCard({ task, people, onOpen }: { task: Task; people: Employee[]; onOpen?: (task: Task) => void }) {
  const [{ dragging }, drag] = useDrag(() => ({ type: ITEM, item: { id: task.id }, collect: (monitor) => ({ dragging: monitor.isDragging() }) }), [task.id]);
  const person = task.assigneeData ?? people.find((candidate) => candidate.id === task.assignee) ?? fallbackEmployees[0];
  return <motion.div ref={drag as unknown as Ref<HTMLDivElement>} onClick={() => onOpen?.(task)} whileHover={{ y: -2, boxShadow: "0 8px 20px rgba(0,0,0,0.08)" }} className={`rounded-xl border border-border-primary bg-surface-bg p-3 shadow-sm ${dragging ? "cursor-grabbing" : "cursor-grab"}`} style={{ opacity: dragging ? 0.45 : 1 }}>
    <div className="flex items-start gap-2"><div className="min-w-0 flex-1 text-sm font-medium leading-5">{task.title}</div><GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" /></div>
    <div className="mt-3 flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${tone[task.priority]}`}>{task.priority}</span>{task.subtasksTotal !== undefined && <span className="text-[10px] text-muted-foreground">{task.subtasksDone}/{task.subtasksTotal} subtasks</span>}</div>
    <div className="mt-3 flex items-center gap-2 border-t border-border-secondary pt-3"><AppAvatar initials={person.initials} size="sm" /><span className="min-w-0 flex-1 truncate text-xs">{person.name}</span><WorkloadDot workload={person.workload} /><span className="text-[10px] text-muted-foreground">{task.deadline}</span></div>
  </motion.div>;
}

function Column({ status, tasks, people, move, onOpen }: { status: TaskStatus; tasks: Task[]; people: Employee[]; move: (id: string, status: TaskStatus) => void; onOpen?: (task: Task) => void }) {
  const [{ over }, drop] = useDrop(() => ({ accept: ITEM, drop: (item: { id: string }) => move(item.id, status), collect: (monitor) => ({ over: monitor.isOver() }) }), [status, move]);
  return <div ref={drop as unknown as Ref<HTMLDivElement>} className={`min-w-[255px] flex-1 rounded-xl border border-border-secondary bg-bg-faint/70 p-2 transition ${over ? "ring-2 ring-brand-primary/30" : ""}`}>
    <div className="flex items-center justify-between px-1 py-2"><div className="text-xs font-semibold uppercase tracking-[.05em]">{status} <span className="ml-1 text-muted-foreground">{tasks.length}</span></div></div>
    <div className="grid gap-2">{tasks.map((task) => <TaskCard key={task.id} task={task} people={people} onOpen={onOpen} />)}</div>
  </div>;
}

export function KanbanBoard({ onOpenTask, onCreateTask, ownOnly = false, projectFilter }: { onOpenTask?: (task: Task) => void; onCreateTask?: () => void; ownOnly?: boolean; projectFilter?: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [people, setPeople] = useState<Employee[]>(fallbackEmployees);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([getTasks(), getEmployees()]).then(([nextTasks, nextPeople]) => {
      if (!active) return;
      let filtered = ownOnly ? nextTasks.filter((task) => ["eli", "dev", "ben"].includes(task.assignee)) : nextTasks;
      if (projectFilter) filtered = filtered.filter((task) => task.project === projectFilter);
      setTasks(filtered);
      setPeople(nextPeople);
    }).catch((error) => toast.error("Could not load tasks", { id: "kanban-load-error", description: error.message })).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [ownOnly, projectFilter]);

  const move = (id: string, status: TaskStatus) => {
    const before = tasks;
    setTasks((previous) => previous.map((task) => task.id === id ? { ...task, status } : task));
    updateTask(id, { status }).catch((error) => {
      setTasks(before);
      toast.error("Task status not saved", { id: "kanban-update-error", description: error.message });
    });
  };
  const groups = useMemo(() => Object.fromEntries(statuses.map((status) => [status, tasks.filter((task) => task.status === status)])) as Record<TaskStatus, Task[]>, [tasks]);

  return <section className="tdts-card overflow-hidden p-4"><div className="mb-4 flex items-center justify-between"><div><h2 className="tdts-heading">{ownOnly ? "My Task Board" : "Live Task Board"}</h2><p className="text-xs text-muted-foreground">Drag cards between stages to update status</p></div>{onCreateTask && <button onClick={onCreateTask} className="rounded-md bg-brand-primary px-3 py-2 text-xs font-semibold text-white"><Plus className="inline h-3.5 w-3.5" /> Create Task</button>}</div>
    {loading ? <div className="grid grid-cols-4 gap-3 overflow-hidden">{statuses.map((status) => <div key={status} className="min-w-[220px] rounded-xl bg-bg-faint p-3"><Skeleton className="h-4 w-24" /><Skeleton className="mt-4 h-28 w-full" /><Skeleton className="mt-2 h-28 w-full" /></div>)}</div> : tasks.length === 0 ? <div className="rounded-xl border border-dashed border-border-secondary p-8 text-center text-sm text-muted-foreground">No tasks in this workspace yet.</div> : <div className="flex gap-3 overflow-x-auto pb-2">{statuses.map((status) => <Column key={status} status={status} tasks={groups[status]} people={people} move={move} onOpen={onOpenTask} />)}</div>}
  </section>;
}
