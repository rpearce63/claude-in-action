import { test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainContent } from "../main-content";

// Mock heavy dependencies that don't need to render for toggle tests
vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: any) => <div>{children}</div>,
  useFileSystem: vi.fn(() => ({
    getAllFiles: vi.fn(() => new Map()),
    refreshTrigger: 0,
    selectedFile: null,
    getFileContent: vi.fn(),
    updateFile: vi.fn(),
  })),
}));

vi.mock("@/lib/contexts/chat-context", () => ({
  ChatProvider: ({ children }: any) => <div>{children}</div>,
  useChat: vi.fn(() => ({
    messages: [],
    input: "",
    handleInputChange: vi.fn(),
    handleSubmit: vi.fn(),
    status: "idle",
  })),
}));

vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: () => <div data-testid="chat-interface">Chat</div>,
}));

vi.mock("@/components/editor/FileTree", () => ({
  FileTree: () => <div data-testid="file-tree">File Tree</div>,
}));

vi.mock("@/components/editor/CodeEditor", () => ({
  CodeEditor: () => <div data-testid="code-editor">Code Editor</div>,
}));

vi.mock("@/components/preview/PreviewFrame", () => ({
  PreviewFrame: () => <div data-testid="preview-frame">Preview</div>,
}));

vi.mock("@/components/HeaderActions", () => ({
  HeaderActions: () => <div data-testid="header-actions">Header</div>,
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children, ...props }: any) => (
    <div data-testid="resizable-group" {...props}>{children}</div>
  ),
  ResizablePanel: ({ children }: any) => <div>{children}</div>,
  ResizableHandle: () => <div />,
}));

afterEach(() => {
  cleanup();
});

test("renders Preview view by default", () => {
  render(<MainContent />);

  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.queryByTestId("code-editor")).toBeNull();
});

test("clicking Code button switches to code view", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  const codeButton = screen.getByRole("button", { name: "Code" });
  await user.click(codeButton);

  expect(screen.getByTestId("code-editor")).toBeDefined();
  expect(screen.queryByTestId("preview-frame")).toBeNull();
});

test("clicking Preview button switches back to preview view", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  // Switch to code first
  const codeButton = screen.getByRole("button", { name: "Code" });
  await user.click(codeButton);
  expect(screen.getByTestId("code-editor")).toBeDefined();

  // Switch back to preview
  const previewButton = screen.getByRole("button", { name: "Preview" });
  await user.click(previewButton);

  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.queryByTestId("code-editor")).toBeNull();
});

test("can toggle between views multiple times reliably", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  const codeButton = screen.getByRole("button", { name: "Code" });
  const previewButton = screen.getByRole("button", { name: "Preview" });

  // Toggle several times
  await user.click(codeButton);
  expect(screen.getByTestId("code-editor")).toBeDefined();

  await user.click(previewButton);
  expect(screen.getByTestId("preview-frame")).toBeDefined();

  await user.click(codeButton);
  expect(screen.getByTestId("code-editor")).toBeDefined();

  await user.click(previewButton);
  expect(screen.getByTestId("preview-frame")).toBeDefined();
});
