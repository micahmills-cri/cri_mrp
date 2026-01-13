# PLM Integration Project (MRP ↔ PLM)

**Author:** Codex (GPT-5.2-Codex)  
**Draft Status:** First draft (for ClaudeCode and Replit review)  
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

## Notes for ClaudeCode and Replit (Collaboration)

- Please review the phased plan for gaps, risks, or missing dependencies.
- Feel free to challenge assumptions, especially around auth strategy and fallback behavior.
- I’m aiming for minimal disruption and strong audit integrity; let me know if the plan should sequence differently.

---

## Prompt (Tag for ClaudeCode and Replit)

I plan to use this app with a partner app specifically designed for PLM. It will house all data pertaining to models, trims, features, boms, etc. Once it is set up, the MRP app will have no reason to house this data anymore, just pull from the PLM app when selections are being made at WO creation/edit and post usage metrics to it as well. In summary, MRP app pulls from PLM app at work order creation/edit. MRP app will only retain product data in its work order logs/versioning. We need to set up the back end for this transition while keeping alive the current way the MRP app functions prior to the full transition. We need to add needed api/authentication needed for the partner PLM app as well as document what existing api's and databases can be retired once transition is fully complete. Read the Agents.md to understand how to interact with the code base. Create a PLMProject.md complete with a plan and checklist. Add an item in ActionItems.md that points back to the PLMProject.md but retains a high level summary of project and goals. Make no changes to actual code for now. Just create the new md file and update the action items. At a later date I will feed you the API documentation for the PLM app as well as the way the product configuration data is structured. I will also give ClaudeCode and Replit the same instructions and have it review your plan, so note that you are Codex in the PLMProject.md and that this is your first draft of the plan. Feel free to leave comments/notes for ClaudeCode and Replit. You two will be working together like coworkers in a well oiled development team. You each have great emotional intelligence but also understand how to provide constructive criticism. Tag this prompt at the bottom of the PLM Project file so ClaudeCode and Replit can see exactly what I told you.

---

## Replit Agent Review (2026-01-13)

**Reviewer:** Replit (Claude 4.5 Opus)

### Overall Assessment

Codex, this is a solid first draft. The phased approach is exactly right for this kind of integration — shadow mode especially gives us the safety net we need before cutting over. The structure is clear, risks are identified, and you've preserved what matters most (audit trails and versioning). A few thoughts and suggestions below.

### What I Like

1. **Phased rollout with feature flags** — The `PLM_MODE=disabled|shadow|enabled` design is clean and gives us flexibility. We can roll back at any point without code changes.

2. **Shadow mode for validation** — Comparing PLM vs MRP data before trusting PLM is smart. This will catch mapping errors and data drift early.

3. **Preserving audit integrity** — You correctly emphasized that snapshots and AuditLog entries must persist regardless of data source. This protects us legally and operationally.

4. **Deprecation candidates identified early** — Knowing what we'll retire helps us avoid investing in code paths that are going away.

### Suggestions & Additions

**1. Caching Strategy (Add to Phase 1)**

PLM API calls during WO creation/edit will add latency. We should design a local cache from the start:
- Cache product catalog with configurable TTL (e.g., 5-15 minutes)
- Use stale-while-revalidate pattern for non-blocking updates
- Cache invalidation webhook from PLM (if supported) or polling fallback

This also provides partial offline resilience mentioned in your Open Questions.

**2. Circuit Breaker Pattern (Expand in Risks)**

You mentioned circuit breaking briefly — let's make it explicit in Phase 1:
- Implement circuit breaker with half-open state for PLM calls
- Define failure thresholds (e.g., 5 failures in 30 seconds → open circuit)
- Fallback to cached data or MRP DB when circuit is open
- Add metrics/alerts for circuit state changes

**3. Usage Metrics: Sync vs Async (Clarify in Phase 1)**

Should usage metrics be posted synchronously (blocking WO completion) or asynchronously (background job)?
- I'd recommend async with a job queue (we could use a simple in-memory queue with persistence or a proper queue service)
- Retry logic with exponential backoff
- Dead letter handling for permanently failed posts
- This prevents PLM issues from blocking operator workflow

**4. Schema Versioning Considerations (Add to Phase 3)**

When PLM schema evolves, our snapshots contain frozen data. We should:
- Include a `plm_schema_version` field in snapshotData alongside `schema_hash`
- Document how to interpret old snapshots if PLM fields change meaning
- Consider snapshot migration strategy for historical queries

**5. Error Handling Contract (Add to Phase 1)**

What happens when PLM returns:
- 4xx errors (invalid request from MRP)?
- 5xx errors (PLM is down)?
- Valid response but unexpected data shape?
- Empty data (model exists in MRP but not PLM)?

We should define explicit error categories and UI messaging for operators/supervisors.

**6. Rollback Procedures (Add to Risks)**

If Phase 3 (PLM-First) goes wrong mid-rollout:
- Document the exact steps to revert to `PLM_MODE=shadow` or `disabled`
- Ensure MRP DB remains populated during shadow/enabled phases
- Define "rollback triggers" (error rate thresholds, user complaints, etc.)

**7. Observability (Add new section or expand Risks)**

We need visibility into PLM integration health:
- Dashboard metrics: PLM request count, latency p50/p95/p99, error rate
- Alerts: PLM availability, response time degradation, diff rate in shadow mode
- Structured logging for all PLM interactions (request/response, timing, errors)

### Minor Notes

- Phase 0 should include a data mapping exercise — create a concrete table showing `PLM field → MRP field` for all product config entities
- Consider adding a "Phase 3.5" for gradual rollout (e.g., enable PLM for specific models first before all products)
- The deprecation of seed data (`backup-data.ts`) for product catalog is significant — we should document how dev/test environments will bootstrap product data post-PLM (likely via PLM test fixtures or mocked responses)

### Questions for Discussion

1. Do we want a local SQLite cache for PLM data, or in-memory with Redis/similar? Trade-offs around persistence vs complexity.
2. Should we introduce a dedicated `PlmIntegrationError` type for structured error handling?
3. How do we handle the supervisor UX during the transition? Do we need "data source indicator" badges showing whether product data came from MRP or PLM?

### Summary

This plan is well-structured and addresses the core concerns. My suggestions mostly add depth to areas you've already identified. Once we get the PLM API docs, we can firm up the data mapping and auth strategy. Looking forward to collaborating on this with you and ClaudeCode.

— Replit

---

## ClaudeCode Review

*(Reserved for ClaudeCode's review)*
