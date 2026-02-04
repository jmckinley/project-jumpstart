/**
 * @module components/layout/PageHelp
 * @description Contextual per-page help popover with first-time auto-expand
 *
 * PURPOSE:
 * - Provide inline help for each page/section
 * - Auto-expand for first-time visitors, dismissible
 * - Show concepts, tips, and quick-start guidance
 *
 * DEPENDENCIES:
 * - react (useState, useEffect, useRef) - State and click-outside handling
 * - @/lib/tauri (getSetting, saveSetting) - Persist dismissed state
 *
 * EXPORTS:
 * - PageHelp - Help icon with expandable popover
 * - PageHelpContent - Type for help content structure
 *
 * PATTERNS:
 * - Click ? icon to toggle help popover
 * - First visit auto-expands
 * - Any close action (X, "Got it", click outside) permanently dismisses
 * - Content: description, concepts (term/definition), tips
 *
 * CLAUDE NOTES:
 * - Dismissed state stored in settings as "help_dismissed_{pageId}"
 * - All close actions persist dismissal (user preference: Option A)
 * - Positioned relative to header, expands down-left
 */

import { useState, useEffect, useRef } from "react";
import { getSetting, saveSetting } from "@/lib/tauri";

export interface PageHelpContent {
  title: string;
  description: string;
  concepts?: { term: string; definition: string }[];
  tips?: string[];
  learnMoreUrl?: string;
}

interface PageHelpProps {
  pageId: string;
  content: PageHelpContent;
}

export function PageHelp({ pageId, content }: PageHelpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasDismissed, setHasDismissed] = useState<boolean | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Check if user has dismissed this page's help before
  useEffect(() => {
    const checkDismissed = async () => {
      try {
        const dismissed = await getSetting(`help_dismissed_${pageId}`);
        setHasDismissed(dismissed === "true");
        // Auto-expand for first-time visitors
        if (dismissed !== "true") {
          setIsOpen(true);
        }
      } catch {
        // Setting doesn't exist yet, show help
        setHasDismissed(false);
        setIsOpen(true);
      }
    };
    checkDismissed();
  }, [pageId]);

  // Close on click outside (also permanently dismisses)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHasDismissed(true);
        saveSetting(`help_dismissed_${pageId}`, "true").catch(() => {});
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleClose = async () => {
    setIsOpen(false);
    setHasDismissed(true);
    try {
      await saveSetting(`help_dismissed_${pageId}`, "true");
    } catch {
      // Non-critical, continue
    }
  };

  // Don't render until we know dismissed state
  if (hasDismissed === null) return null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
          isOpen
            ? "bg-blue-500/20 text-blue-400"
            : "text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
        }`}
        title="Page help"
        aria-label="Show page help"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-neutral-700 bg-neutral-850 shadow-xl"
          style={{ backgroundColor: "#1a1a1a" }}
        >
          {/* Header */}
          <div className="border-b border-neutral-700 px-4 py-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-neutral-100">{content.title}</h4>
              <button
                onClick={handleClose}
                className="text-neutral-500 hover:text-neutral-300"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-xs text-neutral-400">{content.description}</p>
          </div>

          {/* Concepts */}
          {content.concepts && content.concepts.length > 0 && (
            <div className="border-b border-neutral-700 px-4 py-3">
              <h5 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                Key Concepts
              </h5>
              <dl className="space-y-1.5">
                {content.concepts.map((concept) => (
                  <div key={concept.term}>
                    <dt className="text-xs font-medium text-neutral-300">{concept.term}</dt>
                    <dd className="text-xs text-neutral-500">{concept.definition}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Tips */}
          {content.tips && content.tips.length > 0 && (
            <div className="border-b border-neutral-700 px-4 py-3">
              <h5 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                Quick Tips
              </h5>
              <ul className="space-y-1">
                {content.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-neutral-400">
                    <span className="mt-0.5 text-blue-400">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2">
            {content.learnMoreUrl ? (
              <a
                href={content.learnMoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Learn more →
              </a>
            ) : (
              <span />
            )}
            {!hasDismissed && (
              <button
                onClick={handleClose}
                className="rounded bg-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-600"
              >
                Got it
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
