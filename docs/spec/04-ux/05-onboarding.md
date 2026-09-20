# 05. Onboarding

## 1. Decision for MVP

Use an **inline first-run checklist**, not a multi-page modal wizard.

Reasons:

- faster to first value
- less blocking
- easier to skip/return

## 2. First-run detection

Show checklist when any of these is true:

1. no provider configured
2. no secret present for default provider
3. no session exists yet

Persist dismissal state, but incomplete critical steps can reappear as banners.

## 3. Checklist steps

1. **Add a provider**
2. **Save an API key**
3. **Open a project folder**
4. **Send your first prompt**
5. *(Optional)* Load a development plugin

## 4. Placement

- shown in main chat empty state
- provider and key items deep-link to Settings → Agent
- the optional plugin item opens the app shell's Plugins destination
- project and prompt items invoke their relevant app actions
- checklist collapses after core steps complete

## 5. Copy tone

English source, concise, action-oriented.

Example:

- “Add a model provider”
- “Save your API key”
- “Open a project to enable local tools”

## 6. Non-goals

- account signup
- cloud sync setup
- long product tour overlays
- forced tutorial for returning users

## 7. Acceptance

1. Fresh profile shows checklist
2. Completing provider+key+prompt removes critical empty-state blocker
3. User can dismiss optional parts without breaking app use

## 8. Tuzi product entry point

When the onboarding state is visible and the provider list is empty, the chat
surface may show a compact product chooser for the Tuzi family. It is a single
selection surface, not a second onboarding wizard:

- **Tuzi API**, **Tuzi Store Codex subscription**, and **GAC Codex subscription**
  are named endpoint presets. Selecting one opens the existing
  `ProviderSetupDialog` with the endpoint prefilled.
- The API key field remains in the shared provider form. Keys are written only
  through the Host secret store; renderer state and persisted onboarding state
  never contain the key.
- **Later** dismisses the onboarding state through `app.dismissOnboarding`.
  Saving a provider also dismisses it, so a successful setup cannot reopen the
  chooser on the next render.
- **Other provider** opens the same form in Custom endpoint mode. The chooser
  is hidden as soon as a provider exists, even when the checklist is still
  visible.

The chooser is deliberately gated by the empty provider list to avoid covering
returning users or changing the existing checklist contract.
