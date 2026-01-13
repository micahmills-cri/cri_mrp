# PLM Integration Project (MRP ↔ PLM)

**Status:** Planning Draft
**Last Updated:** 2026-01-13
**Next Review:** After PLM API documentation received

## Executive Summary

The MRP app will integrate with a partner PLM system that will become the source of truth for product configuration data (models, trims, features, BOMs). MRP will continue functioning with local data during the transition, then pull product data from PLM during work order creation/edit and post usage metrics back. MRP will retain only work order snapshots and logs for historical integrity.

## Goals

1. Build an integration layer that switches between local product data and PLM data (feature-flag driven)
2. Implement API authentication and resilient access patterns (caching, circuit breakers, fallbacks)
3. Post usage metrics asynchronously to avoid blocking operator workflows
4. Preserve work order audit integrity (snapshots include PLM correlation metadata)
5. Define deprecation path for MRP product tables and APIs once PLM is live
6. Provide zero-downtime migration with clear rollback procedures

## Non-Goals

- Schema migrations (Phase 0 planning only)
- UI changes until PLM API contract is known
- Real-time sync between systems (snapshots freeze data at WO creation)

## Key Architectural Decisions

### 1. Feature Flag Strategy

```typescript
PLM_CONFIG = {
  mode: 'disabled' | 'shadow' | 'enabled',
  fallbackEnabled: boolean,           // Use MRP DB if PLM unavailable
  cacheEnabled: boolean,
  cacheTTL: number,                   // seconds
  circuitBreakerThreshold: number,    // failures before opening
  enabledForModels: string[]          // empty = all models
}
```

- **disabled**: MRP operates as today (no PLM calls)
- **shadow**: Dual-read from both sources, log diffs, no user impact
- **enabled**: PLM is primary source, MRP DB is fallback

### 2. Integration Layer (`src/server/plm/`)

**Core responsibilities:**
- Fetch product catalog from PLM (models/trims/features/BOMs)
- Post usage metrics asynchronously via job queue
- Translate PLM payloads ↔ MRP DTOs
- Handle auth token lifecycle (refresh, expiry, retries)
- Cache responses with stale-while-revalidate pattern
- Circuit breaker with half-open state recovery

**Key modules:**
- `client.ts` — HTTP client with auth, retries, circuit breaker
- `cache.ts` — In-memory cache with TTL and invalidation hooks
- `adapter.ts` — Transform PLM schema → MRP DTOs
- `metrics.ts` — Async job queue for usage metric posts
- `__mocks__/` — Deterministic fixtures for local dev and tests

### 3. Work Order Snapshot Enrichment

Every WO mutation writes a `WorkOrderVersion` snapshot that now includes:
- `dataSource: 'mrp' | 'plm'` — Immutable at creation
- `plmCorrelationId` — PLM request ID for cross-system tracing
- `plmSchemaVersion` — PLM API version at snapshot time
- Complete PLM response payload (for forensic debugging)

Snapshots freeze product configuration; in-flight WOs are never migrated.

### 4. Performance & Resilience

- **Target latency**: < 800ms for WO detail APIs (includes PLM overhead)
- **Cache-first**: Product catalog cached with 5-15 min TTL
- **Circuit breaker**: 5 failures in 30s → open circuit → fallback to cache/MRP
- **Async metrics**: Usage posts happen in background job queue with retries
- **Rate limiting**: Throttle concurrent PLM requests to prevent thundering herd

## Phased Implementation

### Phase 0 — Discovery & Contract Definition

**Deliverables:**
- [ ] PLM API documentation ingested and reviewed
- [ ] Data mapping table: `PLM field → MRP field` for all product entities
- [ ] Auth strategy defined (JWT, OAuth2, mTLS, etc.)
- [ ] Usage metrics payload format and cadence agreed
- [ ] Routing validation contract clarified (does PLM define routings?)
- [ ] Error response catalog and user-facing message mappings
- [ ] SLA requirements documented (uptime, latency, rate limits)

**Open questions to resolve:**
- Does PLM define routings, or just product config?
- Are model/trim/feature IDs consistent with current MRP, or do we need translation?
- How does PLM represent conditional feature availability?
- What are PLM's scheduled maintenance windows?
- Is there a webhook for cache invalidation, or only polling?

### Phase 1 — Integration Skeleton (No Behavior Change)

