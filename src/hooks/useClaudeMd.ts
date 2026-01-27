/**
 * @module hooks/useClaudeMd
 * @description Custom hook for CLAUDE.md read, write, and generation operations
 *
 * PURPOSE:
 * - Load CLAUDE.md content from the active project path
 * - Write updated content back to disk
 * - Generate new CLAUDE.md from project template
 * - Track loading and error states
 *
 * DEPENDENCIES:
 * - @/lib/tauri - readClaudeMd, writeClaudeMd, generateClaudeMd IPC calls
 * - @/stores/projectStore - Active project for path and ID
 *
 * EXPORTS:
 * - useClaudeMd - Hook returning CLAUDE.md state and actions
 *
 * PATTERNS:
 * - Call loadContent() to fetch current CLAUDE.md
 * - Call saveContent() to persist edits
 * - Call generate() to create new content from template (does not auto-save)
 * - Returns { exists, content, tokenEstimate, loading, error, actions }
 *
 * CLAUDE NOTES:
 * - generate() returns content but does NOT write to disk; caller decides whether to save
 * - loadContent() should be called when the active project changes
 * - content is null until loadContent() is first called
 */

import { useCallback, useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { readClaudeMd, writeClaudeMd, generateClaudeMd } from "@/lib/tauri";

interface ClaudeMdState {
  exists: boolean;
  content: string;
  tokenEstimate: number;
  filePath: string;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

export function useClaudeMd() {
  const activeProject = useProjectStore((s) => s.activeProject);

  const [state, setState] = useState<ClaudeMdState>({
    exists: false,
    content: "",
    tokenEstimate: 0,
    filePath: "",
    loading: false,
    saving: false,
    error: null,
  });

  const loadContent = useCallback(async () => {
    if (!activeProject) return;

    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const info = await readClaudeMd(activeProject.path);
      setState((s) => ({
        ...s,
        exists: info.exists,
        content: info.content,
        tokenEstimate: info.tokenEstimate,
        filePath: info.path,
        loading: false,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to read CLAUDE.md",
      }));
    }
  }, [activeProject]);

  const saveContent = useCallback(
    async (content: string) => {
      if (!activeProject) return;

      setState((s) => ({ ...s, saving: true, error: null }));
      try {
        await writeClaudeMd(activeProject.path, content);
        setState((s) => ({
          ...s,
          exists: true,
          content,
          tokenEstimate: Math.ceil(content.length / 4),
          saving: false,
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          saving: false,
          error: err instanceof Error ? err.message : "Failed to save CLAUDE.md",
        }));
      }
    },
    [activeProject],
  );

  const generate = useCallback(async (): Promise<string | null> => {
    if (!activeProject) return null;

    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const content = await generateClaudeMd(activeProject.id);
      setState((s) => ({ ...s, loading: false }));
      return content;
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to generate CLAUDE.md",
      }));
      return null;
    }
  }, [activeProject]);

  return {
    ...state,
    loadContent,
    saveContent,
    generate,
  };
}
