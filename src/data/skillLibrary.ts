/**
 * @module data/skillLibrary
 * @description Curated catalog of pre-defined skills for the skill library
 *
 * PURPOSE:
 * - Provide a collection of high-quality, ready-to-use skills
 * - Cover common tasks across different tech stacks
 * - Serve as templates for users to customize
 *
 * DEPENDENCIES:
 * - @/types/skill - LibrarySkill type
 *
 * EXPORTS:
 * - SKILL_LIBRARY - Array of LibrarySkill objects (~20 skills)
 *
 * PATTERNS:
 * - Each skill has markdown content with sections: When to use, Instructions, Template, Rules
 * - Skills are tagged with relevant TechTags for relevance scoring
 * - "universal" tag indicates skills that apply to all projects
 *
 * CLAUDE NOTES:
 * - Keep skill content between 200-400 words
 * - Ensure each skill has actionable instructions
 * - Include code templates where applicable
 * - Group related skills by category
 */

import type { LibrarySkill } from "@/types/skill";

export const SKILL_LIBRARY: LibrarySkill[] = [
  // Documentation Skills
  {
    slug: "module-doc-header",
    name: "Module Doc Header",
    description: "Add standardized documentation headers to source files",
    category: "documentation",
    tags: ["universal"],
    content: `## When to use
Use this skill when creating new source files or adding documentation to existing files that lack headers.

## Instructions
1. Identify the module path from the file location
2. Write a one-line description of the module's purpose
3. List the main responsibilities under PURPOSE
4. Document significant imports under DEPENDENCIES
5. List all public exports under EXPORTS
6. Note usage patterns under PATTERNS
7. Add helpful reminders under CLAUDE NOTES

## Template
\`\`\`typescript
/**
 * @module [path/from/src]
 * @description [One-line description]
 *
 * PURPOSE:
 * - [Main responsibility]
 *
 * DEPENDENCIES:
 * - [import] - [why needed]
 *
 * EXPORTS:
 * - [name] - [description]
 *
 * PATTERNS:
 * - [Usage pattern]
 *
 * CLAUDE NOTES:
 * - [Important context]
 */
\`\`\`

## Rules
- Always update headers when exports change
- Keep descriptions concise but complete
- Include dependencies only when they reveal important context`,
  },
  {
    slug: "readme-generator",
    name: "README Generator",
    description: "Generate comprehensive README files for projects",
    category: "documentation",
    tags: ["universal"],
    content: `## When to use
Use when creating a new project README or updating an outdated one.

## Instructions
1. Start with a clear project title and one-line description
2. Add a "Features" section with bullet points
3. Include "Getting Started" with installation steps
4. Add "Usage" with code examples
5. Include "Development" section for contributors
6. Add "License" section

## Template
\`\`\`markdown
# Project Name

One-line description of what this project does.

## Features

- Feature 1
- Feature 2

## Getting Started

### Prerequisites
- Node.js 18+

### Installation
\\\`\\\`\\\`bash
npm install
\\\`\\\`\\\`

## Usage

\\\`\\\`\\\`typescript
import { example } from 'project';
\\\`\\\`\\\`

## Development

\\\`\\\`\\\`bash
npm run dev
npm test
\\\`\\\`\\\`

## License

MIT
\`\`\`

## Rules
- Keep it scannable with clear headings
- Include working code examples
- Update when major features change`,
  },
  {
    slug: "api-docs-openapi",
    name: "API Docs (OpenAPI)",
    description: "Document REST APIs using OpenAPI/Swagger format",
    category: "documentation",
    tags: ["typescript", "javascript", "python", "rust"],
    content: `## When to use
Use when documenting REST API endpoints for external consumption or team reference.

## Instructions
1. Define the endpoint path and HTTP method
2. Describe request parameters (path, query, body)
3. Document response schemas with examples
4. Include error response codes
5. Add authentication requirements if applicable

## Template
\`\`\`yaml
/api/users/{id}:
  get:
    summary: Get user by ID
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    responses:
      200:
        description: User found
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/User'
      404:
        description: User not found
\`\`\`

## Rules
- Document all possible response codes
- Include request/response examples
- Keep descriptions actionable`,
  },

  // Testing Skills
  {
    slug: "react-component-tests",
    name: "React Component Tests",
    description: "Write comprehensive tests for React components",
    category: "testing",
    tags: ["react", "typescript", "vitest", "jest"],
    content: `## When to use
Use when testing React components for rendering, user interactions, and state changes.

## Instructions
1. Import testing utilities and the component
2. Write a describe block for the component
3. Test initial render state
4. Test user interactions with userEvent
5. Test conditional rendering
6. Mock external dependencies

## Template
\`\`\`typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const onClick = vi.fn();
    render(<MyComponent onClick={onClick} />);

    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(<MyComponent loading />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
\`\`\`

## Rules
- Test behavior, not implementation details
- Use accessible queries (getByRole, getByLabelText)
- Avoid testing library internals`,
  },
  {
    slug: "python-unit-tests",
    name: "Python Unit Tests",
    description: "Write pytest-style unit tests for Python code",
    category: "testing",
    tags: ["python", "pytest"],
    content: `## When to use
Use when testing Python functions, classes, and modules with pytest.

## Instructions
1. Create test file with test_ prefix
2. Write test functions with descriptive names
3. Use fixtures for shared setup
4. Use parametrize for multiple test cases
5. Mock external dependencies with pytest-mock

## Template
\`\`\`python
import pytest
from mymodule import calculate_total, UserService

class TestCalculateTotal:
    def test_basic_sum(self):
        assert calculate_total([1, 2, 3]) == 6

    def test_empty_list(self):
        assert calculate_total([]) == 0

    @pytest.mark.parametrize("items,expected", [
        ([10], 10),
        ([1, 2], 3),
        ([-1, 1], 0),
    ])
    def test_various_inputs(self, items, expected):
        assert calculate_total(items) == expected

class TestUserService:
    @pytest.fixture
    def service(self, mocker):
        mock_db = mocker.Mock()
        return UserService(db=mock_db)

    def test_get_user(self, service):
        service.db.find_user.return_value = {"id": 1}
        result = service.get_user(1)
        assert result["id"] == 1
\`\`\`

## Rules
- One assertion per test when possible
- Use fixtures for complex setup
- Name tests descriptively`,
  },
  {
    slug: "rust-unit-tests",
    name: "Rust Unit Tests",
    description: "Write unit tests for Rust functions and modules",
    category: "testing",
    tags: ["rust"],
    content: `## When to use
Use when testing Rust functions, including async functions and error handling.

## Instructions
1. Add #[cfg(test)] module at the bottom of the file
2. Import super::* to access private functions
3. Use #[test] attribute for sync tests
4. Use #[tokio::test] for async tests
5. Use assert!, assert_eq!, assert_ne! macros

## Template
\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_valid_input() {
        let result = parse_input("hello");
        assert_eq!(result, Ok("hello".to_string()));
    }

    #[test]
    fn test_parse_empty_returns_error() {
        let result = parse_input("");
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_fetch_data() {
        let client = MockClient::new();
        let result = fetch_data(&client).await;
        assert!(result.is_ok());
    }
}
\`\`\`

## Rules
- Test both success and error cases
- Use descriptive test names
- Keep tests focused on one behavior`,
  },
  {
    slug: "e2e-tests-playwright",
    name: "E2E Tests (Playwright)",
    description: "Write end-to-end tests with Playwright",
    category: "testing",
    tags: ["playwright", "typescript"],
    content: `## When to use
Use for testing user flows across multiple pages and interactions.

## Instructions
1. Define test using test() function
2. Navigate to the page with page.goto()
3. Interact with elements using locators
4. Assert on page content and behavior
5. Use beforeEach for common setup

## Template
\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('User Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText('Welcome back')).toBeVisible();
  });

  test('invalid credentials show error', async ({ page }) => {
    await page.getByLabel('Email').fill('wrong@example.com');
    await page.getByLabel('Password').fill('wrong');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });
});
\`\`\`

## Rules
- Test complete user journeys
- Use web-first assertions
- Avoid arbitrary waits`,
  },

  // Component Creation Skills
  {
    slug: "react-component-scaffold",
    name: "React Component Scaffold",
    description: "Create new React components with TypeScript and Tailwind",
    category: "component-creation",
    tags: ["react", "typescript", "tailwind"],
    content: `## When to use
Use when creating new React components with TypeScript props and Tailwind styling.

## Instructions
1. Define the props interface above the component
2. Use function declaration with explicit return type
3. Apply Tailwind classes for styling
4. Export as named export

## Template
\`\`\`typescript
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  onClick?: () => void;
}

export function Button({
  children,
  variant = 'primary',
  disabled = false,
  onClick,
}: ButtonProps) {
  const baseStyles = 'rounded-md px-4 py-2 font-medium transition-colors';
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-500',
    secondary: 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700',
  };

  return (
    <button
      className={\`\${baseStyles} \${variantStyles[variant]}\`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
\`\`\`

## Rules
- One component per file
- Props interface defined above component
- Use semantic HTML elements
- Prefer composition over prop drilling`,
  },
  {
    slug: "vue-component-scaffold",
    name: "Vue Component Scaffold",
    description: "Create new Vue 3 components with TypeScript",
    category: "component-creation",
    tags: ["vue", "typescript"],
    content: `## When to use
Use when creating new Vue 3 components with Composition API and TypeScript.

## Instructions
1. Use <script setup lang="ts">
2. Define props with defineProps and typed interface
3. Define emits with defineEmits
4. Use ref/reactive for local state

## Template
\`\`\`vue
<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  title: string;
  count?: number;
}

const props = withDefaults(defineProps<Props>(), {
  count: 0,
});

const emit = defineEmits<{
  (e: 'update', value: number): void;
}>();

const localCount = ref(props.count);
const doubled = computed(() => localCount.value * 2);

function increment() {
  localCount.value++;
  emit('update', localCount.value);
}
</script>

<template>
  <div class="card">
    <h2>{{ title }}</h2>
    <p>Count: {{ localCount }} (doubled: {{ doubled }})</p>
    <button @click="increment">Increment</button>
  </div>
</template>
\`\`\`

## Rules
- Use Composition API with <script setup>
- Define prop defaults with withDefaults
- Type emits for better DX`,
  },

  // State Management Skills
  {
    slug: "zustand-store-pattern",
    name: "Zustand Store Pattern",
    description: "Create Zustand stores with typed state and actions",
    category: "state-management",
    tags: ["zustand", "react", "typescript"],
    content: `## When to use
Use when creating global state stores with Zustand in React apps.

## Instructions
1. Define interface for state + actions
2. Create store with create<Interface>()
3. Initialize state values
4. Define action functions that call set()
5. Export typed hook

## Template
\`\`\`typescript
import { create } from 'zustand';

interface UserState {
  user: User | null;
  loading: boolean;
  error: string | null;

  setUser: (user: User | null) => void;
  fetchUser: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  loading: false,
  error: null,

  setUser: (user) => set({ user }),

  fetchUser: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(\`/api/users/\${id}\`);
      const user = await response.json();
      set({ user, loading: false });
    } catch (e) {
      set({ error: 'Failed to fetch user', loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
\`\`\`

## Rules
- Keep stores focused on one domain
- Use selectors for derived state
- Handle loading and error states`,
  },
  {
    slug: "pinia-store-pattern",
    name: "Pinia Store Pattern",
    description: "Create Pinia stores for Vue applications",
    category: "state-management",
    tags: ["pinia", "vue", "typescript"],
    content: `## When to use
Use when creating state stores in Vue 3 applications with Pinia.

## Instructions
1. Define store with defineStore()
2. Use Setup Store syntax for full TypeScript support
3. Return state refs, computed getters, and actions

## Template
\`\`\`typescript
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', () => {
  // State
  const user = ref<User | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const isAuthenticated = computed(() => user.value !== null);
  const displayName = computed(() =>
    user.value?.name ?? 'Guest'
  );

  // Actions
  async function fetchUser(id: string) {
    loading.value = true;
    error.value = null;
    try {
      const response = await fetch(\`/api/users/\${id}\`);
      user.value = await response.json();
    } catch (e) {
      error.value = 'Failed to fetch user';
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    user.value = null;
  }

  return { user, loading, error, isAuthenticated, displayName, fetchUser, logout };
});
\`\`\`

## Rules
- Use Setup Store syntax for TypeScript
- Keep stores focused on one domain
- Handle loading and error states`,
  },

  // API Design Skills
  {
    slug: "rest-endpoint-typescript",
    name: "REST Endpoint (TypeScript)",
    description: "Create REST API endpoints with Express/Fastify/NestJS",
    category: "api-design",
    tags: ["typescript", "express", "fastify", "nestjs"],
    content: `## When to use
Use when creating new REST API endpoints in Node.js backends.

## Instructions
1. Define request/response types
2. Validate input parameters
3. Handle errors with try/catch
4. Return appropriate status codes
5. Add JSDoc for documentation

## Template
\`\`\`typescript
interface CreateUserRequest {
  email: string;
  name: string;
}

interface CreateUserResponse {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

/**
 * POST /api/users
 * Creates a new user account
 */
export async function createUser(
  req: Request<{}, {}, CreateUserRequest>,
  res: Response<CreateUserResponse | { error: string }>
) {
  try {
    const { email, name } = req.body;

    // Validate input
    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name required' });
    }

    // Create user
    const user = await userService.create({ email, name });

    return res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Failed to create user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
\`\`\`

## Rules
- Always validate input
- Return consistent error format
- Use appropriate HTTP status codes`,
  },
  {
    slug: "tauri-ipc-command",
    name: "Tauri IPC Command",
    description: "Create Tauri backend commands with proper error handling",
    category: "api-design",
    tags: ["tauri", "rust", "typescript"],
    content: `## When to use
Use when creating new Tauri IPC commands that bridge Rust backend and TypeScript frontend.

## Instructions
1. Define async Rust function with #[tauri::command]
2. Return Result<T, String> for proper error handling
3. Use State<AppState> for shared state
4. Register command in invoke_handler
5. Create TypeScript wrapper function

## Template (Rust)
\`\`\`rust
#[tauri::command]
pub async fn get_user(
    id: String,
    state: State<'_, AppState>,
) -> Result<User, String> {
    let db = state.db.lock()
        .map_err(|e| format!("DB lock error: {}", e))?;

    let user = db.query_row(
        "SELECT * FROM users WHERE id = ?1",
        [&id],
        |row| Ok(User { /* ... */ })
    ).map_err(|e| format!("User not found: {}", e))?;

    Ok(user)
}
\`\`\`

## Template (TypeScript)
\`\`\`typescript
export async function getUser(id: string): Promise<User> {
  return invoke<User>("get_user", { id });
}
\`\`\`

## Rules
- Always return Result<T, String>
- Map errors to descriptive strings
- Register in lib.rs invoke_handler`,
  },
  {
    slug: "fastapi-endpoint",
    name: "FastAPI Endpoint",
    description: "Create FastAPI endpoints with Pydantic models",
    category: "api-design",
    tags: ["python", "fastapi"],
    content: `## When to use
Use when creating REST API endpoints with FastAPI and Pydantic.

## Instructions
1. Define Pydantic models for request/response
2. Use type hints for parameters
3. Add docstring for OpenAPI docs
4. Handle errors with HTTPException
5. Use dependency injection for services

## Template
\`\`\`python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/users", tags=["users"])

class CreateUserRequest(BaseModel):
    email: EmailStr
    name: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: str

@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    request: CreateUserRequest,
    user_service: UserService = Depends(get_user_service)
) -> UserResponse:
    """
    Create a new user account.

    - **email**: User's email address
    - **name**: User's display name
    """
    try:
        user = await user_service.create(
            email=request.email,
            name=request.name
        )
        return UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            created_at=user.created_at.isoformat()
        )
    except DuplicateEmailError:
        raise HTTPException(400, "Email already registered")
\`\`\`

## Rules
- Use Pydantic models for validation
- Add docstrings for OpenAPI
- Use dependency injection`,
  },

  // Error Handling Skills
  {
    slug: "react-error-boundary",
    name: "React Error Boundary",
    description: "Implement error boundaries for graceful error handling",
    category: "error-handling",
    tags: ["react", "typescript"],
    content: `## When to use
Use to catch JavaScript errors in component trees and display fallback UI.

## Instructions
1. Create class component extending React.Component
2. Implement static getDerivedStateFromError
3. Implement componentDidCatch for logging
4. Render fallback UI when error exists
5. Wrap error-prone components

## Template
\`\`\`typescript
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // Send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-4 bg-red-950 border border-red-900 rounded">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
\`\`\`

## Rules
- Use at key UI boundaries
- Log errors to monitoring service
- Provide actionable recovery options`,
  },
  {
    slug: "rust-error-handling",
    name: "Rust Error Handling",
    description: "Implement proper error handling patterns in Rust",
    category: "error-handling",
    tags: ["rust"],
    content: `## When to use
Use when defining custom error types and handling errors in Rust.

## Instructions
1. Define custom error enum with thiserror
2. Implement From traits for error conversion
3. Use ? operator for propagation
4. Map errors at boundaries to user-friendly strings

## Template
\`\`\`rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

pub type Result<T> = std::result::Result<T, AppError>;

// Usage
fn get_user(id: &str) -> Result<User> {
    let user = db.query_row(...)
        .map_err(|_| AppError::NotFound(format!("User {}", id)))?;
    Ok(user)
}

// At IPC boundary, convert to String
#[tauri::command]
pub async fn get_user_cmd(id: String) -> std::result::Result<User, String> {
    get_user(&id).map_err(|e| e.to_string())
}
\`\`\`

## Rules
- Use thiserror for custom errors
- Implement From for automatic conversion
- Map to strings at IPC boundaries`,
  },

  // Code Review Skills
  {
    slug: "pr-review-checklist",
    name: "PR Review Checklist",
    description: "Systematic checklist for reviewing pull requests",
    category: "code-review",
    tags: ["universal"],
    content: `## When to use
Use when reviewing pull requests to ensure consistent, thorough reviews.

## Instructions
Follow this checklist for every PR review:

### Functionality
- [ ] Code does what the PR description says
- [ ] Edge cases are handled
- [ ] Error handling is appropriate
- [ ] No obvious bugs or logic errors

### Code Quality
- [ ] Code is readable and self-documenting
- [ ] No unnecessary complexity
- [ ] DRY - no duplicated logic
- [ ] Functions are focused and small

### Testing
- [ ] Tests cover the changes
- [ ] Tests cover edge cases
- [ ] Tests are readable
- [ ] No flaky tests introduced

### Security
- [ ] No hardcoded secrets
- [ ] Input is validated
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities

### Performance
- [ ] No obvious N+1 queries
- [ ] No unnecessary re-renders (React)
- [ ] Large data sets are paginated

### Documentation
- [ ] Complex logic is commented
- [ ] Public APIs are documented
- [ ] README updated if needed

## Rules
- Be constructive and specific
- Suggest improvements, don't just criticize
- Approve when concerns are addressed`,
  },
  {
    slug: "security-review-focus",
    name: "Security Review Focus",
    description: "Security-focused code review checklist",
    category: "code-review",
    tags: ["universal"],
    content: `## When to use
Use when reviewing code that handles user input, authentication, or sensitive data.

## Instructions
Check for these security concerns:

### Input Validation
- [ ] All user input is validated
- [ ] Input length limits enforced
- [ ] Character encoding is handled

### Injection Prevention
- [ ] SQL uses parameterized queries
- [ ] HTML output is escaped (XSS)
- [ ] Command execution uses safe APIs
- [ ] Path traversal is prevented

### Authentication
- [ ] Passwords are hashed (bcrypt/argon2)
- [ ] Sessions have proper expiry
- [ ] CSRF tokens are validated
- [ ] Rate limiting is in place

### Authorization
- [ ] Access control is enforced
- [ ] Users can only access their data
- [ ] Admin actions are restricted

### Data Protection
- [ ] Sensitive data is encrypted
- [ ] Secrets are in environment variables
- [ ] Logs don't contain sensitive data
- [ ] Error messages don't leak info

### Dependencies
- [ ] No known vulnerable packages
- [ ] Dependencies are up to date
- [ ] Minimal dependency footprint

## Rules
- Treat all user input as untrusted
- Apply defense in depth
- Log security-relevant events`,
  },

  // Refactoring Skills
  {
    slug: "extract-shared-logic",
    name: "Extract Shared Logic",
    description: "Identify and extract reusable code into shared utilities",
    category: "refactoring",
    tags: ["universal"],
    content: `## When to use
Use when you notice duplicated logic that should be centralized.

## Instructions
1. Identify the repeated pattern
2. Define a clear interface for the extracted function
3. Create the utility in an appropriate location
4. Replace all instances with the new utility
5. Add tests for the extracted logic

## Checklist
Before extracting:
- [ ] Pattern appears 3+ times (rule of three)
- [ ] Logic is identical, not just similar
- [ ] Extraction simplifies the code

When extracting:
- [ ] Function has a clear, single purpose
- [ ] Parameters cover all use cases
- [ ] Return type is consistent
- [ ] Error handling is appropriate

After extracting:
- [ ] All call sites are updated
- [ ] Tests cover the utility
- [ ] No regression in behavior

## Template
\`\`\`typescript
// Before: duplicated in multiple files
const formattedDate = new Date(timestamp)
  .toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

// After: extracted utility
// src/lib/date.ts
export function formatDate(timestamp: string | Date): string {
  const date = typeof timestamp === 'string'
    ? new Date(timestamp)
    : timestamp;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
\`\`\`

## Rules
- Don't extract too early (YAGNI)
- Keep extracted utilities focused
- Document the utility's purpose`,
  },

  // Debugging Skills
  {
    slug: "systematic-debugging",
    name: "Systematic Debugging",
    description: "Methodical approach to finding and fixing bugs",
    category: "debugging",
    tags: ["universal"],
    content: `## When to use
Use when encountering a bug that isn't immediately obvious.

## Instructions

### 1. Reproduce
- [ ] Can you reproduce the bug consistently?
- [ ] What are the exact steps to reproduce?
- [ ] What is the expected vs actual behavior?

### 2. Isolate
- [ ] When did it start happening?
- [ ] What changed recently?
- [ ] Can you reproduce in a minimal example?
- [ ] Does it happen in all environments?

### 3. Hypothesize
- [ ] What could cause this behavior?
- [ ] List 3-5 possible causes
- [ ] Rank by likelihood

### 4. Test
- [ ] Add logging/breakpoints at key points
- [ ] Check input values at each step
- [ ] Verify assumptions with assertions
- [ ] Test each hypothesis systematically

### 5. Fix
- [ ] Implement the fix
- [ ] Verify the bug is resolved
- [ ] Check for side effects
- [ ] Add a test to prevent regression

### 6. Document
- [ ] Explain the root cause
- [ ] Document the fix
- [ ] Update any misleading comments/docs

## Debugging Commands
\`\`\`bash
# Git: What changed recently?
git log --oneline -20
git diff HEAD~5

# Node: Enable verbose logging
DEBUG=* npm run dev

# Browser: Enable verbose React
localStorage.setItem('debug', '*')
\`\`\`

## Rules
- Don't guess - gather evidence
- Change one thing at a time
- Keep notes as you debug`,
  },

  // Database Skills
  {
    slug: "sql-migration-pattern",
    name: "SQL Migration Pattern",
    description: "Create safe, reversible database migrations",
    category: "database",
    tags: ["postgresql", "mysql", "sqlite"],
    content: `## When to use
Use when modifying database schema (adding tables, columns, indexes).

## Instructions
1. Create timestamped migration file
2. Write UP migration (apply changes)
3. Write DOWN migration (reverse changes)
4. Test both directions
5. Consider data migration if needed

## Template
\`\`\`sql
-- Migration: 20240115_add_user_preferences
-- Description: Add preferences column to users table

-- UP
ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT '{}';
CREATE INDEX idx_users_preferences ON users USING GIN (preferences);

-- DOWN
DROP INDEX IF EXISTS idx_users_preferences;
ALTER TABLE users DROP COLUMN IF EXISTS preferences;
\`\`\`

## Safe Migration Checklist
- [ ] Migration is reversible
- [ ] Handles existing data correctly
- [ ] Doesn't lock tables for too long
- [ ] Tested on a copy of production data

## Common Patterns
\`\`\`sql
-- Add nullable column (safe)
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- Add NOT NULL with default (safe)
ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';

-- Rename column (PostgreSQL)
ALTER TABLE users RENAME COLUMN old_name TO new_name;

-- Add index concurrently (PostgreSQL, no lock)
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
\`\`\`

## Rules
- Always include DOWN migration
- Test on copy of production data
- Use transactions when possible
- Add indexes concurrently on large tables`,
  },
];
