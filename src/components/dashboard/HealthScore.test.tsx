/**
 * @module components/dashboard/HealthScore.test
 * @description Unit tests for HealthScore dashboard component
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HealthScore } from "./HealthScore";

const mockComponents = {
  claudeMd: 20,
  moduleDocs: 15,
  freshness: 12,
  skills: 10,
  context: 8,
  enforcement: 10,
  tests: 8,
};

describe("HealthScore", () => {
  describe("rendering", () => {
    it("should render health score title", () => {
      render(<HealthScore score={75} components={mockComponents} />);

      expect(screen.getByText("Health Score")).toBeInTheDocument();
    });

    it("should display the score value", () => {
      render(<HealthScore score={75} components={mockComponents} />);

      expect(screen.getByText("75")).toBeInTheDocument();
      expect(screen.getByText("/ 100")).toBeInTheDocument();
    });

    it("should render breakdown section", () => {
      render(<HealthScore score={75} components={mockComponents} />);

      expect(screen.getByText("Breakdown")).toBeInTheDocument();
    });

    it("should display all component labels", () => {
      render(<HealthScore score={75} components={mockComponents} />);

      expect(screen.getByText("CLAUDE.md")).toBeInTheDocument();
      expect(screen.getByText("Modules")).toBeInTheDocument();
      expect(screen.getByText("Freshness")).toBeInTheDocument();
      expect(screen.getByText("Skills")).toBeInTheDocument();
      expect(screen.getByText("Context")).toBeInTheDocument();
      expect(screen.getByText("Enforcement")).toBeInTheDocument();
      expect(screen.getByText("Tests")).toBeInTheDocument();
    });

    it("should display component values with max", () => {
      render(<HealthScore score={75} components={mockComponents} />);

      expect(screen.getByText("20 / 23")).toBeInTheDocument(); // claudeMd
      expect(screen.getByText("15 / 23")).toBeInTheDocument(); // moduleDocs
      expect(screen.getByText("12 / 14")).toBeInTheDocument(); // freshness
      expect(screen.getByText("10 / 14")).toBeInTheDocument(); // skills
      expect(screen.getByText("8 / 8")).toBeInTheDocument();   // context
      expect(screen.getByText("10 / 8")).toBeInTheDocument();  // enforcement
      expect(screen.getByText("8 / 10")).toBeInTheDocument();  // tests
    });
  });

  describe("score colors", () => {
    it("should use green for score >= 70", () => {
      const { container } = render(<HealthScore score={75} components={mockComponents} />);

      // Check that green color class is applied
      const scoreElement = container.querySelector(".text-green-500");
      expect(scoreElement).toBeInTheDocument();
    });

    it("should use yellow for score 40-69", () => {
      const { container } = render(<HealthScore score={50} components={mockComponents} />);

      const scoreElement = container.querySelector(".text-yellow-500");
      expect(scoreElement).toBeInTheDocument();
    });

    it("should use red for score < 40", () => {
      const { container } = render(<HealthScore score={25} components={mockComponents} />);

      const scoreElement = container.querySelector(".text-red-500");
      expect(scoreElement).toBeInTheDocument();
    });
  });

  describe("null components", () => {
    it("should render with null components (shows 0 values)", () => {
      render(<HealthScore score={0} components={null} />);

      // Should still render labels
      expect(screen.getByText("CLAUDE.md")).toBeInTheDocument();

      // Values should show 0 - there are multiple "0 / X" entries
      const zeroValues = screen.getAllByText(/0 \/ \d+/);
      expect(zeroValues.length).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("should handle score of 0", () => {
      render(<HealthScore score={0} components={mockComponents} />);

      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("should handle score of 100", () => {
      render(<HealthScore score={100} components={mockComponents} />);

      expect(screen.getByText("100")).toBeInTheDocument();
    });

    it("should handle max component values", () => {
      const maxComponents = {
        claudeMd: 23,
        moduleDocs: 23,
        freshness: 14,
        skills: 14,
        context: 8,
        enforcement: 8,
        tests: 10,
      };

      render(<HealthScore score={100} components={maxComponents} />);

      // There are two components with max 23: claudeMd and moduleDocs
      const maxValueElements = screen.getAllByText("23 / 23");
      expect(maxValueElements.length).toBe(2);
    });
  });
});
