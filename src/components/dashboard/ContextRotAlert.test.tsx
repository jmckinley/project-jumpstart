/**
 * @module components/dashboard/ContextRotAlert.test
 * @description Unit tests for ContextRotAlert dashboard component
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContextRotAlert } from "./ContextRotAlert";

describe("ContextRotAlert", () => {
  describe("rendering by risk level", () => {
    it("should return null for low risk", () => {
      const { container } = render(
        <ContextRotAlert risk="low" onReview={() => {}} />
      );

      expect(container.firstChild).toBeNull();
    });

    it("should render alert for medium risk", () => {
      render(<ContextRotAlert risk="medium" onReview={() => {}} />);

      expect(screen.getByText("Context Rot Warning")).toBeInTheDocument();
    });

    it("should render alert for high risk", () => {
      render(<ContextRotAlert risk="high" onReview={() => {}} />);

      expect(screen.getByText("Context Rot Risk Detected")).toBeInTheDocument();
    });
  });

  describe("medium risk content", () => {
    it("should show medium risk message", () => {
      render(<ContextRotAlert risk="medium" onReview={() => {}} />);

      expect(screen.getByText("Some documentation may be going stale")).toBeInTheDocument();
    });

    it("should show review button", () => {
      render(<ContextRotAlert risk="medium" onReview={() => {}} />);

      expect(screen.getByText(/Review/)).toBeInTheDocument();
    });
  });

  describe("high risk content", () => {
    it("should show high risk message", () => {
      render(<ContextRotAlert risk="high" onReview={() => {}} />);

      expect(screen.getByText("Multiple files have outdated documentation")).toBeInTheDocument();
    });

    it("should show review button for high risk", () => {
      render(<ContextRotAlert risk="high" onReview={() => {}} />);

      expect(screen.getByText(/Review/)).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("should call onReview when review button is clicked", async () => {
      const user = userEvent.setup();
      const onReview = vi.fn();

      render(<ContextRotAlert risk="medium" onReview={onReview} />);

      const reviewButton = screen.getByText(/Review/);
      await user.click(reviewButton);

      expect(onReview).toHaveBeenCalled();
    });

    it("should call onReview for high risk click", async () => {
      const user = userEvent.setup();
      const onReview = vi.fn();

      render(<ContextRotAlert risk="high" onReview={onReview} />);

      const reviewButton = screen.getByText(/Review/);
      await user.click(reviewButton);

      expect(onReview).toHaveBeenCalled();
    });
  });

  describe("styling by risk level", () => {
    it("should have yellow styling for medium risk", () => {
      const { container } = render(
        <ContextRotAlert risk="medium" onReview={() => {}} />
      );

      // Check for yellow border class (border-yellow-500/50)
      const alert = container.querySelector("[class*='yellow']");
      expect(alert).toBeInTheDocument();
    });

    it("should have red styling for high risk", () => {
      const { container } = render(
        <ContextRotAlert risk="high" onReview={() => {}} />
      );

      // Check for red border class (border-red-500/50)
      const alert = container.querySelector("[class*='red']");
      expect(alert).toBeInTheDocument();
    });
  });
});
