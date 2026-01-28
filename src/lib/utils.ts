/**
 * @module lib/utils
 * @description General utility functions used across the application
 *
 * PURPOSE:
 * - Provide the cn() helper for conditional Tailwind class merging
 * - Shared utility functions used across components
 *
 * DEPENDENCIES:
 * - (none — pure utility functions)
 *
 * EXPORTS:
 * - cn - Tailwind class name merger for conditional className composition
 *
 * PATTERNS:
 * - Import cn from '@/lib/utils' for all className composition
 * - Keep utilities generic; domain-specific logic goes elsewhere
 *
 * CLAUDE NOTES:
 * - This file is required by shadcn/ui components
 * - cn() filters falsy values and joins remaining class strings
 */

export function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
