/**
 * @module components/modules/ProjectKickstart.test
 * @description Unit tests for ProjectKickstart component
 *
 * PURPOSE:
 * - Test kickstart form rendering and validation
 * - Test feature list add/remove functionality
 * - Test tech stack dropdown interactions
 * - Test prompt generation flow
 * - Test CLAUDE.md creation flow
 *
 * DEPENDENCIES:
 * - vitest - Test framework
 * - @testing-library/react - Component rendering and queries
 * - @testing-library/user-event - User interaction simulation
 *
 * EXPORTS:
 * - None (test file)
 *
 * PATTERNS:
 * - Mock @/lib/tauri for generateKickstartPrompt and generateKickstartClaudeMd
 * - Mock @/stores/projectStore for activeProject
 * - Mock navigator.clipboard.writeText for copy functionality
 * - Use userEvent for form interactions
 *
 * CLAUDE NOTES:
 * - Required fields: appPurpose, targetUsers, at least one feature, language
 * - Optional fields: framework, database, styling, constraints
 * - Features list starts with one empty input
 * - Framework dropdown depends on selected language
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectKickstart } from "./ProjectKickstart";

// Helper to get select elements by their label text (since labels aren't properly associated)
function getSelectByLabelText(labelText: RegExp | string): HTMLSelectElement {
  // Find the label element
  const labels = screen.getAllByText(labelText);
  // Find the closest select element in the same container
  for (const label of labels) {
    const container = label.closest("div");
    const select = container?.querySelector("select");
    if (select) return select as HTMLSelectElement;
  }
  throw new Error(`Could not find select for label: ${labelText}`);
}

// Mock the tauri lib
const mockGenerateKickstartPrompt = vi.fn();
const mockGenerateKickstartClaudeMd = vi.fn();
const mockInferTechStack = vi.fn();

vi.mock("@/lib/tauri", () => ({
  generateKickstartPrompt: (...args: unknown[]) => mockGenerateKickstartPrompt(...args),
  generateKickstartClaudeMd: (...args: unknown[]) => mockGenerateKickstartClaudeMd(...args),
  inferTechStack: (...args: unknown[]) => mockInferTechStack(...args),
}));

// Mock the project store
const mockActiveProject = {
  id: "test-project-id",
  name: "Test Project",
  path: "/test/project/path",
  description: "A test project",
  projectType: "Web App",
  language: "TypeScript",
  framework: "React",
  database: null,
  testing: "Vitest",
  styling: "Tailwind CSS",
  stackExtras: null,
  healthScore: 50,
  createdAt: "2024-01-01T00:00:00Z",
};

vi.mock("@/stores/projectStore", () => ({
  useProjectStore: vi.fn((selector) =>
    selector({ activeProject: mockActiveProject })
  ),
}));

// Import after mock
import { useProjectStore } from "@/stores/projectStore";

// Mock clipboard API
const mockWriteText = vi.fn();

describe("ProjectKickstart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default mock state
    vi.mocked(useProjectStore).mockImplementation((selector) =>
      selector({ activeProject: mockActiveProject } as ReturnType<typeof useProjectStore.getState>)
    );
    mockGenerateKickstartPrompt.mockResolvedValue({
      fullPrompt: "# Generated Kickstart Prompt\n\nThis is a test prompt.",
      tokenEstimate: 1500,
    });
    mockGenerateKickstartClaudeMd.mockResolvedValue("CLAUDE.md created successfully");
    mockInferTechStack.mockResolvedValue({
      language: null,
      framework: { value: "React", reason: "Best for web apps", confidence: "high" },
      database: { value: "PostgreSQL", reason: "Reliable and scalable", confidence: "medium" },
      styling: { value: "Tailwind CSS", reason: "Utility-first CSS", confidence: "high" },
      warnings: [],
    });
    // Setup clipboard mock
    mockWriteText.mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: mockWriteText,
      },
    });
  });

  describe("Initial Render", () => {
    it("should render header with project name if active project exists", () => {
      render(<ProjectKickstart />);

      expect(screen.getByText("Project Kickstart")).toBeInTheDocument();
      expect(screen.getByText(/Generate a Claude Code kickstart prompt for Test Project/)).toBeInTheDocument();
    });

    it("should render header without project name if no active project", () => {
      vi.mocked(useProjectStore).mockImplementation((selector) =>
        selector({ activeProject: null } as ReturnType<typeof useProjectStore.getState>)
      );

      render(<ProjectKickstart />);

      expect(screen.getByText(/Generate a Claude Code kickstart prompt for your new project/)).toBeInTheDocument();
    });

    it("should render App Basics section with required fields", () => {
      render(<ProjectKickstart />);

      expect(screen.getByText("App Basics")).toBeInTheDocument();
      expect(screen.getByText("What does your app do?")).toBeInTheDocument();
      expect(screen.getByText("Who are the target users?")).toBeInTheDocument();
      // Check for required indicators
      const requiredIndicators = screen.getAllByText("*");
      expect(requiredIndicators.length).toBeGreaterThanOrEqual(3); // appPurpose, targetUsers, language
    });

    it("should render Features section with one empty feature input", () => {
      render(<ProjectKickstart />);

      expect(screen.getByText("Key Features")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Feature 1...")).toBeInTheDocument();
      expect(screen.getByText("Add another feature")).toBeInTheDocument();
    });

    it("should render Tech Stack section with language, framework, database, styling", () => {
      render(<ProjectKickstart />);

      expect(screen.getByText("Tech Stack")).toBeInTheDocument();
      expect(screen.getByText("Language")).toBeInTheDocument();
      expect(screen.getByText("Framework")).toBeInTheDocument();
      expect(screen.getByText("Database")).toBeInTheDocument();
      expect(screen.getByText("Styling")).toBeInTheDocument();
    });

    it("should render Constraints section (optional)", () => {
      render(<ProjectKickstart />);

      expect(screen.getByText("Constraints (Optional)")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Any specific requirements/)).toBeInTheDocument();
    });

    it("should render disabled Generate button initially", () => {
      render(<ProjectKickstart />);

      // Button text depends on stack completeness, match either
      const button = screen.getByRole("button", { name: /(generate kickstart prompt|review & generate)/i });
      expect(button).toBeDisabled();
    });
  });

  describe("Form Validation", () => {
    it("should enable Generate button when required fields are filled", async () => {
      const user = userEvent.setup();
      render(<ProjectKickstart />);

      // Fill required fields
      await user.type(
        screen.getByPlaceholderText(/A task management app/),
        "A note-taking app for developers"
      );
      await user.type(
        screen.getByPlaceholderText(/Small to medium/),
        "Software developers"
      );
      await user.type(screen.getByPlaceholderText("Feature 1..."), "Create notes");

      const languageSelect = getSelectByLabelText(/Language/);
      await user.selectOptions(languageSelect, "TypeScript");

      // Button text depends on stack completeness, match either
      const button = screen.getByRole("button", { name: /(generate kickstart prompt|review & generate)/i });
      expect(button).toBeEnabled();
    });

    it("should require appPurpose, targetUsers, at least one feature, and language", async () => {
      const user = userEvent.setup();
      render(<ProjectKickstart />);

      // Button text depends on stack completeness, match either
      const button = screen.getByRole("button", { name: /(generate kickstart prompt|review & generate)/i });

      // Fill only appPurpose - still disabled
      await user.type(screen.getByPlaceholderText(/A task management app/), "An app");
      expect(button).toBeDisabled();

      // Add targetUsers - still disabled
      await user.type(screen.getByPlaceholderText(/Small to medium/), "Users");
      expect(button).toBeDisabled();

      // Add feature - still disabled
      await user.type(screen.getByPlaceholderText("Feature 1..."), "Feature");
      expect(button).toBeDisabled();

      // Add language - now enabled
      const languageSelect = getSelectByLabelText(/Language/);
      await user.selectOptions(languageSelect, "TypeScript");
      expect(button).toBeEnabled();
    });

    it("should allow proceeding without optional fields (framework, database, styling, constraints)", async () => {
      const user = userEvent.setup();
      render(<ProjectKickstart />);

      // Fill only required fields
      await user.type(screen.getByPlaceholderText(/A task management app/), "An app");
      await user.type(screen.getByPlaceholderText(/Small to medium/), "Users");
      await user.type(screen.getByPlaceholderText("Feature 1..."), "Feature");

      const languageSelect = getSelectByLabelText(/Language/);
      await user.selectOptions(languageSelect, "Python");

      // When stack is incomplete, button says "Review & Generate" (AI will suggest missing fields)
      const button = screen.getByRole("button", { name: /review & generate/i });
      expect(button).toBeEnabled();

      // Clicking it should trigger the review step with AI suggestions
      await user.click(button);

      // Verify we enter the review step where AI provides suggestions
      await waitFor(() => {
        expect(screen.getByText("Review Tech Stack")).toBeInTheDocument();
      });

      // Verify user can see their original language selection
      expect(screen.getByText("Python")).toBeInTheDocument();
    });
  });

  describe("Feature List", () => {
    it("should add new feature input when 'Add another feature' is clicked", async () => {
      const user = userEvent.setup();
      render(<ProjectKickstart />);

      expect(screen.queryByPlaceholderText("Feature 2...")).not.toBeInTheDocument();

      await user.click(screen.getByText("Add another feature"));

      expect(screen.getByPlaceholderText("Feature 2...")).toBeInTheDocument();
    });

    it("should remove feature input when X button is clicked", async () => {
      const user = userEvent.setup();
      render(<ProjectKickstart />);

      // Add a second feature
      await user.click(screen.getByText("Add another feature"));
      expect(screen.getByPlaceholderText("Feature 2...")).toBeInTheDocument();

      // Remove buttons should now be visible (there are 2 features)
      const removeButtons = screen.getAllByRole("button").filter(
        (btn) => btn.querySelector('svg path[d*="M6 18L18 6"]')
      );
      expect(removeButtons.length).toBe(2);

      // Click the first remove button
      await user.click(removeButtons[0]);

      // Should only have Feature 1 placeholder now (which shows as Feature 1 after removal)
      const featureInputs = screen.getAllByPlaceholderText(/Feature \d\.\.\./);
      expect(featureInputs.length).toBe(1);
    });

    it("should not allow removing the last feature input", () => {
      render(<ProjectKickstart />);

      // With only one feature, there should be no remove button
      const removeButtons = screen.queryAllByRole("button").filter(
        (btn) => btn.querySelector('svg path[d*="M6 18L18 6"]')
      );
      expect(removeButtons.length).toBe(0);
    });

    it("should update feature value on input change", async () => {
      const user = userEvent.setup();
      render(<ProjectKickstart />);

      const featureInput = screen.getByPlaceholderText("Feature 1...");
      await user.type(featureInput, "User authentication");

      expect(featureInput).toHaveValue("User authentication");
    });
  });

  describe("Tech Stack Dropdowns", () => {
    it("should populate framework dropdown based on selected language", async () => {
      const user = userEvent.setup();
      render(<ProjectKickstart />);

      // Select TypeScript
      const languageSelect = getSelectByLabelText(/Language/);
      await user.selectOptions(languageSelect, "TypeScript");

      // Framework dropdown should have TypeScript frameworks
      const frameworkSelect = getSelectByLabelText(/Framework/);
      expect(frameworkSelect).toBeEnabled();

      // Check that React is an option
      const options = Array.from(frameworkSelect.options);
      const reactOption = options.find((opt) => opt.value === "React");
      expect(reactOption).toBeDefined();
    });

    it("should reset framework when language changes to incompatible option", async () => {
      const user = userEvent.setup();
      render(<ProjectKickstart />);

      // Select TypeScript and React
      const languageSelect = getSelectByLabelText(/Language/);
      await user.selectOptions(languageSelect, "TypeScript");

      const frameworkSelect = getSelectByLabelText(/Framework/);
      await user.selectOptions(frameworkSelect, "React");

      // Change language to Go (which doesn't have React)
      await user.selectOptions(languageSelect, "Go");

      // Framework should be reset
      expect(frameworkSelect).toHaveValue("");
    });

    it("should show 'Select language first...' when no language selected", () => {
      render(<ProjectKickstart />);

      const frameworkSelect = getSelectByLabelText(/Framework/);
      expect(frameworkSelect).toBeDisabled();

      const options = Array.from(frameworkSelect.options);
      const selectLanguageOption = options.find((opt) => opt.text.toLowerCase().includes("select language first"));
      expect(selectLanguageOption).toBeDefined();
    });
  });

  describe("Prompt Generation", () => {
    async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
      await user.type(screen.getByPlaceholderText(/A task management app/), "A note app");
      await user.type(screen.getByPlaceholderText(/Small to medium/), "Developers");
      await user.type(screen.getByPlaceholderText("Feature 1..."), "Create notes");
      const languageSelect = getSelectByLabelText(/Language/);
      await user.selectOptions(languageSelect, "TypeScript");
      // Fill all tech stack fields to skip review step
      const frameworkSelect = getSelectByLabelText(/Framework/);
      await user.selectOptions(frameworkSelect, "React");
      const databaseSelect = getSelectByLabelText(/Database/);
      await user.selectOptions(databaseSelect, "PostgreSQL");
      const stylingSelect = getSelectByLabelText(/Styling/);
      await user.selectOptions(stylingSelect, "Tailwind CSS");
    }

    it("should call generateKickstartPrompt with correct input on Generate click", async () => {
      const user = userEvent.setup();
      render(<ProjectKickstart />);

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: /generate kickstart prompt/i }));

      await waitFor(() => {
        expect(mockGenerateKickstartPrompt).toHaveBeenCalledWith({
          appPurpose: "A note app",
          targetUsers: "Developers",
          keyFeatures: ["Create notes"],
          techPreferences: {
            language: "TypeScript",
            framework: "React",
            database: "PostgreSQL",
            styling: "Tailwind CSS",
          },
          constraints: undefined,
        });
      });
    });

    it("should show loading spinner during generation", async () => {
      const user = userEvent.setup();
      let resolveGeneration: (value: unknown) => void;
      mockGenerateKickstartPrompt.mockImplementation(
        () => new Promise((resolve) => { resolveGeneration = resolve; })
      );

      render(<ProjectKickstart />);

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: /generate kickstart prompt/i }));

      expect(screen.getByText(/generating/i)).toBeInTheDocument();

      // Cleanup
      resolveGeneration!({ fullPrompt: "test", tokenEstimate: 100 });
    });

    it("should display generated prompt in result view", async () => {
      const user = userEvent.setup();
      mockGenerateKickstartPrompt.mockResolvedValue({
        fullPrompt: "# My Generated Prompt\n\nThis is the content.",
        tokenEstimate: 2000,
      });

      render(<ProjectKickstart />);

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: /generate kickstart prompt/i }));

      await waitFor(() => {
        expect(screen.getByText("Generated Prompt")).toBeInTheDocument();
        expect(screen.getByText(/# My Generated Prompt/)).toBeInTheDocument();
      });
    });

    it("should show token estimate badge", async () => {
      const user = userEvent.setup();
      mockGenerateKickstartPrompt.mockResolvedValue({
        fullPrompt: "test",
        tokenEstimate: 1500,
      });

      render(<ProjectKickstart />);

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: /generate kickstart prompt/i }));

      await waitFor(() => {
        expect(screen.getByText(/~1,500 tokens/)).toBeInTheDocument();
      });
    });

    it("should copy prompt to clipboard when Copy is clicked", async () => {
      // Setup clipboard with userEvent
      const user = userEvent.setup({
        writeToClipboard: true,
      });
      mockGenerateKickstartPrompt.mockResolvedValue({
        fullPrompt: "# Prompt to copy",
        tokenEstimate: 100,
      });

      render(<ProjectKickstart />);

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: /generate kickstart prompt/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
      });

      // Click copy button
      const copyButton = screen.getByRole("button", { name: /copy/i });
      await user.click(copyButton);

      // After successful copy, button should show "Copied!" text
      await waitFor(() => {
        expect(screen.getByText("Copied!")).toBeInTheDocument();
      });
    });

    it("should return to form when Edit is clicked", async () => {
      const user = userEvent.setup();
      render(<ProjectKickstart />);

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: /generate kickstart prompt/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /edit/i }));

      // Should be back to form
      expect(screen.getByText("App Basics")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /generate kickstart prompt/i })).toBeInTheDocument();
    });

    it("should show error message when generation fails", async () => {
      const user = userEvent.setup();
      mockGenerateKickstartPrompt.mockRejectedValue(new Error("API error occurred"));

      render(<ProjectKickstart />);

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: /generate kickstart prompt/i }));

      await waitFor(() => {
        expect(screen.getByText("API error occurred")).toBeInTheDocument();
      });
    });
  });

  describe("Create CLAUDE.md", () => {
    async function fillAndGenerate(user: ReturnType<typeof userEvent.setup>) {
      await user.type(screen.getByPlaceholderText(/A task management app/), "A note app");
      await user.type(screen.getByPlaceholderText(/Small to medium/), "Developers");
      await user.type(screen.getByPlaceholderText("Feature 1..."), "Create notes");
      const languageSelect = getSelectByLabelText(/Language/);
      await user.selectOptions(languageSelect, "TypeScript");
      // Fill all tech stack fields to skip review step
      const frameworkSelect = getSelectByLabelText(/Framework/);
      await user.selectOptions(frameworkSelect, "React");
      const databaseSelect = getSelectByLabelText(/Database/);
      await user.selectOptions(databaseSelect, "PostgreSQL");
      const stylingSelect = getSelectByLabelText(/Styling/);
      await user.selectOptions(stylingSelect, "Tailwind CSS");
      await user.click(screen.getByRole("button", { name: /generate kickstart prompt/i }));
    }

    it("should show 'Create CLAUDE.md' card after prompt is generated", async () => {
      const user = userEvent.setup();
      render(<ProjectKickstart />);

      await fillAndGenerate(user);

      await waitFor(() => {
        expect(screen.getByText("Create Initial CLAUDE.md")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /create claude\.md/i })).toBeInTheDocument();
      });
    });

    it("should call generateKickstartClaudeMd when button is clicked", async () => {
      const user = userEvent.setup();
      render(<ProjectKickstart />);

      await fillAndGenerate(user);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /create claude\.md/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /create claude\.md/i }));

      await waitFor(() => {
        expect(mockGenerateKickstartClaudeMd).toHaveBeenCalledWith(
          expect.objectContaining({
            appPurpose: "A note app",
            targetUsers: "Developers",
            keyFeatures: ["Create notes"],
            techPreferences: {
              language: "TypeScript",
              framework: "React",
              database: "PostgreSQL",
              styling: "Tailwind CSS",
            },
          }),
          "/test/project/path"
        );
      });
    });

    it("should show loading state during CLAUDE.md creation", async () => {
      const user = userEvent.setup();
      let resolveCreation: (value: string) => void;
      mockGenerateKickstartClaudeMd.mockImplementation(
        () => new Promise<string>((resolve) => { resolveCreation = resolve; })
      );

      render(<ProjectKickstart />);

      await fillAndGenerate(user);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /create claude\.md/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /create claude\.md/i }));

      expect(screen.getByText(/creating/i)).toBeInTheDocument();

      // Cleanup
      resolveCreation!("done");
    });

    it("should show success state when CLAUDE.md is created", async () => {
      const user = userEvent.setup();
      render(<ProjectKickstart />);

      await fillAndGenerate(user);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /create claude\.md/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /create claude\.md/i }));

      await waitFor(() => {
        expect(screen.getByText("CLAUDE.md Created")).toBeInTheDocument();
        expect(screen.getByText(/Your initial CLAUDE.md has been saved/)).toBeInTheDocument();
      });
    });

    it("should show error message when creation fails", async () => {
      const user = userEvent.setup();
      mockGenerateKickstartClaudeMd.mockRejectedValue(new Error("Failed to write file"));

      render(<ProjectKickstart />);

      await fillAndGenerate(user);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /create claude\.md/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /create claude\.md/i }));

      await waitFor(() => {
        expect(screen.getByText("Failed to write file")).toBeInTheDocument();
      });
    });
  });
});
