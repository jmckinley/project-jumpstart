//! @module commands/skills
//! @description Tauri IPC commands for skills management and pattern detection
//!
//! PURPOSE:
//! - List, create, update, and delete skills via IPC
//! - Detect project patterns that could become reusable skills
//! - Track skill usage analytics
//!
//! DEPENDENCIES:
//! - tauri - Command macro and State
//! - db::AppState - Database connection state
//! - models::skill - Skill, Pattern data types
//! - chrono - Timestamp generation
//! - uuid - Unique ID generation
//!
//! EXPORTS:
//! - list_skills - List all skills for a project
//! - create_skill - Create a new skill
//! - update_skill - Update an existing skill
//! - delete_skill - Delete a skill by ID
//! - detect_patterns - Analyze project to suggest skills
//! - increment_skill_usage - Bump usage count for a skill
//!
//! PATTERNS:
//! - All commands use AppState for DB access
//! - Skills are scoped to a project_id (or global if None)
//! - detect_patterns analyzes project structure and tech stack
//!
//! CLAUDE NOTES:
//! - Skills reduce token usage by capturing reusable patterns
//! - Pattern detection is heuristic-based (not AI-powered yet)
//! - Timestamps use chrono::Utc::now() in RFC 3339 format

use chrono::Utc;
use tauri::State;
use uuid::Uuid;

use crate::db::{self, AppState};
use crate::models::skill::{Pattern, Skill};

/// List all skills for a project (or global skills if project_id is None).
#[tauri::command]
pub async fn list_skills(
    project_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<Skill>, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = if project_id.is_some() {
        db.prepare(
            "SELECT id, project_id, name, description, content, usage_count, created_at, updated_at
             FROM skills WHERE project_id = ?1 OR project_id IS NULL
             ORDER BY usage_count DESC, name ASC",
        )
    } else {
        db.prepare(
            "SELECT id, project_id, name, description, content, usage_count, created_at, updated_at
             FROM skills ORDER BY usage_count DESC, name ASC",
        )
    }
    .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let rows = if let Some(ref pid) = project_id {
        stmt.query_map([pid], map_skill_row)
    } else {
        stmt.query_map([], map_skill_row)
    }
    .map_err(|e| format!("Failed to query skills: {}", e))?;

    let skills: Vec<Skill> = rows
        .filter_map(|r| r.ok())
        .collect();

    Ok(skills)
}

/// Create a new skill and persist it to the database.
#[tauri::command]
pub async fn create_skill(
    name: String,
    description: String,
    content: String,
    project_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Skill, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let now_str = now.to_rfc3339();

    db.execute(
        "INSERT INTO skills (id, project_id, name, description, content, usage_count, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7)",
        rusqlite::params![id, project_id, name, description, content, now_str, now_str],
    )
    .map_err(|e| format!("Failed to insert skill: {}", e))?;

    // Log activity
    if let Some(ref pid) = project_id {
        let _ = db::log_activity_db(&db, pid, "skill", &format!("Created skill: {}", &name));
    }

    Ok(Skill {
        id,
        name,
        description,
        content,
        project_id,
        usage_count: 0,
        created_at: now,
        updated_at: now,
    })
}

/// Update an existing skill's name, description, and content.
#[tauri::command]
pub async fn update_skill(
    id: String,
    name: String,
    description: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<Skill, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let now = Utc::now();
    let now_str = now.to_rfc3339();

    let rows_affected = db
        .execute(
            "UPDATE skills SET name = ?1, description = ?2, content = ?3, updated_at = ?4 WHERE id = ?5",
            rusqlite::params![name, description, content, now_str, id],
        )
        .map_err(|e| format!("Failed to update skill: {}", e))?;

    if rows_affected == 0 {
        return Err(format!("Skill not found: {}", id));
    }

    // Fetch the updated skill
    let skill = db
        .query_row(
            "SELECT id, project_id, name, description, content, usage_count, created_at, updated_at
             FROM skills WHERE id = ?1",
            [&id],
            map_skill_row,
        )
        .map_err(|e| format!("Failed to fetch updated skill: {}", e))?;

    Ok(skill)
}

