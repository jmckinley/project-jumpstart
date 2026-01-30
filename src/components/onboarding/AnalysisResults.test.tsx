/**
 * @module components/onboarding/AnalysisResults.test
 * @description Unit tests for AnalysisResults onboarding component with stack templates
 *
 * PURPOSE:
 * - Test rendering of stack templates trigger and section
 * - Test additional services (stackExtras) dropdowns
 * - Test template application flow
 * - Test interaction between templates and manual overrides
 *
 * PATTERNS:
 * - Uses Vitest globals (describe, it, expect)
 * - Mocks useOnboardingStore for isolated testing
 * - Uses @testing-library/react for component testing
 *
 * CLAUDE NOTES:
 * - Store is mocked to control state and verify actions are called
 * - Template expansion is controlled via component state
 * - Additional services section is always visible
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnalysisResults } from "./AnalysisResults";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { STACK_TEMPLATES } from "@/data/stackTemplates";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Building2: () => <span data-testid="icon-building2">Building2</span>,
  Server: () => <span data-testid="icon-server">Server</span>,
  Rocket: () => <span data-testid="icon-rocket">Rocket</span>,
  Smartphone: () => <span data-testid="icon-smartphone">Smartphone</span>,
  Sparkles: () => <span data-testid="icon-sparkles">Sparkles</span>,
  Radio: () => <span data-testid="icon-radio">Radio</span>,
  ShoppingCart: () => <span data-testid="icon-shoppingcart">ShoppingCart</span>,
  LayoutDashboard: () => <span data-testid="icon-layoutdashboard">LayoutDashboard</span>,
  BarChart3: () => <span data-testid="icon-barchart3">BarChart3</span>,
  FileText: () => <span data-testid="icon-filetext">FileText</span>,
  Store: () => <span data-testid="icon-store">Store</span>,
  Terminal: () => <span data-testid="icon-terminal">Terminal</span>,
  ChevronDown: () => <span data-testid="icon-chevrondown">ChevronDown</span>,
  ChevronUp: () => <span data-testid="icon-chevronup">ChevronUp</span>,
}));

// Mock the store
vi.mock("@/stores/onboardingStore", () => ({
  useOnboardingStore: vi.fn(),
}));

// Create mock functions
const mockSetProjectName = vi.fn();
const mockSetProjectDescription = vi.fn();
const mockSetProjectType = vi.fn();
const mockSetLanguage = vi.fn();
const mockSetFramework = vi.fn();
const mockSetDatabase = vi.fn();
const mockSetTesting = vi.fn();
const mockSetStyling = vi.fn();
const mockSetStackExtras = vi.fn();
const mockApplyTemplate = vi.fn();

// Default mock state
const createMockState = (overrides = {}) => ({
  projectName: "",
  projectDescription: "",
  projectType: "",
  language: "",
  framework: null,
  database: null,
  testing: null,
  styling: null,
  stackExtras: null,
  detectionResult: null,
  setProjectName: mockSetProjectName,
  setProjectDescription: mockSetProjectDescription,
  setProjectType: mockSetProjectType,
  setLanguage: mockSetLanguage,
  setFramework: mockSetFramework,
  setDatabase: mockSetDatabase,
  setTesting: mockSetTesting,
  setStyling: mockSetStyling,
  setStackExtras: mockSetStackExtras,
  applyTemplate: mockApplyTemplate,
  ...overrides,
});

describe("AnalysisResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation with selector support
    vi.mocked(useOnboardingStore).mockImplementation((selector) => {
      const state = createMockState();
      if (typeof selector === "function") {
        return selector(state);
      }
      return state;
    });
  });

  describe("rendering", () => {
    it("should render stack templates trigger button", () => {
      render(<AnalysisResults />);

      expect(
        screen.getByText(/Starting a new project\? Try one of our recommended stacks/i)
      ).toBeInTheDocument();
    });

    it("should not show templates by default (collapsed)", () => {
      render(<AnalysisResults />);

      // Templates should not be visible initially
      const b2bButton = screen.queryByText("B2B SaaS");
      expect(b2bButton).not.toBeInTheDocument();
    });

    it("should show Additional Services section", () => {
      render(<AnalysisResults />);

      expect(screen.getByText("Additional Services (Optional)")).toBeInTheDocument();
    });

    it("should render auth dropdown", () => {
      render(<AnalysisResults />);

      expect(screen.getByText("Authentication")).toBeInTheDocument();
    });

    it("should render hosting dropdown", () => {
      render(<AnalysisResults />);

      expect(screen.getByText("Hosting")).toBeInTheDocument();
    });

    it("should render payments dropdown", () => {
      render(<AnalysisResults />);

      expect(screen.getByText("Payments")).toBeInTheDocument();
    });

    it("should render monitoring dropdown", () => {
      render(<AnalysisResults />);

      expect(screen.getByText("Monitoring")).toBeInTheDocument();
    });

    it("should render email dropdown", () => {
      render(<AnalysisResults />);

      expect(screen.getByText("Email")).toBeInTheDocument();
    });

    it("should render Project Info section", () => {
      render(<AnalysisResults />);

      expect(screen.getByText("Project Info")).toBeInTheDocument();
      expect(screen.getByText("Project Name")).toBeInTheDocument();
      expect(screen.getByText("Project Description")).toBeInTheDocument();
      expect(screen.getByText("Project Type")).toBeInTheDocument();
    });

    it("should render Tech Stack section", () => {
      render(<AnalysisResults />);

      expect(screen.getByText("Tech Stack")).toBeInTheDocument();
      expect(screen.getByText("Language")).toBeInTheDocument();
      expect(screen.getByText("Framework")).toBeInTheDocument();
      expect(screen.getByText("Database")).toBeInTheDocument();
      expect(screen.getByText("Testing")).toBeInTheDocument();
      expect(screen.getByText("Styling")).toBeInTheDocument();
    });
  });

  describe("stack templates interaction", () => {
    it("should expand templates section on click", () => {
      render(<AnalysisResults />);

      const trigger = screen.getByText(
        /Starting a new project\? Try one of our recommended stacks/i
      );
      fireEvent.click(trigger);

      // Templates should now be visible
      expect(screen.getByText("B2B SaaS")).toBeInTheDocument();
      expect(screen.getByText("API-First")).toBeInTheDocument();
    });

    it("should show 12 template cards when expanded", () => {
      render(<AnalysisResults />);

      const trigger = screen.getByText(
        /Starting a new project\? Try one of our recommended stacks/i
      );
      fireEvent.click(trigger);

      // All 12 templates should be visible
      expect(STACK_TEMPLATES).toHaveLength(12);

      for (const template of STACK_TEMPLATES) {
        expect(screen.getByText(template.name)).toBeInTheDocument();
      }
    });

    it("should collapse templates section on second click", () => {
      render(<AnalysisResults />);

      const trigger = screen.getByText(
        /Starting a new project\? Try one of our recommended stacks/i
      );

      // Expand
      fireEvent.click(trigger);
      expect(screen.getByText("B2B SaaS")).toBeInTheDocument();

      // Collapse
      fireEvent.click(trigger);
      expect(screen.queryByText("B2B SaaS")).not.toBeInTheDocument();
    });

    it("clicking template should call applyTemplate", () => {
      render(<AnalysisResults />);

      // Expand templates
      const trigger = screen.getByText(
        /Starting a new project\? Try one of our recommended stacks/i
      );
      fireEvent.click(trigger);

      // Click B2B SaaS template
      const b2bTemplate = screen.getByText("B2B SaaS");
      fireEvent.click(b2bTemplate);

      // applyTemplate should be called with the B2B SaaS template
      expect(mockApplyTemplate).toHaveBeenCalledTimes(1);
      expect(mockApplyTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "b2b-saas",
          name: "B2B SaaS",
        })
      );
    });

    it("clicking template should collapse the section", () => {
      render(<AnalysisResults />);

      // Expand templates
      const trigger = screen.getByText(
        /Starting a new project\? Try one of our recommended stacks/i
      );
      fireEvent.click(trigger);

      // Click a template
      const b2bTemplate = screen.getByText("B2B SaaS");
      fireEvent.click(b2bTemplate);

      // Templates section should be collapsed
      expect(screen.queryByText("API-First")).not.toBeInTheDocument();
    });

    it("should show template descriptions", () => {
      render(<AnalysisResults />);

      // Expand templates
      const trigger = screen.getByText(
        /Starting a new project\? Try one of our recommended stacks/i
      );
      fireEvent.click(trigger);

      // Check for descriptions
      expect(
        screen.getByText("Full-stack app with auth, payments, and analytics")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Backend API service with database and monitoring")
      ).toBeInTheDocument();
    });
  });

  describe("extras dropdowns", () => {
    it("selecting auth option should call setStackExtras", () => {
      render(<AnalysisResults />);

      // Find the auth dropdown (after "Authentication" label)
      const authLabel = screen.getByText("Authentication");
      const authSelect = authLabel
        .closest(".flex")!
        .querySelector("select") as HTMLSelectElement;

      fireEvent.change(authSelect, { target: { value: "Clerk" } });

      expect(mockSetStackExtras).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: "Clerk",
        })
      );
    });

    it("selecting 'None' should clear the auth value", () => {
      // Start with auth set
      vi.mocked(useOnboardingStore).mockImplementation((selector) => {
        const state = createMockState({
          stackExtras: { auth: "Clerk" },
        });
        if (typeof selector === "function") {
          return selector(state);
        }
        return state;
      });

      render(<AnalysisResults />);

      // Find auth dropdown
      const authLabel = screen.getByText("Authentication");
      const authSelect = authLabel
        .closest(".flex")!
        .querySelector("select") as HTMLSelectElement;

      fireEvent.change(authSelect, { target: { value: "" } });

      expect(mockSetStackExtras).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: undefined,
        })
      );
    });

    it("should show correct options in auth dropdown", () => {
      render(<AnalysisResults />);

      const authLabel = screen.getByText("Authentication");
      const authSelect = authLabel
        .closest(".flex")!
        .querySelector("select") as HTMLSelectElement;

      const options = Array.from(authSelect.options).map((o) => o.value);

      expect(options).toContain("");
      expect(options).toContain("Clerk");
      expect(options).toContain("Auth0");
      expect(options).toContain("NextAuth.js");
    });

    it("should show correct options in hosting dropdown", () => {
      render(<AnalysisResults />);

      const hostingLabel = screen.getByText("Hosting");
      const hostingSelect = hostingLabel
        .closest(".flex")!
        .querySelector("select") as HTMLSelectElement;

      const options = Array.from(hostingSelect.options).map((o) => o.value);

      expect(options).toContain("");
      expect(options).toContain("Vercel");
      expect(options).toContain("Railway");
      expect(options).toContain("Render");
    });

    it("should display current stackExtras values in selects", () => {
      vi.mocked(useOnboardingStore).mockImplementation((selector) => {
        const state = createMockState({
          stackExtras: {
            auth: "Clerk",
            hosting: "Vercel",
            payments: "Stripe",
          },
        });
        if (typeof selector === "function") {
          return selector(state);
        }
        return state;
      });

      render(<AnalysisResults />);

      // Find auth dropdown
      const authLabel = screen.getByText("Authentication");
      const authSelect = authLabel
        .closest(".flex")!
        .querySelector("select") as HTMLSelectElement;
      expect(authSelect.value).toBe("Clerk");

      // Find hosting dropdown
      const hostingLabel = screen.getByText("Hosting");
      const hostingSelect = hostingLabel
        .closest(".flex")!
        .querySelector("select") as HTMLSelectElement;
      expect(hostingSelect.value).toBe("Vercel");

      // Find payments dropdown
      const paymentsLabel = screen.getByText("Payments");
      const paymentsSelect = paymentsLabel
        .closest(".flex")!
        .querySelector("select") as HTMLSelectElement;
      expect(paymentsSelect.value).toBe("Stripe");
    });
  });

  describe("confidence badges", () => {
    it("should show confidence badge when detection result exists", () => {
      vi.mocked(useOnboardingStore).mockImplementation((selector) => {
        const state = createMockState({
          language: "TypeScript",
          detectionResult: {
            confidence: "high",
            language: { value: "TypeScript", confidence: 0.95, source: "tsconfig.json" },
            framework: null,
            database: null,
            testing: null,
            styling: null,
            projectName: null,
            projectType: null,
            fileCount: 50,
            hasExistingClaudeMd: false,
          },
        });
        if (typeof selector === "function") {
          return selector(state);
        }
        return state;
      });

      render(<AnalysisResults />);

      expect(screen.getByText("Auto-detected (95%)")).toBeInTheDocument();
    });
  });

  describe("language change handling", () => {
    it("should call setLanguage when language dropdown changes", () => {
      render(<AnalysisResults />);

      const languageLabel = screen.getByText("Language");
      const languageSelect = languageLabel
        .closest(".flex")!
        .querySelector("select") as HTMLSelectElement;

      fireEvent.change(languageSelect, { target: { value: "Python" } });

      expect(mockSetLanguage).toHaveBeenCalledWith("Python");
    });
  });

  describe("project info fields", () => {
    it("should call setProjectName when name input changes", () => {
      render(<AnalysisResults />);

      const nameInput = screen.getByPlaceholderText("My Project");
      fireEvent.change(nameInput, { target: { value: "New Project" } });

      expect(mockSetProjectName).toHaveBeenCalledWith("New Project");
    });

    it("should call setProjectDescription when description input changes", () => {
      render(<AnalysisResults />);

      const descInput = screen.getByPlaceholderText(
        "A brief description of your project"
      );
      fireEvent.change(descInput, { target: { value: "My description" } });

      expect(mockSetProjectDescription).toHaveBeenCalledWith("My description");
    });
  });
});
