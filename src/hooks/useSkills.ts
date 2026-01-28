/**
 * @module hooks/useSkills
 * @description Custom hook for skills management, CRUD operations, and pattern detection
 *
 * PURPOSE:
 * - Manage skills list state with loading/error tracking
 * - Provide CRUD actions for skills (create, update, delete)
 * - Detect project patterns that can become skills
 * - Track skill usage analytics
 *
 * DEPENDENCIES:
 * - @/lib/tauri - listSkills, createSkill, updateSkill, deleteSkill, detectPatterns, incrementSkillUsage IPC calls
 * - @/stores/projectStore - Active project for scoping skills
 * - @/types/skill - Skill, Pattern types
 *
 * EXPORTS:
 * - useSkills - Hook returning skills state and actions
 *
 * PATTERNS:
 * - Call loadSkills() when the skills section becomes active
 * - Call detectProjectPatterns() to refresh pattern suggestions
 * - Skills are scoped to the active project
 * - Returns { skills, patterns, loading, error, loadSkills, addSkill, editSkill, removeSkill, detectProjectPatterns, bumpUsage }
 *
 * CLAUDE NOTES:
 * - loadSkills fetches skills scoped to the active project
 * - detectProjectPatterns analyzes the project directory for patterns
 * - After addSkill/editSkill/removeSkill, the skills list is refreshed automatically
 */

import { useCallback, useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import {
  listSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  detectPatterns,
  incrementSkillUsage,
} from "@/lib/tauri";
import type { Skill, Pattern } from "@/types/skill";

interface SkillsState {
  skills: Skill[];
  patterns: Pattern[];
  loading: boolean;
  detecting: boolean;
  error: string | null;
}

export function useSkills() {
  const activeProject = useProjectStore((s) => s.activeProject);

  const [state, setState] = useState<SkillsState>({
    skills: [],
    patterns: [],
    loading: false,
    detecting: false,
    error: null,
  });

  const loadSkills = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const skills = await listSkills(activeProject?.id);
      setState((s) => ({ ...s, skills, loading: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load skills",
      }));
    }
  }, [activeProject]);

  const addSkill = useCallback(
    async (name: string, description: string, content: string) => {
      try {
        await createSkill(name, description, content, activeProject?.id);
        // Refresh list
        const skills = await listSkills(activeProject?.id);
        setState((s) => ({ ...s, skills, error: null }));
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : "Failed to create skill",
        }));
      }
    },
    [activeProject],
  );

  const editSkill = useCallback(
    async (id: string, name: string, description: string, content: string) => {
      try {
        await updateSkill(id, name, description, content);
        const skills = await listSkills(activeProject?.id);
        setState((s) => ({ ...s, skills, error: null }));
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : "Failed to update skill",
        }));
      }
    },
    [activeProject],
  );

  const removeSkill = useCallback(
    async (id: string) => {
      try {
        await deleteSkill(id);
        const skills = await listSkills(activeProject?.id);
        setState((s) => ({ ...s, skills, error: null }));
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : "Failed to delete skill",
        }));
      }
    },
    [activeProject],
  );

  const detectProjectPatterns = useCallback(async () => {
    if (!activeProject) return;

    setState((s) => ({ ...s, detecting: true, error: null }));
    try {
      const patterns = await detectPatterns(activeProject.path);
      setState((s) => ({ ...s, patterns, detecting: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        detecting: false,
        error:
          err instanceof Error ? err.message : "Failed to detect patterns",
      }));
    }
  }, [activeProject]);

  const bumpUsage = useCallback(async (id: string) => {
    try {
      await incrementSkillUsage(id);
      setState((s) => ({
        ...s,
        skills: s.skills.map((sk) =>
          sk.id === id ? { ...sk, usageCount: sk.usageCount + 1 } : sk,
        ),
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        error:
          err instanceof Error
            ? err.message
            : "Failed to increment skill usage",
      }));
    }
  }, []);

  return {
    ...state,
    loadSkills,
    addSkill,
    editSkill,
    removeSkill,
    detectProjectPatterns,
    bumpUsage,
  };
}
