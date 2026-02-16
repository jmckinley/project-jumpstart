---
paths:
  - "src/**/*.tsx"
  - "src/**/*.ts"
---

# React / Frontend Patterns

## Components

- One component per file
- Props interface defined above component
- Use shadcn/ui primitives (Button, Card, Badge, etc.)
- Tailwind for ALL styling - never CSS files
- Functional components only
- Prefer composition over prop drilling

## Hooks

- All hooks call real Tauri backend (no mock data)
- Custom hooks in `src/hooks/` wrap Tauri IPC calls
- Use `useCallback` for handler functions passed as props
- Use `useEffect` for data loading on mount

## State

- Zustand stores in `src/stores/` for global state
- Local state with `useState` for component-specific data
- `useProjectStore` for active project context

## Tauri IPC

- All IPC wrappers in `src/lib/tauri.ts`
- Command names must exactly match Rust function names (snake_case)
- Pass `null` not `undefined` for optional Tauri params
- Tauri auto-converts snake_case (Rust) to camelCase (TS) for struct fields

## Common Gotchas

- When adding optional params to Tauri commands, frontend must pass `null` not `undefined`
- When component passes new optional param to callback, existing tests need updating to include `undefined` arg
- Use `pnpm`, not npm or yarn
