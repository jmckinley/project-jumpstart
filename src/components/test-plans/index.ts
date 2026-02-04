/**
 * @module components/test-plans/index
 * @description Barrel file for test plan components
 *
 * PURPOSE:
 * - Re-export all test plan components for easy importing
 * - Provide a single import point for the test plans feature
 *
 * EXPORTS:
 * - TestPlansList - List of test plans with status badges
 * - TestPlanEditor - Form for creating/editing test plans
 * - TestCasesList - List of test cases with filters
 * - TestCaseEditor - Form for creating/editing test cases
 * - TestCasesManager - Filterable test cases list for managing large numbers of cases
 * - TestRunProgress - Live test execution progress
 * - TestRunHistory - Historical test runs
 * - TestCoverageChart - SVG coverage trend chart
 * - TestSuggestions - AI-generated test suggestions
 * - TDDWorkflow - Guided TDD workflow panel
 * - TDDPhaseCard - Individual TDD phase card
 * - SubagentGenerator - Generate subagent configurations
 * - HooksGenerator - Generate PostToolUse hooks
 *
 * PATTERNS:
 * - Import from '@/components/test-plans' for all components
 *
 * CLAUDE NOTES:
 * - All components follow the project's React patterns
 * - Components use Tailwind for styling
 * - Props interfaces defined in each component file
 */

export { TestPlansList } from "./TestPlansList";
export { TestPlanEditor } from "./TestPlanEditor";
export { TestCasesList } from "./TestCasesList";
export { TestCaseEditor } from "./TestCaseEditor";
export { TestCasesManager } from "./TestCasesManager";
export { TestRunProgress } from "./TestRunProgress";
export { TestRunHistory } from "./TestRunHistory";
export { TestCoverageChart } from "./TestCoverageChart";
export { TestSuggestions } from "./TestSuggestions";
export { TDDWorkflow } from "./TDDWorkflow";
export { TDDPhaseCard } from "./TDDPhaseCard";
export { SubagentGenerator } from "./SubagentGenerator";
export { HooksGenerator } from "./HooksGenerator";
