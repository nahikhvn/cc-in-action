import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("starts with isLoading false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  test("exposes signIn, signUp, and isLoading", () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
    expect(typeof result.current.isLoading).toBe("boolean");
  });

  describe("signIn", () => {
    test("sets isLoading true during request and false after", async () => {
      let resolveSignIn!: (value: any) => void;
      const pendingSignIn = new Promise((resolve) => {
        resolveSignIn = resolve;
      });
      vi.mocked(signInAction).mockReturnValue(pendingSignIn as any);

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.signIn("user@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignIn({ success: false, error: "Invalid credentials" });
        await pendingSignIn;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns the result from the action", async () => {
      const mockResult = { success: false, error: "Invalid credentials" };
      vi.mocked(signInAction).mockResolvedValue(mockResult);
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([]);
      vi.mocked(createProject).mockResolvedValue({ id: "proj-1" } as any);

      const { result } = renderHook(() => useAuth());
      let returnedResult: any;

      await act(async () => {
        returnedResult = await result.current.signIn("user@example.com", "password123");
      });

      expect(returnedResult).toEqual(mockResult);
    });

    test("does not call handlePostSignIn on failure", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: false, error: "Bad creds" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "wrong");
      });

      expect(getAnonWorkData).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("resets isLoading to false even when action throws", async () => {
      vi.mocked(signInAction).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    test("sets isLoading true during request and false after", async () => {
      let resolveSignUp!: (value: any) => void;
      const pendingSignUp = new Promise((resolve) => {
        resolveSignUp = resolve;
      });
      vi.mocked(signUpAction).mockReturnValue(pendingSignUp as any);

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.signUp("user@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignUp({ success: false, error: "Email taken" });
        await pendingSignUp;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns the result from the action", async () => {
      const mockResult = { success: false, error: "Email already registered" };
      vi.mocked(signUpAction).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useAuth());
      let returnedResult: any;

      await act(async () => {
        returnedResult = await result.current.signUp("user@example.com", "password123");
      });

      expect(returnedResult).toEqual(mockResult);
    });

    test("does not call handlePostSignIn on failure", async () => {
      vi.mocked(signUpAction).mockResolvedValue({ success: false, error: "Email taken" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("user@example.com", "password123");
      });

      expect(getAnonWorkData).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("resets isLoading to false even when action throws", async () => {
      vi.mocked(signUpAction).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("user@example.com", "password123").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("handlePostSignIn — anonymous work exists", () => {
    const anonWork = {
      messages: [{ id: "1", role: "user", content: "Hello" }],
      fileSystemData: { "/App.jsx": { type: "file", content: "..." } },
    };

    beforeEach(() => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(anonWork);
      vi.mocked(createProject).mockResolvedValue({ id: "anon-proj-99" } as any);
    });

    test("creates a project with anon work data and redirects", async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: anonWork.messages,
          data: anonWork.fileSystemData,
        })
      );
      expect(mockPush).toHaveBeenCalledWith("/anon-proj-99");
    });

    test("clears anon work after saving it", async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(clearAnonWork).toHaveBeenCalled();
    });

    test("does not fetch existing projects when anon work exists", async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(getProjects).not.toHaveBeenCalled();
    });
  });

  describe("handlePostSignIn — no anonymous work, existing projects", () => {
    const projects = [
      { id: "proj-latest", name: "Latest", createdAt: new Date(), updatedAt: new Date() },
      { id: "proj-older", name: "Older", createdAt: new Date(), updatedAt: new Date() },
    ];

    beforeEach(() => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue(projects as any);
    });

    test("redirects to the most recent project", async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/proj-latest");
    });

    test("does not create a new project", async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(createProject).not.toHaveBeenCalled();
    });
  });

  describe("handlePostSignIn — no anonymous work, no existing projects", () => {
    beforeEach(() => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([]);
      vi.mocked(createProject).mockResolvedValue({ id: "brand-new-proj" } as any);
    });

    test("creates a new project and redirects to it", async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [],
          data: {},
        })
      );
      expect(mockPush).toHaveBeenCalledWith("/brand-new-proj");
    });
  });

  describe("handlePostSignIn — anon work with empty messages is ignored", () => {
    beforeEach(() => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue({ messages: [], fileSystemData: {} });
      vi.mocked(getProjects).mockResolvedValue([
        { id: "existing-proj" } as any,
      ]);
    });

    test("falls through to existing projects when anon messages are empty", async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(createProject).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/existing-proj");
    });
  });

  describe("signUp triggers the same post-sign-in flow", () => {
    beforeEach(() => {
      vi.mocked(signUpAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([{ id: "signup-proj" } as any]);
    });

    test("redirects after successful signUp", async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("newuser@example.com", "securepass");
      });

      expect(mockPush).toHaveBeenCalledWith("/signup-proj");
    });
  });
});
