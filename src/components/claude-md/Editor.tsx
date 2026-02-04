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
 * - EditorProps - Props interface with optional onSave callback
 *
 * PATTERNS:
 * - Calls loadContent() on mount via useEffect to fetch current CLAUDE.md
 * - Maintains local draft state so the textarea is a controlled component
 * - Syncs local draft from hook content when content loads or changes externally
 * - "Regen fresh CLAUDE.md" button is always visible and prominent
 * - Shows confirmation dialog when generating would replace existing content
 * - Suggestions onApply appends the template snippet to the draft
 *
 * CLAUDE NOTES:
 * - The local draft state is separate from the hook's content to allow unsaved edits
 * - Token estimate in the header updates based on the draft, not the saved content
 * - generate() returns content but does NOT auto-save; user must click Save
 * - Loading spinner overlays the entire editor when loading is true
 * - Error banner appears at the top of the editor when error is non-null
 * - Confirmation dialog prevents accidental overwrites of existing content
 */

import { useCallback, useEffect, useState } from "react";
import { useClaudeMd } from "@/hooks/useClaudeMd";
import { useProjectStore } from "@/stores/projectStore";
import { Preview } from "./Preview";
import { Suggestions } from "./Suggestions";

interface EditorProps {
  onSave?: () => void;
}

export function Editor({ onSave }: EditorProps) {
  const activeProject = useProjectStore((s) => s.activeProject);
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
  const [generating, setGenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
    setSaveError(null);
    try {
      await saveContent(draft);
      setDirty(false);
      onSave?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save";
      setSaveError(message);
      console.error("Failed to save CLAUDE.md:", err);
    }
  }, [draft, saveContent, onSave]);

  const handleGenerateClick = useCallback(() => {
    // If content exists, show confirmation first
    if (exists && draft.trim().length > 0) {
      setShowConfirm(true);
    } else {
      handleGenerateConfirmed();
    }
  }, [exists, draft]);

  const handleGenerateConfirmed = useCallback(async () => {
    setShowConfirm(false);
    setGenerating(true);
    try {
      const generated = await generate();
      if (generated !== null) {
        setDraft(generated);
        setDirty(true);
      }
    } finally {
      setGenerating(false);
    }
  }, [generate]);

  const handleCancelGenerate = useCallback(() => {
    setShowConfirm(false);
  }, []);

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
          <span className="text-xs text-neutral-500">
            ~{draftTokenEstimate.toLocaleString()} tokens
          </span>
        </div>

        <div className="flex items-center gap-3">
          {dirty ? (
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          ) : (
            <span className="rounded-md border border-neutral-700 bg-neutral-800 px-4 py-1.5 text-xs font-medium text-neutral-500">
              Saved
            </span>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="border-b border-amber-900 bg-amber-950/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-300">Replace existing content?</p>
              <p className="text-xs text-amber-400/70">
                This will replace your current CLAUDE.md with a fresh template based on your project settings.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelGenerate}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-neutral-400 transition-colors hover:text-neutral-200"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateConfirmed}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
              >
                Replace & Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {(error || saveError) && (
        <div className="border-b border-red-900 bg-red-950 px-4 py-2">
          <p className="text-xs text-red-400">{error || saveError}</p>
        </div>
      )}

      {/* No Project Selected */}
      {!activeProject && !loading && (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-neutral-400">No project selected</p>
            <p className="text-xs text-neutral-500">Select a project from the sidebar to edit its CLAUDE.md</p>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {activeProject && loading ? (
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
      ) : activeProject ? (
        /* Split Pane: Editor (left) + Preview & Suggestions (right) */
        <div className="flex min-h-0 flex-1">
          {/* Left Pane: Textarea Editor */}
          <div className="flex flex-1 flex-col border-r border-neutral-800">
            <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-1.5">
              <span className="text-xs font-medium text-neutral-500">
                Editor
              </span>
              <button
                onClick={handleGenerateClick}
                disabled={loading || generating}
                className="flex items-center gap-1.5 rounded-md border border-emerald-700 bg-emerald-900/30 px-2.5 py-1 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-900/50 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {generating ? "Generating..." : "Regen Using AI"}
              </button>
            </div>
            <textarea
              value={draft}
              onChange={handleDraftChange}
              placeholder="# Project Name\n\nDescribe your project here..."
              spellCheck={false}
              className="flex-1 resize-none bg-neutral-950 p-4 font-mono text-sm leading-relaxed text-neutral-100 placeholder-neutral-400 focus:outline-none"
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
      ) : null}
    </div>
  );
}
