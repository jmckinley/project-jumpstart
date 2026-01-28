/**
 * @module components/enforcement/CISetup
 * @description CI integration setup with copyable templates for GitHub Actions and GitLab CI
 *
 * PURPOSE:
 * - Display CI integration snippets for documentation enforcement
 * - Provide copyable YAML templates for GitHub Actions and GitLab CI
 * - Show which CI providers are already configured
 *
 * DEPENDENCIES:
 * - @/components/ui/card - Card layout
 * - @/components/ui/button - Copy button
 * - @/components/ui/badge - Provider badges
 * - @/types/enforcement - CiSnippet type
 *
 * EXPORTS:
 * - CISetup - CI integration templates component
 *
 * PATTERNS:
 * - Receives snippets array and loading state from parent
 * - onLoadSnippets callback triggers fetching CI templates
 * - Each snippet shows provider name, description, filename, and copyable content
 * - Copy button uses navigator.clipboard.writeText
 *
 * CLAUDE NOTES:
 * - Two providers: github_actions and gitlab_ci
 * - Snippets are generated server-side based on project structure
 * - Description is appended with "(workflows directory exists)" if detected
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CiSnippet } from "@/types/enforcement";

interface CISetupProps {
  snippets: CiSnippet[];
  loading: boolean;
  onLoadSnippets: () => void;
}

function getProviderLabel(provider: string): string {
  switch (provider) {
    case "github_actions":
      return "GitHub Actions";
    case "gitlab_ci":
      return "GitLab CI";
    default:
      return provider;
  }
}

function SnippetCard({ snippet }: { snippet: CiSnippet }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: no-op if clipboard is unavailable
    }
  };

  const isConfigured = snippet.description.includes("exists)");

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-200">{snippet.name}</span>
          <Badge variant="outline" className="text-xs text-neutral-400">
            {getProviderLabel(snippet.provider)}
          </Badge>
          {isConfigured && (
            <Badge className="bg-emerald-900/50 text-emerald-400 hover:bg-emerald-900/50 text-xs">
              Detected
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className="text-xs text-neutral-400 hover:text-neutral-200"
        >
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>

      <p className="text-xs text-neutral-500">{snippet.description}</p>

      <div className="text-xs text-neutral-500">
        File: <code className="rounded bg-neutral-800 px-1 py-0.5">{snippet.filename}</code>
      </div>

      <pre className="max-h-64 overflow-auto rounded-md border border-neutral-800 bg-neutral-900 p-3 text-xs text-neutral-300">
        <code>{snippet.content}</code>
      </pre>
    </div>
  );
}

export function CISetup({ snippets, loading, onLoadSnippets }: CISetupProps) {
  return (
    <Card className="border-neutral-800 bg-neutral-900">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">CI Integration</CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={onLoadSnippets}
            disabled={loading}
            className="text-xs text-neutral-400 hover:text-neutral-200"
          >
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-neutral-400">
          Add documentation checks to your CI pipeline. Copy the snippet below into your workflow configuration.
        </p>

        {snippets.length === 0 && !loading && (
          <div className="flex items-center justify-center py-8 text-sm text-neutral-500">
            Click Refresh to load CI templates.
          </div>
        )}

        {snippets.map((snippet) => (
          <SnippetCard key={snippet.provider} snippet={snippet} />
        ))}
      </CardContent>
    </Card>
  );
}
