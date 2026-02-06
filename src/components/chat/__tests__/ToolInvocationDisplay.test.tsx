import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import {
  ToolInvocationDisplay,
  getToolMessage,
} from "../ToolInvocationDisplay";

afterEach(() => {
  cleanup();
});

// --- getToolMessage unit tests ---

test("str_replace_editor create shows 'Creating' with full path", () => {
  expect(
    getToolMessage({
      toolName: "str_replace_editor",
      args: { command: "create", path: "/components/Card.jsx" },
      state: "result",
    })
  ).toEqual({ message: "Creating /components/Card.jsx" });
});

test("str_replace_editor str_replace shows 'Editing' with full path", () => {
  expect(
    getToolMessage({
      toolName: "str_replace_editor",
      args: { command: "str_replace", path: "/components/Card.jsx" },
      state: "result",
    })
  ).toEqual({ message: "Editing /components/Card.jsx" });
});

test("str_replace_editor insert shows 'Inserting into' with full path", () => {
  expect(
    getToolMessage({
      toolName: "str_replace_editor",
      args: { command: "insert", path: "/App.jsx" },
      state: "result",
    })
  ).toEqual({ message: "Inserting into /App.jsx" });
});

test("str_replace_editor view shows 'Reading' with full path", () => {
  expect(
    getToolMessage({
      toolName: "str_replace_editor",
      args: { command: "view", path: "/utils/helpers.ts" },
      state: "call",
    })
  ).toEqual({ message: "Reading /utils/helpers.ts" });
});

test("str_replace_editor unknown command shows 'Modifying'", () => {
  expect(
    getToolMessage({
      toolName: "str_replace_editor",
      args: { command: "undo_edit", path: "/App.jsx" },
      state: "call",
    })
  ).toEqual({ message: "Modifying /App.jsx" });
});

test("file_manager rename shows full paths with arrow", () => {
  expect(
    getToolMessage({
      toolName: "file_manager",
      args: {
        command: "rename",
        path: "/old/Button.jsx",
        new_path: "/components/Button.jsx",
      },
      state: "result",
    })
  ).toEqual({ message: "Moving /old/Button.jsx → /components/Button.jsx" });
});

test("file_manager rename with different names", () => {
  expect(
    getToolMessage({
      toolName: "file_manager",
      args: {
        command: "rename",
        path: "/components/Card.jsx",
        new_path: "/components/CardList.jsx",
      },
      state: "result",
    })
  ).toEqual({
    message: "Moving /components/Card.jsx → /components/CardList.jsx",
  });
});

test("file_manager delete shows 'Deleting' with full path", () => {
  expect(
    getToolMessage({
      toolName: "file_manager",
      args: { command: "delete", path: "/components/OldComponent.jsx" },
      state: "result",
    })
  ).toEqual({ message: "Deleting /components/OldComponent.jsx" });
});

test("file_manager unknown command shows 'Managing'", () => {
  expect(
    getToolMessage({
      toolName: "file_manager",
      args: { command: "unknown", path: "/App.jsx" },
      state: "call",
    })
  ).toEqual({ message: "Managing /App.jsx" });
});

test("unknown tool falls back to tool name", () => {
  expect(
    getToolMessage({
      toolName: "some_other_tool",
      args: {},
      state: "call",
    })
  ).toEqual({ message: "some_other_tool" });
});

// --- Detail line tests ---

test("str_replace with old_str/new_str shows truncated replacement preview", () => {
  const result = getToolMessage({
    toolName: "str_replace_editor",
    args: {
      command: "str_replace",
      path: "/App.jsx",
      old_str: "Hello",
      new_str: "World",
    },
    state: "result",
  });
  expect(result.message).toBe("Editing /App.jsx");
  expect(result.detail).toBe('"Hello" → "World"');
});

test("str_replace with very long old_str truncates detail", () => {
  const longStr = "a".repeat(50);
  const result = getToolMessage({
    toolName: "str_replace_editor",
    args: {
      command: "str_replace",
      path: "/App.jsx",
      old_str: longStr,
      new_str: "short",
    },
    state: "result",
  });
  expect(result.message).toBe("Editing /App.jsx");
  expect(result.detail).toContain("…");
  // old_str should be truncated to 25 chars (24 + …)
  expect(result.detail!.length).toBeLessThan(60);
});

test("insert with insert_line shows line number in message", () => {
  const result = getToolMessage({
    toolName: "str_replace_editor",
    args: {
      command: "insert",
      path: "/App.jsx",
      insert_line: 15,
      new_str: "const x = 1;",
    },
    state: "result",
  });
  expect(result.message).toBe("Inserting into /App.jsx at line 15");
  expect(result.detail).toBe("const x = 1;");
});

test("view with view_range shows line range in detail", () => {
  const result = getToolMessage({
    toolName: "str_replace_editor",
    args: {
      command: "view",
      path: "/App.jsx",
      view_range: [10, 20],
    },
    state: "call",
  });
  expect(result.message).toBe("Reading /App.jsx");
  expect(result.detail).toBe("Lines 10–20");
});

test("view without view_range has no detail", () => {
  const result = getToolMessage({
    toolName: "str_replace_editor",
    args: { command: "view", path: "/App.jsx" },
    state: "call",
  });
  expect(result.message).toBe("Reading /App.jsx");
  expect(result.detail).toBeUndefined();
});

// --- Component rendering tests ---

test("shows spinner when tool is in progress", () => {
  const { container } = render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "call",
      }}
    />
  );

  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
  // Spinner should be present (svg with animate-spin)
  const spinner = container.querySelector(".animate-spin");
  expect(spinner).not.toBeNull();
  // Green dot should NOT be present
  const greenDot = container.querySelector(".bg-emerald-500");
  expect(greenDot).toBeNull();
});

test("shows green dot when tool is complete", () => {
  const { container } = render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "result",
        result: "File created: /App.jsx",
      }}
    />
  );

  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
  // Green dot should be present
  const greenDot = container.querySelector(".bg-emerald-500");
  expect(greenDot).not.toBeNull();
  // Spinner should NOT be present
  const spinner = container.querySelector(".animate-spin");
  expect(spinner).toBeNull();
});

test("shows spinner when state is result but result is null", () => {
  const { container } = render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "str_replace", path: "/Card.jsx" },
        state: "result",
        result: null,
      }}
    />
  );

  expect(screen.getByText("Editing /Card.jsx")).toBeDefined();
  const spinner = container.querySelector(".animate-spin");
  expect(spinner).not.toBeNull();
});

test("renders detail line when present", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "str_replace_editor",
        args: {
          command: "str_replace",
          path: "/App.jsx",
          old_str: "foo",
          new_str: "bar",
        },
        state: "result",
        result: "OK",
      }}
    />
  );

  expect(screen.getByText("Editing /App.jsx")).toBeDefined();
  expect(screen.getByText('"foo" → "bar"')).toBeDefined();
});

test("does not render detail line when absent", () => {
  const { container } = render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "result",
        result: "OK",
      }}
    />
  );

  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
  // No detail span should exist
  const detailSpan = container.querySelector(".text-neutral-400");
  expect(detailSpan).toBeNull();
});
