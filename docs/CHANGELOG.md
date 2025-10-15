# Agent Change Log

> Record every pull request chronologically with the newest entry at the top. Use UTC timestamps in ISO 8601 format.

## 2025-10-15T15:40:02Z — Agent: gpt-5-codex

- **Summary:** Refined the supervisor Kanban into an accessible horizontal gallery with snap scrolling, stable gutters, and responsive column sizing while anchoring the theme toggle to the safe-area inset on touch devices.
- **Reasoning:** Ensure supervisors can browse every lane on mobile and desktop without layout overflow and keep the dark mode control unobtrusive yet reachable across devices with dynamic safe-area spacing.
- **Hats:** role-ui, qa-gate, docs.

## 2025-10-10T12:00:00Z — Agent: gpt-5-codex

- **Summary:** Enriched the supervisor dashboard API with workstation metadata, reworked the Kanban board to build dynamic work-center lanes with fallbacks, and added contract/unit tests covering the new dashboard payload and kanban grouping.
- **Reasoning:** Provide supervisors with workstation-aware visibility so the board layout matches active centers while ensuring future regressions are caught automatically.
- **Hats:** api-contract, role-ui, qa-gate.

## 2025-10-09T14:22:24Z — Agent: gpt-5-codex

- **Summary:** Rebuilt the operator console UI to consume theme-aware tokens, shared form primitives, and semantic status badges so every panel, table, and action control honors dark mode. Refreshed the product model/trim selector to lean on the shared Select/Input components, ensuring supervisor planning forms inherit the same adaptive styling.
- **Reasoning:** Replace the ad hoc inline styles that hardcoded light-theme colors so operators and supervisors get consistent, accessible experiences across light and dark themes while centralizing future styling updates.
- **Hats:** role-ui, docs, qa-gate.

## 2025-10-08T19:45:00Z — Agent: gpt-5-codex

- **Summary:** Applied theme-aware palettes to shared UI primitives, refreshed supervisor dashboard styling to respect CSS vari
  able tokens, and centralized status/priority color maps for dark-mode parity.
- **Reasoning:** Eliminate the lingering light-theme assumptions so supervisors see accessible contrast in both light and dark
  modes while keeping future component work anchored to shared tokens.

## 2025-10-08T17:30:00Z — Agent: gpt-5-codex

- **Summary:** Introduced a global theme provider and floating toggle to support persistent light/dark modes and refreshed shared styles to respect theme-aware tokens across forms, tables, and layout chrome.
- **Reasoning:** Ensure operators and supervisors can switch to a low-light friendly palette without losing readability while keeping shared UI primitives consistent.
- **Hats:** role-ui, qa-gate.

## 2025-10-08T16:05:00Z — Agent: gpt-5-codex

- **Summary:** Replaced the lightweight guidance with a comprehensive `AGENTS.md` playbook that adds an executive summary, role protocols, and reinforced domain/operational guardrails.
- **Reasoning:** Give future agents a scannable yet thorough reference so they can uphold the product invariants, testing discipline, and documentation habits without guesswork.

## 2025-10-08T15:18:59Z — Agent: gpt-5-codex

- **Summary:** Refreshed the project README to document the combined supervisor workspace, current operator capabilities, and up-to-date setup/testing guidance.
- **Reasoning:** Align the public-facing documentation with the latest product experience and developer workflow.

## 2025-10-08T14:20:00Z — Agent: gpt-5-codex

- **Summary:** Added the root `AGENTS.md` to codify coding standards, testing requirements, and documentation expectations. Established the shared change log process.
- **Reasoning:** Provide future agents with clear guardrails and traceability for their work.
