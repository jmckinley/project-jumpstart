/**
 * @module components/claude-md/Editor
 * @description Main CLAUDE.md editor view with split layout: textarea editor on the left, preview and suggestions on the right
 *
 * PURPOSE:
 * - Provide a textarea for editing CLAUDE.md content
 * - Display a live preview of the markdown content alongside the editor
 * - Show token count estimate in a header bar
 * - Allow saving edits and generating new CLAUDE.md content
 * - Surface improvement suggestions below the preview
 *
 * DEPENDENCIES:
 * - @/hooks/useClaudeMd - Hook for loading, saving, and generating CLAUDE.md content
 * - ./Preview - Markdown preview component
 * - ./Suggestions - Improvement suggestions panel
 *
 * EXPORTS:
 * - Editor - Main CLAUDE.md editor component
 *
 * PATTERNS:
 * - Calls loadContent() on mount via useEffect to fetch current CLAUDE.md
 * - Maintains local draft state so the textarea is a controlled component
 * - Syncs local draft from hook content when content loads or changes externally
 * - "Generate" button only appears when no CLAUDE.md exists (exists === false)
 * - Suggestions onApply appends the template snippet to the draft
 *
 * CLAUDE NOTES:
 * - The local draft state is separate from the hook's content to allow unsaved edits
 * - Token estimate in the header updates based on the draft, not the saved content
 * - generate() returns content but does NOT auto-save; user must click Save
 * - Loading spinner overlays the entire editor when loading is true
 * - Error banner appears at the top of the editor when error is non-null
 */

import { useCallback, useEffect, useState } from "react";
import { useClaudeMd } from "@/hooks/useClaudeMd";
import { Preview } from "./Preview";
import { Suggestions } from "./Suggestions";

export function Editor() {
  const {
    exists,
    content,
    tokenEstimate,
    loading,
    saving,
    error,
    loadContent,
    saveContent,
    generate,
  } = useClaudeMd();

  const [draft, setDraft] = useState("");
  const [dirty, setDirty] = useState(false);

  // Load content on mount
  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // Sync draft from loaded content
  useEffect(() => {
    setDraft(content);
    setDirty(false);
  }, [content]);

  const handleDraftChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setDraft(e.target.value);
      setDirty(true);
    },
    [],
  );

  const handleSave = useCallback(async () => {
    await saveContent(draft);
    setDirty(false);
  }, [draft, saveContent]);

  const handleGenerate = useCallback(async () => {
    const generated = await generate();
    if (generated !== null) {
      setDraft(generated);
      setDirty(true);
    }
  }, [generate]);

  const handleApplySuggestion = useCallback((template: string) => {
    setDraft((prev) => prev + template);
    setDirty(true);
  }, []);

  const draftTokenEstimate = dirty ? Math.ceil(draft.length / 4) : tokenEstimate;

  return (
    <div className="flex h-full flex-col bg-neutral-950">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-neutral-100">CLAUDE.md</h2>
          {dirty && (
            <span className="rounded bg-amber-900/50 px-2 py-0.5 text-xs text-amber-400">
              Unsaved
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500">
            ~{draftTokenEstimate.toLocaleString()} tokens
          </span>

          {!exists && !loading && (
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Generate
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="border-b border-red-900 bg-red-950 px-4 py-2">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Loading Overlay */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <svg
              className="h-8 w-8 animate-spin text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-sm text-neutral-400">Loading CLAUDE.md...</p>
          </div>
        </div>
      ) : (
        /* Split Pane: Editor (left) + Preview & Suggestions (right) */
        <div className="flex min-h-0 flex-1">
          {/* Left Pane: Textarea Editor */}
          <div className="flex flex-1 flex-col border-r border-neutral-800">
            <div className="border-b border-neutral-800 px-4 py-1.5">
              <span className="text-xs font-medium text-neutral-500">
                Editor
              </span>
            </div>
            <textarea
              value={draft}
              onChange={handleDraftChange}
              placeholder="# Project Name\n\nDescribe your project here..."
              spellCheck={false}
              className="flex-1 resize-none bg-neutral-950 p-4 font-mono text-sm leading-relaxed text-neutral-100 placeholder-neutral-600 focus:outline-none"
            />
          </div>

          {/* Right Pane: Preview + Suggestions */}
          <div className="flex w-1/2 flex-col gap-3 overflow-y-auto p-3">
            <div className="min-h-0 flex-1">
              <Preview content={draft} />
            </div>
            <Suggestions content={draft} onApply={handleApplySuggestion} />
          </div>
        </div>
      )}
    </div>
  );
}
