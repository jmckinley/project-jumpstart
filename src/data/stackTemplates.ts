/**
 * @module data/stackTemplates
 * @description Pre-defined software stack templates for the onboarding flow
 *
 * PURPOSE:
 * - Provide quick-start templates for common project types
 * - Auto-fill tech stack fields during onboarding
 * - Include recommended extras (auth, hosting, payments, etc.)
 *
 * DEPENDENCIES:
 * - @/types/project - StackExtras type
 *
 * EXPORTS:
 * - StackTemplate - Interface for a stack template
 * - STACK_TEMPLATES - Array of 16 pre-defined templates
 *
 * PATTERNS:
 * - Each template includes core stack (language, framework, database, testing, styling)
 * - Templates also include extras (auth, hosting, payments, monitoring, email)
 * - Templates have icons for visual identification (Lucide icon names)
 *
 * CLAUDE NOTES:
 * - Templates are applied via useOnboardingStore.applyTemplate()
 * - Icon names correspond to lucide-react exports
 * - All fields except id, name, description, icon can be null
 */

import type { StackExtras } from "@/types/project";

export interface StackTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  language: string;
  framework: string;
  database: string | null;
  testing: string | null;
  styling: string | null;
  extras: StackExtras;
}

export const STACK_TEMPLATES: StackTemplate[] = [
  {
    id: "b2b-saas",
    name: "B2B SaaS",
    description: "Full-stack app with auth, payments, and analytics",
    icon: "Building2",
    language: "TypeScript",
    framework: "Next.js",
    database: "PostgreSQL",
    testing: "Vitest",
    styling: "Tailwind CSS",
    extras: {
      auth: "Clerk",
      hosting: "Vercel",
      payments: "Stripe",
      monitoring: "PostHog",
    },
  },
  {
    id: "api-first",
    name: "API-First",
    description: "Backend API service with database and monitoring",
    icon: "Server",
    language: "TypeScript",
    framework: "Fastify",
    database: "PostgreSQL",
    testing: "Vitest",
    styling: null,
    extras: {
      hosting: "Railway",
      monitoring: "Sentry",
    },
  },
  {
    id: "mvp-startup",
    name: "MVP/Startup",
    description: "Quick prototype with BaaS for rapid development",
    icon: "Rocket",
    language: "TypeScript",
    framework: "Next.js",
    database: "Supabase",
    testing: "Vitest",
    styling: "Tailwind CSS",
    extras: {
      auth: "Supabase Auth",
      hosting: "Vercel",
    },
  },
  {
    id: "mobile",
    name: "Mobile App",
    description: "Cross-platform mobile with React Native",
    icon: "Smartphone",
    language: "TypeScript",
    framework: "React",
    database: "Supabase",
    testing: "Jest",
    styling: null,
    extras: {
      auth: "Supabase Auth",
      monitoring: "Sentry",
    },
  },
  {
    id: "ai-powered",
    name: "AI-Powered",
    description: "AI/LLM integration with modern stack",
    icon: "Sparkles",
    language: "TypeScript",
    framework: "Next.js",
    database: "PostgreSQL",
    testing: "Vitest",
    styling: "Tailwind CSS",
    extras: {
      auth: "Clerk",
      hosting: "Vercel",
      monitoring: "PostHog",
    },
  },
  {
    id: "realtime",
    name: "Real-Time",
    description: "Live updates and collaboration features",
    icon: "Radio",
    language: "TypeScript",
    framework: "Next.js",
    database: "Supabase",
    testing: "Vitest",
    styling: "Tailwind CSS",
    extras: {
      auth: "Supabase Auth",
      hosting: "Vercel",
      cache: "Redis",
    },
  },
  {
    id: "ecommerce",
    name: "E-commerce",
    description: "Online store with payments and inventory",
    icon: "ShoppingCart",
    language: "TypeScript",
    framework: "Next.js",
    database: "PostgreSQL",
    testing: "Playwright",
    styling: "Tailwind CSS",
    extras: {
      auth: "NextAuth.js",
      hosting: "Vercel",
      payments: "Stripe",
      monitoring: "Sentry",
    },
  },
  {
    id: "internal-tool",
    name: "Internal Tool",
    description: "Admin dashboards and internal apps",
    icon: "LayoutDashboard",
    language: "TypeScript",
    framework: "Next.js",
    database: "PostgreSQL",
    testing: "Vitest",
    styling: "Tailwind CSS",
    extras: {
      auth: "NextAuth.js",
      hosting: "Railway",
    },
  },
  {
    id: "analytics",
    name: "Analytics Dashboard",
    description: "Data visualization and reporting",
    icon: "BarChart3",
    language: "TypeScript",
    framework: "Next.js",
    database: "PostgreSQL",
    testing: "Vitest",
    styling: "Tailwind CSS",
    extras: {
      auth: "NextAuth.js",
      hosting: "Vercel",
      monitoring: "PostHog",
    },
  },
  {
    id: "content",
    name: "Content Website",
    description: "CMS-driven site with static generation",
    icon: "FileText",
    language: "TypeScript",
    framework: "Next.js",
    database: null,
    testing: "Vitest",
    styling: "Tailwind CSS",
    extras: {
      hosting: "Vercel",
      monitoring: "PostHog",
    },
  },
  {
    id: "marketplace",
    name: "Marketplace",
    description: "Multi-vendor platform with payments",
    icon: "Store",
    language: "TypeScript",
    framework: "Next.js",
    database: "PostgreSQL",
    testing: "Playwright",
    styling: "Tailwind CSS",
    extras: {
      auth: "Clerk",
      hosting: "Vercel",
      payments: "Stripe",
      monitoring: "Sentry",
    },
  },
  {
    id: "dev-tool",
    name: "Developer Tool/CLI",
    description: "Command-line tool or developer utility",
    icon: "Terminal",
    language: "TypeScript",
    framework: "Express",
    database: "SQLite",
    testing: "Vitest",
    styling: null,
    extras: {},
  },
  {
    id: "python-api",
    name: "Python API",
    description: "Python backend with FastAPI and PostgreSQL",
    icon: "Cpu",
    language: "Python",
    framework: "FastAPI",
    database: "PostgreSQL",
    testing: "pytest",
    styling: null,
    extras: {
      auth: "FastAPI JWT",
      hosting: "Railway",
      monitoring: "Sentry",
    },
  },
  {
    id: "rust-backend",
    name: "Rust Backend",
    description: "High-performance Rust backend with Axum",
    icon: "Zap",
    language: "Rust",
    framework: "Axum",
    database: "PostgreSQL",
    testing: "cargo test",
    styling: null,
    extras: {
      hosting: "Fly.io",
      monitoring: "Sentry",
    },
  },
  {
    id: "go-service",
    name: "Go Service",
    description: "Go microservice with Gin and PostgreSQL",
    icon: "Box",
    language: "Go",
    framework: "Gin",
    database: "PostgreSQL",
    testing: "go test",
    styling: null,
    extras: {
      hosting: "GCP Cloud Run",
      monitoring: "Prometheus",
    },
  },
  {
    id: "java-enterprise",
    name: "Java Enterprise",
    description: "Enterprise Java with Spring Boot",
    icon: "Building",
    language: "Java",
    framework: "Spring Boot",
    database: "PostgreSQL",
    testing: "JUnit",
    styling: null,
    extras: {
      auth: "Spring Security",
      hosting: "AWS",
      monitoring: "Micrometer",
    },
  },
];
