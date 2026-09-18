# ADR 0283: Persisted multi-workbench orchestration

- Status: Accepted
- Date: 2026-09-18
- Deciders: PI-Desktop maintainers
- Related: [03-runtime/04-data-storage](../spec/03-runtime/04-data-storage.md) ·
  [03-runtime/06-host-rpc-protocol](../spec/03-runtime/06-host-rpc-protocol.md) ·
  [04-ux/01-ui-ia](../spec/04-ux/01-ui-ia.md) · E2E-259 · E2E-260

## Context

PI-Desktop has one production runtime path: projects locate work, sessions own
conversation and agent execution, Electron main is a thin bridge, and
host-core owns durable state. Users also need several durable ways to organize
that runtime: a coding workspace, a daily task surface, a creative brief, a
research notebook, and user-created variations.

Making each workspace a second runtime would duplicate session lifecycle,
permissions, provider bindings, work-panel state, and recovery. Treating it as
renderer-only state would lose profile order and navigation context on restart
and could not safely associate newly created projects or sessions.

## Decision

1. **A workbench is a host-owned orchestration profile.** Schema v19 adds
   `workbenches`, `workbench_projects`, and `workbench_sessions`. The profile
   stores presentation, layout, model-role hints, bounded dashboard JSON, and
   last navigation context. Projects and sessions retain their existing tables
   and ownership. Deleting a workbench deletes associations only.
2. **One active profile is durable.** Its id is stored in `kv` under
   `workbenches/active`. The first initialization creates Coding, Daily,
   Creative, and Research profiles, maps existing projects and live sessions to
   Coding, and is idempotent. New projects and sessions are associated with the
   active profile.
3. **Switching changes navigation and effective presentation only.** Before a
   switch, the renderer records the current project/session context. Host writes
   are serialized and only the newest renderer intent may commit. A switch does
   not reparent a running task, change its directory/model/permissions, or
   restart its runtime.
4. **The existing shell remains authoritative.** Coding and Custom use the
   existing Sidebar, ChatSurface, and WorkPanel. Daily stores a real local task
   list and notes. Research stores explicit sources and notes. Creative stores a
   prompt and model-role bindings, but generation stays disabled until a real
   durable media adapter exists; no placeholder is presented as generated
   output.
5. **Workbench appearance is effective, not global.** The renderer resolves
   `workbench.themeId ?? globalSettings.theme`. The built-in profile themes are
   `polar-night`, `sakura-day`, `fortune-gold`, and `deep-study`. A missing
   plugin theme falls back to the global preference. Motion settings respect
   `prefers-reduced-motion`. Switching never writes the global theme setting.
6. **The bridge is additive.** Six bounded host methods and matching IPC calls
   list, create, update, activate, reorder, and delete profiles. This does not
   change the protocol v11 handshake. Invalid input fails with
   `INVALID_PARAMS`, missing profiles with `NOT_FOUND`, deleting the last
   profile with `CONFLICT`, and database failures with `INTERNAL`.
7. **Workbench capability elevation is out of scope.** Skills, MCP servers,
   plugin permissions, and agent tool policy keep their existing global,
   project, and session ownership. Future workbench policy may only further
   restrict those capabilities, never elevate them.

## Consequences

- Users can manage and restore ordered workbench profiles without duplicating
  runtime state or losing projects and sessions when a profile is removed.
- The renderer gains a separate Zustand domain store and a small selection
  coordinator instead of adding workflow state to the central app store.
- Dashboard JSON is deliberately bounded and schema-light. A template that
  outgrows that boundary needs a versioned domain model rather than an
  unbounded profile blob.
- Media generation remains visibly unavailable until submit/query/cancel,
  recovery, credential, cost, and artifact lifecycle contracts exist.
- The additive tables and RPC surface require migration, persistence,
  contract, race, responsive, theme, and representative user-path coverage.

## Alternatives

### A second runtime per workbench

Rejected. It duplicates session and permission ownership, makes background
task continuity ambiguous, and creates incompatible recovery paths.

### Renderer-only profiles

Rejected. Renderer state cannot authoritatively migrate existing data,
associate new sessions, or survive restart without another persistence path.

### Mutate the global theme on every switch

Rejected. It destroys the user's fallback preference and makes a navigation
action rewrite unrelated application settings.

### Ship simulated media results

Rejected. Capability metadata is not a media job runtime, and placeholder
success would misrepresent provider work, cost, and artifact durability.
