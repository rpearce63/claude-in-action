import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuth } from "@/hooks/use-auth";

// Mock dependencies
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
vi.mock("@/actions", () => ({
  signIn: (...args: any[]) => mockSignIn(...args),
  signUp: (...args: any[]) => mockSignUp(...args),
}));

const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

const mockGetProjects = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: (...args: any[]) => mockGetProjects(...args),
}));

const mockCreateProject = vi.fn();
vi.mock("@/actions/create-project", () => ({
  createProject: (...args: any[]) => mockCreateProject(...args),
}));

// Test component that exposes the hook's API
function TestComponent({
  onResult,
  onError,
}: {
  onResult?: (result: any) => void;
  onError?: (error: any) => void;
}) {
  const { signIn, signUp, isLoading } = useAuth();

  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <button
        data-testid="sign-in"
        onClick={async () => {
          try {
            const result = await signIn("test@example.com", "password123");
            onResult?.(result);
          } catch (e) {
            onError?.(e);
          }
        }}
      />
      <button
        data-testid="sign-up"
        onClick={async () => {
          try {
            const result = await signUp("test@example.com", "password123");
            onResult?.(result);
          } catch (e) {
            onError?.(e);
          }
        }}
      />
    </div>
  );
}

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "new-project-id" });
  });

  afterEach(() => {
    cleanup();
  });

  describe("initial state", () => {
    test("isLoading is false initially", () => {
      render(<TestComponent />);
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });
  });

  describe("signIn", () => {
    test("returns result from signIn action on success", async () => {
      const user = userEvent.setup();
      const onResult = vi.fn();
      mockSignIn.mockResolvedValue({ success: true });

      render(<TestComponent onResult={onResult} />);
      await user.click(screen.getByTestId("sign-in"));

      expect(mockSignIn).toHaveBeenCalledWith("test@example.com", "password123");
      expect(onResult).toHaveBeenCalledWith({ success: true });
    });

    test("returns result from signIn action on failure", async () => {
      const user = userEvent.setup();
      const onResult = vi.fn();
      mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

      render(<TestComponent onResult={onResult} />);
      await user.click(screen.getByTestId("sign-in"));

      expect(onResult).toHaveBeenCalledWith({
        success: false,
        error: "Invalid credentials",
      });
    });

    test("does not navigate on failed signIn", async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

      render(<TestComponent />);
      await user.click(screen.getByTestId("sign-in"));

      expect(mockPush).not.toHaveBeenCalled();
    });

    test("sets isLoading during signIn and resets after", async () => {
      let resolveSignIn: (value: any) => void;
      mockSignIn.mockReturnValue(
        new Promise((resolve) => {
          resolveSignIn = resolve;
        })
      );

      render(<TestComponent />);
      expect(screen.getByTestId("loading").textContent).toBe("false");

      // Start sign in
      await act(async () => {
        screen.getByTestId("sign-in").click();
        // Let the microtask for setIsLoading(true) run
        await Promise.resolve();
      });

      expect(screen.getByTestId("loading").textContent).toBe("true");

      // Complete sign in
      await act(async () => {
        resolveSignIn!({ success: false });
      });

      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    test("resets isLoading even when signIn action throws", async () => {
      const user = userEvent.setup();
      const onError = vi.fn();
      mockSignIn.mockRejectedValue(new Error("Network error"));

      render(<TestComponent onError={onError} />);
      await user.click(screen.getByTestId("sign-in"));

      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "Network error" }));
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });
  });

  describe("signUp", () => {
    test("returns result from signUp action on success", async () => {
      const user = userEvent.setup();
      const onResult = vi.fn();
      mockSignUp.mockResolvedValue({ success: true });

      render(<TestComponent onResult={onResult} />);
      await user.click(screen.getByTestId("sign-up"));

      expect(mockSignUp).toHaveBeenCalledWith("test@example.com", "password123");
      expect(onResult).toHaveBeenCalledWith({ success: true });
    });

    test("returns result from signUp action on failure", async () => {
      const user = userEvent.setup();
      const onResult = vi.fn();
      mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

      render(<TestComponent onResult={onResult} />);
      await user.click(screen.getByTestId("sign-up"));

      expect(onResult).toHaveBeenCalledWith({
        success: false,
        error: "Email already registered",
      });
    });

    test("does not navigate on failed signUp", async () => {
      const user = userEvent.setup();
      mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

      render(<TestComponent />);
      await user.click(screen.getByTestId("sign-up"));

      expect(mockPush).not.toHaveBeenCalled();
    });

    test("resets isLoading even when signUp action throws", async () => {
      const user = userEvent.setup();
      const onError = vi.fn();
      mockSignUp.mockRejectedValue(new Error("Network error"));

      render(<TestComponent onError={onError} />);
      await user.click(screen.getByTestId("sign-up"));

      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "Network error" }));
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });
  });

  describe("post-signIn flow with anonymous work", () => {
    test("creates project from anon work and navigates to it", async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ id: "1", role: "user", content: "Hello" }],
        fileSystemData: { "/App.tsx": { type: "file", content: "code" } },
      });
      mockCreateProject.mockResolvedValue({ id: "anon-project-id" });

      render(<TestComponent />);
      await user.click(screen.getByTestId("sign-in"));

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringContaining("Design from"),
        messages: [{ id: "1", role: "user", content: "Hello" }],
        data: { "/App.tsx": { type: "file", content: "code" } },
      });
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
    });

    test("clears anon work after migrating", async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ id: "1", role: "user", content: "test" }],
        fileSystemData: {},
      });
      mockCreateProject.mockResolvedValue({ id: "proj-1" });

      render(<TestComponent />);
      await user.click(screen.getByTestId("sign-in"));

      expect(mockClearAnonWork).toHaveBeenCalled();
    });

    test("skips anon work when messages array is empty", async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({
        messages: [],
        fileSystemData: {},
      });
      mockGetProjects.mockResolvedValue([{ id: "existing-id" }]);

      render(<TestComponent />);
      await user.click(screen.getByTestId("sign-in"));

      // Should not create project from anon work
      expect(mockClearAnonWork).not.toHaveBeenCalled();
      // Should fall through to existing projects
      expect(mockPush).toHaveBeenCalledWith("/existing-id");
    });

    test("skips anon work when getAnonWorkData returns null", async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "existing-id" }]);

      render(<TestComponent />);
      await user.click(screen.getByTestId("sign-in"));

      expect(mockClearAnonWork).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/existing-id");
    });
  });

  describe("post-signIn flow with existing projects", () => {
    test("navigates to most recent project", async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([
        { id: "recent-project" },
        { id: "older-project" },
      ]);

      render(<TestComponent />);
      await user.click(screen.getByTestId("sign-in"));

      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/recent-project");
    });

    test("does not create a new project when existing ones are found", async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([{ id: "existing-id" }]);

      render(<TestComponent />);
      await user.click(screen.getByTestId("sign-in"));

      expect(mockCreateProject).not.toHaveBeenCalled();
    });
  });

  describe("post-signIn flow with no projects", () => {
    test("creates a new project and navigates to it", async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "brand-new-project" });

      render(<TestComponent />);
      await user.click(screen.getByTestId("sign-in"));

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #\d+$/),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith("/brand-new-project");
    });
  });

  describe("post-signUp flow", () => {
    test("runs the same post-auth flow after signUp", async () => {
      const user = userEvent.setup();
      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ id: "1", role: "user", content: "Hello" }],
        fileSystemData: {},
      });
      mockCreateProject.mockResolvedValue({ id: "signup-project" });

      render(<TestComponent />);
      await user.click(screen.getByTestId("sign-up"));

      expect(mockCreateProject).toHaveBeenCalled();
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/signup-project");
    });

    test("navigates to existing project after signUp when no anon work", async () => {
      const user = userEvent.setup();
      mockSignUp.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([{ id: "existing-after-signup" }]);

      render(<TestComponent />);
      await user.click(screen.getByTestId("sign-up"));

      expect(mockPush).toHaveBeenCalledWith("/existing-after-signup");
    });
  });
});
