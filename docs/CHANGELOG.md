# Agent Change Log

> Record every pull request chronologically with the newest entry at the top. Use UTC timestamps in ISO 8601 format.

## 2025-10-16T15:49:00Z — Agent: Docs & Runbooks

- **Summary:** Strengthened agent workflow to MANDATE documenting all discovered issues in ActionItems.md. Updated AGENTS.md Executive Summary (#7 requirement), Documentation & Change Management (CRITICAL section), Testing Expectations, PR Checklist, Definition of Done, and all agent role descriptions. Updated ActionItems.md "How to Use" section and ONBOARDING.md development workflow with non-negotiable discovery documentation requirement.
- **Reasoning:** Previous language was permissive ("as you discover") not imperative ("MUST add"). Agents were not consistently documenting discovered issues (test failures, build errors, bugs, warnings) in ActionItems.md, leading to lost technical debt tracking. This change makes discovery documentation mandatory across all roles and embedded in every critical workflow checkpoint (Executive Summary, PR Checklist, Definition of Done). Language is now imperative ("MUST", "CRITICAL", "non-negotiable") to eliminate ambiguity.
- **Changes Made**: (1) Added #7 to Executive Summary: "Document ALL discoveries", (2) Expanded Documentation & Change Management with 10-item discovery checklist, (3) Added test failure documentation to Testing Expectations, (4) Made PR Checklist explicit with discovery requirements, (5) Added discovery requirement to Definition of Done, (6) Added universal discovery clause to all 10 agent roles, (7) Added mandatory step #6 to ActionItems.md, (8) Emphasized requirement in ONBOARDING.md.
- **Hats:** docs, qa-gate.

## 2025-10-16T15:30:00Z — Agent: QA & Release Gate

- **Summary:** Configured ESLint (v8.57) and Prettier (v3.6.2) for consistent code quality and formatting. Created `.eslintrc.json` with Next.js defaults, no-console warnings, and Prettier integration. Created `.prettierrc` with project standards (no semicolons, single quotes, 2-space indent, trailing commas) and `.prettierignore` for build outputs. Added `lint`, `lint:fix`, `format`, and `format:check` scripts to package.json. Updated `docs/ActionItems.md` to mark ESLint and Prettier items complete and documented 6 newly discovered issues.
- **Reasoning:** Enforce consistent code style across the codebase (currently 93 files need formatting), catch potential issues early (17+ console.log warnings detected), and establish foundation for pre-commit hooks. ESLint v8 chosen for compatibility with Next.js 14 config system. Prettier config matches majority of existing code conventions.
- **Issues Discovered:** (1) 93 files need formatting with CRLF line ending issues, (2) 17 console.log warnings across codebase, (3) 4 test files failing due to Prisma enum import issues, (4) `buildKanbanColumns` export in supervisor page blocking builds, (5) Duplicate Card component border classes causing Vite warnings. All issues added to ActionItems.md for tracking.
- **Hats:** qa-gate.

## 2025-01-16T19:30:00Z — Agent: Docs & Runbooks

- **Summary:** Created `docs/ActionItems.md` to track prioritized technical debt and improvement tasks. Updated `AGENTS.md` to require checking action items before starting work and updating statuses during development. Added ActionItems reference to `docs/ONBOARDING.md` development workflow section.
- **Reasoning:** Provide a centralized, prioritized task list based on best practices analysis to coordinate work across agents, prevent duplicate efforts, and ensure important improvements don't get lost. Establishes clear workflow for claiming, tracking, and completing action items.
- **Hats:** docs, qa-gate.

## 2025-10-16T13:55:39Z — Agent: gpt-5-codex

- **Summary:** Hid the manual credential form in development, added quick-launch demo account buttons that share the login fetch helper, and kept the production form unchanged for manual sign-in flows.
- **Reasoning:** Streamline local testing by allowing one-click role switching without disrupting the production login behavior or its error handling.
- **Hats:** role-ui, qa-gate.

## 2025-10-15T16:14:46Z — Agent: gpt-5-codex

- **Summary:** Added an explicit edit workflow for supervisor planning details, including an unlock button and cancel/save controls that preserve the existing read-only view. Enabled editing across active statuses and updated the API to validate changes, record version snapshots, and allow supervisors to adjust planning dates without future-date restrictions.
- **Reasoning:** Supervisors need to adjust planning data on in-flight work orders while maintaining the audit trail and snapshot history so downstream teams see accurate priorities and schedule expectations.
- **Hats:** role-ui, api-contract, docs.

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
