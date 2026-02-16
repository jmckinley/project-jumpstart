/**
 * @module components/ui/Toast
 * @description Toast notification container and item components
 *
 * PURPOSE:
 * - Render toast notifications in a fixed bottom-right container
 * - Auto-dismiss toasts after a configurable duration (default 4000ms)
 * - Support success, error, and info toast types with distinct styling
 * - Provide a close button for manual dismissal
 *
 * DEPENDENCIES:
 * - react - useEffect for auto-dismiss timer
 * - @/stores/toastStore - useToastStore for reading toasts and removeToast action
 *
 * EXPORTS:
 * - ToastContainer - Fixed-position container that renders all active toasts
 *
 * PATTERNS:
 * - ToastContainer subscribes to toastStore and renders ToastItem for each toast
 * - ToastItem sets a setTimeout on mount for auto-dismiss
 * - Type-based styling: green for success, red for error, blue for info
 *
 * CLAUDE NOTES:
 * - Container is fixed bottom-right with z-50
 * - Auto-dismiss uses toast.duration or defaults to 4000ms
 * - Close button calls removeToast immediately
 * - Renders nothing when toasts array is empty
 */

import React, { useEffect } from "react";
import { useToastStore } from "@/stores/toastStore";
import type { Toast } from "@/stores/toastStore";

const DEFAULT_DURATION = 4000;

const TYPE_STYLES: Record<Toast["type"], string> = {
  success: "border-green-800 bg-green-950/90 text-green-300",
  error: "border-red-800 bg-red-950/90 text-red-300",
  info: "border-blue-800 bg-blue-950/90 text-blue-300",
};

function CheckCircleIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

const TYPE_ICONS: Record<Toast["type"], () => React.ReactElement> = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  info: InfoIcon,
};

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((s) => s.removeToast);

  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, toast.duration ?? DEFAULT_DURATION);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, removeToast]);

  const Icon = TYPE_ICONS[toast.type];

  return (
    <div
      role="status"
      className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg ${TYPE_STYLES[toast.type]}`}
    >
      <Icon />
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => removeToast(toast.id)}
        className="ml-2 opacity-60 transition-opacity hover:opacity-100"
        aria-label="Close"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
