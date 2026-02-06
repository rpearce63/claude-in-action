import { Loader2 } from "lucide-react";

interface ToolInvocation {
  toolName: string;
  args: Record<string, any>;
  state: string;
  result?: any;
}

interface ToolInvocationDisplayProps {
  toolInvocation: ToolInvocation;
}

export function getToolMessage(toolInvocation: ToolInvocation): string {
  const { toolName, args } = toolInvocation;
  const path = args?.path ?? "";
  const fileName = path.split("/").filter(Boolean).pop() ?? path;

  if (toolName === "str_replace_editor") {
    switch (args?.command) {
      case "create":
        return `Creating ${fileName}`;
      case "str_replace":
        return `Editing ${fileName}`;
      case "insert":
        return `Editing ${fileName}`;
      case "view":
        return `Reading ${fileName}`;
      default:
        return `Modifying ${fileName}`;
    }
  }

  if (toolName === "file_manager") {
    switch (args?.command) {
      case "rename": {
        const newPath = args?.new_path ?? "";
        const newFileName =
          newPath.split("/").filter(Boolean).pop() ?? newPath;
        return `Renaming ${fileName} to ${newFileName}`;
      }
      case "delete":
        return `Deleting ${fileName}`;
      default:
        return `Managing ${fileName}`;
    }
  }

  return toolName;
}

export function ToolInvocationDisplay({
  toolInvocation,
}: ToolInvocationDisplayProps) {
  const isComplete =
    toolInvocation.state === "result" && toolInvocation.result != null;
  const message = getToolMessage(toolInvocation);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {isComplete ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{message}</span>
    </div>
  );
}
