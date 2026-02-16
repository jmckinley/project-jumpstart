---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
  - "src-tauri/src/**/*.rs"
---

# Module Documentation Rules

## CRITICAL: Every File MUST Have Documentation

Every source file needs a documentation header at the top because:

1. **Headers survive context compaction** - When context fills up, Claude loses memory. But file headers are always visible when a file is opened.
2. **We're building a documentation tool** - If we don't document our own code, we're hypocrites.
3. **Self-hosting** - Use Project Jumpstart on itself for documentation maintenance.

## TypeScript/React Format

```typescript
/**
 * @module [path/from/src]
 * @description [One-line description]
 *
 * PURPOSE:
 * - [Main responsibility #1]
 *
 * DEPENDENCIES:
 * - [import path] - [why]
 *
 * EXPORTS:
 * - [functionName] - [what it does]
 *
 * PATTERNS:
 * - [How this module should be used]
 *
 * CLAUDE NOTES:
 * - [Things to always remember]
 */
```

## Rust Format

```rust
//! @module [path/from/src]
//! @description [One-line description]
//!
//! PURPOSE:
//! - [Main responsibility]
//!
//! DEPENDENCIES:
//! - [crate/module] - [why]
//!
//! EXPORTS:
//! - [function_name] - [what it does]
//!
//! PATTERNS:
//! - [Usage patterns]
//!
//! CLAUDE NOTES:
//! - [Important context]
```

## When to Update

| Change Type | Action Required |
|-------------|-----------------|
| Add new export | Add to EXPORTS section |
| Remove export | Remove from EXPORTS section |
| Change function signature | Update EXPORTS description |
| Add significant import | Add to DEPENDENCIES |
| Change module purpose | Update @description and PURPOSE |
| Fix bug revealing behavior | Add to CLAUDE NOTES |

## Checklist

Before completing ANY file modification, verify:
- `@description` accurately describes the module
- All current exports are listed in EXPORTS
- Removed exports are deleted from docs
- CLAUDE NOTES contain helpful reminders
