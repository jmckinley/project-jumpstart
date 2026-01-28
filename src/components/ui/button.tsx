/**
 * @module components/ui/button
 * @description Polymorphic button with variant and size support
 *
 * PURPOSE:
 * - Provide a consistent button primitive across the application
 * - Support visual variants: default, primary, destructive, outline, ghost
 * - Support sizes: default, sm
 *
 * DEPENDENCIES:
 * - react - ButtonHTMLAttributes for prop forwarding
 *
 * EXPORTS:
 * - Button - Button component with variant/size props
 *
 * PATTERNS:
 * - variant and size select base Tailwind classes
 * - className prop merges with (and can override) variant classes
 * - disabled state reduces opacity and disables pointer events
 *
 * CLAUDE NOTES:
 * - Plain HTML button, no Radix dependency
 * - Consumers frequently override colors via className (e.g. bg-blue-600)
 * - The "outline" variant provides a bordered, transparent button
 */

import { forwardRef, type ButtonHTMLAttributes } from "react";

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

const variantClasses: Record<string, string> = {
  default:
    "bg-neutral-100 text-neutral-900 hover:bg-neutral-200",
  primary:
    "bg-blue-600 text-white hover:bg-blue-500",
  destructive:
    "bg-red-600 text-white hover:bg-red-500",
  outline:
    "border border-neutral-700 bg-transparent text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100",
  ghost:
    "bg-transparent text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200",
};

const sizeClasses: Record<string, string> = {
  default: "h-9 px-4 py-2 text-sm",
  sm: "h-7 px-3 text-xs",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "destructive" | "outline" | "ghost";
  size?: "default" | "sm";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400",
        variantClasses[variant],
        sizeClasses[size],
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      disabled={disabled}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button };
export type { ButtonProps };
