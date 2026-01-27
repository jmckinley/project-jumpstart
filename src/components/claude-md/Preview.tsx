/**
 * @module components/claude-md/Preview
 * @description Renders a basic markdown preview of CLAUDE.md content with custom parsing
 *
 * PURPOSE:
 * - Parse raw markdown text into styled HTML elements
 * - Support headings, bullet lists, code blocks, tables, bold, horizontal rules, and paragraphs
 * - Provide a live preview of what the CLAUDE.md looks like when rendered
 *
 * DEPENDENCIES:
 * - react - useMemo for memoized parsing
 *
 * EXPORTS:
 * - Preview - Markdown preview component
 *
 * PATTERNS:
 * - Receives raw markdown string via content prop
 * - Uses a custom line-by-line parser (no external markdown library)
 * - Memoizes the parsed output to avoid re-parsing on every render
 * - Renders inside a scrollable container with a fixed title header
 *
 * CLAUDE NOTES:
 * - This is intentionally a simple renderer; it does NOT support nested lists, images, or links
 * - Code blocks are detected by lines starting with ``` and toggle a flag
 * - Table detection looks for lines starting with | and skips separator rows (|---|)
 * - Bold text (**text**) is rendered inline within paragraphs and list items
 */

import { useMemo } from "react";

interface PreviewProps {
  content: string;
}

interface ParsedBlock {
  type:
    | "h1"
    | "h2"
    | "h3"
    | "bullet"
    | "code"
    | "table"
    | "hr"
    | "paragraph";
  content: string;
  rows?: string[][];
}

function renderInlineFormatting(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={match.index} className="font-bold text-neutral-50">
        {match[1]}
      </strong>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function parseMarkdown(content: string): ParsedBlock[] {
  const lines = content.split("\n");
  const blocks: ParsedBlock[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let tableRows: string[][] = [];
  let inTable = false;

  const flushTable = () => {
    if (tableRows.length > 0) {
      blocks.push({ type: "table", content: "", rows: tableRows });
      tableRows = [];
    }
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.trimStart().startsWith("```")) {
      if (inCodeBlock) {
        blocks.push({ type: "code", content: codeLines.join("\n") });
        codeLines = [];
        inCodeBlock = false;
      } else {
        if (inTable) flushTable();
        inCodeBlock = true;
      }
      continue;
    }

    // Inside code block: accumulate lines
    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Horizontal rule
    if (/^---+\s*$/.test(line.trim()) && !inTable) {
      flushTable();
      blocks.push({ type: "hr", content: "" });
      continue;
    }

    // Table row
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      // Skip separator rows like |---|---|
      if (/^\|[\s\-:|]+\|$/.test(line.trim())) {
        inTable = true;
        continue;
      }
      inTable = true;
      const cells = line
        .trim()
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      tableRows.push(cells);
      continue;
    }

    // If we were in a table and hit a non-table line, flush
    if (inTable) {
      flushTable();
    }

    // Headings
    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", content: line.slice(4) });
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", content: line.slice(3) });
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push({ type: "h1", content: line.slice(2) });
      continue;
    }

    // Bullet points
    if (/^\s*[-*]\s/.test(line)) {
      const text = line.replace(/^\s*[-*]\s+/, "");
      blocks.push({ type: "bullet", content: text });
      continue;
    }

    // Empty line: skip
    if (line.trim() === "") {
      continue;
    }

    // Paragraph
    blocks.push({ type: "paragraph", content: line });
  }

  // Flush remaining table or code block
  if (inTable) flushTable();
  if (inCodeBlock && codeLines.length > 0) {
    blocks.push({ type: "code", content: codeLines.join("\n") });
  }

  return blocks;
}

export function Preview({ content }: PreviewProps) {
  const blocks = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div className="flex h-full flex-col rounded-lg border border-neutral-800 bg-neutral-900">
      {/* Header */}
      <div className="border-b border-neutral-800 px-4 py-2">
        <h3 className="text-sm font-semibold text-neutral-300">
          Claude's Understanding
        </h3>
      </div>

      {/* Preview Content */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {blocks.length === 0 && (
          <p className="text-sm italic text-neutral-500">
            Nothing to preview yet. Start editing or generate a CLAUDE.md.
          </p>
        )}

        {blocks.map((block, idx) => {
          switch (block.type) {
            case "h1":
              return (
                <h1
                  key={idx}
                  className="border-b border-neutral-700 pb-2 text-xl font-bold text-neutral-50"
                >
                  {renderInlineFormatting(block.content)}
                </h1>
              );
            case "h2":
              return (
                <h2
                  key={idx}
                  className="mt-2 border-b border-neutral-800 pb-1 text-lg font-semibold text-neutral-100"
                >
                  {renderInlineFormatting(block.content)}
                </h2>
              );
            case "h3":
              return (
                <h3
                  key={idx}
                  className="mt-1 text-base font-semibold text-neutral-200"
                >
                  {renderInlineFormatting(block.content)}
                </h3>
              );
            case "bullet":
              return (
                <div key={idx} className="flex gap-2 pl-4 text-sm">
                  <span className="mt-1 text-blue-400">-</span>
                  <span className="text-neutral-300">
                    {renderInlineFormatting(block.content)}
                  </span>
                </div>
              );
            case "code":
              return (
                <pre
                  key={idx}
                  className="overflow-x-auto rounded-md border border-neutral-700 bg-neutral-950 p-3 text-xs text-green-400"
                >
                  <code>{block.content}</code>
                </pre>
              );
            case "table":
              return (
                <div key={idx} className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    {block.rows && block.rows.length > 0 && (
                      <>
                        <thead>
                          <tr>
                            {block.rows[0].map((cell, ci) => (
                              <th
                                key={ci}
                                className="border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-left font-medium text-neutral-200"
                              >
                                {renderInlineFormatting(cell)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {block.rows.slice(1).map((row, ri) => (
                            <tr key={ri}>
                              {row.map((cell, ci) => (
                                <td
                                  key={ci}
                                  className="border border-neutral-700 px-3 py-1.5 text-neutral-300"
                                >
                                  {renderInlineFormatting(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </>
                    )}
                  </table>
                </div>
              );
            case "hr":
              return (
                <hr key={idx} className="my-3 border-t border-neutral-700" />
              );
            case "paragraph":
              return (
                <p key={idx} className="text-sm leading-relaxed text-neutral-300">
                  {renderInlineFormatting(block.content)}
                </p>
              );
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
