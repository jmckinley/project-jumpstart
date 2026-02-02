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
 * - Test review step with layered tech stack UI
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
 * - Mock @/lib/tauri for generateKickstartPrompt, generateKickstartClaudeMd, inferTechStack
 * - Mock @/stores/projectStore for activeProject
 * - Mock navigator.clipboard.writeText for copy functionality
 * - Use userEvent for form interactions
 * - goToReviewStep helper navigates to "Suggested Tech Stack" step
 *
 * CLAUDE NOTES:
 * - Required fields: appPurpose, targetUsers, at least one feature (language is optional)
 * - Optional fields: framework, database, styling, constraints
 * - Features list starts with one empty input
 * - Framework dropdown depends on selected language
 * - Review step uses layered UI with Core, Data, UI sections
 * - "Accept & Generate" button replaces old "Accept Suggestions" + "Generate" flow
 * - "Regenerate" button calls inferTechStack again for alternative suggestions
 * - "Additional Technologies" input allows adding extra tech to constraints
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
      // Check for required indicators (appPurpose and targetUsers only - language is optional)
      const requiredIndicators = screen.getAllByText("*");
      expect(requiredIndicators.length).toBeGreaterThanOrEqual(2); // appPurpose, targetUsers
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

    it("should require appPurpose, targetUsers, and at least one feature (language is optional)", async () => {
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

      // Add feature - now enabled (language is optional, AI will suggest)
      await user.type(screen.getByPlaceholderText("Feature 1..."), "Feature");
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
        expect(screen.getByText("Suggested Tech Stack")).toBeInTheDocument();
      });

      // Verify user can see their original language selection
      expect(screen.getByDisplayValue("Python")).toBeInTheDocument();
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

    it("should return to form when Start Over is clicked", async () => {
      const user = userEvent.setup();
      render(<ProjectKickstart />);

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: /generate kickstart prompt/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /start over/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /start over/i }));

      // Should be back to form
      expect(screen.getByText("App Basics")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /generate kickstart prompt/i })).toBeInTheDocument();
    });

    it("should allow editing the generated prompt when Edit is clicked", async () => {
      const user = userEvent.setup();
      mockGenerateKickstartPrompt.mockResolvedValue({
        fullPrompt: "# Original Prompt",
        tokenEstimate: 100,
      });

      render(<ProjectKickstart />);

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: /generate kickstart prompt/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /^edit$/i })).toBeInTheDocument();
      });

      // Click Edit to enter edit mode
      await user.click(screen.getByRole("button", { name: /^edit$/i }));

      // Should show textarea for editing
      const textarea = screen.getByRole("textbox");
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue("# Original Prompt");

      // Button should now say "Done"
      expect(screen.getByRole("button", { name: /done/i })).toBeInTheDocument();
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

  describe("Automatic CLAUDE.md Creation", () => {
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

    it("should automatically call generateKickstartClaudeMd after prompt generation", async () => {
      const user = userEvent.setup();
      render(<ProjectKickstart />);

      await fillAndGenerate(user);

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

    it("should show success state when CLAUDE.md is created automatically", async () => {
      const user = userEvent.setup();
      render(<ProjectKickstart />);

      await fillAndGenerate(user);

      await waitFor(() => {
        expect(screen.getByText(/CLAUDE\.md has been created/i)).toBeInTheDocument();
      });
    });

    it("should not fail prompt generation if CLAUDE.md creation fails", async () => {
      const user = userEvent.setup();
      mockGenerateKickstartClaudeMd.mockRejectedValue(new Error("Failed to write file"));

      render(<ProjectKickstart />);

      await fillAndGenerate(user);

      // Prompt should still be displayed even if CLAUDE.md creation failed
      await waitFor(() => {
        expect(screen.getByText("Generated Prompt")).toBeInTheDocument();
      });
    });
  });

  describe("Tech Stack Inference", () => {
    async function fillRequiredFieldsWithIncompleteStack(user: ReturnType<typeof userEvent.setup>) {
      await user.type(screen.getByPlaceholderText(/A task management app/), "A note app");
      await user.type(screen.getByPlaceholderText(/Small to medium/), "Developers");
      await user.type(screen.getByPlaceholderText("Feature 1..."), "Create notes");
      const languageSelect = getSelectByLabelText(/Language/);
      await user.selectOptions(languageSelect, "TypeScript");
      // Don't fill framework, database, or styling - leave stack incomplete
    }

    it("should call inferTechStack when stack is incomplete", async () => {
      const user = userEvent.setup();
      render(<ProjectKickstart />);

      await fillRequiredFieldsWithIncompleteStack(user);
      await user.click(screen.getByRole("button", { name: /review & generate/i }));

      await waitFor(() => {
        expect(mockInferTechStack).toHaveBeenCalledWith({
          appPurpose: "A note app",
          targetUsers: "Developers",
          keyFeatures: ["Create notes"],
          constraints: undefined,
          currentLanguage: "TypeScript",
          currentFramework: undefined,
          currentDatabase: undefined,
          currentStyling: undefined,
        });
      });
    });

    it("should show loading state during inference", async () => {
      const user = userEvent.setup();
      let resolveInference: (value: unknown) => void;
      mockInferTechStack.mockImplementation(
        () => new Promise((resolve) => { resolveInference = resolve; })
      );

      render(<ProjectKickstart />);

      await fillRequiredFieldsWithIncompleteStack(user);
      await user.click(screen.getByRole("button", { name: /review & generate/i }));

      expect(screen.getByText("Analyzing...")).toBeInTheDocument();

      // Cleanup
      resolveInference!({
        language: null,
        framework: { value: "React", reason: "Test", confidence: "high" },
        database: null,
        styling: null,
        warnings: [],
      });
    });

    it("should transition to review step after inference completes", async () => {
      const user = userEvent.setup();
      render(<ProjectKickstart />);

      await fillRequiredFieldsWithIncompleteStack(user);
      await user.click(screen.getByRole("button", { name: /review & generate/i }));

      await waitFor(() => {
        expect(screen.getByText("Suggested Tech Stack")).toBeInTheDocument();
      });
    });

    it("should handle inference error gracefully", async () => {
      const user = userEvent.setup();
      mockInferTechStack.mockRejectedValue(new Error("API error"));

      render(<ProjectKickstart />);

      await fillRequiredFieldsWithIncompleteStack(user);
      await user.click(screen.getByRole("button", { name: /review & generate/i }));

      await waitFor(() => {
        expect(screen.getByText("API error")).toBeInTheDocument();
      });
    });

    it("should include constraints in inference input when provided", async () => {
      const user = userEvent.setup();
      render(<ProjectKickstart />);

      await fillRequiredFieldsWithIncompleteStack(user);
      await user.type(
        screen.getByPlaceholderText(/Any specific requirements/),
        "Must be offline-first"
      );
      await user.click(screen.getByRole("button", { name: /review & generate/i }));

      await waitFor(() => {
        expect(mockInferTechStack).toHaveBeenCalledWith(
          expect.objectContaining({
            constraints: "Must be offline-first",
          })
        );
      });
    });
  });

  describe("Review Step", () => {
    async function goToReviewStep(user: ReturnType<typeof userEvent.setup>) {
      await user.type(screen.getByPlaceholderText(/A task management app/), "A note app");
      await user.type(screen.getByPlaceholderText(/Small to medium/), "Developers");
      await user.type(screen.getByPlaceholderText("Feature 1..."), "Create notes");
      const languageSelect = getSelectByLabelText(/Language/);
      await user.selectOptions(languageSelect, "TypeScript");
      // Don't fill optional fields to trigger review step
      await user.click(screen.getByRole("button", { name: /review & generate/i }));
      await waitFor(() => {
        expect(screen.getByText("Suggested Tech Stack")).toBeInTheDocument();
      });
    }

    describe("Rendering", () => {
      it("should show layered tech stack UI with Core, Data, and UI sections", async () => {
        const user = userEvent.setup();
        render(<ProjectKickstart />);

        await goToReviewStep(user);

        // Should show layer headings
        expect(screen.getByText("Core")).toBeInTheDocument();
        expect(screen.getByText("Data")).toBeInTheDocument();
        expect(screen.getByText("UI")).toBeInTheDocument();
      });

      it("should show reasoning for suggestions when value matches", async () => {
        const user = userEvent.setup();
        mockInferTechStack.mockResolvedValue({
          language: null,
          framework: { value: "React", reason: "Best for interactive UIs", confidence: "high" },
          database: null,
          styling: null,
          warnings: [],
        });

        render(<ProjectKickstart />);

        await goToReviewStep(user);

        expect(screen.getByText("Best for interactive UIs")).toBeInTheDocument();
      });

      it("should display AI recommendations if present", async () => {
        const user = userEvent.setup();
        mockInferTechStack.mockResolvedValue({
          language: null,
          framework: { value: "React", reason: "Test", confidence: "high" },
          database: null,
          styling: null,
          warnings: ["Consider using a database for data persistence", "Authentication may be needed"],
        });

        render(<ProjectKickstart />);

        await goToReviewStep(user);

        expect(screen.getByText("AI Recommendations:")).toBeInTheDocument();
        expect(screen.getByText(/Consider using a database for data persistence/)).toBeInTheDocument();
        expect(screen.getByText(/Authentication may be needed/)).toBeInTheDocument();
      });

      it("should show Language, Framework, Database, and Styling labels", async () => {
        const user = userEvent.setup();
        render(<ProjectKickstart />);

        await goToReviewStep(user);

        expect(screen.getByText("Language")).toBeInTheDocument();
        expect(screen.getByText("Framework")).toBeInTheDocument();
        expect(screen.getByText("Database")).toBeInTheDocument();
        expect(screen.getByText("Styling")).toBeInTheDocument();
      });

      it("should show Regenerate button", async () => {
        const user = userEvent.setup();
        render(<ProjectKickstart />);

        await goToReviewStep(user);

        expect(screen.getByRole("button", { name: /regenerate/i })).toBeInTheDocument();
      });

      it("should show Additional Technologies input", async () => {
        const user = userEvent.setup();
        render(<ProjectKickstart />);

        await goToReviewStep(user);

        expect(screen.getByText("Additional Technologies")).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Redis, Docker, AWS S3/)).toBeInTheDocument();
      });

      it("should pre-fill dropdowns with user selections or AI suggestions", async () => {
        const user = userEvent.setup();
        mockInferTechStack.mockResolvedValue({
          language: null,
          framework: { value: "React", reason: "Test", confidence: "high" },
          database: { value: "PostgreSQL", reason: "Test", confidence: "medium" },
          styling: { value: "Tailwind CSS", reason: "Test", confidence: "high" },
          warnings: [],
        });

        render(<ProjectKickstart />);

        await goToReviewStep(user);

        // User selected TypeScript, so it should be pre-filled
        expect(screen.getByDisplayValue("TypeScript")).toBeInTheDocument();
        // AI suggested values should be pre-filled
        expect(screen.getByDisplayValue("React")).toBeInTheDocument();
        expect(screen.getByDisplayValue("PostgreSQL")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Tailwind CSS")).toBeInTheDocument();
      });
    });

    describe("Regenerate", () => {
      it("should call inferTechStack again when Regenerate clicked", async () => {
        const user = userEvent.setup();
        render(<ProjectKickstart />);

        await goToReviewStep(user);

        // Clear mock to track new call
        mockInferTechStack.mockClear();
        mockInferTechStack.mockResolvedValue({
          language: { value: "Python", reason: "Alternative", confidence: "high" },
          framework: { value: "FastAPI", reason: "Fast and modern", confidence: "high" },
          database: { value: "MongoDB", reason: "NoSQL option", confidence: "medium" },
          styling: null,
          warnings: [],
        });

        await user.click(screen.getByRole("button", { name: /regenerate/i }));

        await waitFor(() => {
          expect(mockInferTechStack).toHaveBeenCalled();
        });
      });
    });

    describe("Accept & Generate", () => {
      it("should proceed to generation with reviewed values", async () => {
        const user = userEvent.setup();
        mockInferTechStack.mockResolvedValue({
          language: null,
          framework: { value: "React", reason: "Test", confidence: "high" },
          database: { value: "SQLite", reason: "Test", confidence: "high" },
          styling: { value: "CSS Modules", reason: "Test", confidence: "high" },
          warnings: [],
        });

        render(<ProjectKickstart />);

        await goToReviewStep(user);

        // Click Accept & Generate
        await user.click(screen.getByRole("button", { name: /accept & generate/i }));

        await waitFor(() => {
          expect(mockGenerateKickstartPrompt).toHaveBeenCalledWith(
            expect.objectContaining({
              techPreferences: {
                language: "TypeScript",
                framework: "React",
                database: "SQLite",
                styling: "CSS Modules",
              },
            })
          );
        });
      });
    });

    describe("Back Navigation", () => {
      it("should return to form when 'Back to form' clicked", async () => {
        const user = userEvent.setup();
        render(<ProjectKickstart />);

        await goToReviewStep(user);

        await user.click(screen.getByText(/back to form/i));

        // Should be back at form step
        expect(screen.getByText("App Basics")).toBeInTheDocument();
        expect(screen.getByText("Key Features")).toBeInTheDocument();
      });

      it("should preserve form values when returning", async () => {
        const user = userEvent.setup();
        render(<ProjectKickstart />);

        await goToReviewStep(user);

        await user.click(screen.getByText(/back to form/i));

        // Form values should still be there
        expect(screen.getByDisplayValue("A note app")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Developers")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Create notes")).toBeInTheDocument();
        const languageSelect = getSelectByLabelText(/Language/);
        expect(languageSelect).toHaveValue("TypeScript");
      });
    });

    describe("Generate Button", () => {
      it("should call generateKickstartPrompt with reviewed values", async () => {
        const user = userEvent.setup();
        mockInferTechStack.mockResolvedValue({
          language: null,
          framework: { value: "Vue.js", reason: "Test", confidence: "high" },
          database: { value: "MongoDB", reason: "Test", confidence: "medium" },
          styling: { value: "SCSS", reason: "Test", confidence: "low" },
          warnings: [],
        });

        render(<ProjectKickstart />);

        await goToReviewStep(user);

        // Click Accept & Generate (reviewed values are pre-filled from suggestions)
        await user.click(screen.getByRole("button", { name: /accept & generate/i }));

        await waitFor(() => {
          expect(mockGenerateKickstartPrompt).toHaveBeenCalledWith({
            appPurpose: "A note app",
            targetUsers: "Developers",
            keyFeatures: ["Create notes"],
            techPreferences: {
              language: "TypeScript",
              framework: "Vue.js",
              database: "MongoDB",
              styling: "SCSS",
            },
            constraints: undefined,
          });
        });
      });

      it("should transition to result step after generation", async () => {
        const user = userEvent.setup();
        render(<ProjectKickstart />);

        await goToReviewStep(user);

        await user.click(screen.getByRole("button", { name: /accept & generate/i }));

        await waitFor(() => {
          expect(screen.getByText("Generated Prompt")).toBeInTheDocument();
        });
      });

      it("should show loading state during generation from review step", async () => {
        const user = userEvent.setup();
        let resolveGeneration: (value: unknown) => void;
        mockGenerateKickstartPrompt.mockImplementation(
          () => new Promise((resolve) => { resolveGeneration = resolve; })
        );

        render(<ProjectKickstart />);

        await goToReviewStep(user);

        await user.click(screen.getByRole("button", { name: /accept & generate/i }));

        expect(screen.getByText(/generating/i)).toBeInTheDocument();

        // Cleanup
        resolveGeneration!({ fullPrompt: "test", tokenEstimate: 100 });
      });
    });
  });

  describe("onClaudeMdCreated Callback", () => {
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

    it("should call onClaudeMdCreated automatically after generation", async () => {
      const user = userEvent.setup();
      const mockCallback = vi.fn();
      render(<ProjectKickstart onClaudeMdCreated={mockCallback} />);

      await fillAndGenerate(user);

      // CLAUDE.md is created automatically after prompt generation
      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalledTimes(1);
      });
    });

    it("should not call callback when creation fails", async () => {
      const user = userEvent.setup();
      mockGenerateKickstartClaudeMd.mockRejectedValue(new Error("Failed"));
      const mockCallback = vi.fn();
      render(<ProjectKickstart onClaudeMdCreated={mockCallback} />);

      await fillAndGenerate(user);

      // Wait for prompt to be generated (CLAUDE.md creation fails silently)
      await waitFor(() => {
        expect(screen.getByText("Generated Prompt")).toBeInTheDocument();
      });

      // Callback should not have been called since creation failed
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });
});