/// Delete a skill by ID.
#[tauri::command]
pub async fn delete_skill(
    id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    // Get skill name and project_id before deleting
    let skill_info: Option<(String, Option<String>)> = db
        .query_row(
            "SELECT name, project_id FROM skills WHERE id = ?1",
            [&id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .ok();

    let rows_affected = db
        .execute("DELETE FROM skills WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete skill: {}", e))?;

    if rows_affected == 0 {
        return Err(format!("Skill not found: {}", id));
    }

    // Log activity
    if let Some((name, Some(pid))) = skill_info {
        let _ = db::log_activity_db(&db, &pid, "skill", &format!("Deleted skill: {}", name));
    }

    Ok(())
}

/// Increment the usage count for a skill.
#[tauri::command]
pub async fn increment_skill_usage(
    id: String,
    state: State<'_, AppState>,
) -> Result<u32, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    db.execute(
        "UPDATE skills SET usage_count = usage_count + 1, updated_at = ?1 WHERE id = ?2",
        rusqlite::params![Utc::now().to_rfc3339(), id],
    )
    .map_err(|e| format!("Failed to increment usage: {}", e))?;

    let count: u32 = db
        .query_row(
            "SELECT usage_count FROM skills WHERE id = ?1",
            [&id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to fetch usage count: {}", e))?;

    Ok(count)
}

/// Detect patterns in a project that could become reusable skills.
/// Analyzes project structure, tech stack, and common file patterns.
#[tauri::command]
pub async fn detect_patterns(
    project_path: String,
    state: State<'_, AppState>,
) -> Result<Vec<Pattern>, String> {
    let path = std::path::Path::new(&project_path);
    if !path.exists() {
        return Err(format!("Path does not exist: {}", project_path));
    }

    let mut patterns = Vec::new();

    // Detect tech-stack-based patterns
    detect_tech_patterns(path, &mut patterns);

    // Detect structural patterns
    detect_structural_patterns(path, &mut patterns);

    // Persist detected patterns to DB (get project_id first)
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let project_id: Option<String> = db
        .query_row(
            "SELECT id FROM projects WHERE path = ?1",
            [&project_path],
            |row| row.get(0),
        )
        .ok();

    if let Some(pid) = &project_id {
        let now_str = Utc::now().to_rfc3339();
        for pattern in &patterns {
            // Upsert: only insert if description doesn't already exist for this project
            db.execute(
                "INSERT OR IGNORE INTO patterns (id, project_id, description, frequency, suggested_skill, detected_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                rusqlite::params![
                    pattern.id,
                    pid,
                    pattern.description,
                    pattern.frequency,
                    pattern.suggested_skill,
                    now_str,
                ],
            )
            .map_err(|e| format!("Failed to save pattern: {}", e))?;
        }
    }

    Ok(patterns)
}

// ---------------------------------------------------------------------------
// Pattern detection heuristics
// ---------------------------------------------------------------------------

fn detect_tech_patterns(path: &std::path::Path, patterns: &mut Vec<Pattern>) {
    // Check for package.json (Node.js/React patterns)
    if path.join("package.json").exists() {
        let pkg_content = std::fs::read_to_string(path.join("package.json")).unwrap_or_default();

        if pkg_content.contains("\"react\"") {
            patterns.push(Pattern {
                id: Uuid::new_v4().to_string(),
                description: "React component creation pattern".to_string(),
                frequency: 5,
                suggested_skill: Some(
                    r#"## React Component Pattern

### Structure
- One component per file, named after the component
- Props interface defined ABOVE the component function
- Use named exports (not default exports)
- Functional components only (no class components)

### TypeScript Requirements
```typescript
interface MyComponentProps {
  title: string;
  count?: number;  // Optional props use ?
  onAction: () => void;
  children?: React.ReactNode;
}

export function MyComponent({ title, count = 0, onAction, children }: MyComponentProps) {
  // Component logic here
  return (
    <div>
      {/* JSX here */}
    </div>
  );
}
```

### Styling
- Use Tailwind CSS utility classes exclusively
- No inline styles or CSS files
- Follow dark theme: bg-neutral-950, border-neutral-800, text-neutral-300

### DO
- Destructure props in function signature
- Use semantic HTML elements
- Handle loading and error states
- Memoize callbacks with useCallback when passed to children

### DON'T
- Don't use `any` type - always define proper interfaces
- Don't mutate props or state directly
- Don't use index as key in lists (use unique IDs)
- Don't forget to handle edge cases (empty arrays, null values)"#
                        .to_string(),
                ),
            });
        }

        if pkg_content.contains("\"vitest\"") || pkg_content.contains("\"jest\"") {
            patterns.push(Pattern {
                id: Uuid::new_v4().to_string(),
                description: "Test file creation pattern".to_string(),
                frequency: 4,
                suggested_skill: Some(
                    r#"## Test File Pattern

### File Naming
- Test files: `ComponentName.test.tsx` or `hookName.test.ts`
- Colocate with source: `src/components/Button.tsx` → `src/components/Button.test.tsx`

### Structure
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MyComponent } from "./MyComponent";

// Mock dependencies at top of file
vi.mock("@/lib/tauri", () => ({
  invoke: vi.fn(),
}));

describe("MyComponent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render correctly", () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("should handle user interaction", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<MyComponent onAction={onAction} />);

    await user.click(screen.getByRole("button"));
    expect(onAction).toHaveBeenCalledOnce();
  });
});
```

### Test Coverage Requirements
- Happy path (normal usage)
- Error states and edge cases
- Loading states
- Empty/null/undefined inputs
- User interactions (clicks, typing)

### DO
- Use descriptive test names: "should [do X] when [condition Y]"
- Test behavior, not implementation details
- Use `getByRole` over `getByTestId` when possible
- Clean up mocks in beforeEach

### DON'T
- Don't test internal state directly
- Don't forget async/await for user events
- Don't leave console.error calls in tests (mock them)"#
                        .to_string(),
                ),
            });
        }

        if pkg_content.contains("\"zustand\"") {
            patterns.push(Pattern {
                id: Uuid::new_v4().to_string(),
                description: "Zustand store creation pattern".to_string(),
                frequency: 3,
                suggested_skill: Some(
                    r#"## Zustand Store Pattern

### File Location
- Stores go in `src/stores/` directory
- One store per file: `src/stores/userStore.ts`

### Structure
```typescript
import { create } from "zustand";

// 1. Define interface with state AND actions together
interface UserState {
  // State
  user: User | null;
  loading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

// 2. Initial state (for reset)
const initialState = {
  user: null,
  loading: false,
  error: null,
};

// 3. Create store with typed state
export const useUserStore = create<UserState>((set) => ({
  ...initialState,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
```

### Usage in Components
```typescript
// Use selectors to pick specific state (prevents unnecessary re-renders)
const user = useUserStore((s) => s.user);
const setUser = useUserStore((s) => s.setUser);

// DON'T: const { user, setUser } = useUserStore(); // Re-renders on ANY state change
```

### DO
- Always type the state interface
- Use selectors to access specific state slices
- Include a reset() action for cleanup
- Keep actions simple (complex logic goes in hooks)

### DON'T
- Don't destructure the whole store in components
- Don't put async logic directly in store (use hooks)
- Don't forget to reset on logout/cleanup"#
                        .to_string(),
                ),
            });
        }

        if pkg_content.contains("tailwindcss") {
            patterns.push(Pattern {
                id: Uuid::new_v4().to_string(),
                description: "Tailwind CSS utility class patterns".to_string(),
                frequency: 3,
                suggested_skill: Some(
                    r#"## Tailwind CSS Pattern

### Color Palette (Dark Theme)
| Element | Class |
|---------|-------|
| Background | `bg-neutral-950` (page), `bg-neutral-900` (cards) |
| Borders | `border-neutral-800` |
| Text primary | `text-neutral-100` or `text-neutral-200` |
| Text secondary | `text-neutral-400` |
| Text muted | `text-neutral-500` or `text-neutral-600` |
| Accent | `text-blue-400`, `bg-blue-600` (buttons) |
| Success | `text-green-400`, `bg-green-500/20` |
| Warning | `text-yellow-400`, `bg-yellow-500/20` |
| Error | `text-red-400`, `bg-red-500/20` |

### Common Patterns
```tsx
// Card container
<div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">

// Button primary
<button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">

// Button secondary
<button className="rounded-md border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-700">

// Input field
<input className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none">

// Badge
<span className="inline-flex rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">
```

### DO
- Use utility classes exclusively (no custom CSS)
- Use consistent spacing: `gap-2`, `gap-3`, `gap-4`, `p-3`, `p-4`
- Use `transition-colors` for hover effects
- Use `truncate` for text that might overflow

### DON'T
- Don't use inline styles
- Don't create CSS files
- Don't use arbitrary values like `w-[123px]` (use design tokens)
- Don't forget dark mode considerations (we're dark-only)"#
                        .to_string(),
                ),
            });
        }
    }

    // Check for Cargo.toml (Rust patterns)
    if path.join("Cargo.toml").exists() || path.join("src-tauri/Cargo.toml").exists() {
        patterns.push(Pattern {
            id: Uuid::new_v4().to_string(),
            description: "Tauri command creation pattern".to_string(),
            frequency: 4,
            suggested_skill: Some(
                r#"## Tauri Command Pattern

### Command Structure
```rust
use tauri::State;
use crate::db::AppState;

#[tauri::command]
pub async fn my_command(
    arg1: String,
    arg2: Option<i32>,  // Optional args
    state: State<'_, AppState>,
) -> Result<ReturnType, String> {
    // 1. Get database connection
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    // 2. Do work
    let result = do_something(&db, &arg1)?;

    // 3. Return success
    Ok(result)
}
```

### Registration (lib.rs)
```rust
// Add to invoke_handler in lib.rs
.invoke_handler(tauri::generate_handler![
    // ... existing commands
    commands::mymodule::my_command,  // Add new command
])
```

### Frontend Wrapper (lib/tauri.ts)
```typescript
export async function myCommand(arg1: string, arg2?: number): Promise<ReturnType> {
  return invoke<ReturnType>("my_command", { arg1, arg2 });
}
```

### Error Handling
```rust
// Convert errors to String at boundary
.map_err(|e| e.to_string())?

// Or with context
.map_err(|e| format!("Failed to load data: {}", e))?
```

### DO
- Always make commands `async`
- Always return `Result<T, String>`
- Use `State<'_, AppState>` for shared state
- Add command to invoke_handler in lib.rs
- Create typed wrapper in lib/tauri.ts

### DON'T
- Don't use `unwrap()` or `expect()` - always handle errors
- Don't forget to register the command in lib.rs
- Don't block the async runtime with heavy sync operations"#
                    .to_string(),
            ),
        });
    }

    // Check for Python
    if path.join("requirements.txt").exists() || path.join("pyproject.toml").exists() {
        patterns.push(Pattern {
            id: Uuid::new_v4().to_string(),
            description: "Python module creation pattern".to_string(),
            frequency: 3,
            suggested_skill: Some(
                r#"## Python Module Pattern

### File Structure
```python
"""
Module docstring explaining purpose.

This module handles [description].
"""

from typing import Optional, List, Dict
from dataclasses import dataclass

# Constants at top
DEFAULT_TIMEOUT = 30

@dataclass
class MyModel:
    """Data class for structured data."""
    name: str
    value: int
    optional_field: Optional[str] = None

def public_function(arg: str, count: int = 0) -> List[str]:
    """
    Brief description of what function does.

    Args:
        arg: Description of arg
        count: Description of count (default: 0)

    Returns:
        List of strings representing...

    Raises:
        ValueError: If arg is empty
    """
    if not arg:
        raise ValueError("arg cannot be empty")

    return _helper_function(arg, count)

def _helper_function(arg: str, count: int) -> List[str]:
    """Private helper (prefixed with _)."""
    return [arg] * count
```

### __init__.py Exports
```python
"""Package docstring."""

from .module_name import public_function, MyModel

__all__ = ["public_function", "MyModel"]
```

### DO
- Use type hints for all function signatures
- Write docstrings for all public functions/classes
- Use `@dataclass` for data containers
- Prefix private functions with `_`
- Export public API in `__init__.py`

### DON'T
- Don't use `from module import *`
- Don't skip type hints
- Don't forget to handle exceptions
- Don't use mutable default arguments"#
                    .to_string(),
            ),
        });
    }
}

fn detect_structural_patterns(path: &std::path::Path, patterns: &mut Vec<Pattern>) {
    // Check for common directory structures
    let src_dir = path.join("src");
    if !src_dir.exists() {
        return;
    }

    // Components directory → component creation is frequent
    if src_dir.join("components").exists() {
        let component_count = count_files_in_dir(&src_dir.join("components"));
        if component_count > 5 {
            patterns.push(Pattern {
                id: Uuid::new_v4().to_string(),
                description: format!("Large component library ({} files)", component_count),
                frequency: component_count.min(10) as u32,
                suggested_skill: Some(
                    r#"## Component Library Pattern

### Directory Structure
```
src/components/
├── ui/              # Reusable primitives (Button, Card, Badge)
├── layout/          # Layout components (Sidebar, MainPanel)
├── dashboard/       # Feature-specific components
├── forms/           # Form components
└── [feature]/       # Feature modules
```

### Component File Template
```typescript
/**
 * @module components/[category]/ComponentName
 * @description Brief description of component purpose
 */

interface ComponentNameProps {
  // Required props first
  title: string;
  onAction: () => void;
  // Optional props with defaults
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

export function ComponentName({
  title,
  onAction,
  variant = "primary",
  disabled = false,
}: ComponentNameProps) {
  return (
    <div className="...">
      {/* Implementation */}
    </div>
  );
}
```

### Naming Conventions
- Component files: `PascalCase.tsx`
- One component per file
- File name matches component name
- Test file: `ComponentName.test.tsx`

### DO
- Keep components focused (single responsibility)
- Extract reusable logic to hooks
- Use composition over prop drilling
- Document with JSDoc header

### DON'T
- Don't put multiple components in one file
- Don't use default exports
- Don't duplicate component logic (extract to shared components)"#
                        .to_string(),
                ),
            });
        }
    }

    // Hooks directory → hook creation pattern
    if src_dir.join("hooks").exists() {
        let hook_count = count_files_in_dir(&src_dir.join("hooks"));
        if hook_count > 2 {
            patterns.push(Pattern {
                id: Uuid::new_v4().to_string(),
                description: format!("Custom hooks pattern ({} hooks)", hook_count),
                frequency: hook_count.min(8) as u32,
                suggested_skill: Some(
                    r#"## Custom Hook Pattern

### File Location & Naming
- Location: `src/hooks/useFeatureName.ts`
- Naming: Always prefix with `use`

### Hook Template
```typescript
/**
 * @module hooks/useFeatureName
 * @description Manages [feature] state and actions
 */

import { useState, useCallback } from "react";
import { featureApi } from "@/lib/tauri";

interface FeatureState {
  data: DataType | null;
  loading: boolean;
  error: string | null;
}

export function useFeatureName() {
  const [state, setState] = useState<FeatureState>({
    data: null,
    loading: false,
    error: null,
  });

  const loadData = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await featureApi();
      setState((s) => ({ ...s, data, loading: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  }, []);

  const updateData = useCallback(async (newData: DataType) => {
    // Update logic
  }, []);

  return {
    ...state,
    loadData,
    updateData,
  };
}
```

### Return Type Pattern
```typescript
// Return object with spread state + actions
return {
  ...state,           // data, loading, error
  loadData,           // Actions
  updateData,
  clearError,
};
```

### DO
- Use `useCallback` for all action functions
- Type the state interface explicitly
- Handle loading and error states
- Use functional setState: `setState(s => ({ ...s, ... }))`

### DON'T
- Don't forget cleanup in useEffect (return cleanup function)
- Don't call hooks conditionally
- Don't put business logic in components (put it in hooks)"#
                        .to_string(),
                ),
            });
        }
    }

    // Check for CLAUDE.md → documentation pattern
    if path.join("CLAUDE.md").exists() {
        patterns.push(Pattern {
            id: Uuid::new_v4().to_string(),
            description: "Module documentation header pattern".to_string(),
            frequency: 5,
            suggested_skill: Some(
                r#"## Module Documentation Pattern

Every source file MUST have a documentation header at the top. This is critical because:
- Headers survive context compaction (Claude loses memory after ~30 min)
- They're always visible when a file is opened
- They document intent, not just implementation

### TypeScript/React Template
```typescript
/**
 * @module path/from/src
 * @description One-line description of what this module does
 *
 * PURPOSE:
 * - Main responsibility #1
 * - Main responsibility #2
 *
 * DEPENDENCIES:
 * - @/lib/tauri - Backend IPC calls
 * - @/stores/featureStore - State management
 *
 * EXPORTS:
 * - functionName - What it does
 * - ComponentName - What it renders
 * - TypeName - What it represents
 *
 * PATTERNS:
 * - How this module should be used
 * - Important conventions to follow
 *
 * CLAUDE NOTES:
 * - Things to always remember about this module
 * - Common mistakes to avoid
 * - Related files to check
 */
```

### Rust Template
```rust
//! @module path/from/src
//! @description One-line description
//!
//! PURPOSE:
//! - Main responsibility
//!
//! EXPORTS:
//! - function_name - What it does
//!
//! CLAUDE NOTES:
//! - Important context
```

### When to Update
| Change | Action |
|--------|--------|
| Add export | Add to EXPORTS |
| Remove export | Remove from EXPORTS |
| Add significant import | Add to DEPENDENCIES |
| Change purpose | Update @description |
| Fix bug revealing behavior | Add to CLAUDE NOTES |

### DO
- Update docs when changing exports
- Keep descriptions concise but complete
- Include "gotchas" in CLAUDE NOTES

### DON'T
- Don't skip the header on new files
- Don't leave stale exports listed
- Don't forget to document non-obvious behavior"#
                    .to_string(),
            ),
        });
    }
}

fn count_files_in_dir(dir: &std::path::Path) -> usize {
    let mut count = 0;
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                count += 1;
            } else if path.is_dir() {
                count += count_files_in_dir(&path);
            }
        }
    }
    count
}

// ---------------------------------------------------------------------------
// Row mapping helper
// ---------------------------------------------------------------------------

fn map_skill_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Skill> {
    let created_str: String = row.get(6)?;
    let updated_str: String = row.get(7)?;

    let created_at = chrono::DateTime::parse_from_rfc3339(&created_str)
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|_| Utc::now());

    let updated_at = chrono::DateTime::parse_from_rfc3339(&updated_str)
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|_| Utc::now());

    Ok(Skill {
        id: row.get(0)?,
        project_id: row.get(1)?,
        name: row.get(2)?,
        description: row.get(3)?,
        content: row.get(4)?,
        usage_count: row.get(5)?,
        created_at,
        updated_at,
    })
}