**Deliverables:**
- [ ] `src/server/plm/` module with stubbed methods
- [ ] `PLM_CONFIG` env parsing in `src/lib/env.ts`
- [ ] Auth client with token refresh logic
- [ ] HTTP client with retries and circuit breaker
- [ ] In-memory cache with configurable TTL
- [ ] Async job queue for usage metrics (in-memory to start)
- [ ] Mocked PLM responses in `__mocks__/` mirroring `backup-data.ts`
- [ ] Contract tests with mocked PLM API

**Validation:**
- Tests pass with `PLM_MODE=disabled` (no regressions)
- Mock PLM server can be started for local dev
- Circuit breaker state transitions correctly under simulated failures

### Phase 2 — Shadow Mode (Validation & Tuning)

**Deliverables:**
- [ ] Dual-read logic: fetch from both MRP DB and PLM
- [ ] Diff detection and structured logging (sample rate configurable)
- [ ] Metrics dashboard showing PLM vs MRP parity (diffs, latency, errors)
- [ ] Performance regression tests (ensure < 800ms target still met)
- [ ] Alerting for high diff rates, PLM latency spikes, auth failures

**Validation:**
- Shadow mode runs in production with zero user impact
- Diff logs analyzed; remediation plan for any schema mismatches
- PLM latency P95 measured; cache strategy adjusted if needed
- Circuit breaker tested with simulated PLM outages

### Phase 3 — PLM-First Mode (Gradual Rollout)

**Deliverables:**
- [ ] `PLM_MODE=enabled` uses PLM as primary data source
- [ ] Fallback to MRP DB or cached data when PLM unavailable
- [ ] Snapshots include `dataSource`, `plmCorrelationId`, `plmSchemaVersion`
- [ ] Audit logs enriched with PLM request metadata and fallback events
- [ ] Error messages mapped to user-friendly text (timeout, auth failure, etc.)
- [ ] Gradual rollout: enable for specific models first, then all
- [ ] Monitoring dashboard: `/admin/plm-health` page for real-time status

**Validation:**
- E2E tests for WO creation with PLM-sourced data
- Fallback scenarios tested (PLM down, slow response, malformed data)
- Operators/supervisors see clear error messages, not raw API errors
- Rollback procedure documented and rehearsed (flip to `shadow` or `disabled`)

### Phase 4 — Deprecation & Cleanup

**Deliverables:**
- [ ] Legacy product APIs marked deprecated (return warnings in responses)
- [ ] Product tables archived (kept read-only for historical WO queries)
- [ ] Seed scripts updated to use PLM mocks instead of `backup-data.ts` product fixtures
- [ ] Documentation updated: ONBOARDING.md, CHANGELOG.md, ADR for PLM integration
- [ ] Monitoring confirms zero reads from deprecated product tables
- [ ] Final deprecation: remove product tables and APIs after retention period

**Validation:**
- Dev/test environments bootstrap correctly with PLM mocks
- Historical WO snapshots remain queryable (no data loss)
- Performance and audit integrity maintained post-cleanup

## Testing Strategy

### Phase 1
- Contract tests with mocked PLM responses
- Unit tests for PLM ↔ MRP adapter transformations
- Auth token lifecycle tests (refresh, expiry, revocation)
- Circuit breaker state machine tests

### Phase 2
- Shadow mode diff detection with thresholds
- Performance regression tests (< 800ms target)
- Alert validation for anomalies

### Phase 3
- E2E WO creation flow with PLM data
- Fallback scenario tests (PLM unavailable)
- RBAC validation with PLM-sourced data
- Department-scoped data access tests
- Error message display validation

### Phase 4
- Deprecated API response tests (410 Gone)
- Seed/restore tests without product tables
- Historical snapshot query validation

## API Design (Draft)

### MRP → PLM (Outbound)
- `POST /plm/usage-metrics` — Async batch post of WO event metrics

### MRP ← PLM (Inbound)
- `GET /plm/catalog` — Full product catalog with caching
- `GET /plm/models/:id/config` — Specific model configuration
- `GET /plm/trims/:id` — Trim details
- `GET /plm/features?modelId=&trimId=` — Available features for context

### Authentication
- Store credentials in `src/lib/env.ts` (e.g., `PLM_CLIENT_ID`, `PLM_CLIENT_SECRET`)
- Token refresh handled transparently by client
- Add request signing if required by PLM contract

## Deprecation Roadmap

### Immediate (Phase 1)
- None (shadow mode preserves all current functionality)

### After Shadow Mode (Phase 2)
- Mark product catalog APIs as `@deprecated` in code comments
- Add warning headers to deprecated API responses

### After PLM Cutover (Phase 3)
- Product configuration tables become read-only
- New product data only enters via PLM integration

