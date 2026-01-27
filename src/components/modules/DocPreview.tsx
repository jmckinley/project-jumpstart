/**
 * @module components/modules/DocPreview
 * @description Panel for previewing a module's documentation content and applying it to the source file
 *
 * PURPOSE:
 * - Display a formatted preview of a ModuleDoc (description, purpose, dependencies, exports, patterns, claude notes)
 * - Show a placeholder when no file is selected or no doc is available
 * - Provide an "Apply to File" button that writes the documentation header into the source file
 *
 * DEPENDENCIES:
 * - @/types/module - ModuleDoc type for documentation content
 *
 * EXPORTS:
 * - DocPreview - Documentation preview and apply panel component
 *
 * PATTERNS:
 * - Receives doc as a nullable prop; renders placeholder when null
 * - Each documentation section is rendered in its own rounded card
 * - The onApply callback is invoked when the user clicks "Apply to File"
 * - Loading state disables the apply button and shows feedback
 *
 * CLAUDE NOTES:
 * - Sections rendered: module path, description, purpose, dependencies, exports, patterns, claude notes
 * - Empty array sections (e.g., no patterns) are still shown with "None specified" text
 * - filePath prop is displayed in the header so the user knows which file they're previewing
 * - The apply button should be connected to useModules().applyDoc in the parent
 */

import type { ModuleDoc } from "@/types/module";

interface DocPreviewProps {
  filePath: string;
  doc: ModuleDoc | null;
  onApply: () => void;
  loading: boolean;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-800/50 p-4">
      <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
        {title}
      </h4>
      {children}
    </div>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <Section title={title}>
      {items.length > 0 ? (
        <ul className="space-y-1">
          {items.map((item, index) => (
            <li
              key={`${title}-${index}`}
              className="flex items-start gap-2 text-sm text-neutral-300"
            >
              <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-600" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm italic text-neutral-600">None specified</p>
      )}
    </Section>
  );
}

export function DocPreview({ filePath, doc, onApply, loading }: DocPreviewProps) {
  if (!doc) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 p-8">
        <div className="text-center">
          <div className="mb-3 text-3xl text-neutral-700">&#128196;</div>
          <p className="text-sm font-medium text-neutral-400">
            Select a file to preview documentation
          </p>
          <p className="mt-1 text-xs text-neutral-600">
            Choose a file from the tree to see its documentation or generate new docs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-neutral-200">
            Documentation Preview
          </h3>
          <p className="mt-0.5 truncate font-mono text-xs text-neutral-500">
            {filePath}
          </p>
        </div>
        <button
          onClick={onApply}
          disabled={loading}
          className={`shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            loading
              ? "cursor-not-allowed bg-neutral-800 text-neutral-600"
              : "bg-green-600 text-white hover:bg-green-500"
          }`}
        >
          {loading ? "Applying..." : "Apply to File"}
        </button>
      </div>

      {/* Documentation Sections */}
      <div className="space-y-3">
        {/* Module Path */}
        <Section title="Module">
          <p className="font-mono text-sm text-neutral-300">{doc.modulePath}</p>
        </Section>

        {/* Description */}
        <Section title="Description">
          <p className="text-sm text-neutral-300">{doc.description}</p>
        </Section>

        {/* Purpose */}
        <ListSection title="Purpose" items={doc.purpose} />

        {/* Dependencies */}
        <ListSection title="Dependencies" items={doc.dependencies} />

        {/* Exports */}
        <ListSection title="Exports" items={doc.exports} />

        {/* Patterns */}
        <ListSection title="Patterns" items={doc.patterns} />

        {/* Claude Notes */}
        <ListSection title="Claude Notes" items={doc.claudeNotes} />
      </div>
    </div>
  );
}
