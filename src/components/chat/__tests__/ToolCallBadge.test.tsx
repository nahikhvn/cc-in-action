import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge, getToolLabel } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

// --- getToolLabel unit tests ---

test("getToolLabel: str_replace_editor create", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "/src/App.jsx" })).toBe("Creating App.jsx");
});

test("getToolLabel: str_replace_editor str_replace", () => {
  expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "/src/components/Button.tsx" })).toBe("Editing Button.tsx");
});

test("getToolLabel: str_replace_editor insert", () => {
  expect(getToolLabel("str_replace_editor", { command: "insert", path: "/src/App.jsx" })).toBe("Editing App.jsx");
});

test("getToolLabel: str_replace_editor view", () => {
  expect(getToolLabel("str_replace_editor", { command: "view", path: "/src/App.jsx" })).toBe("Reading App.jsx");
});

test("getToolLabel: file_manager rename", () => {
  expect(
    getToolLabel("file_manager", { command: "rename", path: "/src/Old.tsx", new_path: "/src/New.tsx" })
  ).toBe("Renaming Old.tsx → New.tsx");
});

test("getToolLabel: file_manager delete", () => {
  expect(getToolLabel("file_manager", { command: "delete", path: "/src/Unused.tsx" })).toBe("Deleting Unused.tsx");
});

test("getToolLabel: unknown tool falls back to tool name", () => {
  expect(getToolLabel("some_other_tool", {})).toBe("some_other_tool");
});

// --- ToolCallBadge rendering tests ---

test("shows label and green dot when state is result", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="result"
    />
  );

  expect(screen.getByText("Creating App.jsx")).toBeDefined();
  const dot = document.querySelector(".bg-emerald-500");
  expect(dot).toBeTruthy();
});

test("shows label and spinner when state is call", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "str_replace", path: "/src/Card.tsx" }}
      state="call"
    />
  );

  expect(screen.getByText("Editing Card.tsx")).toBeDefined();
  const spinner = document.querySelector(".animate-spin");
  expect(spinner).toBeTruthy();
});

test("shows spinner when state is partial-call", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/src/Form.tsx" }}
      state="partial-call"
    />
  );

  const spinner = document.querySelector(".animate-spin");
  expect(spinner).toBeTruthy();
});

test("renders file_manager delete label", () => {
  render(
    <ToolCallBadge
      toolName="file_manager"
      args={{ command: "delete", path: "/src/Old.tsx" }}
      state="result"
    />
  );

  expect(screen.getByText("Deleting Old.tsx")).toBeDefined();
});
