/**
 * @module hooks/useAgents
 * @description Custom hook for agents management, CRUD operations, and library integration
 *
 * PURPOSE:
 * - Manage agents list state with loading/error tracking
 * - Provide CRUD actions for agents (create, update, delete)
 * - Track agent usage analytics
 * - Support adding agents from the library
 *
 * DEPENDENCIES:
 * - @/lib/tauri - listAgents, createAgent, updateAgent, deleteAgent, incrementAgentUsage IPC calls
 * - @/stores/projectStore - Active project for scoping agents
 * - @/types/agent - Agent, LibraryAgent types
 *
 * EXPORTS:
 * - useAgents - Hook returning agents state and actions
 *
 * PATTERNS:
 * - Call loadAgents() when the agents section becomes active
 * - Agents are scoped to the active project
 * - Returns { agents, loading, error, loadAgents, addAgent, editAgent, removeAgent, bumpUsage, isAgentAdded, addFromLibrary }
 *
 * CLAUDE NOTES:
 * - loadAgents fetches agents scoped to the active project
 * - After addAgent/editAgent/removeAgent, the agents list is refreshed automatically
 * - isAgentAdded checks by name (case-insensitive)
 * - addFromLibrary creates an agent from a LibraryAgent object
 */

import { useCallback, useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import {
  listAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  incrementAgentUsage,
} from "@/lib/tauri";
import type { Agent, LibraryAgent, AgentWorkflowStep, AgentTool } from "@/types/agent";

interface AgentsState {
  agents: Agent[];
  loading: boolean;
  error: string | null;
}

export function useAgents() {
  const activeProject = useProjectStore((s) => s.activeProject);

  const [state, setState] = useState<AgentsState>({
    agents: [],
    loading: false,
    error: null,
  });

  const loadAgents = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const agents = await listAgents(activeProject?.id);
      setState((s) => ({ ...s, agents, loading: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load agents",
      }));
    }
  }, [activeProject]);

  const addAgent = useCallback(
    async (
      name: string,
      description: string,
      tier: string,
      category: string,
      instructions: string,
      workflow: AgentWorkflowStep[] | null,
      tools: AgentTool[] | null,
      triggerPatterns: string[] | null,
    ) => {
      try {
        await createAgent(
          name,
          description,
          tier,
          category,
          instructions,
          workflow,
          tools,
          triggerPatterns,
          activeProject?.id,
        );
        // Refresh list
        const agents = await listAgents(activeProject?.id);
        setState((s) => ({ ...s, agents, error: null }));
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : "Failed to create agent",
        }));
      }
    },
    [activeProject],
  );

  const editAgent = useCallback(
    async (
      id: string,
      name: string,
      description: string,
      tier: string,
      category: string,
      instructions: string,
      workflow: AgentWorkflowStep[] | null,
      tools: AgentTool[] | null,
      triggerPatterns: string[] | null,
    ) => {
      try {
        await updateAgent(
          id,
          name,
          description,
          tier,
          category,
          instructions,
          workflow,
          tools,
          triggerPatterns,
        );
        const agents = await listAgents(activeProject?.id);
        setState((s) => ({ ...s, agents, error: null }));
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : "Failed to update agent",
        }));
      }
    },
    [activeProject],
  );

  const removeAgent = useCallback(
    async (id: string) => {
      try {
        await deleteAgent(id);
        const agents = await listAgents(activeProject?.id);
        setState((s) => ({ ...s, agents, error: null }));
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : "Failed to delete agent",
        }));
      }
    },
    [activeProject],
  );

  const bumpUsage = useCallback(async (id: string) => {
    try {
      await incrementAgentUsage(id);
      setState((s) => ({
        ...s,
        agents: s.agents.map((ag) =>
          ag.id === id ? { ...ag, usageCount: ag.usageCount + 1 } : ag,
        ),
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        error:
          err instanceof Error
            ? err.message
            : "Failed to increment agent usage",
      }));
    }
  }, []);

  /**
   * Check if an agent with the given name already exists (case-insensitive).
   */
  const isAgentAdded = useCallback(
    (name: string): boolean => {
      return state.agents.some(
        (a) => a.name.toLowerCase() === name.toLowerCase(),
      );
    },
    [state.agents],
  );

  /**
   * Add an agent from the library catalog.
   */
  const addFromLibrary = useCallback(
    async (libraryAgent: LibraryAgent) => {
      await addAgent(
        libraryAgent.name,
        libraryAgent.description,
        libraryAgent.tier,
        libraryAgent.category,
        libraryAgent.instructions,
        libraryAgent.workflow ?? null,
        libraryAgent.tools ?? null,
        libraryAgent.triggerPatterns ?? null,
      );
    },
    [addAgent],
  );

  return {
    ...state,
    loadAgents,
    addAgent,
    editAgent,
    removeAgent,
    bumpUsage,
    isAgentAdded,
    addFromLibrary,
  };
}
