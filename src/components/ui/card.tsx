/**
 * @module components/ui/card
 * @description Composable card container with header, title, and content slots
 *
 * PURPOSE:
 * - Provide a consistent card layout primitive for section containers
 * - Support dark-themed styling via Tailwind class overrides
 *
 * DEPENDENCIES:
 * - react - HTMLAttributes for prop forwarding
 *
 * EXPORTS:
 * - Card - Root card container (rounded border div)
 * - CardHeader - Header area with padding
 * - CardTitle - Title element (h3)
 * - CardContent - Body content area with padding
 *
 * PATTERNS:
 * - All components forward ref and merge className via template literals
 * - Default styling uses neutral dark theme; override with className prop
 * - Compose as: Card > CardHeader > CardTitle + CardContent
 *
 * CLAUDE NOTES:
 * - These are plain HTML elements styled with Tailwind, no Radix dependency
 * - className is merged (not replaced) so defaults always apply unless overridden
 */

import { forwardRef, type HTMLAttributes } from "react";

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-100",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("p-6 pt-0", className)}
      {...props}
    />
  ),
);
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardContent };
