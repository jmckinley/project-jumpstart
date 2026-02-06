#!/bin/bash
#
# extract-learnings.sh - Auto-extract learnings from Claude Code sessions
#
# This hook runs at SessionEnd and analyzes the conversation transcript to
# extract user preferences, solutions to recurring problems, and patterns.
# Learnings are appended to CLAUDE.local.md (personal, not git-tracked).
#
# Requirements:
# - jq (for JSON parsing)
# - curl (for API calls)
# - ANTHROPIC_API_KEY environment variable (or reads from ~/.project-jumpstart/settings.json)
#
# Hook receives JSON on stdin:
# {
#   "session_id": "abc123",
#   "transcript_path": "/path/to/transcript.jsonl",
#   "cwd": "/path/to/project",
#   "hook_event_name": "SessionEnd"
# }

set -euo pipefail

# Configuration
MEMORY_FILE="CLAUDE.local.md"
MIN_TURNS=5  # Minimum conversation turns to analyze (skip short sessions)
MAX_TRANSCRIPT_CHARS=50000  # Truncate very long transcripts

# Read hook input from stdin
INPUT=$(cat)
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')

# Validate inputs
if [[ -z "$TRANSCRIPT_PATH" || ! -f "$TRANSCRIPT_PATH" ]]; then
    exit 0  # No transcript, nothing to do
fi

if [[ -z "$CWD" ]]; then
    exit 0
fi

# Get API key (try env var first, then settings file)
if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
    SETTINGS_FILE="$HOME/.project-jumpstart/settings.json"
    if [[ -f "$SETTINGS_FILE" ]]; then
        # Use correct key name: anthropic_api_key
        ANTHROPIC_API_KEY=$(jq -r '.anthropic_api_key // empty' "$SETTINGS_FILE" 2>/dev/null || true)
    fi
fi

if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
    # No API key available, skip extraction
    exit 0
fi

# Count conversation turns
TURN_COUNT=$(wc -l < "$TRANSCRIPT_PATH" | tr -d ' ')
if [[ "$TURN_COUNT" -lt "$MIN_TURNS" ]]; then
    # Too short to extract meaningful learnings
    exit 0
fi

# Read and truncate transcript if needed
TRANSCRIPT=$(head -c "$MAX_TRANSCRIPT_CHARS" "$TRANSCRIPT_PATH")

# Read existing learnings to avoid duplicates
MEMORY_PATH="$CWD/$MEMORY_FILE"
EXISTING_LEARNINGS=""
if [[ -f "$MEMORY_PATH" ]]; then
    EXISTING_LEARNINGS=$(cat "$MEMORY_PATH")
fi

# Prepare the extraction prompt
EXTRACTION_PROMPT="Analyze this Claude Code conversation transcript and extract learnings worth remembering for future sessions.

EXISTING LEARNINGS (avoid duplicates):
$EXISTING_LEARNINGS

---

CONVERSATION TRANSCRIPT:
$TRANSCRIPT

---

Extract and return ONLY new, non-duplicate learnings in these categories:

1. **User Preferences** - Coding style, communication preferences, tool choices
2. **Solutions** - Fixes for specific errors or problems that might recur
3. **Patterns** - Recurring workflows or approaches the user likes
4. **Gotchas** - Project-specific pitfalls or things to remember

Rules:
- Return ONLY bullet points, no explanations
- Skip if nothing new or significant to add
- Be concise (one line per learning)
- Start each with the category in brackets: [Preference], [Solution], [Pattern], [Gotcha]
- Return 'NONE' if no new learnings worth saving

Example output:
- [Preference] User prefers terse responses without excessive explanation
- [Solution] SQLite \"database locked\" error: ensure db.lock() is released before next call
- [Pattern] Always run tests after modifying Rust files
- [Gotcha] The legacy API endpoint /v1/users is deprecated, use /v2/users"

# Call Claude API to extract learnings (with 30s timeout)
RESPONSE=$(curl -s --max-time 30 https://api.anthropic.com/v1/messages \
    -H "Content-Type: application/json" \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -d "$(jq -n \
        --arg prompt "$EXTRACTION_PROMPT" \
        '{
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 1024,
            messages: [{role: "user", content: $prompt}]
        }')" 2>/dev/null || true)

# Extract the text content from response
LEARNINGS=$(echo "$RESPONSE" | jq -r '.content[0].text // empty' 2>/dev/null || true)

# Skip if no learnings or error
if [[ -z "$LEARNINGS" || "$LEARNINGS" == "NONE" || "$LEARNINGS" == "null" ]]; then
    exit 0
fi

# Append learnings to memory file
{
    if [[ ! -f "$MEMORY_PATH" ]]; then
        echo "# Session Learnings"
        echo ""
        echo "Auto-extracted insights from Claude Code sessions."
        echo "This file is personal (not git-tracked)."
        echo ""
    fi

    echo ""
    echo "## Session $SESSION_ID ($(date '+%Y-%m-%d %H:%M'))"
    echo ""
    echo "$LEARNINGS"
} >> "$MEMORY_PATH"

exit 0
