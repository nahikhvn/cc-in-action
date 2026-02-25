import { test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainContent } from "../main-content";

// Mock heavy dependencies
vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useFileSystem: vi.fn(),
}));

vi.mock("@/lib/contexts/chat-context", () => ({
  ChatProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
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
  HeaderActions: () => <div data-testid="header-actions">Header Actions</div>,
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  ResizablePanel: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <div>{children}</div>,
  ResizableHandle: () => <div data-testid="resize-handle" />,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test("renders preview view by default", () => {
  render(<MainContent />);

  expect(screen.getByTestId("preview-frame")).toBeInTheDocument();
  expect(screen.queryByTestId("code-editor")).not.toBeInTheDocument();
  expect(screen.queryByTestId("file-tree")).not.toBeInTheDocument();
});

test("Preview tab is active by default", () => {
  render(<MainContent />);

  const previewTab = screen.getByRole("tab", { name: "Preview" });
  const codeTab = screen.getByRole("tab", { name: "Code" });

  expect(previewTab).toHaveAttribute("data-state", "active");
  expect(codeTab).toHaveAttribute("data-state", "inactive");
});

test("clicking Code tab shows code editor and file tree", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  const codeTab = screen.getByRole("tab", { name: "Code" });
  await user.click(codeTab);

  expect(screen.getByTestId("code-editor")).toBeInTheDocument();
  expect(screen.getByTestId("file-tree")).toBeInTheDocument();
  expect(screen.queryByTestId("preview-frame")).not.toBeInTheDocument();
});

test("clicking Preview tab after Code tab returns to preview", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  // Switch to code view
  const codeTab = screen.getByRole("tab", { name: "Code" });
  await user.click(codeTab);

  expect(screen.getByTestId("code-editor")).toBeInTheDocument();

  // Switch back to preview
  const previewTab = screen.getByRole("tab", { name: "Preview" });
  await user.click(previewTab);

  expect(screen.getByTestId("preview-frame")).toBeInTheDocument();
  expect(screen.queryByTestId("code-editor")).not.toBeInTheDocument();
});

test("Code tab becomes active after clicking it", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  const codeTab = screen.getByRole("tab", { name: "Code" });
  await user.click(codeTab);

  expect(codeTab).toHaveAttribute("data-state", "active");

  const previewTab = screen.getByRole("tab", { name: "Preview" });
  expect(previewTab).toHaveAttribute("data-state", "inactive");
});

test("toggling between tabs multiple times works correctly", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  const previewTab = screen.getByRole("tab", { name: "Preview" });
  const codeTab = screen.getByRole("tab", { name: "Code" });

  // Start: preview
  expect(screen.getByTestId("preview-frame")).toBeInTheDocument();

  // Switch to code
  await user.click(codeTab);
  expect(screen.getByTestId("code-editor")).toBeInTheDocument();
  expect(screen.queryByTestId("preview-frame")).not.toBeInTheDocument();

  // Switch back to preview
  await user.click(previewTab);
  expect(screen.getByTestId("preview-frame")).toBeInTheDocument();
  expect(screen.queryByTestId("code-editor")).not.toBeInTheDocument();

  // Switch to code again
  await user.click(codeTab);
  expect(screen.getByTestId("code-editor")).toBeInTheDocument();
  expect(screen.queryByTestId("preview-frame")).not.toBeInTheDocument();
});
