/**
 * @module hooks/useTeamTemplates
 * @description Custom hook for team template management, CRUD operations, and library integration
 *
 * PURPOSE:
 * - Manage team templates list state with loading/error tracking
 * - Provide CRUD actions for templates (create, update, delete)
 * - Track template usage analytics
 * - Support adding templates from the library
 * - Generate deploy output in different formats
 *
 * DEPENDENCIES:
 * - @/lib/tauri - listTeamTemplates, createTeamTemplate, updateTeamTemplate, deleteTeamTemplate, incrementTeamTemplateUsage, generateTeamDeployOutput
 * - @/stores/projectStore - Active project for scoping templates
 * - @/types/team-template - TeamTemplate, LibraryTeamTemplate, ProjectContext types
 *
 * EXPORTS:
 * - useTeamTemplates - Hook returning templates state and actions
 *
 * PATTERNS:
 * - Call loadTemplates() when the team templates section becomes active
 * - Templates are scoped to the active project
 * - Returns { templates, loading, error, loadTemplates, addTemplate, editTemplate, removeTemplate, bumpUsage, isTemplateAdded, addFromLibrary, generateOutput }
 *
 * CLAUDE NOTES:
 * - loadTemplates fetches templates scoped to the active project
 * - After add/edit/remove, the templates list is refreshed automatically
 * - isTemplateAdded checks by name (case-insensitive)
 * - addFromLibrary creates a template from a LibraryTeamTemplate object
 * - generateOutput calls the backend to produce deploy output (optionally with project context)
 */

import { useCallback, useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useToastStore } from "@/stores/toastStore";
import {
  listTeamTemplates,
  createTeamTemplate,
  updateTeamTemplate,
  deleteTeamTemplate,
  incrementTeamTemplateUsage,
  generateTeamDeployOutput,
} from "@/lib/tauri";
import type { TeamTemplate, LibraryTeamTemplate, TeammateDef, TeamTaskDef, TeamHookDef, ProjectContext } from "@/types/team-template";

interface TeamTemplatesState {
  templates: TeamTemplate[];
  loading: boolean;
  error: string | null;
}

export function useTeamTemplates() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const addToast = useToastStore((s) => s.addToast);

  const [state, setState] = useState<TeamTemplatesState>({
    templates: [],
    loading: false,
    error: null,
  });

  const loadTemplates = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const templates = await listTeamTemplates(activeProject?.id);
      setState((s) => ({ ...s, templates, loading: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load team templates",
      }));
    }
  }, [activeProject]);

  const addTemplate = useCallback(
    async (
      name: string,
      description: string,
      orchestrationPattern: string,
      category: string,
      teammates: TeammateDef[],
      tasks: TeamTaskDef[],
      hooks: TeamHookDef[],
      leadSpawnInstructions: string,
    ) => {
      try {
        await createTeamTemplate(
          name,
          description,
          orchestrationPattern,
          category,
          JSON.stringify(teammates),
          JSON.stringify(tasks),
          JSON.stringify(hooks),
          leadSpawnInstructions,
          activeProject?.id,
        );
        const templates = await listTeamTemplates(activeProject?.id);
        setState((s) => ({ ...s, templates, error: null }));
        addToast({ message: "Template created", type: "success" });
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : "Failed to create team template",
        }));
      }
    },
    [activeProject],
  );

  const editTemplate = useCallback(
    async (
      id: string,
      name: string,
      description: string,
      orchestrationPattern: string,
      category: string,
      teammates: TeammateDef[],
      tasks: TeamTaskDef[],
      hooks: TeamHookDef[],
      leadSpawnInstructions: string,
    ) => {
      try {
        await updateTeamTemplate(
          id,
          name,
          description,
          orchestrationPattern,
          category,
          JSON.stringify(teammates),
          JSON.stringify(tasks),
          JSON.stringify(hooks),
          leadSpawnInstructions,
        );
        const templates = await listTeamTemplates(activeProject?.id);
        setState((s) => ({ ...s, templates, error: null }));
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : "Failed to update team template",
        }));
      }
    },
    [activeProject],
  );

  const removeTemplate = useCallback(
    async (id: string) => {
      try {
        await deleteTeamTemplate(id);
        const templates = await listTeamTemplates(activeProject?.id);
        setState((s) => ({ ...s, templates, error: null }));
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : "Failed to delete team template",
        }));
      }
    },
    [activeProject],
  );

  const bumpUsage = useCallback(async (id: string) => {
    try {
      await incrementTeamTemplateUsage(id);
      setState((s) => ({
        ...s,
        templates: s.templates.map((t) =>
          t.id === id ? { ...t, usageCount: t.usageCount + 1 } : t,
        ),
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        error: err instanceof Error ? err.message : "Failed to increment template usage",
      }));
    }
  }, []);

  const isTemplateAdded = useCallback(
    (name: string): boolean => {
      return state.templates.some(
        (t) => t.name.toLowerCase() === name.toLowerCase(),
      );
    },
    [state.templates],
  );

  const addFromLibrary = useCallback(
    async (libraryTemplate: LibraryTeamTemplate) => {
      await addTemplate(
        libraryTemplate.name,
        libraryTemplate.description,
        libraryTemplate.orchestrationPattern,
        libraryTemplate.category,
        libraryTemplate.teammates,
        libraryTemplate.tasks,
        libraryTemplate.hooks,
        libraryTemplate.leadSpawnInstructions,
      );
    },
    [addTemplate],
  );

  const generateOutput = useCallback(
    async (template: TeamTemplate | LibraryTeamTemplate, format: string, projectContext?: ProjectContext): Promise<string | null> => {
      try {
        const templateJson = JSON.stringify(template);
        const contextJson = projectContext ? JSON.stringify(projectContext) : undefined;
        return await generateTeamDeployOutput(templateJson, format, contextJson);
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : "Failed to generate deploy output",
        }));
        return null;
      }
    },
    [],
  );

  return {
    ...state,
    loadTemplates,
    addTemplate,
    editTemplate,
    removeTemplate,
    bumpUsage,
    isTemplateAdded,
    addFromLibrary,
    generateOutput,
  };
}
