# Freshness Engine (Context Rot Prevention)

## How Staleness Detection Works

The freshness engine compares file modification times and git history against
documentation timestamps to detect when docs become stale.

## Scoring

- Fresh (100): Doc updated after last code change
- Stale (50-99): Code changed since last doc update
- Missing (0): No documentation header found

## Health Score Components

| Component | Weight | What It Measures |
|-----------|--------|------------------|
| claudeMd | 25 | CLAUDE.md existence and completeness |
| moduleDocs | 25 | Module documentation coverage |
| freshness | 15 | Documentation staleness |
| skills | 15 | Skills defined for project |
| context | 10 | Context health status |
| enforcement | 10 | Git hooks installed |

## Context Rot Risk Levels

- **Low**: All docs fresh, good coverage
- **Medium**: Some stale docs or missing coverage
- **High**: Many stale docs, context at risk

## Key Files

- Freshness calculation: `src-tauri/src/core/freshness.rs`
- Health scoring: `src-tauri/src/core/health.rs`
- Module scanning: `src-tauri/src/commands/modules.rs`
- Dashboard display: `src/components/dashboard/HealthScore.tsx`
