#!/bin/bash
#
# check-test-staleness.sh - Detect stale tests after source file changes
#
# This hook runs at SessionEnd and checks if recently modified source files
# have corresponding test files that were NOT also modified. If so, it flags
# them as potentially stale in CLAUDE.local.md.
#
# Algorithm:
# 1. Get recently changed files from git (last 10 commits)
# 2. Filter to material source files (exclude test files, configs, etc.)
# 3. For each source file, find its expected test file
# 4. If test file exists but was NOT modified -> flag as stale
# 5. Append flags to CLAUDE.local.md
#
# No API calls - purely git + filesystem, instant and free.
#
# Hook receives JSON on stdin:
# {
#   "session_id": "abc123",
#   "transcript_path": "/path/to/transcript.jsonl",
#   "cwd": "/path/to/project",
#   "hook_event_name": "SessionEnd"
# }

set -euo pipefail

# Read hook input from stdin
INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')

# Validate inputs
if [[ -z "$CWD" || ! -d "$CWD" ]]; then
    exit 0
fi

# Must be a git repo
if ! git -C "$CWD" rev-parse --git-dir &>/dev/null; then
    exit 0
fi

# Configuration
MEMORY_FILE="CLAUDE.local.md"
MEMORY_PATH="$CWD/$MEMORY_FILE"
LOOKBACK=10

# Get recently changed files (last N commits)
CHANGED_FILES=$(git -C "$CWD" diff --name-only "HEAD~${LOOKBACK}" HEAD 2>/dev/null || true)

if [[ -z "$CHANGED_FILES" ]]; then
    exit 0
fi

# Source file extensions to check (material code files)
SOURCE_EXTS="\.tsx?$|\.jsx?$|\.rs$|\.py$|\.go$"

# Test file patterns to exclude from source list
TEST_PATTERNS="\.test\.|\.spec\.|_test\.|test_|__tests__|\.stories\."

# Filter to material source files (not tests, not configs)
SOURCE_FILES=""
while IFS= read -r file; do
    # Skip empty lines
    [[ -z "$file" ]] && continue
    # Must match source extension
    if ! echo "$file" | grep -qE "$SOURCE_EXTS"; then
        continue
    fi
    # Must NOT be a test file
    if echo "$file" | grep -qE "$TEST_PATTERNS"; then
        continue
    fi
    # Must NOT be a config file
    if echo "$file" | grep -qE "config\.|\.config|\.d\.ts$|mod\.rs$"; then
        continue
    fi
    SOURCE_FILES+="$file"$'\n'
done <<< "$CHANGED_FILES"

if [[ -z "$SOURCE_FILES" ]]; then
    exit 0
fi

# Build set of changed files for quick lookup
declare -A CHANGED_SET
while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    CHANGED_SET["$file"]=1
done <<< "$CHANGED_FILES"

# Find stale test files
STALE_ENTRIES=""

find_test_file() {
    local src="$1"
    local dir=$(dirname "$src")
    local base=$(basename "$src")
    local ext="${base##*.}"
    local name="${base%.*}"

    case "$ext" in
        ts|tsx|js|jsx)
            # Check: Name.test.ext, Name.spec.ext
            for test_ext in "test" "spec"; do
                local candidate="$dir/${name}.${test_ext}.${ext}"
                if [[ -f "$CWD/$candidate" ]]; then
                    echo "$candidate"
                    return
                fi
            done
            # Check __tests__/ directory
            local tests_candidate="$dir/__tests__/${name}.${test_ext:-test}.${ext}"
            if [[ -f "$CWD/$tests_candidate" ]]; then
                echo "$tests_candidate"
                return
            fi
            ;;
        rs)
            # Rust: inline tests in same file (check if file has #[cfg(test)])
            if grep -q '#\[cfg(test)\]' "$CWD/$src" 2>/dev/null; then
                # Test is inline - if source was modified, test was too
                echo "__inline__"
                return
            fi
            ;;
        py)
            # Python: test_name.py in same dir or tests/ dir
            local test_candidate="$dir/test_${base}"
            if [[ -f "$CWD/$test_candidate" ]]; then
                echo "$test_candidate"
                return
            fi
            test_candidate="$dir/tests/test_${base}"
            if [[ -f "$CWD/$test_candidate" ]]; then
                echo "$test_candidate"
                return
            fi
            ;;
        go)
            # Go: name_test.go
            local test_candidate="$dir/${name}_test.go"
            if [[ -f "$CWD/$test_candidate" ]]; then
                echo "$test_candidate"
                return
            fi
            ;;
    esac

    echo ""
}

while IFS= read -r src; do
    [[ -z "$src" ]] && continue

    test_file=$(find_test_file "$src")

    # Skip if no test file found or inline tests
    if [[ -z "$test_file" || "$test_file" == "__inline__" ]]; then
        continue
    fi

    # Check if test file was also modified
    if [[ -z "${CHANGED_SET[$test_file]:-}" ]]; then
        STALE_ENTRIES+="- [Gotcha] Test may be stale: $src was modified but $test_file was not | topic:patterns | confidence:medium"$'\n'
    fi
done <<< "$SOURCE_FILES"

# Write stale entries to CLAUDE.local.md
if [[ -n "$STALE_ENTRIES" ]]; then
    {
        if [[ ! -f "$MEMORY_PATH" ]]; then
            echo "# Session Learnings"
            echo ""
            echo "Auto-extracted insights from Claude Code sessions."
            echo "This file is personal (not git-tracked)."
            echo ""
        fi

        echo ""
        echo "## Test Staleness Check - Session $SESSION_ID ($(date '+%Y-%m-%d %H:%M'))"
        echo ""
        echo "$STALE_ENTRIES"
    } >> "$MEMORY_PATH"
fi

exit 0
