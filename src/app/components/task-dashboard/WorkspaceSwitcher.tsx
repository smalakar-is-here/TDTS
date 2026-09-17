import { Check, ChevronDown, Layers } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { workspaces } from "./data";
import { useWorkspace } from "./WorkspaceContext";

export function WorkspaceSwitcher() {
  const { workspace, setWorkspace } = useWorkspace();

  const handleSelect = (item: string) => {
    if (item === workspace) return;
    setWorkspace(item);
    toast.success(`Switched to ${item}`, { id: "workspace-switch" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-9 items-center gap-2 rounded-md border border-border-primary bg-surface-bg pl-3 pr-2.5 text-sm hover:bg-bg-faint">
          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="max-w-[140px] truncate">{workspace}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {workspaces.map((item) => (
          <DropdownMenuItem key={item} onClick={() => handleSelect(item)}>
            <span className="flex-1 truncate">{item}</span>
            {item === workspace && <Check className="h-4 w-4 text-brand-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
