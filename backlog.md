# Backlog

## P0 — Critical
- [x] [S] Stuck syncs: "Think & Grow Rich" GHL + "Paradyme" HubSpot stuck in "syncing" forever — added dead-letter cleanup (#cycle-1)
- [ ] [M] All GHL syncs stale 6-8 days — only Kroh Exploration synced since March 13. Investigate why sync-ghl-all-clients is failing silently for other clients
- [ ] [S] Future-dated daily_metrics rows (date=2026-12-31) — investigate and clean up corrupt data
- [ ] [M] `recalculate-daily-metrics` only recalculates yesterday+today — backdated data never corrected (expand to 7-day lookback)
- [ ] [M] `daily-accuracy-check` counts non-spam+null-spam as "expected leads" — should be total leads
- [ ] [S] `aggregateMetrics` pipelineValue uses `Math.min` instead of SUM
- [ ] [M] Timezone mismatch: frontend local time vs backend UTC — leads on wrong day

## P1 — High
- [ ] [M] Create `sync_runs` table to track every sync execution (Known Issue #6)
- [ ] [S] `useSyncHealth` checks `ghl_synced_at` for HubSpot clients (wrong field)
- [ ] [M] Meta API token expiry is silent — add explicit 401 detection
- [ ] [S] Pipeline sync may not paginate past 100 opportunities
- [ ] [S] No retry logic in `sync-ghl-all-clients` when individual client fails
- [ ] [S] Calendar status mapping silently drops unmapped GHL statuses
- [ ] [M] Cache invalidation scattered across 5+ hooks — centralize
- [ ] [M] `useMasterSync` polls every 5s with 10-min timeout hack — replace with Realtime
- [ ] [S] `useLeads` auto-refetches every 30s — unnecessary DB load
- [ ] [M] No Error Boundaries on any page route
- [ ] [S] Lazy-load retry only 1 attempt

## P1 — Security
- [ ] [L] No RLS policies — anon key can read/write all 71 tables
- [ ] [S] No input validation on edge function parameters

## P2 — Medium
- [ ] [M] Task recurrence doesn't auto-create next instance
- [ ] [M] Brief→script pipeline no error recovery
- [ ] [S] Creative status lifecycle not enforced at DB level
- [ ] [S] Live ads scraping not automated
- [ ] [S] CPA trigger threshold not configurable per client
- [ ] [S] No webhook replay capability
- [ ] [M] CSV imports don't validate before processing
- [ ] [M] No System Health dashboard

## P3 — Low
- [ ] [L] `sync-ghl-contacts` is 3,882 lines — decompose
- [ ] [M] Source-filtered metrics disconnected from daily_metrics
- [ ] [M] Reconciliation doesn't cover Meta Ads data
- [ ] [S] Attribution model not documented
- [ ] [M] `fetchAllRows` sequential pagination slow for 50K+ rows
- [ ] [S] Hardcoded agency client ID in DatabaseView
- [ ] [S] Hardcoded Loom IDs and quiz templates in React

Legend: [S] = small (< 1 hour), [M] = medium (1-3 hours), [L] = large (3+ hours)
