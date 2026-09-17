import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { workspaces } from "./data";

export const workspaceProjectMap: Record<string, string> = {
  "Project Alpha": "Project Alpha",
  "Growth Workspace": "Growth",
  "Checkout Team": "Checkout",
  "Platform": "Platform",
};

export const workspaceTaglines: Record<string, string> = {
  "Project Alpha": "Everything important, without hunting through tabs.",
  "Growth Workspace": "Campaigns, content, and funnel experiments in one place.",
  "Checkout Team": "Payments, billing, and checkout reliability at a glance.",
  "Platform": "Core infrastructure and platform-wide initiatives.",
};

type WorkspaceContextValue = {
  workspace: string;
  setWorkspace: (next: string) => void;
  projectFilter: string;
  tagline: string;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<string>(workspaces[0]);

  const value = useMemo<WorkspaceContextValue>(() => ({
    workspace,
    setWorkspace,
    projectFilter: workspaceProjectMap[workspace] ?? workspace,
    tagline: workspaceTaglines[workspace] ?? "",
  }), [workspace]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside a WorkspaceProvider");
  return ctx;
}
