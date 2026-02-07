/**
 * @module components/team-templates/TeamDeployOutput.test
 * @description Unit tests for the TeamDeployOutput component
 *
 * PURPOSE:
 * - Verify format selector renders with three options
 * - Verify default format is "prompt"
 * - Verify onGenerate is called when component mounts/format changes
 * - Verify generated output shows in code block
 * - Verify copy button copies to clipboard
 * - Verify back button calls onBack
 * - Verify projectContext is forwarded to onGenerate
 * - Verify personalization badge shows when context has name
 * - Verify personalization badge is absent without context
 *
 * DEPENDENCIES:
 * - @/components/team-templates/TeamDeployOutput - Component under test
 * - @/types/team-template - LibraryTeamTemplate, ProjectContext types
 *
 * EXPORTS:
 * - None (test file)
 *
 * PATTERNS:
 * - Mocks navigator.clipboard.writeText for copy testing
 * - Uses waitFor for async useEffect generation
 * - Uses fireEvent for format selection and button clicks
 *
 * CLAUDE NOTES:
 * - Component calls onGenerate in useEffect on mount and on format change
 * - Output is async and controlled by onGenerate return value
 * - Three formats: prompt (Lead Prompt), script (Shell Script), config (Setup Files)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TeamDeployOutput } from "./TeamDeployOutput";
import type { LibraryTeamTemplate, ProjectContext } from "@/types/team-template";

const mockTemplate: LibraryTeamTemplate = {
  slug: "test-team",
  name: "Test Team",
  description: "A test team template",
  orchestrationPattern: "leader",
  category: "feature-development",
  tags: ["universal"],
  teammates: [
    { role: "Dev", description: "Developer", spawnPrompt: "You are a dev" },
  ],
  tasks: [
    { id: "t1", title: "Build", description: "Build it", assignedTo: "Dev", blockedBy: [] },
  ],
  hooks: [],
  leadSpawnInstructions: "Coordinate the team",
};

describe("TeamDeployOutput", () => {
  let onGenerate: ReturnType<typeof vi.fn>;
  let onBack: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onGenerate = vi.fn().mockResolvedValue("# Generated Output\nThis is the generated team deployment prompt.");
    onBack = vi.fn();

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("renders format selector with three options", async () => {
    render(
      <TeamDeployOutput
        template={mockTemplate}
        onGenerate={onGenerate}
        onBack={onBack}
      />,
    );

    expect(screen.getByText("Lead Prompt")).toBeInTheDocument();
    expect(screen.getByText("Shell Script")).toBeInTheDocument();
    expect(screen.getByText("Setup Files")).toBeInTheDocument();
  });

  it("default format is 'prompt' (Lead Prompt selected)", async () => {
    render(
      <TeamDeployOutput
        template={mockTemplate}
        onGenerate={onGenerate}
        onBack={onBack}
      />,
    );

    await waitFor(() => {
      expect(onGenerate).toHaveBeenCalledWith(mockTemplate, "prompt", undefined);
    });
  });

  it("calls onGenerate when component mounts", async () => {
    render(
      <TeamDeployOutput
        template={mockTemplate}
        onGenerate={onGenerate}
        onBack={onBack}
      />,
    );

    await waitFor(() => {
      expect(onGenerate).toHaveBeenCalled();
    });
  });

  it("calls onGenerate with new format when format changes", async () => {
    render(
      <TeamDeployOutput
        template={mockTemplate}
        onGenerate={onGenerate}
        onBack={onBack}
      />,
    );

    // Wait for initial generation
    await waitFor(() => {
      expect(onGenerate).toHaveBeenCalledWith(mockTemplate, "prompt", undefined);
    });

    // Change to script format
    fireEvent.click(screen.getByText("Shell Script"));

    await waitFor(() => {
      expect(onGenerate).toHaveBeenCalledWith(mockTemplate, "script", undefined);
    });
  });

  it("shows generated output in code block", async () => {
    render(
      <TeamDeployOutput
        template={mockTemplate}
        onGenerate={onGenerate}
        onBack={onBack}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/# Generated Output/),
      ).toBeInTheDocument();
    });
  });

  it("shows Generated Output label", async () => {
    render(
      <TeamDeployOutput
        template={mockTemplate}
        onGenerate={onGenerate}
        onBack={onBack}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Generated Output:")).toBeInTheDocument();
    });
  });

  it("copy button copies to clipboard", async () => {
    render(
      <TeamDeployOutput
        template={mockTemplate}
        onGenerate={onGenerate}
        onBack={onBack}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Copy")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Copy"));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "# Generated Output\nThis is the generated team deployment prompt.",
    );
  });

  it("back button calls onBack", async () => {
    render(
      <TeamDeployOutput
        template={mockTemplate}
        onGenerate={onGenerate}
        onBack={onBack}
      />,
    );

    fireEvent.click(screen.getByText("Back"));
    expect(onBack).toHaveBeenCalled();
  });

  it("shows template name in header", async () => {
    render(
      <TeamDeployOutput
        template={mockTemplate}
        onGenerate={onGenerate}
        onBack={onBack}
      />,
    );

    expect(screen.getByText("Deploy: Test Team")).toBeInTheDocument();
  });

  it("shows generating state when output is loading", async () => {
    // Make onGenerate never resolve
    const pendingGenerate = vi.fn().mockReturnValue(new Promise(() => {}));

    render(
      <TeamDeployOutput
        template={mockTemplate}
        onGenerate={pendingGenerate}
        onBack={onBack}
      />,
    );

    expect(screen.getByText("Generating...")).toBeInTheDocument();
  });

  it("forwards projectContext to onGenerate", async () => {
    const context: ProjectContext = {
      name: "My App",
      language: "TypeScript",
      framework: "React",
      testFramework: "Vitest",
      buildTool: "Vite",
      styling: "Tailwind CSS",
      database: null,
    };

    render(
      <TeamDeployOutput
        template={mockTemplate}
        projectContext={context}
        onGenerate={onGenerate}
        onBack={onBack}
      />,
    );

    await waitFor(() => {
      expect(onGenerate).toHaveBeenCalledWith(mockTemplate, "prompt", context);
    });
  });

  it("shows personalization badge when projectContext has name", async () => {
    const context: ProjectContext = {
      name: "My App",
      language: "TypeScript",
      framework: null,
      testFramework: null,
      buildTool: null,
      styling: null,
      database: null,
    };

    render(
      <TeamDeployOutput
        template={mockTemplate}
        projectContext={context}
        onGenerate={onGenerate}
        onBack={onBack}
      />,
    );

    expect(screen.getByText("Personalized for My App")).toBeInTheDocument();
  });

  it("does not show personalization badge without projectContext", async () => {
    render(
      <TeamDeployOutput
        template={mockTemplate}
        onGenerate={onGenerate}
        onBack={onBack}
      />,
    );

    expect(screen.queryByText(/Personalized for/)).not.toBeInTheDocument();
  });
});
