/**
 * @module components/team-templates/index
 * @description Barrel file for team template components
 *
 * PURPOSE:
 * - Re-export all team template components for easy importing
 * - Provide a single import point for the team templates feature
 *
 * EXPORTS:
 * - TeamCategoryFilter - Orchestration pattern and category filter pills
 * - TeamTemplateCard - Grid card for a single library template
 * - TeamTemplateDetail - Detail panel for selected template
 * - TeamTemplateLibrary - Main library orchestrator view
 * - TeamTemplatesList - Saved project templates list
 * - TeamTemplateEditor - Template create/edit form
 * - TeamDeployOutput - Deploy output with format selector and preview
 *
 * PATTERNS:
 * - Import from '@/components/team-templates' for all components
 *
 * CLAUDE NOTES:
 * - All components follow the project's React patterns
 * - Components use Tailwind for styling
 * - Props interfaces defined in each component file
 */

export { TeamCategoryFilter } from "./TeamCategoryFilter";
export { TeamTemplateCard } from "./TeamTemplateCard";
export { TeamTemplateDetail } from "./TeamTemplateDetail";
export { TeamTemplateLibrary } from "./TeamTemplateLibrary";
export { TeamTemplatesList } from "./TeamTemplatesList";
export { TeamTemplateEditor } from "./TeamTemplateEditor";
export { TeamDeployOutput } from "./TeamDeployOutput";
