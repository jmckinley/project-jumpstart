/**
 * @module stores/toastStore
 * @description Zustand store for managing toast notifications
 *
 * PURPOSE:
 * - Manage a queue of toast notifications (success, error, info)
 * - Provide addToast/removeToast actions
 * - Generate unique IDs for each toast
 *
 * DEPENDENCIES:
 * - zustand - State management
 *
 * EXPORTS:
 * - useToastStore - Zustand hook for toast state and actions
 * - Toast - Toast type definition
 *
 * PATTERNS:
 * - Components call addToast({ message, type }) after successful actions
 * - ToastContainer reads toasts array and renders them
 * - Each toast auto-dismisses via setTimeout in the UI component
 *
 * CLAUDE NOTES:
 * - IDs are generated via crypto.randomUUID or Date.now fallback
 * - Default duration is 4000ms (set in Toast UI component, not here)
 * - Store only manages the array; auto-dismiss is handled by the UI
 */

import { create } from "zustand";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

let counter = 0;

function generateId(): string {
  counter += 1;
  return `toast-${Date.now()}-${counter}`;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: generateId() }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
