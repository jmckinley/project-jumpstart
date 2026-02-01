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
 * - SKILL_LIBRARY - Array of LibrarySkill objects (~50 skills)
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
  // Language Patterns Skills
  {
    slug: "typescript-patterns",
    name: "TypeScript Patterns",
    description: "TypeScript idioms, conventions, and best practices",
    category: "language-patterns",
    tags: ["typescript"],
    content: `## When to use
Use as a reference for TypeScript coding conventions and patterns.

## Naming Conventions
- **Files**: kebab-case for files (\`user-service.ts\`), PascalCase for components (\`UserCard.tsx\`)
- **Variables/Functions**: camelCase (\`getUserById\`, \`isActive\`)
- **Types/Interfaces**: PascalCase (\`UserProfile\`, \`ApiResponse\`)
- **Constants**: SCREAMING_SNAKE_CASE (\`MAX_RETRIES\`, \`API_BASE_URL\`)
- **Generics**: Single uppercase letters or descriptive names (\`T\`, \`TData\`, \`TResponse\`)

## Common Patterns
\`\`\`typescript
// Prefer interfaces for object shapes
interface User {
  id: string;
  name: string;
  email: string;
}

// Use type for unions, intersections, mapped types
type Status = 'pending' | 'active' | 'inactive';
type UserWithRole = User & { role: string };

// Const assertions for literal types
const ROUTES = {
  home: '/',
  users: '/users',
} as const;

// Discriminated unions for state
type LoadingState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

// Generic constraints
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// Optional chaining and nullish coalescing
const userName = user?.profile?.name ?? 'Anonymous';

// Type guards
function isUser(value: unknown): value is User {
  return typeof value === 'object' && value !== null && 'id' in value;
}
\`\`\`

## Rules
- Prefer \`interface\` over \`type\` for object shapes (better error messages)
- Use \`unknown\` over \`any\` when type is truly unknown
- Enable strict mode in tsconfig.json
- Avoid type assertions (\`as\`) - use type guards instead
- Export types that are part of your public API`,
  },
  {
    slug: "python-patterns",
    name: "Python Patterns",
    description: "Python idioms, PEP 8 conventions, and best practices",
    category: "language-patterns",
    tags: ["python"],
    content: `## When to use
Use as a reference for Python coding conventions (PEP 8) and patterns.

## Naming Conventions
- **Files/Modules**: snake_case (\`user_service.py\`)
- **Variables/Functions**: snake_case (\`get_user_by_id\`, \`is_active\`)
- **Classes**: PascalCase (\`UserProfile\`, \`ApiClient\`)
- **Constants**: SCREAMING_SNAKE_CASE (\`MAX_RETRIES\`, \`API_BASE_URL\`)
- **Private**: Single underscore prefix (\`_internal_method\`)
- **Name Mangling**: Double underscore prefix (\`__private_attr\`)

## Common Patterns
\`\`\`python
# Type hints (Python 3.10+)
def get_user(user_id: str) -> User | None:
    ...

# Dataclasses for data structures
from dataclasses import dataclass

@dataclass
class User:
    id: str
    name: str
    email: str
    active: bool = True

# Context managers for resource management
with open('file.txt') as f:
    content = f.read()

# List/dict comprehensions
squares = [x**2 for x in range(10)]
user_map = {u.id: u for u in users}

# Generator expressions for memory efficiency
sum_squares = sum(x**2 for x in range(1000000))

# Walrus operator (Python 3.8+)
if (n := len(data)) > 10:
    print(f"Processing {n} items")

# Pattern matching (Python 3.10+)
match status:
    case 'pending':
        handle_pending()
    case 'active' | 'verified':
        handle_active()
    case _:
        handle_unknown()

# EAFP (Easier to Ask Forgiveness than Permission)
try:
    value = data['key']
except KeyError:
    value = default
\`\`\`

## Rules
- Follow PEP 8 style guide
- Use type hints for function signatures
- Prefer \`pathlib\` over \`os.path\`
- Use \`f-strings\` for string formatting
- Use virtual environments for dependencies`,
  },
  {
    slug: "rust-patterns",
    name: "Rust Patterns",
    description: "Rust idioms, conventions, and ownership patterns",
    category: "language-patterns",
    tags: ["rust"],
    content: `## When to use
Use as a reference for Rust coding conventions and idiomatic patterns.

## Naming Conventions
- **Files/Modules**: snake_case (\`user_service.rs\`)
- **Variables/Functions**: snake_case (\`get_user_by_id\`, \`is_active\`)
- **Types/Traits**: PascalCase (\`UserProfile\`, \`Serialize\`)
- **Constants/Statics**: SCREAMING_SNAKE_CASE (\`MAX_RETRIES\`)
- **Lifetimes**: Short lowercase (\`'a\`, \`'de\`)

## Common Patterns
\`\`\`rust
// Result and Option handling
fn get_user(id: &str) -> Result<User, Error> {
    let user = db.find(id).ok_or(Error::NotFound)?;
    Ok(user)
}

// Pattern matching
match result {
    Ok(user) => println!("Found: {}", user.name),
    Err(Error::NotFound) => println!("User not found"),
    Err(e) => return Err(e),
}

// if let for single pattern
if let Some(user) = maybe_user {
    process(user);
}

// Iterator chains
let active_names: Vec<String> = users
    .iter()
    .filter(|u| u.active)
    .map(|u| u.name.clone())
    .collect();

// Builder pattern
let client = ClientBuilder::new()
    .timeout(Duration::from_secs(30))
    .retry_count(3)
    .build()?;

// Newtype pattern for type safety
struct UserId(String);
struct Email(String);

// From/Into for conversions
impl From<&str> for UserId {
    fn from(s: &str) -> Self {
        UserId(s.to_string())
    }
}

// Derive common traits
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
struct User {
    id: String,
    name: String,
}
\`\`\`

## Rules
- Use \`?\` operator for error propagation
- Prefer \`&str\` over \`String\` for function parameters
- Use \`#[derive]\` for common trait implementations
- Run \`cargo clippy\` before committing
- Prefer iterators over manual loops`,
  },
  {
    slug: "go-patterns",
    name: "Go Patterns",
    description: "Go idioms, conventions, and effective patterns",
    category: "language-patterns",
    tags: ["go"],
    content: `## When to use
Use as a reference for Go coding conventions and idiomatic patterns.

## Naming Conventions
- **Files**: snake_case (\`user_service.go\`)
- **Packages**: short, lowercase, no underscores (\`http\`, \`user\`)
- **Exported (public)**: PascalCase (\`GetUser\`, \`UserService\`)
- **Unexported (private)**: camelCase (\`getUser\`, \`userCache\`)
- **Interfaces**: -er suffix for single method (\`Reader\`, \`Writer\`)
- **Acronyms**: All caps (\`HTTPClient\`, \`userID\`)

## Common Patterns
\`\`\`go
// Error handling - check immediately
result, err := doSomething()
if err != nil {
    return fmt.Errorf("doSomething failed: %w", err)
}

// Multiple return values
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}

// Defer for cleanup
func readFile(path string) ([]byte, error) {
    f, err := os.Open(path)
    if err != nil {
        return nil, err
    }
    defer f.Close()
    return io.ReadAll(f)
}

// Interface satisfaction (implicit)
type Reader interface {
    Read(p []byte) (n int, err error)
}

// Struct embedding for composition
type UserService struct {
    *BaseService  // Embedded
    cache *Cache
}

// Functional options pattern
type Option func(*Config)

func WithTimeout(d time.Duration) Option {
    return func(c *Config) { c.Timeout = d }
}

func NewClient(opts ...Option) *Client {
    cfg := defaultConfig()
    for _, opt := range opts {
        opt(cfg)
    }
    return &Client{config: cfg}
}

// Context for cancellation
func fetchData(ctx context.Context, url string) ([]byte, error) {
    req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
    // ...
}
\`\`\`

## Rules
- Handle errors explicitly, don't ignore them
- Use \`context.Context\` for cancellation and timeouts
- Prefer composition over inheritance
- Keep interfaces small (1-3 methods)
- Run \`go fmt\` and \`go vet\` before committing`,
  },
  {
    slug: "java-patterns",
    name: "Java Patterns",
    description: "Java idioms, conventions, and modern patterns",
    category: "language-patterns",
    tags: ["java"],
    content: `## When to use
Use as a reference for Java coding conventions and modern patterns.

## Naming Conventions
- **Files/Classes**: PascalCase (\`UserService.java\`)
- **Packages**: lowercase, reverse domain (\`com.example.user\`)
- **Variables/Methods**: camelCase (\`getUserById\`, \`isActive\`)
- **Constants**: SCREAMING_SNAKE_CASE (\`MAX_RETRIES\`)
- **Interfaces**: PascalCase, often adjective (\`Serializable\`, \`Comparable\`)

## Common Patterns
\`\`\`java
// Records for immutable data (Java 16+)
public record User(String id, String name, String email) {}

// Optional for nullable values
public Optional<User> findUser(String id) {
    return Optional.ofNullable(userMap.get(id));
}

// Stream API for collections
List<String> activeNames = users.stream()
    .filter(User::isActive)
    .map(User::getName)
    .toList();

// Pattern matching for instanceof (Java 16+)
if (obj instanceof User user) {
    System.out.println(user.getName());
}

// Switch expressions (Java 14+)
String message = switch (status) {
    case PENDING -> "Waiting...";
    case ACTIVE -> "Ready";
    case INACTIVE -> "Disabled";
};

// Builder pattern
User user = User.builder()
    .id("123")
    .name("John")
    .email("john@example.com")
    .build();

// Try-with-resources
try (var reader = new BufferedReader(new FileReader(path))) {
    return reader.lines().toList();
}

// CompletableFuture for async
CompletableFuture.supplyAsync(() -> fetchUser(id))
    .thenApply(this::processUser)
    .exceptionally(e -> handleError(e));

// Sealed classes (Java 17+)
public sealed interface Shape permits Circle, Rectangle, Triangle {}
\`\`\`

## Rules
- Use \`Optional\` instead of returning null
- Prefer records for DTOs and value objects
- Use try-with-resources for AutoCloseable
- Prefer composition over inheritance
- Use modern features (var, records, switch expressions)`,
  },
  {
    slug: "kotlin-patterns",
    name: "Kotlin Patterns",
    description: "Kotlin idioms, conventions, and Android patterns",
    category: "language-patterns",
    tags: ["kotlin", "android"],
    content: `## When to use
Use as a reference for Kotlin coding conventions and idiomatic patterns.

## Naming Conventions
- **Files**: PascalCase for classes (\`UserService.kt\`), can contain multiple classes
- **Packages**: lowercase, no underscores (\`com.example.user\`)
- **Variables/Functions**: camelCase (\`getUserById\`, \`isActive\`)
- **Constants**: SCREAMING_SNAKE_CASE or camelCase in companion objects
- **Classes**: PascalCase (\`UserRepository\`)

## Common Patterns
\`\`\`kotlin
// Data classes for DTOs
data class User(
    val id: String,
    val name: String,
    val email: String,
    val active: Boolean = true
)

// Null safety
val name: String? = user?.name
val displayName = name ?: "Anonymous"
val length = name?.length ?: 0

// Elvis operator with throw
val user = findUser(id) ?: throw NotFoundException()

// Scope functions
user?.let { processUser(it) }
user.apply { name = "Updated" }
val result = with(config) { "$host:$port" }

// Extension functions
fun String.toSlug(): String =
    lowercase().replace(" ", "-")

// Sealed classes for state
sealed class UiState<out T> {
    object Loading : UiState<Nothing>()
    data class Success<T>(val data: T) : UiState<T>()
    data class Error(val message: String) : UiState<Nothing>()
}

// Coroutine patterns
suspend fun fetchUsers(): List<User> = withContext(Dispatchers.IO) {
    api.getUsers()
}

// Delegation
class UserRepository(
    private val api: UserApi
) : UserApi by api

// Inline classes for type safety
@JvmInline
value class UserId(val value: String)
\`\`\`

## Rules
- Prefer val over var (immutability)
- Use data classes for DTOs
- Use sealed classes for restricted hierarchies
- Leverage scope functions appropriately
- Use coroutines for async operations`,
  },
  {
    slug: "swift-patterns",
    name: "Swift Patterns",
    description: "Swift idioms, conventions, and iOS patterns",
    category: "language-patterns",
    tags: ["swift", "ios"],
    content: `## When to use
Use as a reference for Swift coding conventions and idiomatic patterns.

## Naming Conventions
- **Files**: PascalCase matching primary type (\`UserService.swift\`)
- **Types/Protocols**: PascalCase (\`UserProfile\`, \`Codable\`)
- **Variables/Functions**: camelCase (\`getUserById\`, \`isActive\`)
- **Constants**: camelCase (\`maxRetries\`, \`defaultTimeout\`)
- **Enum cases**: camelCase (\`case pending\`, \`case active\`)

## Common Patterns
\`\`\`swift
// Structs for value types (prefer over classes)
struct User: Codable, Identifiable {
    let id: String
    var name: String
    var email: String
    var isActive: Bool = true
}

// Optionals and unwrapping
guard let user = findUser(id) else {
    return nil
}

// Optional chaining
let street = user?.address?.street ?? "Unknown"

// Enums with associated values
enum Result<Success, Failure: Error> {
    case success(Success)
    case failure(Failure)
}

// Protocol-oriented design
protocol Identifiable {
    associatedtype ID: Hashable
    var id: ID { get }
}

extension Array where Element: Identifiable {
    func find(byId id: Element.ID) -> Element? {
        first { $0.id == id }
    }
}

// Property wrappers
@propertyWrapper
struct Clamped<Value: Comparable> {
    var wrappedValue: Value {
        didSet { wrappedValue = min(max(wrappedValue, range.lowerBound), range.upperBound) }
    }
    let range: ClosedRange<Value>
}

// Result builders (SwiftUI)
@ViewBuilder
func content() -> some View {
    if isLoading {
        ProgressView()
    } else {
        Text(message)
    }
}

// Async/await
func fetchUser(id: String) async throws -> User {
    let url = URL(string: "\\(baseURL)/users/\\(id)")!
    let (data, _) = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode(User.self, from: data)
}
\`\`\`

## Rules
- Prefer structs over classes (value semantics)
- Use guard for early exits
- Leverage protocol extensions for shared behavior
- Use async/await for concurrency
- Follow Swift API Design Guidelines`,
  },
  {
    slug: "javascript-patterns",
    name: "JavaScript Patterns",
    description: "Modern JavaScript idioms and ES6+ patterns",
    category: "language-patterns",
    tags: ["javascript"],
    content: `## When to use
Use as a reference for modern JavaScript (ES6+) conventions and patterns.

## Naming Conventions
- **Files**: kebab-case (\`user-service.js\`) or camelCase
- **Variables/Functions**: camelCase (\`getUserById\`, \`isActive\`)
- **Classes**: PascalCase (\`UserService\`)
- **Constants**: SCREAMING_SNAKE_CASE or camelCase (\`MAX_RETRIES\`, \`apiBaseUrl\`)
- **Private fields**: # prefix (\`#privateField\`)

## Common Patterns
\`\`\`javascript
// Destructuring
const { id, name, email = 'n/a' } = user;
const [first, ...rest] = items;

// Spread operator
const updated = { ...user, name: 'New Name' };
const combined = [...array1, ...array2];

// Optional chaining and nullish coalescing
const street = user?.address?.street ?? 'Unknown';

// Template literals
const message = \`Hello, \${name}! You have \${count} messages.\`;

// Arrow functions
const double = (x) => x * 2;
const fetchUser = async (id) => {
  const response = await fetch(\`/api/users/\${id}\`);
  return response.json();
};

// Array methods
const activeNames = users
  .filter(u => u.active)
  .map(u => u.name);

// Object shorthand
const name = 'John';
const user = { name, active: true };

// Private class fields
class Counter {
  #count = 0;
  increment() { this.#count++; }
  get value() { return this.#count; }
}

// Modules
export const helper = () => {};
export default class Service {}
import Service, { helper } from './service.js';

// Promise.all for parallel operations
const [users, posts] = await Promise.all([
  fetchUsers(),
  fetchPosts()
]);
\`\`\`

## Rules
- Use const by default, let when reassignment needed
- Prefer arrow functions for callbacks
- Use async/await over .then() chains
- Avoid var, use const/let
- Use optional chaining for nested property access`,
  },

  // UI/UX Skills
  {
    slug: "accessibility-patterns",
    name: "Accessibility (a11y)",
    description: "Make interfaces accessible to all users including those with disabilities",
    category: "ui-ux",
    tags: ["universal"],
    content: `## When to use
Use when building any user interface to ensure it's accessible to all users.

## Core Principles
- **Perceivable**: Content must be presentable in ways users can perceive
- **Operable**: UI must be operable via keyboard, mouse, touch, voice
- **Understandable**: Information and UI operation must be understandable
- **Robust**: Content must work with current and future assistive technologies

## Essential Patterns

### Semantic HTML
\`\`\`html
<!-- Use semantic elements -->
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/home">Home</a></li>
  </ul>
</nav>

<main>
  <article>
    <h1>Page Title</h1>
    <section aria-labelledby="section-heading">
      <h2 id="section-heading">Section</h2>
    </section>
  </article>
</main>
\`\`\`

### Keyboard Navigation
\`\`\`typescript
// Ensure all interactive elements are focusable
<button onClick={handleClick}>Click me</button>  // ✓ Focusable
<div onClick={handleClick}>Click me</div>        // ✗ Not focusable

// Add keyboard handlers for custom components
function CustomButton({ onClick, children }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {children}
    </div>
  );
}
\`\`\`

### ARIA Attributes
\`\`\`tsx
// Live regions for dynamic content
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// Form accessibility
<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  aria-describedby="email-error"
  aria-invalid={hasError}
/>
{hasError && <span id="email-error" role="alert">Invalid email</span>}

// Modal dialogs
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
>
  <h2 id="dialog-title">Confirm Action</h2>
</div>
\`\`\`

### Color and Contrast
- Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text
- Don't rely on color alone to convey information
- Provide visible focus indicators

## Testing Checklist
- [ ] All functionality available via keyboard
- [ ] Focus order is logical
- [ ] Focus is visible at all times
- [ ] Images have alt text
- [ ] Form inputs have labels
- [ ] Error messages are announced
- [ ] Color contrast meets WCAG AA

## Rules
- Test with screen readers (VoiceOver, NVDA)
- Use browser accessibility tools (Lighthouse, axe)
- Include users with disabilities in testing`,
  },
  {
    slug: "responsive-design",
    name: "Responsive Design",
    description: "Create layouts that work across all screen sizes and devices",
    category: "ui-ux",
    tags: ["universal", "tailwind"],
    content: `## When to use
Use when building interfaces that need to work on mobile, tablet, and desktop.

## Mobile-First Approach
Start with mobile styles, then add complexity for larger screens.

\`\`\`css
/* Base styles (mobile) */
.container {
  padding: 1rem;
  flex-direction: column;
}

/* Tablet and up */
@media (min-width: 768px) {
  .container {
    padding: 2rem;
    flex-direction: row;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    max-width: 1200px;
    margin: 0 auto;
  }
}
\`\`\`

## Tailwind Responsive Patterns
\`\`\`tsx
// Mobile-first responsive classes
<div className="
  flex flex-col gap-4
  md:flex-row md:gap-6
  lg:gap-8
">
  <aside className="w-full md:w-64 lg:w-80">
    Sidebar
  </aside>
  <main className="flex-1">
    Content
  </main>
</div>

// Responsive text
<h1 className="text-2xl md:text-3xl lg:text-4xl">
  Responsive Heading
</h1>

// Hide/show based on breakpoint
<nav className="hidden md:flex">Desktop Nav</nav>
<button className="md:hidden">Mobile Menu</button>

// Responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {items.map(item => <Card key={item.id} />)}
</div>
\`\`\`

## Fluid Typography
\`\`\`css
/* Fluid font size using clamp */
h1 {
  font-size: clamp(1.5rem, 4vw, 3rem);
}

/* Fluid spacing */
.section {
  padding: clamp(1rem, 5vw, 4rem);
}
\`\`\`

## Common Breakpoints
| Name | Min Width | Typical Use |
|------|-----------|-------------|
| sm | 640px | Large phones |
| md | 768px | Tablets |
| lg | 1024px | Laptops |
| xl | 1280px | Desktops |
| 2xl | 1536px | Large screens |

## Touch-Friendly Design
\`\`\`tsx
// Minimum touch target: 44x44px
<button className="min-h-[44px] min-w-[44px] p-3">
  Tap me
</button>

// Adequate spacing between touch targets
<div className="flex gap-3">
  <button>Action 1</button>
  <button>Action 2</button>
</div>
\`\`\`

## Rules
- Design mobile-first, enhance for larger screens
- Test on real devices, not just browser resize
- Use relative units (rem, em, %) over fixed pixels
- Ensure touch targets are at least 44x44px
- Consider landscape orientation on mobile`,
  },
  {
    slug: "loading-empty-states",
    name: "Loading & Empty States",
    description: "Design effective loading indicators and empty state messaging",
    category: "ui-ux",
    tags: ["universal", "react"],
    content: `## When to use
Use when displaying async content or when data sets may be empty.

## Loading States

### Skeleton Screens
Better than spinners for content that will appear in a known layout.

\`\`\`tsx
function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="h-48 bg-neutral-700 rounded-lg" />
      <div className="mt-4 space-y-3">
        <div className="h-4 bg-neutral-700 rounded w-3/4" />
        <div className="h-4 bg-neutral-700 rounded w-1/2" />
      </div>
    </div>
  );
}

function CardList({ isLoading, items }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
      </div>
    );
  }
  return items.map(item => <Card key={item.id} item={item} />);
}
\`\`\`

### Spinner for Actions
Use for button actions and short operations.

\`\`\`tsx
function LoadingButton({ isLoading, children, ...props }) {
  return (
    <button disabled={isLoading} {...props}>
      {isLoading ? (
        <span className="flex items-center gap-2">
          <Spinner className="h-4 w-4 animate-spin" />
          Loading...
        </span>
      ) : children}
    </button>
  );
}
\`\`\`

### Progressive Loading
Show content as it becomes available.

\`\`\`tsx
function Feed({ items, hasMore, loadMore, isLoadingMore }) {
  return (
    <>
      {items.map(item => <FeedItem key={item.id} item={item} />)}

      {hasMore && (
        <button onClick={loadMore} disabled={isLoadingMore}>
          {isLoadingMore ? 'Loading...' : 'Load More'}
        </button>
      )}
    </>
  );
}
\`\`\`

## Empty States

### Informative Empty State
\`\`\`tsx
function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-neutral-500 mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-neutral-200">{title}</h3>
      <p className="mt-2 text-sm text-neutral-400 max-w-sm">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// Usage
<EmptyState
  icon={<InboxIcon className="h-12 w-12" />}
  title="No messages yet"
  description="When you receive messages, they'll appear here."
  action={<Button>Compose Message</Button>}
/>
\`\`\`

### Contextual Empty States
- **Search**: "No results for 'query'. Try different keywords."
- **Filters**: "No items match your filters. Clear filters to see all."
- **First use**: "Welcome! Create your first project to get started."
- **Error**: "Unable to load data. Please try again."

## Rules
- Show skeleton screens for predictable layouts
- Use spinners for short, unpredictable waits
- Always provide context in empty states
- Include a clear call-to-action when appropriate
- Avoid showing empty states briefly during loading`,
  },
  {
    slug: "form-ux-patterns",
    name: "Form UX",
    description: "Design user-friendly forms with clear validation and feedback",
    category: "ui-ux",
    tags: ["universal", "react"],
    content: `## When to use
Use when building any form that collects user input.

## Input States
\`\`\`tsx
interface InputProps {
  label: string;
  error?: string;
  hint?: string;
}

function Input({ label, error, hint, ...props }: InputProps) {
  const id = useId();
  const hasError = Boolean(error);

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>

      <input
        id={id}
        aria-invalid={hasError}
        aria-describedby={hasError ? \`\${id}-error\` : hint ? \`\${id}-hint\` : undefined}
        className={\`
          w-full rounded-md border px-3 py-2
          \${hasError
            ? 'border-red-500 focus:ring-red-500'
            : 'border-neutral-600 focus:ring-blue-500'
          }
        \`}
        {...props}
      />

      {hint && !hasError && (
        <p id={\`\${id}-hint\`} className="text-xs text-neutral-400">
          {hint}
        </p>
      )}

      {hasError && (
        <p id={\`\${id}-error\`} role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
\`\`\`

## Validation Timing

### On Blur (Recommended for most cases)
\`\`\`tsx
const [email, setEmail] = useState('');
const [error, setError] = useState('');
const [touched, setTouched] = useState(false);

<Input
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  onBlur={() => {
    setTouched(true);
    if (!isValidEmail(email)) {
      setError('Please enter a valid email');
    } else {
      setError('');
    }
  }}
  error={touched ? error : undefined}
/>
\`\`\`

### Real-time (For specific cases like passwords)
\`\`\`tsx
function PasswordStrength({ password }) {
  const strength = calculateStrength(password);

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(level => (
          <div
            key={level}
            className={\`h-1 flex-1 rounded \${
              strength >= level ? strengthColors[strength] : 'bg-neutral-700'
            }\`}
          />
        ))}
      </div>
      <p className="text-xs mt-1">{strengthLabels[strength]}</p>
    </div>
  );
}
\`\`\`

## Form Layout Patterns
\`\`\`tsx
// Single column for simplicity
<form className="space-y-4 max-w-md">
  <Input label="Full Name" />
  <Input label="Email" type="email" />
  <Input label="Message" as="textarea" />
  <Button type="submit">Send</Button>
</form>

// Multi-column for related fields
<div className="grid grid-cols-2 gap-4">
  <Input label="First Name" />
  <Input label="Last Name" />
</div>

// Inline for compact forms
<form className="flex gap-2">
  <Input placeholder="Enter email" className="flex-1" />
  <Button type="submit">Subscribe</Button>
</form>
\`\`\`

## Error Summary
\`\`\`tsx
function FormErrors({ errors }) {
  if (errors.length === 0) return null;

  return (
    <div role="alert" className="p-4 bg-red-500/10 border border-red-500/50 rounded">
      <h3 className="font-medium text-red-400">Please fix the following:</h3>
      <ul className="mt-2 list-disc list-inside text-sm text-red-300">
        {errors.map((error, i) => <li key={i}>{error}</li>)}
      </ul>
    </div>
  );
}
\`\`\`

## Rules
- Label every input (never rely on placeholder alone)
- Show errors next to the relevant field
- Validate on blur, not on every keystroke
- Disable submit button while submitting
- Preserve user input on validation failure
- Use appropriate input types (email, tel, url)`,
  },
  {
    slug: "animation-motion",
    name: "Animation & Motion",
    description: "Add purposeful animations and respect user motion preferences",
    category: "ui-ux",
    tags: ["universal", "tailwind", "react"],
    content: `## When to use
Use animation to provide feedback, guide attention, and enhance perceived performance.

## Core Principles
- **Purposeful**: Every animation should serve a function
- **Quick**: Keep durations short (150-300ms for UI, 300-500ms for larger motions)
- **Accessible**: Respect prefers-reduced-motion

## CSS Transitions
\`\`\`css
/* Basic transition */
.button {
  transition: background-color 150ms ease, transform 150ms ease;
}

.button:hover {
  background-color: var(--hover-color);
}

.button:active {
  transform: scale(0.98);
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
\`\`\`

## Tailwind Animation Classes
\`\`\`tsx
// Hover and focus transitions
<button className="
  transition-colors duration-150
  hover:bg-blue-600
  focus:ring-2 focus:ring-blue-500
">
  Click me
</button>

// Scale on interaction
<div className="
  transition-transform duration-150
  hover:scale-105
  active:scale-95
">
  Card
</div>

// Fade in animation
<div className="animate-fadeIn">
  New content
</div>

// Pulse for attention
<span className="animate-pulse">
  Loading...
</span>
\`\`\`

## React Animation Patterns

### Enter/Exit Animations
\`\`\`tsx
function FadeIn({ show, children }) {
  const [shouldRender, setShouldRender] = useState(show);

  useEffect(() => {
    if (show) setShouldRender(true);
  }, [show]);

  const handleAnimationEnd = () => {
    if (!show) setShouldRender(false);
  };

  if (!shouldRender) return null;

  return (
    <div
      className={\`transition-opacity duration-200 \${show ? 'opacity-100' : 'opacity-0'}\`}
      onTransitionEnd={handleAnimationEnd}
    >
      {children}
    </div>
  );
}
\`\`\`

### Staggered List Animation
\`\`\`tsx
function StaggeredList({ items }) {
  return (
    <ul>
      {items.map((item, index) => (
        <li
          key={item.id}
          className="animate-slideIn"
          style={{ animationDelay: \`\${index * 50}ms\` }}
        >
          {item.name}
        </li>
      ))}
    </ul>
  );
}
\`\`\`

## Reduced Motion Hook
\`\`\`tsx
function usePrefersReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(query.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}

// Usage
function AnimatedComponent() {
  const prefersReduced = usePrefersReducedMotion();

  return (
    <div className={prefersReduced ? '' : 'animate-bounce'}>
      {prefersReduced ? 'Static' : 'Bouncing'}
    </div>
  );
}
\`\`\`

## Common Durations
| Type | Duration | Use Case |
|------|----------|----------|
| Instant | 0-100ms | Button color change |
| Fast | 100-200ms | Hover states, toggles |
| Normal | 200-300ms | Modals, dropdowns |
| Slow | 300-500ms | Page transitions |

## Rules
- Always include prefers-reduced-motion support
- Use transform and opacity for smooth 60fps
- Avoid animating layout properties (width, height, top)
- Keep animations under 400ms for UI interactions
- Don't animate on page load unnecessarily`,
  },

  // Mobile Development Skills
  {
    slug: "android-activity-scaffold",
    name: "Android Activity/Fragment",
    description: "Create Android Activities and Fragments with Kotlin",
    category: "component-creation",
    tags: ["kotlin", "android"],
    content: `## When to use
Use when creating new Android Activities or Fragments with proper lifecycle handling.

## Instructions
1. Define the layout XML file
2. Create the Activity/Fragment class
3. Implement lifecycle methods appropriately
4. Use ViewBinding for type-safe view access
5. Handle configuration changes

## Template (Fragment)
\`\`\`kotlin
class UserProfileFragment : Fragment() {
    private var _binding: FragmentUserProfileBinding? = null
    private val binding get() = _binding!!

    private val viewModel: UserProfileViewModel by viewModels()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentUserProfileBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupViews()
        observeViewModel()
    }

    private fun setupViews() {
        binding.saveButton.setOnClickListener {
            viewModel.saveProfile()
        }
    }

    private fun observeViewModel() {
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.uiState.collect { state ->
                updateUI(state)
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
\`\`\`

## Rules
- Always null out binding in onDestroyView to prevent leaks
- Use viewLifecycleOwner for coroutine scopes in Fragments
- Handle configuration changes properly
- Use ViewModel for surviving configuration changes`,
  },
  {
    slug: "swift-viewcontroller",
    name: "iOS ViewController",
    description: "Create iOS ViewControllers with Swift best practices",
    category: "component-creation",
    tags: ["swift", "ios"],
    content: `## When to use
Use when creating new iOS ViewControllers with proper lifecycle handling.

## Instructions
1. Define the storyboard/XIB or programmatic layout
2. Create the ViewController class
3. Implement lifecycle methods
4. Set up delegates and data sources
5. Handle memory warnings

## Template
\`\`\`swift
import UIKit

final class UserProfileViewController: UIViewController {
    // MARK: - Properties
    private let viewModel: UserProfileViewModel

    private lazy var profileImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.translatesAutoresizingMaskIntoConstraints = false
        imageView.contentMode = .scaleAspectFill
        imageView.layer.cornerRadius = 50
        imageView.clipsToBounds = true
        return imageView
    }()

    private lazy var nameLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.font = .systemFont(ofSize: 24, weight: .bold)
        return label
    }()

    // MARK: - Init
    init(viewModel: UserProfileViewModel) {
        self.viewModel = viewModel
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        bindViewModel()
        viewModel.loadProfile()
    }

    // MARK: - Setup
    private func setupUI() {
        view.backgroundColor = .systemBackground
        view.addSubview(profileImageView)
        view.addSubview(nameLabel)

        NSLayoutConstraint.activate([
            profileImageView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20),
            profileImageView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            profileImageView.widthAnchor.constraint(equalToConstant: 100),
            profileImageView.heightAnchor.constraint(equalToConstant: 100),

            nameLabel.topAnchor.constraint(equalTo: profileImageView.bottomAnchor, constant: 16),
            nameLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
        ])
    }

    private func bindViewModel() {
        viewModel.onProfileLoaded = { [weak self] profile in
            self?.nameLabel.text = profile.name
        }
    }
}
\`\`\`

## Rules
- Use dependency injection for ViewModels
- Mark views as lazy and private
- Use weak self in closures to prevent retain cycles
- Organize with MARK comments`,
  },
  {
    slug: "swiftui-view",
    name: "SwiftUI View",
    description: "Create SwiftUI views with proper state management",
    category: "component-creation",
    tags: ["swift", "swiftui", "ios"],
    content: `## When to use
Use when creating new SwiftUI views with reactive state management.

## Instructions
1. Define the View struct
2. Declare state with @State, @Binding, @StateObject as needed
3. Build the body with SwiftUI components
4. Extract subviews for complex layouts
5. Use previews for development

## Template
\`\`\`swift
import SwiftUI

struct UserProfileView: View {
    @StateObject private var viewModel = UserProfileViewModel()
    @State private var isEditing = false

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                profileHeader
                profileDetails
                actionButtons
            }
            .padding()
        }
        .navigationTitle("Profile")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(isEditing ? "Done" : "Edit") {
                    isEditing.toggle()
                }
            }
        }
        .task {
            await viewModel.loadProfile()
        }
    }

    // MARK: - Subviews
    private var profileHeader: some View {
        VStack {
            AsyncImage(url: viewModel.profile?.avatarURL) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                Circle().fill(Color.gray)
            }
            .frame(width: 100, height: 100)
            .clipShape(Circle())

            Text(viewModel.profile?.name ?? "Loading...")
                .font(.title2.bold())
        }
    }

    private var profileDetails: some View {
        VStack(alignment: .leading, spacing: 12) {
            if isEditing {
                TextField("Name", text: $viewModel.editableName)
                    .textFieldStyle(.roundedBorder)
            } else {
                Text(viewModel.profile?.bio ?? "")
                    .foregroundColor(.secondary)
            }
        }
    }

    private var actionButtons: some View {
        Button("Save Changes") {
            Task { await viewModel.saveProfile() }
        }
        .buttonStyle(.borderedProminent)
        .disabled(!isEditing)
    }
}

#Preview {
    NavigationStack {
        UserProfileView()
    }
}
\`\`\`

## Rules
- Use @StateObject for owned view models
- Use @ObservedObject for passed-in view models
- Extract computed view properties for readability
- Add #Preview for rapid iteration`,
  },
  {
    slug: "kotlin-coroutines",
    name: "Kotlin Coroutines",
    description: "Implement async operations with Kotlin coroutines",
    category: "api-design",
    tags: ["kotlin", "android"],
    content: `## When to use
Use when implementing asynchronous operations in Kotlin/Android apps.

## Instructions
1. Define suspend functions for async operations
2. Use appropriate coroutine scope (viewModelScope, lifecycleScope)
3. Handle exceptions with try/catch or CoroutineExceptionHandler
4. Use Flow for reactive streams
5. Choose the right dispatcher (IO, Main, Default)

## Template
\`\`\`kotlin
class UserRepository(
    private val api: UserApi,
    private val db: UserDao,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) {
    // Single async operation
    suspend fun getUser(id: String): Result<User> = withContext(ioDispatcher) {
        try {
            val user = api.fetchUser(id)
            db.insertUser(user)
            Result.success(user)
        } catch (e: Exception) {
            // Try cache on network failure
            db.getUser(id)?.let { Result.success(it) }
                ?: Result.failure(e)
        }
    }

    // Reactive stream with Flow
    fun observeUsers(): Flow<List<User>> = db.observeAllUsers()
        .flowOn(ioDispatcher)
        .catch { emit(emptyList()) }

    // Parallel operations
    suspend fun syncAllData(): Result<Unit> = withContext(ioDispatcher) {
        try {
            coroutineScope {
                val users = async { api.fetchUsers() }
                val settings = async { api.fetchSettings() }

                db.insertUsers(users.await())
                db.insertSettings(settings.await())
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

// In ViewModel
class UserViewModel(private val repository: UserRepository) : ViewModel() {
    private val _uiState = MutableStateFlow<UiState>(UiState.Loading)
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    fun loadUser(id: String) {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            repository.getUser(id)
                .onSuccess { _uiState.value = UiState.Success(it) }
                .onFailure { _uiState.value = UiState.Error(it.message) }
        }
    }
}
\`\`\`

## Rules
- Use viewModelScope in ViewModels
- Use lifecycleScope in Activities/Fragments
- Always handle exceptions
- Use Dispatchers.IO for blocking operations`,
  },
  {
    slug: "swift-async-await",
    name: "Swift Async/Await",
    description: "Implement async operations with Swift concurrency",
    category: "api-design",
    tags: ["swift", "ios"],
    content: `## When to use
Use when implementing asynchronous operations in Swift/iOS apps.

## Instructions
1. Mark functions as async
2. Use await for async calls
3. Handle errors with try/catch
4. Use Task for launching from sync context
5. Use actors for thread-safe state

## Template
\`\`\`swift
// Actor for thread-safe data access
actor UserCache {
    private var users: [String: User] = [:]

    func getUser(_ id: String) -> User? {
        users[id]
    }

    func setUser(_ user: User) {
        users[user.id] = user
    }
}

// Repository with async/await
class UserRepository {
    private let api: UserAPI
    private let cache: UserCache

    init(api: UserAPI, cache: UserCache) {
        self.api = api
        self.cache = cache
    }

    func getUser(id: String) async throws -> User {
        // Check cache first
        if let cached = await cache.getUser(id) {
            return cached
        }

        // Fetch from API
        let user = try await api.fetchUser(id: id)
        await cache.setUser(user)
        return user
    }

    // Parallel fetching
    func getAllUserDetails(ids: [String]) async throws -> [User] {
        try await withThrowingTaskGroup(of: User.self) { group in
            for id in ids {
                group.addTask {
                    try await self.getUser(id: id)
                }
            }

            var users: [User] = []
            for try await user in group {
                users.append(user)
            }
            return users
        }
    }
}

// In ViewModel
@MainActor
class UserViewModel: ObservableObject {
    @Published var user: User?
    @Published var isLoading = false
    @Published var error: Error?

    private let repository: UserRepository

    func loadUser(id: String) {
        isLoading = true
        Task {
            do {
                user = try await repository.getUser(id: id)
            } catch {
                self.error = error
            }
            isLoading = false
        }
    }
}
\`\`\`

## Rules
- Use @MainActor for UI-related classes
- Use actors for shared mutable state
- Use TaskGroup for parallel operations
- Always handle cancellation when appropriate`,
  },
  {
    slug: "android-unit-tests",
    name: "Android Unit Tests",
    description: "Write unit tests for Android with Kotlin and MockK",
    category: "testing",
    tags: ["kotlin", "android"],
    content: `## When to use
Use when testing Android ViewModels, repositories, and business logic.

## Instructions
1. Use JUnit 5 or JUnit 4 with AndroidX Test
2. Mock dependencies with MockK
3. Use turbine for Flow testing
4. Use coroutines test dispatcher
5. Test ViewModels with test coroutine scope

## Template
\`\`\`kotlin
@OptIn(ExperimentalCoroutinesApi::class)
class UserViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val repository: UserRepository = mockk()
    private lateinit var viewModel: UserViewModel

    @BeforeEach
    fun setup() {
        viewModel = UserViewModel(repository)
    }

    @Test
    fun \`loadUser success updates state\`() = runTest {
        // Given
        val user = User(id = "1", name = "John")
        coEvery { repository.getUser("1") } returns Result.success(user)

        // When
        viewModel.loadUser("1")

        // Then
        viewModel.uiState.test {
            assertEquals(UiState.Loading, awaitItem())
            assertEquals(UiState.Success(user), awaitItem())
        }
    }

    @Test
    fun \`loadUser failure shows error\`() = runTest {
        // Given
        coEvery { repository.getUser("1") } returns
            Result.failure(Exception("Network error"))

        // When
        viewModel.loadUser("1")

        // Then
        viewModel.uiState.test {
            assertEquals(UiState.Loading, awaitItem())
            val errorState = awaitItem()
            assertTrue(errorState is UiState.Error)
        }
    }
}

// MainDispatcherRule for coroutines
class MainDispatcherRule(
    private val dispatcher: TestDispatcher = UnconfinedTestDispatcher()
) : TestWatcher() {
    override fun starting(description: Description) {
        Dispatchers.setMain(dispatcher)
    }
    override fun finished(description: Description) {
        Dispatchers.resetMain()
    }
}
\`\`\`

## Rules
- Use coEvery for suspend function mocks
- Use turbine for Flow assertions
- Always set test dispatcher for Main
- Test both success and error paths`,
  },
  {
    slug: "swift-unit-tests",
    name: "Swift Unit Tests",
    description: "Write unit tests for iOS/Swift with XCTest",
    category: "testing",
    tags: ["swift", "ios"],
    content: `## When to use
Use when testing Swift ViewModels, services, and business logic.

## Instructions
1. Create XCTestCase subclass
2. Use setUp() for common initialization
3. Mock protocols with manual mocks or frameworks
4. Test async code with async/await in tests
5. Use XCTAssert variants for assertions

## Template
\`\`\`swift
import XCTest
@testable import MyApp

final class UserViewModelTests: XCTestCase {
    var sut: UserViewModel!
    var mockRepository: MockUserRepository!

    override func setUp() {
        super.setUp()
        mockRepository = MockUserRepository()
        sut = UserViewModel(repository: mockRepository)
    }

    override func tearDown() {
        sut = nil
        mockRepository = nil
        super.tearDown()
    }

    func testLoadUserSuccess() async throws {
        // Given
        let expectedUser = User(id: "1", name: "John")
        mockRepository.getUserResult = .success(expectedUser)

        // When
        await sut.loadUser(id: "1")

        // Then
        XCTAssertEqual(sut.user, expectedUser)
        XCTAssertFalse(sut.isLoading)
        XCTAssertNil(sut.error)
    }

    func testLoadUserFailure() async throws {
        // Given
        let expectedError = NSError(domain: "test", code: 1)
        mockRepository.getUserResult = .failure(expectedError)

        // When
        await sut.loadUser(id: "1")

        // Then
        XCTAssertNil(sut.user)
        XCTAssertFalse(sut.isLoading)
        XCTAssertNotNil(sut.error)
    }
}

// Mock
class MockUserRepository: UserRepositoryProtocol {
    var getUserResult: Result<User, Error> = .failure(NSError())
    var getUserCallCount = 0

    func getUser(id: String) async throws -> User {
        getUserCallCount += 1
        return try getUserResult.get()
    }
}
\`\`\`

## Rules
- Use sut (system under test) naming convention
- Always tearDown to prevent state leakage
- Mock at protocol boundaries
- Test async with async test methods`,
  },

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
  {
    slug: "supabase-patterns",
    name: "Supabase Patterns",
    description: "Supabase authentication, database queries, and real-time subscriptions",
    category: "database",
    tags: ["typescript", "javascript", "react", "supabase"],
    content: `## When to use
Use when building apps with Supabase for auth, database, and real-time features.

## Authentication Setup
\`\`\`typescript
// Initialize client
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// With React (auth-helpers)
import { SessionContextProvider } from '@supabase/auth-helpers-react';

function App({ children }) {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      {children}
    </SessionContextProvider>
  );
}

// Use session in components
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';

function Profile() {
  const session = useSession();
  const supabase = useSupabaseClient();

  if (!session) return <Login />;
  return <div>Welcome {session.user.email}</div>;
}
\`\`\`

## Database Queries
\`\`\`typescript
// Select with filters
const { data, error } = await supabase
  .from('tasks')
  .select('id, title, due_date, course:courses(name)')
  .eq('user_id', userId)
  .gte('due_date', today)
  .order('due_date', { ascending: true });

// Insert
const { data, error } = await supabase
  .from('tasks')
  .insert({ title, due_date, user_id: session.user.id })
  .select()
  .single();

// Update
const { error } = await supabase
  .from('tasks')
  .update({ completed: true })
  .eq('id', taskId);

// Delete
const { error } = await supabase
  .from('tasks')
  .delete()
  .eq('id', taskId);

// Upsert (insert or update)
const { data, error } = await supabase
  .from('settings')
  .upsert({ user_id: userId, theme: 'dark' })
  .select()
  .single();
\`\`\`

## Real-time Subscriptions
\`\`\`typescript
useEffect(() => {
  const channel = supabase
    .channel('tasks-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks', filter: \`user_id=eq.\${userId}\` },
      (payload) => {
        if (payload.eventType === 'INSERT') addTask(payload.new);
        if (payload.eventType === 'UPDATE') updateTask(payload.new);
        if (payload.eventType === 'DELETE') removeTask(payload.old.id);
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [userId]);
\`\`\`

## Row Level Security (RLS)
\`\`\`sql
-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tasks
CREATE POLICY "Users view own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own tasks
CREATE POLICY "Users insert own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own tasks
CREATE POLICY "Users update own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);
\`\`\`

## Rules
- Always enable RLS on tables with user data
- Use \`.single()\` when expecting one row
- Handle errors from every query
- Use typed client with \`Database\` generic for type safety`,
  },
  {
    slug: "firebase-patterns",
    name: "Firebase Patterns",
    description: "Firebase authentication, Firestore queries, and real-time listeners",
    category: "database",
    tags: ["typescript", "javascript", "react", "firebase"],
    content: `## When to use
Use when building apps with Firebase for auth, Firestore database, and real-time sync.

## Authentication Setup
\`\`\`typescript
// Initialize Firebase
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

export const auth = getAuth(app);
export const db = getFirestore(app);

// Auth state hook
function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  return { user, loading };
}

// Sign in
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
await signInWithPopup(auth, new GoogleAuthProvider());
\`\`\`

## Firestore Queries
\`\`\`typescript
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot
} from 'firebase/firestore';

// Get single document
const docSnap = await getDoc(doc(db, 'users', odById));
if (docSnap.exists()) {
  const user = { id: docSnap.id, ...docSnap.data() };
}

// Query collection
const q = query(
  collection(db, 'tasks'),
  where('userId', '==', currentUser.uid),
  where('completed', '==', false),
  orderBy('dueDate', 'asc'),
  limit(50)
);
const snapshot = await getDocs(q);
const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

// Add document
const docRef = await addDoc(collection(db, 'tasks'), {
  title: 'New Task',
  userId: currentUser.uid,
  createdAt: serverTimestamp(),
});

// Update document
await updateDoc(doc(db, 'tasks', taskId), {
  completed: true,
  completedAt: serverTimestamp(),
});

// Delete document
await deleteDoc(doc(db, 'tasks', taskId));
\`\`\`

## Real-time Listeners
\`\`\`typescript
useEffect(() => {
  const q = query(
    collection(db, 'tasks'),
    where('userId', '==', user.uid),
    orderBy('createdAt', 'desc')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setTasks(tasks);
  });

  return () => unsubscribe();
}, [user.uid]);
\`\`\`

## Security Rules
\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tasks/{taskId} {
      allow read, write: if request.auth != null
        && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.userId;
    }
  }
}
\`\`\`

## Rules
- Always unsubscribe from listeners in cleanup
- Use \`serverTimestamp()\` for consistent timestamps
- Index compound queries in Firebase console
- Keep documents under 1MB`,
  },
  {
    slug: "prisma-patterns",
    name: "Prisma Patterns",
    description: "Prisma ORM for type-safe database queries and migrations",
    category: "database",
    tags: ["typescript", "prisma", "postgresql", "mysql", "sqlite"],
    content: `## When to use
Use Prisma for type-safe database access with auto-generated TypeScript types.

## Schema Definition
\`\`\`prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  tasks     Task[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Task {
  id        String   @id @default(cuid())
  title     String
  completed Boolean  @default(false)
  dueDate   DateTime?
  user      User     @relation(fields: [userId], references: [id])
  userId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([dueDate])
}
\`\`\`

## Client Setup
\`\`\`typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
\`\`\`

## CRUD Operations
\`\`\`typescript
// Create
const user = await prisma.user.create({
  data: { email: 'user@example.com', name: 'John' },
});

// Read with relations
const userWithTasks = await prisma.user.findUnique({
  where: { id: userId },
  include: { tasks: { where: { completed: false }, orderBy: { dueDate: 'asc' } } },
});

// Update
const task = await prisma.task.update({
  where: { id: taskId },
  data: { completed: true },
});

// Delete
await prisma.task.delete({ where: { id: taskId } });

// Upsert
const settings = await prisma.settings.upsert({
  where: { userId },
  update: { theme: 'dark' },
  create: { userId, theme: 'dark' },
});

// Transaction
const [task, user] = await prisma.$transaction([
  prisma.task.create({ data: taskData }),
  prisma.user.update({ where: { id: userId }, data: { taskCount: { increment: 1 } } }),
]);
\`\`\`

## Advanced Queries
\`\`\`typescript
// Aggregation
const stats = await prisma.task.aggregate({
  where: { userId },
  _count: true,
  _avg: { priority: true },
});

// Group by
const tasksByStatus = await prisma.task.groupBy({
  by: ['completed'],
  where: { userId },
  _count: true,
});

// Raw SQL (when needed)
const result = await prisma.$queryRaw\`
  SELECT * FROM tasks WHERE due_date < NOW() AND completed = false
\`;
\`\`\`

## Commands
\`\`\`bash
npx prisma generate    # Generate client after schema changes
npx prisma migrate dev # Create and apply migration
npx prisma studio      # Open visual database browser
npx prisma db push     # Push schema without migration (dev only)
\`\`\`

## Rules
- Run \`prisma generate\` after schema changes
- Use singleton pattern to avoid connection pool exhaustion
- Add indexes for frequently queried fields
- Use transactions for related operations`,
  },
  {
    slug: "drizzle-patterns",
    name: "Drizzle Patterns",
    description: "Drizzle ORM for lightweight, type-safe SQL queries",
    category: "database",
    tags: ["typescript", "postgresql", "mysql", "sqlite"],
    content: `## When to use
Use Drizzle for a lightweight, SQL-like TypeScript ORM with excellent performance.

## Schema Definition
\`\`\`typescript
// db/schema.ts
import { pgTable, text, boolean, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  completed: boolean('completed').default(false).notNull(),
  dueDate: timestamp('due_date'),
  userId: uuid('user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Infer types from schema
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect;
\`\`\`

## Client Setup
\`\`\`typescript
// db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
\`\`\`

## CRUD Operations
\`\`\`typescript
import { eq, and, gte, desc } from 'drizzle-orm';
import { db } from './db';
import { users, tasks } from './db/schema';

// Create
const [user] = await db.insert(users)
  .values({ email: 'user@example.com', name: 'John' })
  .returning();

// Read with conditions
const userTasks = await db.select()
  .from(tasks)
  .where(and(
    eq(tasks.userId, userId),
    eq(tasks.completed, false)
  ))
  .orderBy(desc(tasks.dueDate));

// Read with joins
const tasksWithUser = await db.select({
  task: tasks,
  userName: users.name,
})
  .from(tasks)
  .leftJoin(users, eq(tasks.userId, users.id))
  .where(eq(tasks.userId, userId));

// Update
await db.update(tasks)
  .set({ completed: true })
  .where(eq(tasks.id, taskId));

// Delete
await db.delete(tasks)
  .where(eq(tasks.id, taskId));
\`\`\`

## Transactions
\`\`\`typescript
await db.transaction(async (tx) => {
  const [task] = await tx.insert(tasks)
    .values({ title: 'New Task', userId })
    .returning();

  await tx.update(users)
    .set({ taskCount: sql\`task_count + 1\` })
    .where(eq(users.id, userId));

  return task;
});
\`\`\`

## Migrations
\`\`\`bash
# Generate migration from schema changes
npx drizzle-kit generate:pg

# Apply migrations
npx drizzle-kit push:pg

# Open Drizzle Studio
npx drizzle-kit studio
\`\`\`

## Rules
- Use \`$inferSelect\` and \`$inferInsert\` for type inference
- Prefer \`returning()\` to get inserted/updated data
- Use transactions for related operations
- Drizzle is SQL-first - learn the SQL it generates`,
  },
  {
    slug: "mongodb-patterns",
    name: "MongoDB Patterns",
    description: "MongoDB with Mongoose for document database operations",
    category: "database",
    tags: ["typescript", "javascript", "mongodb"],
    content: `## When to use
Use MongoDB/Mongoose for flexible document storage with JavaScript-native feel.

## Schema Definition
\`\`\`typescript
// models/User.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name?: string;
  tasks: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  name: String,
  tasks: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', userSchema);

// models/Task.ts
export interface ITask extends Document {
  title: string;
  completed: boolean;
  dueDate?: Date;
  user: mongoose.Types.ObjectId;
}

const taskSchema = new Schema<ITask>({
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
  dueDate: Date,
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

taskSchema.index({ user: 1, dueDate: 1 });

export const Task = mongoose.model<ITask>('Task', taskSchema);
\`\`\`

## Connection Setup
\`\`\`typescript
// lib/mongodb.ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
\`\`\`

## CRUD Operations
\`\`\`typescript
// Create
const user = await User.create({ email: 'user@example.com', name: 'John' });

// Read with population
const userWithTasks = await User.findById(userId)
  .populate({
    path: 'tasks',
    match: { completed: false },
    options: { sort: { dueDate: 1 } }
  });

// Find with conditions
const tasks = await Task.find({
  user: userId,
  completed: false,
  dueDate: { $gte: new Date() }
}).sort({ dueDate: 1 });

// Update
await Task.findByIdAndUpdate(taskId, { completed: true }, { new: true });

// Update many
await Task.updateMany(
  { user: userId, dueDate: { $lt: new Date() } },
  { $set: { overdue: true } }
);

// Delete
await Task.findByIdAndDelete(taskId);
\`\`\`

## Aggregation Pipeline
\`\`\`typescript
const taskStats = await Task.aggregate([
  { $match: { user: new mongoose.Types.ObjectId(userId) } },
  { $group: {
    _id: '$completed',
    count: { $sum: 1 },
    avgPriority: { $avg: '$priority' }
  }},
]);

// Tasks grouped by date
const tasksByDate = await Task.aggregate([
  { $match: { user: new mongoose.Types.ObjectId(userId) } },
  { $group: {
    _id: { $dateToString: { format: '%Y-%m-%d', date: '$dueDate' } },
    tasks: { $push: '$$ROOT' },
    count: { $sum: 1 }
  }},
  { $sort: { '_id': 1 } }
]);
\`\`\`

## Rules
- Always add indexes for queried fields
- Use \`lean()\` for read-only queries (better performance)
- Avoid deep nesting; prefer references
- Use transactions for multi-document operations`,
  },

  // Stack Extras Skills - Authentication, Hosting, Payments, Monitoring, Email
  {
    slug: "stripe-integration",
    name: "Stripe Integration",
    description: "Payment processing with Stripe for subscriptions and one-time payments",
    category: "api-design",
    tags: ["stripe", "typescript", "nextjs"],
    content: `## When to use
Use Stripe for processing payments, subscriptions, and managing billing in web applications.

## Setup
\`\`\`typescript
// lib/stripe.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
});
\`\`\`

## Checkout Session
\`\`\`typescript
// app/api/checkout/route.ts
import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { priceId, customerId } = await req.json();

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: \`\${process.env.NEXT_PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}\`,
    cancel_url: \`\${process.env.NEXT_PUBLIC_URL}/pricing\`,
  });

  return NextResponse.json({ url: session.url });
}
\`\`\`

## Webhook Handler
\`\`\`typescript
// app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      // Provision subscription
      break;
    case 'customer.subscription.deleted':
      // Handle cancellation
      break;
  }

  return new Response('OK');
}
\`\`\`

## Rules
- Always verify webhook signatures
- Use idempotency keys for API calls
- Store Stripe customer ID with user records
- Test with Stripe CLI locally`,
  },
  {
    slug: "clerk-auth",
    name: "Clerk Authentication",
    description: "User authentication and management with Clerk",
    category: "api-design",
    tags: ["clerk", "typescript", "nextjs", "react"],
    content: `## When to use
Use Clerk for drop-in authentication with social logins, MFA, and user management.

## Setup
\`\`\`typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
\`\`\`

## Layout
\`\`\`typescript
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
\`\`\`

## Server Components
\`\`\`typescript
// app/dashboard/page.tsx
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect('/sign-in');

  return <div>Welcome, {user.firstName}!</div>;
}
\`\`\`

## Client Components
\`\`\`typescript
'use client';
import { useUser, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export function Header() {
  const { user, isLoaded } = useUser();

  return (
    <header>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
        <span>{user?.emailAddresses[0].emailAddress}</span>
      </SignedIn>
      <SignedOut>
        <a href="/sign-in">Sign In</a>
      </SignedOut>
    </header>
  );
}
\`\`\`

## Rules
- Protect API routes with auth() or getAuth()
- Use webhooks for syncing user data to your database
- Configure allowed redirect URLs in Clerk dashboard`,
  },
  {
    slug: "nextauth-setup",
    name: "NextAuth.js Setup",
    description: "Authentication with NextAuth.js for Next.js applications",
    category: "api-design",
    tags: ["nextauth", "nextjs", "typescript"],
    content: `## When to use
Use NextAuth.js for flexible authentication with multiple providers in Next.js apps.

## Setup (App Router)
\`\`\`typescript
// lib/auth.ts
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    Google({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: { ...session.user, id: user.id },
    }),
  },
});

// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth';
export const { GET, POST } = handlers;
\`\`\`

## Server Components
\`\`\`typescript
// app/dashboard/page.tsx
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/api/auth/signin');

  return <div>Welcome, {session.user.name}!</div>;
}
\`\`\`

## Client Components
\`\`\`typescript
'use client';
import { useSession, signIn, signOut } from 'next-auth/react';

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <div>Loading...</div>;

  if (session) {
    return (
      <button onClick={() => signOut()}>
        Sign out ({session.user?.email})
      </button>
    );
  }

  return <button onClick={() => signIn()}>Sign in</button>;
}
\`\`\`

## Rules
- Use database adapter for production (Prisma, Drizzle)
- Configure NEXTAUTH_SECRET in production
- Handle session refresh for long-lived sessions`,
  },
  {
    slug: "sentry-setup",
    name: "Sentry Error Tracking",
    description: "Error monitoring and performance tracking with Sentry",
    category: "error-handling",
    tags: ["sentry", "typescript", "react", "nextjs"],
    content: `## When to use
Use Sentry for error tracking, performance monitoring, and debugging production issues.

## Setup (Next.js)
\`\`\`bash
npx @sentry/wizard@latest -i nextjs
\`\`\`

## Manual Configuration
\`\`\`typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
\`\`\`

## Error Boundary
\`\`\`typescript
'use client';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  Sentry.captureException(error);

  return (
    <html>
      <body>
        <h2>Something went wrong!</h2>
        <button onClick={() => window.location.reload()}>
          Try again
        </button>
      </body>
    </html>
  );
}
\`\`\`

## Custom Events
\`\`\`typescript
import * as Sentry from '@sentry/nextjs';

// Capture exception with context
Sentry.captureException(error, {
  tags: { feature: 'checkout' },
  extra: { orderId: '123', userId: 'abc' },
});

// Track custom event
Sentry.captureMessage('Payment processed', {
  level: 'info',
  tags: { paymentMethod: 'stripe' },
});

// Set user context
Sentry.setUser({ id: userId, email: userEmail });
\`\`\`

## Rules
- Use source maps in production for readable stack traces
- Set meaningful tags for filtering issues
- Use breadcrumbs to track user actions
- Configure alerting rules in Sentry dashboard`,
  },
  {
    slug: "posthog-analytics",
    name: "PostHog Analytics",
    description: "Product analytics and feature flags with PostHog",
    category: "api-design",
    tags: ["posthog", "typescript", "react", "nextjs"],
    content: `## When to use
Use PostHog for product analytics, feature flags, A/B testing, and session replays.

## Setup
\`\`\`typescript
// lib/posthog.ts
import posthog from 'posthog-js';

export function initPostHog() {
  if (typeof window !== 'undefined') {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      capture_pageview: false, // Handle manually for SPA
      capture_pageleave: true,
    });
  }
}

// app/providers.tsx
'use client';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { initPostHog } from '@/lib/posthog';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname;
      if (searchParams.toString()) {
        url = url + '?' + searchParams.toString();
      }
      posthog.capture('$pageview', { '$current_url': url });
    }
  }, [pathname, searchParams]);

  return children;
}
\`\`\`

## Event Tracking
\`\`\`typescript
import posthog from 'posthog-js';

// Track event
posthog.capture('button_clicked', {
  button_name: 'signup',
  page: '/landing',
});

// Identify user
posthog.identify(userId, {
  email: user.email,
  plan: user.subscription,
});

// Feature flags
const showNewFeature = posthog.isFeatureEnabled('new-dashboard');
\`\`\`

## Rules
- Always call identify() after user logs in
- Use meaningful event names (verb_noun format)
- Set up user properties for segmentation
- Use feature flags for gradual rollouts`,
  },
  {
    slug: "resend-email",
    name: "Resend Email",
    description: "Transactional email sending with Resend",
    category: "api-design",
    tags: ["resend", "typescript", "nextjs"],
    content: `## When to use
Use Resend for sending transactional emails with React Email templates.

## Setup
\`\`\`typescript
// lib/resend.ts
import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);
\`\`\`

## Email Template
\`\`\`typescript
// emails/welcome.tsx
import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Button,
  Heading,
} from '@react-email/components';

interface WelcomeEmailProps {
  name: string;
  dashboardUrl: string;
}

export function WelcomeEmail({ name, dashboardUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif' }}>
        <Container>
          <Heading>Welcome, {name}!</Heading>
          <Text>Thanks for signing up. Get started with your dashboard:</Text>
          <Button
            href={dashboardUrl}
            style={{ background: '#0070f3', color: '#fff', padding: '12px 20px' }}
          >
            Go to Dashboard
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
\`\`\`

## Sending Email
\`\`\`typescript
// app/api/send-welcome/route.ts
import { resend } from '@/lib/resend';
import { WelcomeEmail } from '@/emails/welcome';

export async function POST(req: Request) {
  const { email, name } = await req.json();

  const { data, error } = await resend.emails.send({
    from: 'App <noreply@yourdomain.com>',
    to: email,
    subject: 'Welcome to Our App!',
    react: WelcomeEmail({ name, dashboardUrl: 'https://app.com/dashboard' }),
  });

  if (error) {
    return Response.json({ error }, { status: 500 });
  }

  return Response.json({ success: true, id: data?.id });
}
\`\`\`

## Rules
- Verify domain in Resend dashboard for production
- Use React Email for type-safe templates
- Handle errors and retry logic
- Set proper from address for deliverability`,
  },
  {
    slug: "vercel-deployment",
    name: "Vercel Deployment",
    description: "Deploy and configure applications on Vercel",
    category: "documentation",
    tags: ["vercel", "nextjs", "typescript"],
    content: `## When to use
Use Vercel for deploying Next.js applications with edge functions and serverless.

## Environment Variables
\`\`\`bash
# Set via CLI
vercel env add STRIPE_SECRET_KEY production
vercel env add DATABASE_URL production preview development

# Or via vercel.json
\`\`\`

## Configuration
\`\`\`json
// vercel.json
{
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "crons": [{
    "path": "/api/cron/daily-cleanup",
    "schedule": "0 5 * * *"
  }],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "s-maxage=60, stale-while-revalidate" }
      ]
    }
  ]
}
\`\`\`

## Edge Functions
\`\`\`typescript
// app/api/geo/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: Request) {
  const geo = request.headers.get('x-vercel-ip-country') || 'US';
  return NextResponse.json({ country: geo });
}
\`\`\`

## Preview Deployments
\`\`\`typescript
// lib/env.ts
export const isPreview = process.env.VERCEL_ENV === 'preview';
export const isProd = process.env.VERCEL_ENV === 'production';

// Use different API keys for preview vs production
const apiKey = isPreview
  ? process.env.API_KEY_PREVIEW
  : process.env.API_KEY;
\`\`\`

## Rules
- Use preview deployments for testing PRs
- Set sensitive env vars via dashboard, not vercel.json
- Use edge runtime for low-latency APIs
- Configure proper caching headers`,
  },
  {
    slug: "railway-deployment",
    name: "Railway Deployment",
    description: "Deploy backend services on Railway",
    category: "documentation",
    tags: ["railway", "typescript"],
    content: `## When to use
Use Railway for deploying backend services, databases, and scheduled jobs.

## Configuration
\`\`\`toml
# railway.toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "pnpm start"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "on-failure"
restartPolicyMaxRetries = 3

[deploy.variables]
NODE_ENV = "production"
\`\`\`

## Dockerfile (Alternative)
\`\`\`dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
USER node
CMD ["node", "dist/index.js"]
\`\`\`

## Health Check Endpoint
\`\`\`typescript
// src/routes/health.ts
import { Router } from 'express';

const router = Router();

router.get('/health', async (req, res) => {
  try {
    // Check database connection
    await db.query('SELECT 1');
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: String(error) });
  }
});

export default router;
\`\`\`

## Rules
- Use railway.toml for configuration
- Set up health checks for reliability
- Use Railway CLI for local development with prod env vars
- Connect Railway Postgres with DATABASE_URL`,
  },
  {
    slug: "redis-caching",
    name: "Redis Caching",
    description: "Caching patterns with Redis/Upstash",
    category: "api-design",
    tags: ["redis", "upstash", "typescript"],
    content: `## When to use
Use Redis for caching, rate limiting, and session storage.

## Setup (Upstash)
\`\`\`typescript
// lib/redis.ts
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
\`\`\`

## Caching Pattern
\`\`\`typescript
// lib/cache.ts
import { redis } from './redis';

export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<T> {
  const cached = await redis.get<T>(key);
  if (cached) return cached;

  const data = await fn();
  await redis.set(key, data, { ex: ttlSeconds });
  return data;
}

// Usage
const user = await cached(
  \`user:\${userId}\`,
  () => db.user.findUnique({ where: { id: userId } }),
  300 // 5 minutes
);
\`\`\`

## Rate Limiting
\`\`\`typescript
// lib/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
  analytics: true,
});

// middleware.ts
export async function middleware(req: NextRequest) {
  const ip = req.ip ?? '127.0.0.1';
  const { success, limit, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: { 'X-RateLimit-Limit': String(limit) },
    });
  }
}
\`\`\`

## Cache Invalidation
\`\`\`typescript
// Invalidate single key
await redis.del(\`user:\${userId}\`);

// Invalidate by pattern (use scan in production)
const keys = await redis.keys('user:*');
if (keys.length) await redis.del(...keys);
\`\`\`

## Rules
- Set appropriate TTLs for different data types
- Use cache-aside pattern for database queries
- Implement cache invalidation on data updates
- Monitor cache hit rates`,
  },
  {
    slug: "supabase-auth-patterns",
    name: "Supabase Auth",
    description: "Authentication patterns with Supabase Auth",
    category: "api-design",
    tags: ["supabase-auth", "supabase", "typescript", "nextjs"],
    content: `## When to use
Use Supabase Auth for authentication with email/password, magic links, and OAuth providers.

## Setup
\`\`\`typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
\`\`\`

## Auth Flow
\`\`\`typescript
'use client';
import { createClient } from '@/lib/supabase/client';

export function AuthForm() {
  const supabase = createClient();

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: \`\${window.location.origin}/auth/callback\` },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };
}
\`\`\`

## Server-Side Auth Check
\`\`\`typescript
// app/dashboard/page.tsx
import { createServerSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return <div>Welcome, {user.email}!</div>;
}
\`\`\`

## Rules
- Use RLS policies for database security
- Handle auth state changes with onAuthStateChange
- Store user metadata in profiles table
- Use service role key only in server-side code`,
  },
  {
    slug: "auth0-integration",
    name: "Auth0 Integration",
    description: "Enterprise authentication with Auth0",
    category: "api-design",
    tags: ["auth0", "typescript", "react", "nextjs"],
    content: `## When to use
Use Auth0 for enterprise authentication with SSO, MFA, and advanced security features.

## Setup (Next.js)
\`\`\`typescript
// app/api/auth/[auth0]/route.ts
import { handleAuth, handleLogin } from '@auth0/nextjs-auth0';

export const GET = handleAuth({
  login: handleLogin({
    authorizationParams: {
      audience: process.env.AUTH0_AUDIENCE,
      scope: 'openid profile email',
    },
    returnTo: '/dashboard',
  }),
});
\`\`\`

## Client Component
\`\`\`typescript
'use client';
import { useUser } from '@auth0/nextjs-auth0/client';

export function Profile() {
  const { user, error, isLoading } = useUser();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  if (!user) {
    return <a href="/api/auth/login">Login</a>;
  }

  return (
    <div>
      <img src={user.picture} alt={user.name} />
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <a href="/api/auth/logout">Logout</a>
    </div>
  );
}
\`\`\`

## Server Component
\`\`\`typescript
// app/dashboard/page.tsx
import { getSession } from '@auth0/nextjs-auth0';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user) redirect('/api/auth/login');

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {session.user.name}</p>
    </div>
  );
}
\`\`\`

## API Route Protection
\`\`\`typescript
// app/api/protected/route.ts
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0';

export const GET = withApiAuthRequired(async (req) => {
  const session = await getSession();
  const user = session?.user;
  return Response.json({ user });
});
\`\`\`

## Rules
- Configure allowed callback URLs in Auth0 dashboard
- Use Rules/Actions for custom claims
- Set up proper logout URLs
- Handle token refresh automatically`,
  },
  {
    slug: "openai-integration",
    name: "OpenAI Integration",
    description: "AI features with OpenAI API and streaming",
    category: "api-design",
    tags: ["openai", "typescript", "nextjs"],
    content: `## When to use
Use OpenAI for chat completions, embeddings, and other AI features.

## Setup
\`\`\`typescript
// lib/openai.ts
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
\`\`\`

## Chat Completion
\`\`\`typescript
// app/api/chat/route.ts
import { openai } from '@/lib/openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages,
    stream: true,
  });

  const stream = OpenAIStream(response);
  return new StreamingTextResponse(stream);
}
\`\`\`

## Client with Vercel AI SDK
\`\`\`typescript
'use client';
import { useChat } from 'ai/react';

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>
          <strong>{m.role}:</strong> {m.content}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Say something..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          Send
        </button>
      </form>
    </div>
  );
}
\`\`\`

## Embeddings for Search
\`\`\`typescript
export async function createEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

// Store embeddings in Supabase/pgvector
const embedding = await createEmbedding(documentContent);
await supabase.from('documents').insert({
  content: documentContent,
  embedding,
});
\`\`\`

## Rules
- Use streaming for chat responses (better UX)
- Implement rate limiting on AI endpoints
- Set max_tokens to control costs
- Use system messages for behavior control`,
  },

  // Claude Code Best Practices - Prompting Patterns
  {
    slug: "grill-me-on-changes",
    name: "Grill Me On Changes",
    description: "Request aggressive review to catch issues before shipping",
    category: "code-review",
    tags: ["universal"],
    content: `## When to use
Use when you want Claude to aggressively review your changes to catch bugs, edge cases, and potential issues before they reach production. This is especially valuable before merging PRs or deploying.

## Instructions
After making changes, invoke this pattern to get a thorough, skeptical review:

1. Present all your changes to Claude
2. Ask Claude to assume bugs exist and find them
3. Request Claude to challenge your assumptions
4. Have Claude trace through edge cases systematically

## Template
\`\`\`
I've made the following changes. Please grill me on them:

[Paste your changes or describe what you modified]

Assume there ARE bugs in this code and find them. Be skeptical. Check:
- Edge cases (empty inputs, null values, boundary conditions)
- Error handling (what if external services fail?)
- Race conditions (concurrent access issues)
- Security implications (injection, auth bypass)
- Performance issues (N+1 queries, memory leaks)
- Missing test coverage

Don't be nice - I want to catch issues before users do.
\`\`\`

## Rules
- Don't get defensive when Claude finds issues - that's the point
- Fix issues Claude finds before moving on
- Use this before every PR or major commit
- Consider adding found issues to CLAUDE.md for future reference`,
  },
  {
    slug: "prove-it-works",
    name: "Prove It Works",
    description: "Demand concrete evidence that changes function correctly",
    category: "testing",
    tags: ["universal"],
    content: `## When to use
Use when you need verification that changes actually work, not just that the code looks right. This pattern forces demonstration of correct behavior.

## Instructions
After Claude makes changes, demand proof:

1. Ask for specific test cases that prove the change works
2. Request edge case demonstrations
3. Have Claude show the before/after behavior
4. Verify error handling paths

## Template
\`\`\`
You made changes to [describe what changed]. Now prove it works:

1. Show me a test case that exercises the happy path
2. Show me what happens with edge cases:
   - Empty input
   - Invalid input
   - Boundary values
3. Show me what happens when things fail:
   - Network errors
   - Invalid state
   - Missing dependencies
4. If this is a UI change, describe what the user sees

Don't just tell me it works - demonstrate it.
\`\`\`

## Rules
- Never accept "this should work" - demand evidence
- Require actual test output, not theoretical explanations
- If Claude can't prove it works, the change isn't done
- Add regression tests for any bugs found`,
  },
  {
    slug: "fresh-start-pattern",
    name: "Fresh Start Pattern",
    description: "Scrap accumulated context and restart when hitting walls",
    category: "debugging",
    tags: ["universal"],
    content: `## When to use
Use when you've been going in circles, Claude seems confused about the state of the code, or you've accumulated so much context that responses are degraded. This is the "context rot" escape hatch.

## Instructions
When you're stuck:

1. Save any important discoveries to CLAUDE.md
2. Start a completely fresh conversation
3. Begin with minimal, precise context
4. Don't pollute the new session with old assumptions

## Template
For ending the stuck session:
\`\`\`
Before we end this session, let me save what we learned:

What's the root cause we identified? [Document in CLAUDE.md]
What approaches did NOT work? [Document to avoid repeating]
What's the current state of the code? [Note any partial changes]

Now I'm going to start fresh with a new conversation.
\`\`\`

For starting the fresh session:
\`\`\`
Fresh start on [problem description].

Context (minimal):
- File: [specific file]
- Issue: [one sentence description]
- Constraint: [any hard requirements]

Previous session learned:
- [Key insight 1]
- [Key insight 2]
- [Approaches that didn't work]

Let's solve this with fresh eyes.
\`\`\`

## Rules
- Don't bring old conversation baggage into new sessions
- Save learnings to CLAUDE.md so they persist across sessions
- Keep new session context minimal and focused
- It's OK to throw away progress that wasn't working`,
  },
  {
    slug: "two-claude-review",
    name: "Two-Claude Review",
    description: "Use separate sessions for implementation and review",
    category: "code-review",
    tags: ["universal"],
    content: `## When to use
Use for important changes where you want independent review. A second Claude session without implementation context will catch different issues than the one that wrote the code.

## Instructions
Split implementation and review into separate sessions:

1. Session A: Implement the feature/fix
2. Session B (fresh): Review Session A's output
3. Session A: Address Session B's feedback
4. Repeat until Session B approves

## Template
For Session A (Implementation):
\`\`\`
[Normal implementation work]
\`\`\`

For Session B (Fresh Review Session):
\`\`\`
Please review this code change. You didn't write it - I'm asking for independent review.

The change is meant to: [describe intent]

Here's the diff/code:
[paste changes]

Review for:
1. Does it actually achieve the stated goal?
2. Are there bugs or edge cases missed?
3. Is the approach appropriate for this codebase?
4. Are there simpler ways to accomplish this?
5. What's missing from the tests?

Be critical - the author isn't in the room.
\`\`\`

Back to Session A:
\`\`\`
Independent review found these issues:
[paste Session B feedback]

Please address each one.
\`\`\`

## Rules
- Don't share Session A's reasoning with Session B
- Session B should review code at face value
- Take Session B's feedback seriously - it has fresh perspective
- Use for any change you'd want a human colleague to review`,
  },
];
