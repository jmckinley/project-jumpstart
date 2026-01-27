/**
 * @module lib/utils
 * @description General utility functions used across the application
 *
 * PURPOSE:
 * - Provide the cn() helper for conditional Tailwind class merging
 * - Shared utility functions used across components
 *
 * DEPENDENCIES:
 * - (clsx and tailwind-merge will be added with shadcn/ui)
 *
 * EXPORTS:
 * - cn - Tailwind class name merger (placeholder until shadcn setup)
 *
 * PATTERNS:
 * - Import cn from '@/lib/utils' for all className composition
 * - Keep utilities generic; domain-specific logic goes elsewhere
 *
 * CLAUDE NOTES:
 * - This file is required by shadcn/ui components
 * - cn() will be updated when shadcn/ui is installed
 */

export function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
