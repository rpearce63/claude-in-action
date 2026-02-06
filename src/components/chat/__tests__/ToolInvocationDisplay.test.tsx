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

test("str_replace_editor create shows 'Creating' with file name", () => {
  expect(
    getToolMessage({
      toolName: "str_replace_editor",
      args: { command: "create", path: "/components/Card.jsx" },
      state: "result",
    })
  ).toBe("Creating Card.jsx");
});

test("str_replace_editor str_replace shows 'Editing' with file name", () => {
  expect(
    getToolMessage({
      toolName: "str_replace_editor",
      args: { command: "str_replace", path: "/components/Card.jsx" },
      state: "result",
    })
  ).toBe("Editing Card.jsx");
});

test("str_replace_editor insert shows 'Editing' with file name", () => {
  expect(
    getToolMessage({
      toolName: "str_replace_editor",
      args: { command: "insert", path: "/App.jsx" },
      state: "result",
    })
  ).toBe("Editing App.jsx");
});

test("str_replace_editor view shows 'Reading' with file name", () => {
  expect(
    getToolMessage({
      toolName: "str_replace_editor",
      args: { command: "view", path: "/utils/helpers.ts" },
      state: "call",
    })
  ).toBe("Reading helpers.ts");
});

test("str_replace_editor unknown command shows 'Modifying'", () => {
  expect(
    getToolMessage({
      toolName: "str_replace_editor",
      args: { command: "undo_edit", path: "/App.jsx" },
      state: "call",
    })
  ).toBe("Modifying App.jsx");
});

test("file_manager rename shows both file names", () => {
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
  ).toBe("Renaming Button.jsx to Button.jsx");
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
  ).toBe("Renaming Card.jsx to CardList.jsx");
});

test("file_manager delete shows 'Deleting' with file name", () => {
  expect(
    getToolMessage({
      toolName: "file_manager",
      args: { command: "delete", path: "/components/OldComponent.jsx" },
      state: "result",
    })
  ).toBe("Deleting OldComponent.jsx");
});

test("file_manager unknown command shows 'Managing'", () => {
  expect(
    getToolMessage({
      toolName: "file_manager",
      args: { command: "unknown", path: "/App.jsx" },
      state: "call",
    })
  ).toBe("Managing App.jsx");
});

test("unknown tool falls back to tool name", () => {
  expect(
    getToolMessage({
      toolName: "some_other_tool",
      args: {},
      state: "call",
    })
  ).toBe("some_other_tool");
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

  expect(screen.getByText("Creating App.jsx")).toBeDefined();
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

  expect(screen.getByText("Creating App.jsx")).toBeDefined();
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

  expect(screen.getByText("Editing Card.jsx")).toBeDefined();
  const spinner = container.querySelector(".animate-spin");
  expect(spinner).not.toBeNull();
});
