/**
 * @module types/project
 * @description TypeScript type definitions for projects, detection, and onboarding
 *
 * PURPOSE:
 * - Define Project interface matching Rust model
 * - Define DetectionResult for project scanning
 * - Define ProjectSetup for onboarding wizard data
 * - Define StackExtras for additional services (auth, hosting, payments, etc.)
 * - Define project-related option constants
 *
 * EXPORTS:
 * - StackExtras - Additional services configuration (auth, hosting, payments, etc.)
 * - Project - Core project metadata
 * - DetectionResult - Auto-detection output from project scanning
 * - DetectedValue - A detected value with confidence level
 * - ClaudeMdInfo - Metadata about a CLAUDE.md file (exists, content, tokens)
 * - ProjectSetup - Configuration collected during onboarding
 * - LANGUAGES, FRAMEWORKS, DATABASES, etc. - Option lists for dropdowns
 * - AUTH_OPTIONS, HOSTING_OPTIONS, PAYMENTS_OPTIONS, MONITORING_OPTIONS, EMAIL_OPTIONS - Stack extras options
 *
 * PATTERNS:
 * - Types mirror Rust structs in models/project.rs
 * - Use camelCase (TypeScript convention), Rust uses snake_case
 *
 * CLAUDE NOTES:
 * - Keep in sync with Rust models in src-tauri/src/models/project.rs
 * - Tauri IPC automatically converts snake_case to camelCase
 * - ProjectSetup expanded in Phase 2 with full onboarding fields
 * - StackExtras fields are all optional (user may not select any)
 */

/**
 * Stack extras for additional services (auth, hosting, payments, etc.)
 */
export interface StackExtras {
  auth?: string;
  hosting?: string;
  payments?: string;
  monitoring?: string;
  email?: string;
  cache?: string;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  description: string;
  projectType: string;
  language: string;
  framework: string | null;
  database: string | null;
  testing: string | null;
  styling: string | null;
  stackExtras: StackExtras | null;
  healthScore: number;
  createdAt: string;
}

export interface DetectionResult {
  confidence: "high" | "medium" | "low" | "none";
  language: DetectedValue | null;
  framework: DetectedValue | null;
  database: DetectedValue | null;
  testing: DetectedValue | null;
  styling: DetectedValue | null;
  projectName: string | null;
  projectType: string | null;
  fileCount: number;
  hasExistingClaudeMd: boolean;
}

export interface DetectedValue {
  value: string;
  confidence: number;
  source: string;
}

export interface ClaudeMdInfo {
  exists: boolean;
  content: string;
  tokenEstimate: number;
  path: string;
}

export interface ProjectSetup {
  path: string;
  name: string;
  description: string;
  projectType: string;
  language: string;
  framework: string | null;
  database: string | null;
  testing: string | null;
  styling: string | null;
  stackExtras: StackExtras | null;
  goals: string[];
  generateModuleDocs: boolean;
  setupEnforcement: boolean;
}

export const LANGUAGES = [
  "TypeScript",
  "JavaScript",
  "Python",
  "Rust",
  "Go",
  "Dart",
  "Java",
  "Kotlin",
  "Swift",
  "Ruby",
  "PHP",
  "C#",
  "C++",
  "C",
] as const;

export const PROJECT_TYPES = [
  "Web App",
  "API",
  "Mobile",
  "Desktop",
  "CLI",
  "Library",
  "Monorepo",
  "Extension",
] as const;

export const FRAMEWORKS: Record<string, string[]> = {
  TypeScript: [
    "React",
    "Next.js",
    "Vue",
    "Nuxt",
    "Angular",
    "Svelte",
    "SolidJS",
    "Express",
    "Fastify",
    "NestJS",
    "Hono",
    "Tauri",
    "Electron",
    "Chrome Extension",
  ],
  JavaScript: [
    "React",
    "Next.js",
    "Vue",
    "Nuxt",
    "Angular",
    "Svelte",
    "Express",
    "Fastify",
    "Electron",
    "Chrome Extension",
  ],
  Python: ["Django", "FastAPI", "Flask", "Starlette", "Tornado"],
  Rust: ["Tauri", "Actix Web", "Axum", "Rocket", "Warp", "Leptos", "Yew", "Dioxus"],
  Go: ["Gin", "Fiber", "Echo", "Gorilla Mux"],
  Dart: ["Flutter"],
  Java: ["Spring Boot", "Quarkus", "Micronaut"],
  Kotlin: ["Ktor", "Spring Boot"],
  Swift: ["SwiftUI", "Vapor"],
  Ruby: ["Rails", "Sinatra"],
  PHP: ["Laravel", "Symfony"],
};

export const DATABASES = [
  "PostgreSQL",
  "MySQL",
  "SQLite",
  "MongoDB",
  "Redis",
  "Supabase",
  "Firebase",
  "DynamoDB",
  "Pinecone",
  "Weaviate",
  "Qdrant",
  "Chroma",
  "Milvus",
  "PlanetScale",
  "CockroachDB",
  "Neon",
  "Turso",
] as const;

export const TESTING_FRAMEWORKS: Record<string, string[]> = {
  TypeScript: ["Vitest", "Jest", "Testing Library", "Playwright", "Cypress", "Mocha"],
  JavaScript: ["Jest", "Vitest", "Mocha", "Cypress", "Playwright"],
  Python: ["pytest", "unittest", "nose2"],
  Rust: ["cargo test", "insta (snapshot)"],
  Go: ["go test", "testify"],
};

export const STYLING_OPTIONS = [
  "Tailwind CSS",
  "CSS Modules",
  "Styled Components",
  "Emotion",
  "Sass/SCSS",
  "Material UI",
  "Chakra UI",
  "Bootstrap",
  "Less",
] as const;

export const GOALS = [
  { id: "features", label: "Writing new features faster", skill: "generators" },
  { id: "tests", label: "Writing tests", skill: "test-agent" },
  { id: "reviews", label: "Code reviews", skill: "code-reviewer" },
  { id: "refactoring", label: "Refactoring", skill: "refactor-agent" },
  { id: "debugging", label: "Debugging", skill: "debug-agent" },
  { id: "documentation", label: "Documentation", skill: "docs-agent" },
] as const;

export const AUTH_OPTIONS = [
  "Auth0",
  "Clerk",
  "NextAuth.js",
  "Supabase Auth",
  "Firebase Auth",
  "Custom JWT",
  "Resend",
] as const;

export const HOSTING_OPTIONS = [
  "Vercel",
  "Railway",
  "Render",
  "AWS",
  "Fly.io",
  "Netlify",
  "Cloudflare",
] as const;

export const PAYMENTS_OPTIONS = [
  "Stripe",
  "LemonSqueezy",
  "Paddle",
] as const;

export const MONITORING_OPTIONS = [
  "Sentry",
  "PostHog",
  "Datadog",
  "LogRocket",
] as const;

export const EMAIL_OPTIONS = [
  "SendGrid",
  "Postmark",
  "AWS SES",
] as const;
