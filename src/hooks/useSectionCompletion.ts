/**
 * @module hooks/useSectionCompletion
 * @description Tracks completion status for sidebar sections
 *
 * PURPOSE:
 * - Determine which sections have had actions taken
 * - Provide visual feedback in the sidebar via checkmarks
 * - Encourage users to complete setup across all sections
 *
 * DEPENDENCIES:
 * - @/stores/projectStore - Active project for IPC calls
 * - @/lib/tauri - IPC functions to check completion status
 *
 * EXPORTS:
 * - useSectionCompletion - Hook returning completion status for each section
 * - SectionCompletion - Type for the completion status map
 *
 * PATTERNS:
 * - Fetches completion status on mount and when active project changes
 * - Returns a map of section IDs to boolean completion status
 * - Sections without completion tracking return undefined
 *
 * CLAUDE NOTES:
 * - Dashboard, Context, and Settings don't have completion criteria
 * - CLAUDE.md: exists and has content
 * - Modules: at least one file has documentation
 * - Skills: at least one skill added
 * - Agents: at least one agent added
 * - RALPH: at least one loop started
 * - Enforcement: git hooks installed
 */

import { useEffect, useState, useCallback } from "react";
import { useProjectStore } from "@/stores/projectStore";
import {
  readClaudeMd,
  scanModules,
  listSkills,
  listAgents,
  listRalphLoops,
  getHookStatus,
} from "@/lib/tauri";

export interface SectionCompletion {
  "claude-md"?: boolean;
  modules?: boolean;
  skills?: boolean;
  agents?: boolean;
  ralph?: boolean;
  enforcement?: boolean;
}

export function useSectionCompletion() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const [completion, setCompletion] = useState<SectionCompletion>({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!activeProject) {
      setCompletion({});
      return;
    }

    setLoading(true);

    try {
      // Fetch all completion statuses in parallel
      const [claudeMdInfo, modules, skills, agents, loops, hookStatus] =
        await Promise.all([
          readClaudeMd(activeProject.path).catch(() => ({ exists: false, content: "" })),
          scanModules(activeProject.path).catch(() => []),
          listSkills(activeProject.id).catch(() => []),
          listAgents(activeProject.id).catch(() => []),
          listRalphLoops(activeProject.id).catch(() => []),
          getHookStatus(activeProject.path).catch(() => ({ installed: false, mode: null })),
        ]);

      // Determine completion status for each section
      const newCompletion: SectionCompletion = {
        "claude-md": claudeMdInfo.exists && claudeMdInfo.content.trim().length > 0,
        modules: modules.some((m) => m.status === "current"),
        skills: skills.length > 0,
        agents: agents.length > 0,
        ralph: loops.length > 0,
        enforcement: hookStatus.installed,
      };

      setCompletion(newCompletion);
    } catch (error) {
      console.error("Failed to check section completion:", error);
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  // Refresh on mount and when active project changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  return { completion, loading, refresh };
}
