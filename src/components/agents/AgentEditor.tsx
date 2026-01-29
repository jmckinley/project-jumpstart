/**
 * @module components/agents/AgentEditor
 * @description Editor panel for creating and editing agents with tier-specific fields
 *
 * PURPOSE:
 * - Provide a form for creating new agents or editing existing ones
 * - Show text inputs for name and description
 * - Show tier selector (basic/advanced)
 * - Show category selector
 * - Show textarea for instructions
 * - Show workflow editor for advanced agents
 * - Show tools editor for advanced agents
 * - Show trigger patterns input for advanced agents
 * - Provide AI enhancement with accept/reject workflow
 *
 * DEPENDENCIES:
 * - react (useState, useEffect) - Local form state and syncing from props
 * - @/types/agent - Agent, AgentTier, AgentCategory, AgentWorkflowStep, AgentTool
 * - @/data/agentCategories - AGENT_CATEGORIES for dropdown
 * - @/lib/tauri - enhanceAgentInstructions for AI enhancement
 * - @/stores/settingsStore - Check if API key is configured
 *
 * EXPORTS:
 * - AgentEditor - Agent editing form component
 *
 * PATTERNS:
 * - When agent prop is null, the form starts empty (create mode)
 * - When agent prop is provided, the form pre-fills with existing values (edit mode)
 * - Form state resets whenever the agent prop reference changes
 * - Advanced tier shows workflow/tools/triggers editors
 * - Save button is disabled when name is empty
 *
 * CLAUDE NOTES:
 * - The instructions textarea is intended for markdown
 * - useEffect syncs form state from agent prop
 * - The parent decides whether to call addAgent or editAgent based on id
 * - An agent with id="" is treated as pre-filled create (from library), not edit
 */

import { useState, useEffect } from "react";
import type { Agent, AgentTier, AgentCategory, AgentWorkflowStep, AgentTool } from "@/types/agent";
import { AGENT_CATEGORIES } from "@/data/agentCategories";
import { enhanceAgentInstructions } from "@/lib/tauri";
import { useSettingsStore } from "@/stores/settingsStore";
import { useProjectStore } from "@/stores/projectStore";

interface AgentEditorProps {
  agent: Agent | null;
  onSave: (
    name: string,
    description: string,
    tier: string,
    category: string,
    instructions: string,
    workflow: AgentWorkflowStep[] | null,
    tools: AgentTool[] | null,
    triggerPatterns: string[] | null,
  ) => void;
  onCancel: () => void;
}

