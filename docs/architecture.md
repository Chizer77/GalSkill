# Architecture

## Overview

```
                    ┌─────────────────────────────────────┐
                    │              GalSkill               │
                    ├─────────────────────────────────────┤
                    │  SearchBox ──→ CharacterDetail      │
                    │       │                             │
                    │       ▼                             │
                    │  IndexedDB (Dexie) ← CDN Shards     │
                    │       │                             │
                    │       ▼                             │
                    │  Range Fetch (HTTP 206) ← CDN JSONL │
                    │       │                             │
                    │       ▼                             │
                    │  DistillProgress ──→ LLM API        │
                    │       │                             │
                    │       ▼                             │
                    │  SkillExport ──→ ZIP                │
                    └─────────────────────────────────────┘
```

## Component Tree

```
layout.tsx (max-w-[1120px] centered, Noto Sans SC body, serif headings)
└── page.tsx (single-page state machine)
    ├── <header> — SiteIcon + title + subtitle
    ├── ModelConfig          — LLM API config (localStorage)
    ├── SearchBox            — IndexedDB search + keyboard nav
    ├── [selectedCharacter] ─── AnimatePresence
    │   ├── CharacterDetail  — Character info cards
    │   ├── DialogueInput    — Dialogue input / file upload
    │   ├── DistillProgress  — Iterative distillation progress
    │   └── SkillExport      — Skill preview + ZIP export
    └── <footer>
```

## Data Flow

### 1. Index Loading
Download `master.json` (versioned index) from CDN. Shards are partitioned by the first character of each keyword. Background loading streams shards into IndexedDB with 50ms delay between each to avoid blocking the UI. Failed shards are logged and skipped (non-fatal).

### 2. Character Search
User input → 300ms debounce → `ensureShardLoaded()` lazy-loads the required shard → Dexie `startsWith` query → ranked result list (up to 20)

### 3. Character Fetch
HTTP `Range: bytes={offset}-{offset+length-1}` partial request on `character.jsonl` via CDN. Multi-CDN fallback retries configured endpoints in priority order. Response is parsed as JSON into `CharacterData`.

### 4. Dialogue Distillation
Raw text is split into 3000-char chunks (200-char overlap). Each chunk is sent sequentially to a user-configured OpenAI-compatible API. An accumulating `runningSummary` passes context between chunks. The final chunk returns a structured `SkillOutput`.

### 5. Skill Export
Generates 4 files compressed into a ZIP download:
- `identity.json` — Personality, speech patterns, tone
- `knowledge.json` — Worldview, background, tags
- `relations.md` — Character relationship dynamics
- `style_guide.md` — LLM instruction manual for in-character dialogue