### Long-term (Phase 4)
- Archive product tables after retention period (e.g., 12 months)
- Remove deprecated APIs
- Update seed scripts to use PLM mocks exclusively

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Data drift between PLM and MRP | Shadow mode with diff logging and alerts |
| PLM outage impacts WO creation | Circuit breaker + fallback to MRP DB/cache |
| PLM latency violates performance budget | Aggressive caching + async pre-fetch patterns |
| Auth complexity delays launch | Dedicated auth module with retries and clear error paths |
| Schema evolution breaks snapshots | Version all PLM responses in snapshots |
| Gradual rollout causes user confusion | Clear UI indicators showing data source if needed |
| Rollback complexity | Feature flag toggle + documented revert procedures |

## Observability & Monitoring

**Metrics to track:**
- PLM request count, latency (P50/P95/P99), error rate
- Cache hit ratio, staleness duration
- Circuit breaker state transitions
- Shadow mode diff rate and severity
- Usage metric post success/failure rate

**Dashboards:**
- `/admin/plm-health` — Real-time integration status for admins
- Shadow mode diff viewer (during Phase 2)
- Performance regression tracker

**Alerts:**
- PLM availability < 99% (configurable threshold)
- PLM P95 latency > 500ms
- Shadow mode diff rate > 5%
- Circuit breaker open for > 5 minutes
- Usage metric backlog growing

## Rollback Procedures

### From Phase 3 (PLM-First) → Phase 2 (Shadow)
1. Set `PLM_CONFIG.mode = 'shadow'` in environment
2. Deploy config change (no code changes required)
3. Monitor logs to confirm dual-read behavior
4. Investigate root cause of rollback need

### From Phase 2 (Shadow) → Phase 1 (Disabled)
1. Set `PLM_CONFIG.mode = 'disabled'`
2. Deploy config change
3. Confirm MRP operates as before PLM work began

### Rollback triggers
- PLM error rate > 10% sustained for 15 minutes
- PLM latency P95 > 2 seconds
- Data integrity issues (diffs show critical mismatches)
- User-reported errors clustered around WO creation

## Open Questions for PLM Team

1. What is the preferred auth mechanism? (OAuth2 client credentials, JWT, mTLS)
2. What are the rate limits per endpoint? (requests/min)
3. Is there a webhook for cache invalidation when product data changes?
4. What are the SLA guarantees? (uptime, latency, support response time)
5. How are usage metrics expected? (per-event, batched, real-time, daily digest)
6. Does PLM define routing sequences, or only product configurations?
7. What happens if a model exists in MRP but not PLM during transition?
8. Are there scheduled maintenance windows we should cache aggressively before?

## Success Criteria

**Phase 0:** PLM contract and data mapping documented, all open questions answered
**Phase 1:** Integration skeleton merged, tests green, mocks support local dev
**Phase 2:** Shadow mode runs in production with < 1% diff rate for 2 weeks
**Phase 3:** PLM-first mode enabled for all models, < 0.1% fallback rate, zero user complaints
**Phase 4:** Product tables archived, deprecated APIs removed, documentation updated

## Notes for Implementation

- **Keep it simple:** Start with in-memory cache and job queue; graduate to Redis/proper queue only if needed
- **Fail gracefully:** Every PLM failure path should have a clear user message and fallback behavior
- **Audit everything:** Log PLM interactions, cache hits/misses, fallback activations
- **Test edge cases:** Empty catalog, partial responses, slow responses, auth token expiry mid-request
- **Document as you go:** Update ONBOARDING.md with PLM setup steps when contract is known

---

## Related Documents

- `AGENTS.md` — Agent collaboration playbook and domain rules
- `docs/ActionItems.md` — Implementation checklist (to be created from this plan)
- `docs/CHANGELOG.md` — Track all changes during PLM integration work
- `docs/ONBOARDING.md` — Update with PLM setup once contract finalized

## Revision History

- **2026-01-13 (ClaudeCode):** Revised plan synthesizing feedback from Codex, Replit, and ClaudeCode reviews. Focused on brevity, actionable phases, and clear success criteria. Removed excessive detail while preserving critical architectural decisions.
- **2026-01-13 (Replit):** Added caching strategy, circuit breaker pattern, async metrics, observability, rollback procedures
- **2026-01-13 (ClaudeCode):** Added testing strategy, work order lifecycle impacts, snapshot enrichment, RBAC concerns, local dev strategy
- **2026-01-13 (Codex):** Initial draft with phased plan and deprecation roadmap
