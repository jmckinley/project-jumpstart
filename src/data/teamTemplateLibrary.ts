/**
 * @module data/teamTemplateLibrary
 * @description Curated catalog of pre-built team templates for the team library
 *
 * PURPOSE:
 * - Provide 8 high-quality, ready-to-deploy team compositions
 * - Cover common development workflows with coordinated teammates
 * - Demonstrate different orchestration patterns (leader, pipeline, parallel, swarm, council)
 *
 * DEPENDENCIES:
 * - @/types/team-template - LibraryTeamTemplate type
 *
 * EXPORTS:
 * - TEAM_TEMPLATE_LIBRARY - Array of LibraryTeamTemplate objects (8 templates)
 *
 * PATTERNS:
 * - Each template has a unique slug, orchestration pattern, and category
 * - Templates include full spawn prompts for each teammate
 * - Tasks include dependency chains via blockedBy
 * - Templates are tagged with relevant TechTags for relevance scoring
 * - "universal" tag indicates templates that apply to all projects
 *
 * CLAUDE NOTES:
 * - Keep spawn prompts specific and actionable
 * - Tasks should form a logical dependency graph
 * - Lead instructions describe the coordinator's role
 */

import type { LibraryTeamTemplate } from "@/types/team-template";

export const TEAM_TEMPLATE_LIBRARY: LibraryTeamTemplate[] = [
  // 1. Full Stack Feature Team (leader pattern)
  {
    slug: "full-stack-feature-team",
    name: "Full Stack Feature Team",
    description: "Architect-led team with frontend, backend, and test specialists for end-to-end feature delivery",
    orchestrationPattern: "leader",
    category: "feature-development",
    tags: ["universal"],
    teammates: [
      {
        role: "Architect",
        description: "Designs the feature architecture and coordinates implementation",
        spawnPrompt: "You are the Architect for this feature. Your job is to:\n1. Analyze the feature requirements\n2. Design the data model, API contracts, and component structure\n3. Create tasks for Frontend Dev, Backend Dev, and Test Writer\n4. Review their work and ensure consistency\n5. Resolve any integration issues\n\nStart by reading the project's CLAUDE.md and understanding the codebase structure.",
      },
      {
        role: "Frontend Dev",
        description: "Implements UI components and client-side logic",
        spawnPrompt: "You are the Frontend Developer. Your job is to:\n1. Implement React/UI components based on the Architect's design\n2. Handle state management and data fetching\n3. Ensure responsive design and accessibility\n4. Follow existing component patterns in the codebase\n\nWait for the Architect to create your tasks before starting.",
      },
      {
        role: "Backend Dev",
        description: "Implements API endpoints and business logic",
        spawnPrompt: "You are the Backend Developer. Your job is to:\n1. Implement API endpoints and data models based on the Architect's design\n2. Handle validation, error cases, and edge conditions\n3. Write database migrations if needed\n4. Follow existing backend patterns in the codebase\n\nWait for the Architect to create your tasks before starting.",
      },
      {
        role: "Test Writer",
        description: "Writes tests for all new code",
        spawnPrompt: "You are the Test Writer. Your job is to:\n1. Write unit tests for new functions and components\n2. Write integration tests for API endpoints\n3. Ensure edge cases and error conditions are covered\n4. Run all tests and fix any failures\n\nWait for implementation tasks to complete before writing tests.",
      },
    ],
    tasks: [
      {
        id: "design",
        title: "Design feature architecture",
        description: "Create data model, API contracts, and component structure",
        assignedTo: "Architect",
        blockedBy: [],
      },
      {
        id: "backend",
        title: "Implement backend API",
        description: "Build API endpoints and data layer",
        assignedTo: "Backend Dev",
        blockedBy: ["design"],
      },
      {
        id: "frontend",
        title: "Implement frontend UI",
        description: "Build React components and wire up to API",
        assignedTo: "Frontend Dev",
        blockedBy: ["design"],
      },
      {
        id: "tests",
        title: "Write comprehensive tests",
        description: "Unit and integration tests for all new code",
        assignedTo: "Test Writer",
        blockedBy: ["backend", "frontend"],
      },
    ],
    hooks: [],
    leadSpawnInstructions: "You are the lead agent coordinating a Full Stack Feature Team. Spawn the Architect first, then let them create and assign tasks to other teammates. Monitor progress and resolve blockers.",
  },

  // 2. TDD Pipeline Team (pipeline pattern)
  {
    slug: "tdd-pipeline-team",
    name: "TDD Pipeline Team",
    description: "Sequential red-green-refactor pipeline with dedicated specialists for each TDD phase",
    orchestrationPattern: "pipeline",
    category: "testing",
    tags: ["universal"],
    teammates: [
      {
        role: "Test Designer",
        description: "Writes failing tests first (RED phase)",
        spawnPrompt: "You are the Test Designer in a TDD pipeline. Your job is to:\n1. Analyze the feature requirements\n2. Write comprehensive failing tests that define the expected behavior\n3. Ensure tests fail for the RIGHT reason (not syntax errors)\n4. Include edge cases and error conditions\n5. Mark your task complete when all tests are written and failing\n\nWrite tests BEFORE any implementation exists.",
      },
      {
        role: "Implementer",
        description: "Writes minimal code to pass tests (GREEN phase)",
        spawnPrompt: "You are the Implementer in a TDD pipeline. Your job is to:\n1. Read the failing tests written by the Test Designer\n2. Write the MINIMUM code needed to make all tests pass\n3. Do NOT over-engineer or add features not tested\n4. Run tests after each change to verify progress\n5. Mark your task complete when all tests pass\n\nDo not refactor — that's the next phase.",
      },
      {
        role: "Refactorer",
        description: "Cleans up code while keeping tests green (REFACTOR phase)",
        spawnPrompt: "You are the Refactorer in a TDD pipeline. Your job is to:\n1. Review the implementation for code quality issues\n2. Extract duplicated code, improve naming, simplify logic\n3. Run tests after EVERY change to ensure they still pass\n4. Add documentation headers following project conventions\n5. Mark complete when code is clean and all tests pass\n\nNever break existing tests.",
      },
    ],
    tasks: [
      {
        id: "red",
        title: "Write failing tests (RED)",
        description: "Design and write comprehensive failing tests for the feature",
        assignedTo: "Test Designer",
        blockedBy: [],
      },
      {
        id: "green",
        title: "Make tests pass (GREEN)",
        description: "Write minimal implementation to pass all tests",
        assignedTo: "Implementer",
        blockedBy: ["red"],
      },
      {
        id: "refactor",
        title: "Clean up code (REFACTOR)",
        description: "Refactor implementation while keeping all tests green",
        assignedTo: "Refactorer",
        blockedBy: ["green"],
      },
    ],
    hooks: [
      { event: "PostToolUse", command: "{{testCommand}}", description: "Run tests after each code change to verify TDD phase progress" },
    ],
    leadSpawnInstructions: "You are coordinating a TDD Pipeline. The phases run sequentially: RED (write failing tests) -> GREEN (make tests pass) -> REFACTOR (clean up). Ensure each phase completes before the next begins.",
  },

  // 3. Code Review Council (council pattern)
  {
    slug: "code-review-council",
    name: "Code Review Council",
    description: "Multi-perspective code review with security, performance, and style specialists",
    orchestrationPattern: "council",
    category: "code-review",
    tags: ["universal"],
    teammates: [
      {
        role: "Security Auditor",
        description: "Reviews code for security vulnerabilities and OWASP issues",
        spawnPrompt: "You are the Security Auditor on a Code Review Council. Your job is to:\n1. Review all changed files for security vulnerabilities\n2. Check for OWASP Top 10 issues (injection, XSS, auth bypass, etc.)\n3. Verify input validation and sanitization\n4. Check for hardcoded secrets or credentials\n5. Report findings with severity (critical/high/medium/low)\n\nCreate a structured report of all findings.",
      },
      {
        role: "Performance Reviewer",
        description: "Reviews code for performance issues and optimization opportunities",
        spawnPrompt: "You are the Performance Reviewer on a Code Review Council. Your job is to:\n1. Review all changed files for performance issues\n2. Check for N+1 queries, unnecessary re-renders, memory leaks\n3. Identify expensive operations that could be cached or optimized\n4. Check for missing indexes on database queries\n5. Report findings with estimated impact (high/medium/low)\n\nCreate a structured report of all findings.",
      },
      {
        role: "Style Reviewer",
        description: "Reviews code for consistency, readability, and best practices",
        spawnPrompt: "You are the Style Reviewer on a Code Review Council. Your job is to:\n1. Review all changed files for code style consistency\n2. Check naming conventions, file organization, and patterns\n3. Verify documentation headers are present and accurate\n4. Check for code duplication and abstraction opportunities\n5. Ensure the code follows the project's CLAUDE.md conventions\n\nCreate a structured report of all findings.",
      },
    ],
    tasks: [
      {
        id: "security-review",
        title: "Security audit",
        description: "Review all changes for security vulnerabilities",
        assignedTo: "Security Auditor",
        blockedBy: [],
      },
      {
        id: "perf-review",
        title: "Performance review",
        description: "Review all changes for performance issues",
        assignedTo: "Performance Reviewer",
        blockedBy: [],
      },
      {
        id: "style-review",
        title: "Style review",
        description: "Review all changes for code style and consistency",
        assignedTo: "Style Reviewer",
        blockedBy: [],
      },
    ],
    hooks: [],
    leadSpawnInstructions: "You are coordinating a Code Review Council. All three reviewers work in parallel on the same code changes. Collect their reports, synthesize findings, and prioritize the most important issues to address.",
  },

  // 4. Parallel Test Suite Builder (parallel pattern)
  {
    slug: "parallel-test-suite-builder",
    name: "Parallel Test Suite Builder",
    description: "Three test specialists working simultaneously on unit, integration, and E2E tests",
    orchestrationPattern: "parallel",
    category: "testing",
    tags: ["universal"],
    teammates: [
      {
        role: "Unit Tester",
        description: "Writes unit tests for individual functions and components",
        spawnPrompt: "You are the Unit Tester. Your job is to:\n1. Identify all untested functions and components\n2. Write unit tests with comprehensive edge case coverage\n3. Use the project's testing framework (detect from config)\n4. Mock external dependencies appropriately\n5. Aim for 80%+ line coverage on new code\n\nFocus ONLY on unit tests — integration and E2E are handled by other teammates.",
      },
      {
        role: "Integration Tester",
        description: "Writes integration tests for API endpoints and data flows",
        spawnPrompt: "You are the Integration Tester. Your job is to:\n1. Identify API endpoints and data flows that need testing\n2. Write integration tests that test component interactions\n3. Test database queries, API responses, and error handling\n4. Verify data validation and transformation logic\n5. Use realistic test data and fixtures\n\nFocus ONLY on integration tests — unit and E2E are handled by other teammates.",
      },
      {
        role: "E2E Tester",
        description: "Writes end-to-end tests for critical user workflows",
        spawnPrompt: "You are the E2E Tester. Your job is to:\n1. Identify critical user workflows and happy paths\n2. Write E2E tests using the project's E2E framework (Playwright, Cypress, etc.)\n3. Test complete user journeys from start to finish\n4. Include error state and edge case scenarios\n5. Ensure tests are stable and not flaky\n\nFocus ONLY on E2E tests — unit and integration are handled by other teammates.",
      },
    ],
    tasks: [
      {
        id: "unit-tests",
        title: "Write unit tests",
        description: "Comprehensive unit tests for functions and components",
        assignedTo: "Unit Tester",
        blockedBy: [],
      },
      {
        id: "integration-tests",
        title: "Write integration tests",
        description: "Integration tests for API endpoints and data flows",
        assignedTo: "Integration Tester",
        blockedBy: [],
      },
      {
        id: "e2e-tests",
        title: "Write E2E tests",
        description: "End-to-end tests for critical user workflows",
        assignedTo: "E2E Tester",
        blockedBy: [],
      },
    ],
    hooks: [
      { event: "PostToolUse", command: "{{testCommand}}", description: "Run tests after code changes to validate coverage" },
    ],
    leadSpawnInstructions: "You are coordinating a Parallel Test Suite Builder. All three testers work simultaneously on different test levels. Monitor progress and resolve any test conflicts or shared fixture issues.",
  },

  // 5. Migration & Upgrade Team (leader pattern)
  {
    slug: "migration-upgrade-team",
    name: "Migration & Upgrade Team",
    description: "Structured migration with analysis, execution, and validation phases",
    orchestrationPattern: "leader",
    category: "migration",
    tags: ["universal"],
    teammates: [
      {
        role: "Analyst",
        description: "Analyzes the migration scope and creates a detailed plan",
        spawnPrompt: "You are the Migration Analyst. Your job is to:\n1. Analyze the current codebase for migration targets\n2. Identify breaking changes and incompatibilities\n3. Create a detailed migration plan with ordered steps\n4. Document rollback procedures for each step\n5. Estimate risk levels for each migration task\n\nCreate tasks for the Migrator and Validator based on your analysis.",
      },
      {
        role: "Migrator",
        description: "Executes the migration changes",
        spawnPrompt: "You are the Migrator. Your job is to:\n1. Follow the migration plan created by the Analyst\n2. Execute changes in the specified order\n3. Update dependencies, APIs, and configurations\n4. Handle deprecation warnings and breaking changes\n5. Keep a log of all changes made\n\nDo NOT skip steps or change the order without consulting the Analyst.",
      },
      {
        role: "Validator",
        description: "Validates each migration step works correctly",
        spawnPrompt: "You are the Migration Validator. Your job is to:\n1. Run the test suite after each migration step\n2. Verify functionality works as expected\n3. Check for regressions in existing features\n4. Validate that deprecated APIs are fully removed\n5. Report any issues back to the Migrator\n\nDo not sign off on a step until all tests pass.",
      },
    ],
    tasks: [
      {
        id: "analysis",
        title: "Analyze migration scope",
        description: "Document all changes needed, breaking changes, and migration order",
        assignedTo: "Analyst",
        blockedBy: [],
      },
      {
        id: "migrate",
        title: "Execute migration",
        description: "Apply all migration changes following the plan",
        assignedTo: "Migrator",
        blockedBy: ["analysis"],
      },
      {
        id: "validate",
        title: "Validate migration",
        description: "Run tests and verify everything works post-migration",
        assignedTo: "Validator",
        blockedBy: ["migrate"],
      },
    ],
    hooks: [],
    leadSpawnInstructions: "You are coordinating a Migration Team. The Analyst goes first to plan, then the Migrator executes, and the Validator confirms. Ensure each phase completes before the next begins.",
  },

  // 6. Documentation Sprint Team (swarm pattern)
  {
    slug: "documentation-sprint-team",
    name: "Documentation Sprint Team",
    description: "Swarm of documentation specialists covering APIs, modules, and README in parallel",
    orchestrationPattern: "swarm",
    category: "documentation",
    tags: ["universal"],
    teammates: [
      {
        role: "API Documenter",
        description: "Documents all API endpoints and interfaces",
        spawnPrompt: "You are the API Documenter. Your job is to:\n1. Find all API endpoints, IPC commands, and public interfaces\n2. Document request/response formats with examples\n3. Document error codes and edge cases\n4. Create or update API reference documentation\n5. Verify accuracy by reading the implementation\n\nUse the project's documentation conventions from CLAUDE.md.",
      },
      {
        role: "Module Documenter",
        description: "Adds documentation headers to all source files",
        spawnPrompt: "You are the Module Documenter. Your job is to:\n1. Scan all source files for missing documentation headers\n2. Add @module, @description, PURPOSE, DEPENDENCIES, EXPORTS, PATTERNS, CLAUDE NOTES\n3. Update outdated documentation headers\n4. Follow the exact format specified in CLAUDE.md\n5. Prioritize files with the most exports/complexity\n\nUse the project's documentation format from CLAUDE.md.",
      },
      {
        role: "README Writer",
        description: "Creates and updates project README and guides",
        spawnPrompt: "You are the README Writer. Your job is to:\n1. Review or create the project README.md\n2. Include setup instructions, architecture overview, and contribution guide\n3. Add badges for build status, test coverage, etc.\n4. Document environment variables and configuration\n5. Ensure the README is helpful for new contributors\n\nKeep it concise but comprehensive.",
      },
    ],
    tasks: [
      {
        id: "api-docs",
        title: "Document all APIs",
        description: "Create comprehensive API reference documentation",
        assignedTo: "API Documenter",
        blockedBy: [],
      },
      {
        id: "module-docs",
        title: "Add module documentation headers",
        description: "Add or update documentation headers on all source files",
        assignedTo: "Module Documenter",
        blockedBy: [],
      },
      {
        id: "readme",
        title: "Update README and guides",
        description: "Create or update project README with setup, architecture, and contribution guide",
        assignedTo: "README Writer",
        blockedBy: [],
      },
    ],
    hooks: [],
    leadSpawnInstructions: "You are coordinating a Documentation Sprint. All three documenters work simultaneously on different aspects. They should consult each other to avoid duplicating content. Collect all outputs and verify consistency.",
  },

  // 7. Monorepo Refactor Team (pipeline pattern)
  {
    slug: "monorepo-refactor-team",
    name: "Monorepo Refactor Team",
    description: "Sequential pipeline for safely restructuring monorepo packages with dependency tracking",
    orchestrationPattern: "pipeline",
    category: "refactoring",
    tags: ["typescript", "javascript", "react", "nextjs"],
    teammates: [
      {
        role: "Dependency Mapper",
        description: "Maps all cross-package dependencies before any changes",
        spawnPrompt: "You are the Dependency Mapper. Your job is to:\n1. Map all import/export relationships between packages\n2. Identify circular dependencies\n3. Create a dependency graph showing what depends on what\n4. Identify the safe order for moving/renaming packages\n5. Document shared types, utilities, and configurations\n\nOutput a clear dependency map and recommended refactoring order.",
      },
      {
        role: "Code Mover",
        description: "Moves files and updates imports according to the plan",
        spawnPrompt: "You are the Code Mover. Your job is to:\n1. Follow the Dependency Mapper's recommended order\n2. Move files to their new locations\n3. Update ALL import paths (use find-and-replace across the codebase)\n4. Update package.json exports and entry points\n5. Update tsconfig paths and aliases\n\nDo NOT skip any import updates — broken imports will fail the build.",
      },
      {
        role: "Test Fixer",
        description: "Fixes broken tests after code moves",
        spawnPrompt: "You are the Test Fixer. Your job is to:\n1. Run the full test suite and identify failures\n2. Fix broken imports and paths in test files\n3. Update test fixtures and mock paths\n4. Ensure all tests pass with the new structure\n5. Add any missing tests for moved code\n\nEvery test that passed before MUST pass after the refactor.",
      },
      {
        role: "CI Updater",
        description: "Updates CI/CD configuration for the new structure",
        spawnPrompt: "You are the CI Updater. Your job is to:\n1. Update CI/CD workflows for the new package structure\n2. Update build scripts and Dockerfiles\n3. Update path filters for PR checks\n4. Verify the build pipeline works end-to-end\n5. Update deployment configurations\n\nDo not merge until CI is green.",
      },
    ],
    tasks: [
      {
        id: "map-deps",
        title: "Map dependencies",
        description: "Create a complete dependency graph and refactoring plan",
        assignedTo: "Dependency Mapper",
        blockedBy: [],
      },
      {
        id: "move-code",
        title: "Move code and update imports",
        description: "Restructure packages following the dependency map",
        assignedTo: "Code Mover",
        blockedBy: ["map-deps"],
      },
      {
        id: "fix-tests",
        title: "Fix broken tests",
        description: "Ensure all tests pass with the new structure",
        assignedTo: "Test Fixer",
        blockedBy: ["move-code"],
      },
      {
        id: "update-ci",
        title: "Update CI/CD",
        description: "Update build and deploy configs for new structure",
        assignedTo: "CI Updater",
        blockedBy: ["fix-tests"],
      },
    ],
    hooks: [],
    leadSpawnInstructions: "You are coordinating a Monorepo Refactor. This is a strictly sequential pipeline: map dependencies -> move code -> fix tests -> update CI. Each step MUST complete before the next begins to avoid cascading failures.",
  },

  // 8. DevOps Setup Team (parallel pattern)
  {
    slug: "devops-setup-team",
    name: "DevOps Setup Team",
    description: "Parallel specialists for CI pipeline, containerization, and deployment configuration",
    orchestrationPattern: "parallel",
    category: "devops",
    tags: ["universal"],
    teammates: [
      {
        role: "CI Builder",
        description: "Sets up continuous integration pipeline",
        spawnPrompt: "You are the CI Builder. Your job is to:\n1. Detect the project's build system and test framework\n2. Create a CI pipeline (GitHub Actions, GitLab CI, etc.)\n3. Add lint, test, build, and coverage steps\n4. Configure caching for fast builds\n5. Add status badges to README\n\nFocus ONLY on CI — deployment and containerization are handled by other teammates.",
      },
      {
        role: "Docker Specialist",
        description: "Creates optimized Docker configurations",
        spawnPrompt: "You are the Docker Specialist. Your job is to:\n1. Create a multi-stage Dockerfile for the project\n2. Optimize image size with proper layering\n3. Create docker-compose.yml for local development\n4. Include health checks and proper signal handling\n5. Document how to build and run with Docker\n\nFocus ONLY on Docker — CI and deployment are handled by other teammates.",
      },
      {
        role: "Deploy Configurer",
        description: "Sets up deployment configuration and scripts",
        spawnPrompt: "You are the Deploy Configurer. Your job is to:\n1. Choose an appropriate deployment strategy for the project\n2. Create deployment configuration files\n3. Set up environment variable management\n4. Create deployment scripts with rollback support\n5. Document the deployment process\n\nFocus ONLY on deployment — CI and Docker are handled by other teammates.",
      },
    ],
    tasks: [
      {
        id: "ci-pipeline",
        title: "Set up CI pipeline",
        description: "Create CI workflow with lint, test, build, and coverage",
        assignedTo: "CI Builder",
        blockedBy: [],
      },
      {
        id: "docker",
        title: "Create Docker configuration",
        description: "Dockerfile and docker-compose for development and production",
        assignedTo: "Docker Specialist",
        blockedBy: [],
      },
      {
        id: "deploy",
        title: "Configure deployment",
        description: "Deployment config, scripts, and documentation",
        assignedTo: "Deploy Configurer",
        blockedBy: [],
      },
    ],
    hooks: [],
    leadSpawnInstructions: "You are coordinating a DevOps Setup Team. All three specialists work in parallel on independent infrastructure concerns. Monitor progress and ensure configurations are compatible with each other.",
  },
];