export function AgentEditor({ agent, onSave, onCancel }: AgentEditorProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tier, setTier] = useState<AgentTier>("basic");
  const [category, setCategory] = useState<AgentCategory>("feature-development");
  const [instructions, setInstructions] = useState("");
  const [workflow, setWorkflow] = useState<AgentWorkflowStep[]>([]);
  const [tools, setTools] = useState<AgentTool[]>([]);
  const [triggerPatterns, setTriggerPatterns] = useState<string[]>([]);
  const [triggerInput, setTriggerInput] = useState("");

  // AI enhancement state
  const [enhancing, setEnhancing] = useState(false);
  const [enhancedContent, setEnhancedContent] = useState<string | null>(null);
  const [originalContent, setOriginalContent] = useState<string | null>(null);
  const [showingEnhanced, setShowingEnhanced] = useState(true);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);

  const hasApiKey = useSettingsStore((s) => s.hasApiKey);
  const activeProject = useProjectStore((s) => s.activeProject);

  // Sync form state when the selected agent changes
  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setDescription(agent.description);
      setTier(agent.tier as AgentTier);
      setCategory(agent.category as AgentCategory);
      setInstructions(agent.instructions);
      setWorkflow(agent.workflow ?? []);
      setTools(agent.tools ?? []);
      setTriggerPatterns(agent.triggerPatterns ?? []);
    } else {
      setName("");
      setDescription("");
      setTier("basic");
      setCategory("feature-development");
      setInstructions("");
      setWorkflow([]);
      setTools([]);
      setTriggerPatterns([]);
    }
    setTriggerInput("");
    setEnhancedContent(null);
    setOriginalContent(null);
    setShowingEnhanced(true);
    setEnhanceError(null);
  }, [agent]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(
      name.trim(),
      description.trim(),
      tier,
      category,
      instructions,
      tier === "advanced" && workflow.length > 0 ? workflow : null,
      tier === "advanced" && tools.length > 0 ? tools : null,
      tier === "advanced" && triggerPatterns.length > 0 ? triggerPatterns : null,
    );
  };

  const handleCancel = () => {
    setName("");
    setDescription("");
    setTier("basic");
    setCategory("feature-development");
    setInstructions("");
    setWorkflow([]);
    setTools([]);
    setTriggerPatterns([]);
    setEnhancedContent(null);
    setOriginalContent(null);
    setEnhanceError(null);
    onCancel();
  };

  const handleEnhance = async () => {
    if (!instructions.trim()) return;
    setEnhancing(true);
    setEnhanceError(null);
    setOriginalContent(instructions);

    try {
      const enhanced = await enhanceAgentInstructions(
        name,
        description,
        instructions,
        tier,
        category,
        activeProject?.language ?? null,
        activeProject?.framework ?? null,
      );
      setEnhancedContent(enhanced);
      setInstructions(enhanced);
      setShowingEnhanced(true);
    } catch (err) {
      setEnhanceError(err instanceof Error ? err.message : "Enhancement failed");
      setOriginalContent(null);
    } finally {
      setEnhancing(false);
    }
  };

  const handleAcceptEnhanced = () => {
    setEnhancedContent(null);
    setOriginalContent(null);
    setShowingEnhanced(true);
  };

  const handleRejectEnhanced = () => {
    if (originalContent !== null) {
      setInstructions(originalContent);
    }
    setEnhancedContent(null);
    setOriginalContent(null);
    setShowingEnhanced(true);
  };

  const handleToggleView = () => {
    if (showingEnhanced && originalContent !== null) {
      setInstructions(originalContent);
      setShowingEnhanced(false);
    } else if (!showingEnhanced && enhancedContent !== null) {
      setInstructions(enhancedContent);
      setShowingEnhanced(true);
    }
  };

  // Workflow helpers
  const addWorkflowStep = () => {
    setWorkflow([
      ...workflow,
      { step: workflow.length + 1, action: "", description: "" },
    ]);
  };

  const updateWorkflowStep = (index: number, field: "action" | "description", value: string) => {
    const updated = [...workflow];
    updated[index] = { ...updated[index], [field]: value };
    setWorkflow(updated);
  };

  const removeWorkflowStep = (index: number) => {
    const updated = workflow.filter((_, i) => i !== index);
    // Renumber steps
    setWorkflow(updated.map((step, i) => ({ ...step, step: i + 1 })));
  };

  // Tools helpers
  const addTool = () => {
    setTools([...tools, { name: "", description: "", required: false }]);
  };

  const updateTool = (index: number, field: "name" | "description" | "required", value: string | boolean) => {
    const updated = [...tools];
    updated[index] = { ...updated[index], [field]: value };
    setTools(updated);
  };

  const removeTool = (index: number) => {
    setTools(tools.filter((_, i) => i !== index));
  };

  // Trigger patterns helpers
  const addTriggerPattern = () => {
    const trimmed = triggerInput.trim();
    if (trimmed && !triggerPatterns.includes(trimmed)) {
      setTriggerPatterns([...triggerPatterns, trimmed]);
      setTriggerInput("");
    }
  };

  const removeTriggerPattern = (pattern: string) => {
    setTriggerPatterns(triggerPatterns.filter((p) => p !== pattern));
  };

  const isEditing = agent !== null && agent.id !== "";
  const canSave = name.trim().length > 0;
  const canEnhance = instructions.trim().length > 0 && !enhancing;
  const isReviewing = enhancedContent !== null && originalContent !== null;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
      <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-neutral-400">
        {isEditing ? "Edit Agent" : "New Agent"}
      </h3>

      <div className="space-y-4">
        {/* Name field */}
        <div>
          <label htmlFor="agent-name" className="mb-1.5 block text-xs font-medium text-neutral-400">
            Name
          </label>
          <input
            id="agent-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Unit Test Writer"
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-400 outline-none transition-colors focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>

        {/* Description field */}
        <div>
          <label htmlFor="agent-description" className="mb-1.5 block text-xs font-medium text-neutral-400">
            Description
          </label>
          <input
            id="agent-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of what this agent does"
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-400 outline-none transition-colors focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>

        {/* Tier and Category row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="agent-tier" className="mb-1.5 block text-xs font-medium text-neutral-400">
              Tier
            </label>
            <select
              id="agent-tier"
              value={tier}
              onChange={(e) => setTier(e.target.value as AgentTier)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 outline-none transition-colors focus:border-blue-600"
            >
              <option value="basic">Basic</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div>
            <label htmlFor="agent-category" className="mb-1.5 block text-xs font-medium text-neutral-400">
              Category
            </label>
            <select
              id="agent-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as AgentCategory)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 outline-none transition-colors focus:border-blue-600"
            >
              {AGENT_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Instructions textarea */}
        <div>
          <label htmlFor="agent-instructions" className="mb-1.5 block text-xs font-medium text-neutral-400">
            Instructions (Markdown)
          </label>
          <textarea
            id="agent-instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Write agent instructions in markdown..."
            rows={10}
            className="w-full resize-y rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 font-mono text-sm text-neutral-200 placeholder-neutral-400 outline-none transition-colors focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>

        {/* AI Enhancement section */}
        {enhanceError && (
          <div className="rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">
            {enhanceError}
          </div>
        )}

        {isReviewing ? (
          <div className="flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-800/50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-neutral-400">Viewing:</span>
              <button onClick={handleToggleView} className="text-blue-400 hover:text-blue-300 hover:underline">
                {showingEnhanced ? "Enhanced" : "Original"}
              </button>
              <span className="text-neutral-600">|</span>
              <button onClick={handleToggleView} className="text-neutral-400 hover:text-neutral-200">
                Switch to {showingEnhanced ? "Original" : "Enhanced"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRejectEnhanced}
                className="rounded-md border border-red-800 bg-red-950/30 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-950/50"
              >
                Reject
              </button>
              <button
                onClick={handleAcceptEnhanced}
                className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-500"
              >
                Accept
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="text-xs text-neutral-500">
              {!hasApiKey && "Set API key in Settings to enable AI enhancement"}
            </div>
            <button
              onClick={handleEnhance}
              disabled={!canEnhance || !hasApiKey}
              title={!hasApiKey ? "Set API key in Settings" : "Enhance instructions with AI"}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                canEnhance && hasApiKey
                  ? "border-blue-700 bg-blue-950/30 text-blue-400 hover:bg-blue-950/50"
                  : "cursor-not-allowed border-neutral-700 bg-neutral-800 text-neutral-500"
              }`}
            >
              {enhancing ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Enhancing...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                    />
                  </svg>
                  Enhance with AI
                </>
              )}
            </button>
          </div>
        )}

        {/* Advanced tier fields */}
        {tier === "advanced" && (
          <>
            {/* Workflow steps */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-400">Workflow Steps</label>
                <button
                  onClick={addWorkflowStep}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  + Add Step
                </button>
              </div>
              {workflow.length === 0 ? (
                <p className="text-xs text-neutral-500">No workflow steps defined.</p>
              ) : (
                <div className="space-y-2">
                  {workflow.map((step, index) => (
                    <div key={index} className="flex gap-2 rounded-md border border-neutral-700 bg-neutral-800 p-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-900/40 text-xs text-purple-400">
                        {step.step}
                      </span>
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          value={step.action}
                          onChange={(e) => updateWorkflowStep(index, "action", e.target.value)}
                          placeholder="Action name"
                          className="w-full rounded border border-neutral-600 bg-neutral-700 px-2 py-1 text-sm text-neutral-200"
                        />
                        <input
                          type="text"
                          value={step.description}
                          onChange={(e) => updateWorkflowStep(index, "description", e.target.value)}
                          placeholder="Step description"
                          className="w-full rounded border border-neutral-600 bg-neutral-700 px-2 py-1 text-sm text-neutral-200"
                        />
                      </div>
                      <button
                        onClick={() => removeWorkflowStep(index)}
                        className="text-neutral-500 hover:text-red-400"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tools */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-400">Tools</label>
                <button onClick={addTool} className="text-xs text-blue-400 hover:text-blue-300">
                  + Add Tool
                </button>
              </div>
              {tools.length === 0 ? (
                <p className="text-xs text-neutral-500">No tools defined.</p>
              ) : (
                <div className="space-y-2">
                  {tools.map((tool, index) => (
                    <div key={index} className="flex gap-2 rounded-md border border-neutral-700 bg-neutral-800 p-2">
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          value={tool.name}
                          onChange={(e) => updateTool(index, "name", e.target.value)}
                          placeholder="Tool name"
                          className="w-full rounded border border-neutral-600 bg-neutral-700 px-2 py-1 text-sm text-neutral-200"
                        />
                        <input
                          type="text"
                          value={tool.description}
                          onChange={(e) => updateTool(index, "description", e.target.value)}
                          placeholder="Tool description"
                          className="w-full rounded border border-neutral-600 bg-neutral-700 px-2 py-1 text-sm text-neutral-200"
                        />
                      </div>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={tool.required}
                          onChange={(e) => updateTool(index, "required", e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-xs text-neutral-400">Req</span>
                      </label>
                      <button
                        onClick={() => removeTool(index)}
                        className="text-neutral-500 hover:text-red-400"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Trigger patterns */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-400">
                Trigger Patterns
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={triggerInput}
                  onChange={(e) => setTriggerInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTriggerPattern())}
                  placeholder="Type pattern and press Enter"
                  className="flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-400 outline-none focus:border-blue-600"
                />
                <button
                  onClick={addTriggerPattern}
                  className="rounded-md bg-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-600"
                >
                  Add
                </button>
              </div>
              {triggerPatterns.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {triggerPatterns.map((pattern) => (
                    <span
                      key={pattern}
                      className="inline-flex items-center gap-1 rounded-full bg-purple-900/30 px-2 py-0.5 text-xs text-purple-400"
                    >
                      "{pattern}"
                      <button onClick={() => removeTriggerPattern(pattern)} className="hover:text-purple-200">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-neutral-800 pt-4">
          <button
            onClick={handleCancel}
            className="rounded-md border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-600 hover:bg-neutral-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              canSave
                ? "bg-blue-600 text-white hover:bg-blue-500"
                : "cursor-not-allowed bg-neutral-800 text-neutral-600"
            }`}
          >
            {isEditing ? "Save Changes" : "Create Agent"}
          </button>
        </div>
      </div>
    </div>
  );
}
