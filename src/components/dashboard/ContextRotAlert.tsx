/**
 * @module components/dashboard/ContextRotAlert
 * @description Alert banner warning about context rot risk levels
 *
 * PURPOSE:
 * - Display a prominent alert when documentation staleness risk is medium or high
 * - Provide visual distinction between medium (warning) and high (danger) risk
 * - Offer a review action button to address the issue
 *
 * DEPENDENCIES:
 * - None (self-contained presentational component)
 *
 * EXPORTS:
 * - ContextRotAlert - Conditional alert banner component
 *
 * PATTERNS:
 * - Returns null when risk is "low" (component is hidden)
 * - Yellow styling for medium risk, red styling for high risk
 * - Optional onReview callback triggers when "Review" button is clicked
 *
 * CLAUDE NOTES:
 * - This component intentionally returns null for "low" risk, not an empty div
 * - staleCount is optional; message adjusts based on whether it is provided
 * - The warning triangle is rendered using an SVG path, not an emoji
 */

interface ContextRotAlertProps {
  risk: "low" | "medium" | "high";
  staleCount?: number;
  onReview?: () => void;
}

const RISK_CONFIG = {
  medium: {
    border: "border-yellow-500/50",
    bg: "bg-yellow-500/10",
    iconColor: "text-yellow-500",
    textColor: "text-yellow-300",
    subtextColor: "text-yellow-400/70",
    buttonBorder: "border-yellow-500/40",
    buttonBg: "hover:bg-yellow-500/20",
    buttonText: "text-yellow-400",
  },
  high: {
    border: "border-red-500/50",
    bg: "bg-red-500/10",
    iconColor: "text-red-500",
    textColor: "text-red-300",
    subtextColor: "text-red-400/70",
    buttonBorder: "border-red-500/40",
    buttonBg: "hover:bg-red-500/20",
    buttonText: "text-red-400",
  },
};

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8.57465 3.21665L1.51632 14.9983C1.37079 15.2504 1.29379 15.5365 1.29298 15.828C1.29216 16.1195 1.36756 16.406 1.51167 16.659C1.65579 16.912 1.86359 17.1228 2.11441 17.2706C2.36523 17.4184 2.65052 17.498 2.94198 17.5H17.058C17.3495 17.498 17.6347 17.4184 17.8856 17.2706C18.1364 17.1228 18.3442 16.912 18.4883 16.659C18.6324 16.406 18.7078 16.1195 18.707 15.828C18.7062 15.5365 18.6292 15.2504 18.4837 14.9983L11.4253 3.21665C11.2768 2.97174 11.0673 2.76905 10.8173 2.62872C10.5674 2.48838 10.2854 2.41504 9.99882 2.41504C9.71221 2.41504 9.43028 2.48838 9.18031 2.62872C8.93034 2.76905 8.72081 2.97174 8.57215 3.21665H8.57465Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 7.5V10.8333"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 14.1667H10.0083"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getMessage(risk: "medium" | "high", staleCount?: number): string {
  if (risk === "high") {
    if (staleCount !== undefined && staleCount > 0) {
      return `${staleCount} file${staleCount === 1 ? " has" : "s have"} outdated documentation`;
    }
    return "Multiple files have outdated documentation";
  }
  return "Some documentation may be going stale";
}

export function ContextRotAlert({
  risk,
  staleCount,
  onReview,
}: ContextRotAlertProps) {
  if (risk === "low") {
    return null;
  }

  const config = RISK_CONFIG[risk];
  const message = getMessage(risk, staleCount);

  return (
    <div
      className={`flex items-center justify-between rounded-lg border ${config.border} ${config.bg} px-4 py-3`}
      role="alert"
    >
      <div className="flex items-center gap-3">
        <WarningIcon className={`shrink-0 ${config.iconColor}`} />
        <div>
          <p className={`text-sm font-medium ${config.textColor}`}>
            {risk === "high" ? "Context Rot Risk Detected" : "Context Rot Warning"}
          </p>
          <p className={`mt-0.5 text-xs ${config.subtextColor}`}>{message}</p>
        </div>
      </div>

      {onReview && (
        <button
          onClick={onReview}
          className={`shrink-0 rounded-md border ${config.buttonBorder} bg-transparent px-3 py-1.5 text-xs font-medium ${config.buttonText} transition-colors ${config.buttonBg}`}
        >
          Review
        </button>
      )}
    </div>
  );
}
