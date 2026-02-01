/**
 * @module components/modules/FileTree
 * @description Hierarchical file tree displaying all scanned modules with status icons and collapsible folders
 *
 * PURPOSE:
 * - Build a nested tree structure from flat module paths (e.g., "src/components/Foo.tsx" -> nested folders)
 * - Show documentation status per file with color-coded icons
 * - Allow selecting a file to preview its documentation
 * - Support collapsible/expandable folder nodes
 *
 * DEPENDENCIES:
 * - react (useState, useMemo) - Local state for expanded folders and memoized tree
 * - @/types/module - ModuleStatus type for file status data
 *
 * EXPORTS:
 * - FileTree - Tree view component for navigating scanned modules
 *
 * PATTERNS:
 * - Receives flat ModuleStatus[] and builds a nested TreeNode structure via buildTree()
 * - All folders default to expanded on initial render
 * - selectedPath is controlled externally via props
 * - Status icons: green circle = "current", yellow circle = "outdated", red circle = "missing"
 *
 * CLAUDE NOTES:
 * - Tree is rebuilt (memoized) only when modules array changes
 * - Folder file counts include all descendant files, not just direct children
 * - The expanded state is a Set<string> of folder paths joined by "/"
 * - Clicking a folder toggles expand/collapse; clicking a file triggers onSelect
 */

import { useState, useMemo, useEffect } from "react";
import type { ModuleStatus } from "@/types/module";

interface FileTreeProps {
  modules: ModuleStatus[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

interface TreeNode {
  name: string;
  fullPath: string;
  isFolder: boolean;
  children: TreeNode[];
  module?: ModuleStatus;
  fileCount: number;
}

function buildTree(modules: ModuleStatus[]): TreeNode[] {
  const root: TreeNode = {
    name: "",
    fullPath: "",
    isFolder: true,
    children: [],
    fileCount: 0,
  };

  for (const mod of modules) {
    const parts = mod.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const fullPath = parts.slice(0, i + 1).join("/");

      let child = current.children.find((c) => c.name === part);

      if (!child) {
        child = {
          name: part,
          fullPath,
          isFolder: !isFile,
          children: [],
          fileCount: 0,
        };
        if (isFile) {
          child.module = mod;
        }
        current.children.push(child);
      }

      current = child;
    }
  }

  // Count files in each folder recursively
  function countFiles(node: TreeNode): number {
    if (!node.isFolder) return 1;
    let count = 0;
    for (const child of node.children) {
      count += countFiles(child);
    }
    node.fileCount = count;
    return count;
  }

  countFiles(root);

  // Sort: folders first, then alphabetically
  function sortChildren(node: TreeNode): void {
    node.children.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });
    for (const child of node.children) {
      sortChildren(child);
    }
  }

  sortChildren(root);

  return root.children;
}

function collectFolderPaths(nodes: TreeNode[]): Set<string> {
  const paths = new Set<string>();
  function walk(node: TreeNode) {
    if (node.isFolder) {
      paths.add(node.fullPath);
      for (const child of node.children) {
        walk(child);
      }
    }
  }
  for (const node of nodes) {
    walk(node);
  }
  return paths;
}

const STATUS_ICON: Record<ModuleStatus["status"], { color: string; label: string }> = {
  current: { color: "bg-green-500", label: "Documented" },
  outdated: { color: "bg-yellow-500", label: "Outdated" },
  missing: { color: "bg-red-500", label: "Missing" },
};

function TreeNodeRow({
  node,
  depth,
  expanded,
  selectedPath,
  onToggle,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  selectedPath: string | null;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
}) {
  const isExpanded = expanded.has(node.fullPath);
  const isSelected = node.fullPath === selectedPath;
  const paddingLeft = depth * 16 + 8;

  if (node.isFolder) {
    return (
      <>
        <button
          onClick={() => onToggle(node.fullPath)}
          className="flex w-full items-center gap-2 rounded-md py-1.5 text-left text-sm text-neutral-300 transition-colors hover:bg-neutral-800/50"
          style={{ paddingLeft }}
        >
          <span className="shrink-0 text-xs text-neutral-500">
            {isExpanded ? "\u25BE" : "\u25B8"}
          </span>
          <span className="truncate font-medium">{node.name}</span>
          <span className="ml-auto shrink-0 pr-2 text-xs text-neutral-600">
            {node.fileCount}
          </span>
        </button>
        {isExpanded &&
          node.children.map((child) => (
            <TreeNodeRow
              key={child.fullPath}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selectedPath={selectedPath}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
      </>
    );
  }

  const status = node.module ? STATUS_ICON[node.module.status] : STATUS_ICON.missing;

  return (
    <button
      onClick={() => onSelect(node.fullPath)}
      className={`flex w-full items-center gap-2 rounded-md py-1.5 text-left text-sm transition-colors ${
        isSelected
          ? "bg-neutral-800 text-neutral-100"
          : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200"
      }`}
      style={{ paddingLeft }}
      title={`${node.fullPath} - ${status.label}`}
    >
      <span
        className={`inline-block h-2 w-2 shrink-0 rounded-full ${status.color}`}
      />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function FileTree({ modules, selectedPath, onSelect }: FileTreeProps) {
  const tree = useMemo(() => buildTree(modules), [modules]);
  const allFolders = useMemo(() => collectFolderPaths(tree), [tree]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Expand all folders by default when modules load
  useEffect(() => {
    if (allFolders.size > 0) {
      setExpanded(allFolders);
    }
  }, [allFolders]);

  const handleToggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  if (modules.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
        <p className="text-center text-sm text-neutral-500">
          No modules scanned yet. Run a scan to populate the file tree.
        </p>
      </div>
    );
  }

  return (
    <div className="flex max-h-[350px] min-h-[250px] flex-col rounded-lg border border-neutral-800 bg-neutral-900 p-3">
      <h3 className="mb-3 shrink-0 px-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
        Files ({modules.length})
      </h3>
      <div className="flex-1 overflow-y-auto">
        {tree.map((node) => (
          <TreeNodeRow
            key={node.fullPath}
            node={node}
            depth={0}
            expanded={expanded}
            selectedPath={selectedPath}
            onToggle={handleToggle}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
