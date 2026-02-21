/**
 * @module data/stackTemplates.test
 * @description Unit tests for stack templates data structure
 *
 * PURPOSE:
 * - Verify STACK_TEMPLATES export structure and integrity
 * - Ensure all templates have required fields
 * - Validate template IDs are unique
 * - Verify extras fields contain valid StackExtras keys
 *
 * PATTERNS:
 * - Uses Vitest globals (describe, it, expect)
 *
 * CLAUDE NOTES:
 * - Tests validate data integrity, not runtime behavior
 * - Icon names are verified against the TEMPLATE_ICONS mapping in AnalysisResults
 */

import { describe, it, expect } from "vitest";
import { STACK_TEMPLATES } from "./stackTemplates";

// Valid Lucide icon names used in TEMPLATE_ICONS mapping
const VALID_ICON_NAMES = [
  "Building2",
  "Server",
  "Rocket",
  "Smartphone",
  "Sparkles",
  "Radio",
  "ShoppingCart",
  "LayoutDashboard",
  "BarChart3",
  "FileText",
  "Store",
  "Terminal",
];

// Valid StackExtras keys
const VALID_EXTRAS_KEYS = [
  "auth",
  "hosting",
  "payments",
  "monitoring",
  "email",
  "cache",
];

describe("stackTemplates", () => {
  describe("STACK_TEMPLATES export", () => {
    it("should export an array of 12 templates", () => {
      expect(STACK_TEMPLATES).toBeInstanceOf(Array);
      expect(STACK_TEMPLATES).toHaveLength(12);
    });

    it("each template should have required fields (id, name, description, icon, language, framework)", () => {
      for (const template of STACK_TEMPLATES) {
        expect(template.id).toBeDefined();
        expect(typeof template.id).toBe("string");
        expect(template.id.length).toBeGreaterThan(0);

        expect(template.name).toBeDefined();
        expect(typeof template.name).toBe("string");
        expect(template.name.length).toBeGreaterThan(0);

        expect(template.description).toBeDefined();
        expect(typeof template.description).toBe("string");
        expect(template.description.length).toBeGreaterThan(0);

        expect(template.icon).toBeDefined();
        expect(typeof template.icon).toBe("string");

        expect(template.language).toBeDefined();
        expect(typeof template.language).toBe("string");

        expect(template.framework).toBeDefined();
        expect(typeof template.framework).toBe("string");
      }
    });

    it("each template should have valid icon name (matches Lucide icons)", () => {
      for (const template of STACK_TEMPLATES) {
        expect(VALID_ICON_NAMES).toContain(template.icon);
      }
    });

    it("each template id should be unique", () => {
      const ids = STACK_TEMPLATES.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("all extras fields should be valid StackExtras keys", () => {
      for (const template of STACK_TEMPLATES) {
        const extrasKeys = Object.keys(template.extras);
        for (const key of extrasKeys) {
          expect(VALID_EXTRAS_KEYS).toContain(key);
        }
      }
    });
  });

  describe("StackTemplate interface", () => {
    it("B2B SaaS template should have expected values", () => {
      const b2bSaas = STACK_TEMPLATES.find((t) => t.id === "b2b-saas");

      expect(b2bSaas).toBeDefined();
      expect(b2bSaas!.name).toBe("B2B SaaS");
      expect(b2bSaas!.language).toBe("TypeScript");
      expect(b2bSaas!.framework).toBe("Next.js");
      expect(b2bSaas!.database).toBe("PostgreSQL");
      expect(b2bSaas!.testing).toBe("Vitest");
      expect(b2bSaas!.styling).toBe("Tailwind CSS");
      expect(b2bSaas!.extras).toEqual({
        auth: "Clerk",
        hosting: "Vercel",
        payments: "Stripe",
        monitoring: "PostHog",
      });
    });

    it("API-First template should have null styling", () => {
      const apiFirst = STACK_TEMPLATES.find((t) => t.id === "api-first");

      expect(apiFirst).toBeDefined();
      expect(apiFirst!.styling).toBeNull();
    });

    it("Dev Tool template should have empty extras", () => {
      const devTool = STACK_TEMPLATES.find((t) => t.id === "dev-tool");

      expect(devTool).toBeDefined();
      expect(devTool!.extras).toEqual({});
    });
  });

  describe("template field validation", () => {
    it("database field can be null", () => {
      const contentTemplate = STACK_TEMPLATES.find((t) => t.id === "content");

      expect(contentTemplate).toBeDefined();
      expect(contentTemplate!.database).toBeNull();
    });

    it("all templates have extras object (even if empty)", () => {
      for (const template of STACK_TEMPLATES) {
        expect(template.extras).toBeDefined();
        expect(typeof template.extras).toBe("object");
      }
    });

    it("all templates have an icon matching the TEMPLATE_ICONS map", () => {
      // Every template's icon should be one of the known Lucide icons
      const iconSet = new Set(STACK_TEMPLATES.map((t) => t.icon));

      // All icons should be in the valid list
      for (const icon of iconSet) {
        expect(VALID_ICON_NAMES).toContain(icon);
      }
    });
  });
});
