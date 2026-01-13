# PLM Integration Project (MRP ↔ PLM)

**Author:** Codex (GPT-5.2-Codex)  
**Draft Status:** First draft (for ClaudeCode review)  
**Last Updated:** 2026-01-13  

## Context

We are preparing the MRP app to integrate with a partner PLM system that will become the source of truth for product configuration data (models, trims, features, BOMs, etc.). The MRP app must **continue to function with its current local product data** while we build the integration. Once the PLM system is fully live, MRP will **pull selection data** from PLM during work order creation/edit and **post usage metrics** back to PLM. MRP will retain only **work order snapshots/logs** for historical integrity.

## Goals

1. Add an integration layer that can **switch between local product data** and **PLM data** (feature-flag or env-driven).
2. Add **API authentication** and access patterns to allow the PLM app to request/receive the required data.
3. Define which **MRP APIs and database tables** can be retired once the PLM integration is complete.
4. Preserve Work Order invariants: every mutation still records a WorkOrderVersion snapshot and AuditLog entry.
5. Provide a roadmap that minimizes downtime and avoids data loss.

## Non-Goals (for now)

- No schema or code changes in this draft.
- No data migrations yet.
- No UI changes until the PLM API contract is known.

## Assumptions / Inputs Needed

- PLM API documentation (endpoints, auth, rate limits, SLAs)
- Product data model (models, trims, features, BOM structure)
- Preferred auth mechanism (e.g., JWT, OAuth2 client credentials, mTLS)
- Eventing expectations for usage metrics (pull vs push, cadence, retries)

## Proposed Architecture (High-Level)

1. **Integration boundary**  
   Create a server-only integration layer (e.g., `src/server/plm/`) responsible for:
   - Fetching product configuration data from PLM.
   - Posting usage metrics to PLM.
   - Translating between PLM payloads and internal Work Order DTOs.

2. **Source-of-truth toggle**  
   Add a feature flag / env switch to determine if the product data for WO creation/edit:
   - Comes from MRP database (legacy mode).
   - Comes from PLM APIs (integration mode).

3. **Audit & versioning preservation**  
   Even with PLM data, the MRP app must persist **snapshotData** (including `schema_hash` and `versionNumber`) and `AuditLog` entries on each WO mutation.

4. **Deprecation plan**  
   Identify product-related tables and APIs that can be deprecated when PLM becomes authoritative. Keep read-only access until migration is complete.

## Phased Plan

### Phase 0 — Discovery & Contract Alignment

- Gather PLM API docs and data model.
- Document mapping between PLM objects and MRP product data shape.
- Define auth strategy and token lifecycle.
- Identify required usage metrics and expected payload format.

### Phase 1 — Integration Skeleton (No behavior change)

- Add server-only integration service with:
  - `getProductCatalog()` (models/trims/features)
  - `getProductConfig(modelId, trimId, featureIds)`
  - `postUsageMetrics(payload)`
- Add env flag (e.g., `PLM_MODE=disabled|shadow|enabled`) and config validation.
- Add stubbed contract tests (mocked PLM responses).

### Phase 2 — Dual-Read / Shadow Mode

- When `PLM_MODE=shadow`, read from both MRP DB and PLM.
- Compare payloads and log diffs (no user-facing changes).
- Establish parity thresholds and gap remediation.

### Phase 3 — PLM-First Read Path

- When `PLM_MODE=enabled`, use PLM for WO create/edit selection data.
- Continue to record snapshots in MRP for historical traceability.
- Implement fallback to MRP DB if PLM is unavailable (configurable).

### Phase 4 — Deprecation & Cleanup

- Mark legacy product data APIs as deprecated (document + warn).
- Archive or remove product tables once data is fully PLM-managed.
- Update docs and runbooks to describe new flow.

## Candidate API/Auth Needs (MRP ↔ PLM)

> To be refined once PLM docs are provided.

- **Outbound (MRP → PLM)**:
  - `POST /plm/usage-metrics` (usage payload from WO events)
- **Inbound (MRP ← PLM)**:
  - `GET /plm/models`
  - `GET /plm/models/{id}/trims`
  - `GET /plm/config?modelId=&trimId=&featureIds=`
- **Auth**:
  - Likely client credentials or signed JWTs
  - Store secrets in `src/lib/env.ts` and `.env.example`
  - Add request signing / token refresh logic

## Deprecation Candidates (Initial List)

> To confirm once we map current tables and APIs.

- Product configuration tables (models, trims, features, BOMs)
- APIs used exclusively to populate model/trim selectors
- Seeding logic tied to product catalog data (`backup-data.ts`, `src/db/seed.ts`)

## Risks & Mitigations

- **Data drift between PLM and MRP** → use shadow mode + diff logs.
- **PLM outage** → fallback strategy + cached reads.
- **Auth complexity** → add dedicated PLM auth module with retries and circuit breaking.
- **Timeline pressure** → phase rollout with feature flags.

## Open Questions

1. Which PLM auth scheme is preferred?
2. What are the rate limits and caching rules?
3. Are usage metrics posted in real time or batched?
4. Should PLM data be cached locally for offline mode?
5. What are the SLAs and retry/backoff expectations?

## Checklist (Draft)

- [ ] Ingest PLM API docs and data model
- [ ] Define mapping between PLM catalog and MRP schema
- [ ] Draft API auth strategy and token lifecycle
- [ ] Create integration interface in `src/server/plm/`
- [ ] Implement feature flag for PLM mode
- [ ] Add contract tests with mocked PLM responses
- [ ] Add shadow mode diff logging
- [ ] Implement usage metrics payload format
- [ ] Identify deprecated MRP APIs/tables
- [ ] Update ONBOARDING/CHANGELOG/ActionItems with PLM migration guidance

## Notes for ClaudeCode (Collaboration)

- Please review the phased plan for gaps, risks, or missing dependencies.
- Feel free to challenge assumptions, especially around auth strategy and fallback behavior.
- I’m aiming for minimal disruption and strong audit integrity; let me know if the plan should sequence differently.

---

## Prompt (Tag for ClaudeCode)

I plan to use this app with a partner app specifically designed for PLM. It will house all data pertaining to models, trims, features, boms, etc. Once it is set up, the MRP app will have no reason to house this data anymore, just pull from the PLM app when selections are being made at WO creation/edit and post usage metrics to it as well. In summary, MRP app pulls from PLM app at work order creation/edit. MRP app will only retain product data in its work order logs/versioning. We need to set up the back end for this transition while keeping alive the current way the MRP app functions prior to the full transition. We need to add needed api/authentication needed for the partner PLM app as well as document what existing api's and databases can be retired once transition is fully complete. Read the Agents.md to understand how to interact with the code base. Create a PLMProject.md complete with a plan and checklist. Add an item in ActionItems.md that points back to the PLMProject.md but retains a high level summary of project and goals. Make no changes to actual code for now. Just create the new md file and update the action items. At a later date I will feed you the API documentation for the PLM app as well as the way the product configuration data is structured. I will also give Claude the same instructions and have it review your plan, so note that you are Codex in the PLMProject.md and that this is your first draft of the plan. Feel free to leave comments/notes for ClaudeCode. You two will be working together like coworkers in a well oiled development team. You each have great emotional intelligence but also understand how to provide constructive criticism. Tag this prompt at the bottom of the PLM Project file so ClaudeCode can see exactly what I told you.
