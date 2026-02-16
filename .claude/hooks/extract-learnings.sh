#!/bin/bash
#
# extract-learnings.sh - Auto-extract learnings from Claude Code sessions
#
# This hook runs at SessionEnd and analyzes the conversation transcript to
# extract user preferences, solutions to recurring problems, and patterns.
# Learnings are appended to CLAUDE.local.md (personal, not git-tracked)
# and routed to topic-specific files in auto-memory.
#
# Features:
# - Semantic deduplication (sends existing learnings to avoid duplicates)
# - Topic routing (routes to auto-memory topic files)
# - Lifecycle markers ([Verified], [Deprecated])
# - Structured JSON extraction with confidence scoring
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
SETTINGS_FILE="$HOME/.project-jumpstart/settings.json"

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
    if [[ -f "$SETTINGS_FILE" ]]; then
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

# Read existing learnings to avoid duplicates (semantic dedup)
MEMORY_PATH="$CWD/$MEMORY_FILE"
EXISTING_LEARNINGS=""
if [[ -f "$MEMORY_PATH" ]]; then
    EXISTING_LEARNINGS=$(cat "$MEMORY_PATH")
fi

# Also read auto-memory files for broader dedup context
AUTO_MEMORY_CONTEXT=""
MEMORY_DIR="$HOME/.claude/projects"
for dir in "$MEMORY_DIR"/*/memory/; do
    if [[ -d "$dir" ]]; then
        for f in "$dir"*.md; do
            if [[ -f "$f" ]]; then
                AUTO_MEMORY_CONTEXT+=$(head -c 5000 "$f" 2>/dev/null || true)
                AUTO_MEMORY_CONTEXT+=$'\n---\n'
            fi
        done
        break  # Only check first matching project
    fi
done

# Prepare the extraction prompt with semantic dedup
EXTRACTION_PROMPT="Analyze this Claude Code conversation transcript and extract learnings worth remembering for future sessions.

EXISTING LEARNINGS (avoid duplicates - check semantically, not just exact text):
$EXISTING_LEARNINGS

AUTO-MEMORY CONTEXT (also avoid duplicating these):
$AUTO_MEMORY_CONTEXT

---

CONVERSATION TRANSCRIPT:
$TRANSCRIPT

---

Extract and return ONLY new, non-duplicate learnings. Use semantic deduplication: if an existing learning already captures the same insight (even with different wording), skip it.

Format each learning as a structured line:
- [Category] Learning text | topic:TOPIC_NAME | confidence:HIGH|MEDIUM|LOW

Categories: [Preference], [Solution], [Pattern], [Gotcha]

Topic names (for routing to auto-memory files):
- debugging - Bug fixes, error solutions, troubleshooting
- patterns - Code patterns, conventions, architectural decisions
- tools - Tool preferences, CLI commands, build commands
- project - Project-specific facts, file locations, feature status
- workflow - Development workflow, git practices, review process

Rules:
- Return ONLY formatted bullet points, no explanations
- Skip if nothing new or significant to add
- Be concise (one line per learning)
- Include confidence level (HIGH = confirmed across multiple interactions, MEDIUM = observed once clearly, LOW = inferred)
- Return 'NONE' if no new learnings worth saving

Example output:
- [Preference] User prefers terse responses without excessive explanation | topic:workflow | confidence:MEDIUM
- [Solution] SQLite \"database locked\" error: ensure db.lock() is released before next call | topic:debugging | confidence:HIGH
- [Pattern] Always run tests after modifying Rust files | topic:patterns | confidence:HIGH
- [Gotcha] The legacy API endpoint /v1/users is deprecated, use /v2/users | topic:project | confidence:MEDIUM"

# Read model from settings.json (with fallback)
CLAUDE_MODEL=$(jq -r '.claude_model // empty' "$SETTINGS_FILE" 2>/dev/null || true)
if [[ -z "$CLAUDE_MODEL" ]]; then
    CLAUDE_MODEL="claude-sonnet-4-5-latest"
fi

# Call Claude API to extract learnings (with 30s timeout)
RESPONSE=$(curl -s --max-time 30 https://api.anthropic.com/v1/messages \
    -H "Content-Type: application/json" \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -d "$(jq -n \
        --arg prompt "$EXTRACTION_PROMPT" \
        --arg model "$CLAUDE_MODEL" \
        '{
            model: $model,
            max_tokens: 1024,
            messages: [{role: "user", content: $prompt}]
        }')" 2>/dev/null || true)

# Extract the text content from response
LEARNINGS=$(echo "$RESPONSE" | jq -r '.content[0].text // empty' 2>/dev/null || true)

# Skip if no learnings or error
if [[ -z "$LEARNINGS" || "$LEARNINGS" == "NONE" || "$LEARNINGS" == "null" ]]; then
    exit 0
fi

# Append learnings to CLAUDE.local.md (primary storage)
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

# Route learnings to topic-specific auto-memory files
route_to_topic() {
    local topic="$1"
    local learning="$2"
    local topic_file=""

    # Find auto-memory directory for this project
    for dir in "$MEMORY_DIR"/*/memory/; do
        if [[ -d "$dir" ]]; then
            topic_file="${dir}${topic}.md"
            break
        fi
    done

    if [[ -n "$topic_file" ]]; then
        if [[ ! -f "$topic_file" ]]; then
            echo "# ${topic^} Notes" > "$topic_file"
            echo "" >> "$topic_file"
            echo "Auto-routed learnings from session extraction." >> "$topic_file"
            echo "" >> "$topic_file"
        fi
        echo "- $learning" >> "$topic_file"
    fi
}

# Parse learnings and route to topic files
while IFS= read -r line; do
    # Skip empty lines
    [[ -z "$line" ]] && continue
    # Skip lines that don't start with -
    [[ "$line" != -* ]] && continue

    # Extract topic from the learning line
    TOPIC=$(echo "$line" | grep -oP 'topic:\K\w+' 2>/dev/null || true)
    # Extract the learning text (before | topic:)
    LEARNING_TEXT=$(echo "$line" | sed 's/ | topic:.*//' | sed 's/^- //')

    if [[ -n "$TOPIC" && -n "$LEARNING_TEXT" ]]; then
        route_to_topic "$TOPIC" "$LEARNING_TEXT"
    fi
done <<< "$LEARNINGS"

exit 0
