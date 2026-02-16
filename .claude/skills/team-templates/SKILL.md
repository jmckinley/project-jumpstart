# Team Templates in Project Jumpstart

## Orchestration Patterns

- **Leader**: One lead agent coordinates specialist subagents
- **Pipeline**: Sequential handoff between stages
- **Parallel**: Independent agents work simultaneously
- **Swarm**: Agents self-organize around tasks
- **Council**: Multiple reviewers discuss and converge

## Library

8 pre-built templates across 7 categories:
feature-development, testing, code-review, refactoring, migration, documentation, devops

## Deploy Output Formats

1. **Lead Prompt**: Paste-ready markdown to start the team
2. **Shell Script**: Bash script that spawns agents
3. **Config Directory**: `.claude/` config files

## Personalization

Deploy output is personalized with the active project's tech stack:
- Language, framework, test framework, build tool
- Generic phrases replaced with specific tech names
- PostToolUse hooks render with resolved test commands

## Relevance Scoring

Formula: 30 base + 20/match (cap 60) + 10 specificity, MAX_RECOMMENDED = 3

## Key Files

- Library data: `src/data/teamTemplateLibrary.ts`
- Backend: `src-tauri/src/commands/team_templates.rs`
- Frontend: `src/components/team-templates/`
- Types: `src/types/team-template.ts`
