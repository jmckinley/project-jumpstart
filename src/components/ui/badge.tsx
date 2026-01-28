/**
 * @module components/ui/badge
 * @description Inline status badge with variant support
 *
 * PURPOSE:
 * - Display small status indicators (Configured, Not Configured, Installed, etc.)
 * - Support visual variants: default, outline, destructive
 *
 * DEPENDENCIES:
 * - react - HTMLAttributes for prop forwarding
 *
 * EXPORTS:
 * - Badge - Inline badge component with variant prop
 *
 * PATTERNS:
 * - variant selects base Tailwind classes
 * - className prop merges with variant classes for color customization
 * - Renders as a span for inline placement
 *
 * CLAUDE NOTES:
 * - Plain HTML span, no Radix dependency
 * - Consumers frequently override colors via className (e.g. bg-green-900/40 text-green-400)
 * - The "destructive" variant provides a red-themed badge
 */

import { forwardRef, type HTMLAttributes } from "react";

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

const variantClasses: Record<string, string> = {
  default:
    "bg-neutral-700 text-neutral-100",
  outline:
    "border border-neutral-700 bg-transparent text-neutral-400",
  destructive:
    "bg-red-900/40 text-red-400",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline" | "destructive";
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  ),
);
Badge.displayName = "Badge";

export { Badge };
export type { BadgeProps };
