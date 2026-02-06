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

export interface ToolMessageResult {
  message: string;
  detail?: string;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}

export function getToolMessage(toolInvocation: ToolInvocation): ToolMessageResult {
  const { toolName, args } = toolInvocation;
  const path = args?.path ?? "";

  if (toolName === "str_replace_editor") {
    switch (args?.command) {
      case "create":
        return { message: `Creating ${path}` };
      case "str_replace": {
        const oldStr = args?.old_str ?? "";
        const newStr = args?.new_str ?? "";
        const detail =
          oldStr || newStr
            ? `"${truncate(oldStr, 25)}" → "${truncate(newStr, 25)}"`
            : undefined;
        return { message: `Editing ${path}`, detail };
      }
      case "insert": {
        const line = args?.insert_line;
        const message =
          line != null
            ? `Inserting into ${path} at line ${line}`
            : `Inserting into ${path}`;
        const detail = args?.new_str
          ? truncate(args.new_str, 60)
          : undefined;
        return { message, detail };
      }
      case "view": {
        const range = args?.view_range;
        const detail =
          range && Array.isArray(range) && range.length === 2
            ? `Lines ${range[0]}–${range[1]}`
            : undefined;
        return { message: `Reading ${path}`, detail };
      }
      default:
        return { message: `Modifying ${path}` };
    }
  }

  if (toolName === "file_manager") {
    switch (args?.command) {
      case "rename": {
        const newPath = args?.new_path ?? "";
        return { message: `Moving ${path} → ${newPath}` };
      }
      case "delete":
        return { message: `Deleting ${path}` };
      default:
        return { message: `Managing ${path}` };
    }
  }

  return { message: toolName };
}

export function ToolInvocationDisplay({
  toolInvocation,
}: ToolInvocationDisplayProps) {
  const isComplete =
    toolInvocation.state === "result" && toolInvocation.result != null;
  const { message, detail } = getToolMessage(toolInvocation);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {isComplete ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <div className="flex flex-col">
        <span className="text-neutral-700">{message}</span>
        {detail && (
          <span className="text-neutral-400 truncate max-w-xs">{detail}</span>
        )}
      </div>
    </div>
  );
}
