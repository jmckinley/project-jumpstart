#!/bin/bash
#
# pre-compact.sh - Preserve critical context before context compaction
#
# This hook runs before Claude Code compacts the conversation context.
# It saves important state that might be lost during summarization:
# - Current task context and decisions
# - In-progress work descriptions
# - Critical discoveries from the session
#
# Hook receives JSON on stdin:
# {
#   "session_id": "abc123",
#   "transcript_path": "/path/to/transcript.jsonl",
#   "cwd": "/path/to/project",
#   "hook_event_name": "PreCompact"
# }

set -euo pipefail

# Configuration
MEMORY_DIR="$HOME/.claude/projects"
MAX_TRANSCRIPT_TAIL=20000  # Last N chars of transcript to analyze
BACKUP_DIR=".claude/compaction-logs"

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

# Create backup directory for compaction logs
mkdir -p "$CWD/$BACKUP_DIR" 2>/dev/null || true

# Save a compaction timestamp log
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
LOG_FILE="$CWD/$BACKUP_DIR/compact_${TIMESTAMP}.log"

# Get the tail of the transcript (most recent context)
RECENT_CONTEXT=$(tail -c "$MAX_TRANSCRIPT_TAIL" "$TRANSCRIPT_PATH" 2>/dev/null || true)

if [[ -z "$RECENT_CONTEXT" ]]; then
    exit 0
fi

# Write compaction log with session context
{
    echo "# Pre-Compaction Context Snapshot"
    echo "# Session: $SESSION_ID"
    echo "# Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    echo "# Transcript: $TRANSCRIPT_PATH"
    echo "---"
    echo ""
    echo "## Recent Transcript (tail)"
    echo ""
    echo "$RECENT_CONTEXT" | head -200
} > "$LOG_FILE" 2>/dev/null || true

# Try to update auto-memory with a compaction note
# Find the project's auto-memory directory
MEMORY_FILE=""
for dir in "$MEMORY_DIR"/*/memory/MEMORY.md; do
    # Check if this memory dir corresponds to our project
    if [[ -f "$dir" ]]; then
        # Use the first matching memory file we find for this session
        MEMORY_FILE="$dir"
        break
    fi
done

# If we found a memory file, append a compaction note
if [[ -n "$MEMORY_FILE" && -f "$MEMORY_FILE" ]]; then
    # Check if there's already a compaction note for today
    TODAY=$(date '+%Y-%m-%d')
    if ! grep -q "Compaction: $TODAY" "$MEMORY_FILE" 2>/dev/null; then
        {
            echo ""
            echo "## Compaction: $TODAY"
            echo "- Context compacted during session $SESSION_ID"
            echo "- Log saved to $BACKUP_DIR/compact_${TIMESTAMP}.log"
        } >> "$MEMORY_FILE" 2>/dev/null || true
    fi
fi

# Clean up old compaction logs (keep last 10)
if [[ -d "$CWD/$BACKUP_DIR" ]]; then
    ls -t "$CWD/$BACKUP_DIR"/compact_*.log 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
fi

exit 0
