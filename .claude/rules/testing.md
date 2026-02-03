# Testing Rules

## Test Frameworks

| Layer | Framework | Command | Config |
|-------|-----------|---------|--------|
| **Frontend** | Vitest | `pnpm test` | `vitest.config.ts` |
| **Backend** | Cargo test | `cargo test` (in src-tauri/) | `Cargo.toml` |

## File Conventions

### Frontend Tests (Vitest)
- **Location**: Colocated with source files
- **Naming**: `ComponentName.test.tsx` or `moduleName.test.ts`
- **Example**: `src/components/dashboard/HealthScore.test.tsx`

### Backend Tests (Cargo)
- **Location**: Inline `#[cfg(test)]` modules at bottom of source files
- **Naming**: `mod tests { ... }` within the source file
- **Example**: `src-tauri/src/core/health.rs` contains `mod tests`

## Writing Frontend Tests

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

describe("ComponentName", () => {
  it("should do something specific", () => {
    render(<Component prop="value" />);
    expect(screen.getByText("Expected")).toBeInTheDocument();
  });
});
```

### Patterns
- Use `vi.fn()` for mock functions
- Use `vi.mock()` for module mocks (must be at top level)
- Use `screen.getByText()`, `screen.getByRole()`, `screen.getByPlaceholderText()` for queries
- Use `fireEvent.click()`, `fireEvent.change()` for interactions
- Use `waitFor()` for async assertions

### Mocking Tauri
```typescript
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// In test:
vi.mocked(invoke).mockResolvedValue(expectedResult);
```

## Writing Backend Tests (Rust)

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_function_name() {
        let result = function_to_test(input);
        assert_eq!(result, expected);
    }
}
```

### Patterns
- Use `#[allow(dead_code)]` for test-only helper structs
- Use `assert!`, `assert_eq!`, `assert_ne!` for assertions
- Use `#[should_panic]` for expected panics
- Use `tempfile` crate for filesystem tests

## TDD Workflow

When doing TDD, follow **Red → Green → Refactor**:

1. **Red**: Write a failing test first
   - Test should fail for the right reason
   - Confirms test is actually testing something

2. **Green**: Write minimal code to pass
   - Don't over-engineer
   - Just make the test pass

3. **Refactor**: Clean up while tests pass
   - Remove duplication
   - Improve naming
   - Keep tests green throughout

## Test Coverage Goals

- **Target**: 80% code coverage
- **Priority**: Critical paths > edge cases > error handling
- **Current**: 581 tests (502 frontend + 79 Rust)

## Running Tests

```bash
# Frontend (from project root)
pnpm test              # Watch mode
pnpm test --run        # Single run

# Backend (from src-tauri/)
cargo test             # All tests
cargo test test_name   # Specific test
cargo test --quiet     # Minimal output
```

## Common Gotchas

1. **Vitest mocks must be at file top level** - Cannot be inside describe/it blocks
2. **Type mocks carefully** - Use correct types for mock data (e.g., `"pass" | "fail"` not full strings)
3. **Async tests need await** - Use `await waitFor()` or make test `async`
4. **Cargo tests run in parallel** - Don't rely on test order or shared state
5. **act() warnings** - Wrap state updates in `act()` or use `waitFor()`
