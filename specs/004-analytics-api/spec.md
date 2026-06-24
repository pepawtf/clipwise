# Feature Specification: Analytics API

**Feature Branch**: `004-analytics-api`

**Created**: 2026-05-20

**Status**: Draft

**Input**: User description: "Expose TikTok per-post and account-level metrics through Clipwise's API, backed by TikTok's official `video.list` Display API and `user.info.stats` endpoint, with per-post results matched to Clipwise's internal `post_jobs` for attribution; no third-party scrapers; saves count permanently unavailable (TikTok does not expose it)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — API consumer fetches per-post metrics for a connected account (Priority: P1)

An external service (dadsapp) needs to refresh analytics for one of its connected TikTok accounts over a date window. It calls Clipwise's analytics endpoint and receives a paginated list of posts, each carrying views, likes, comments, shares, computed engagement rate, and references back to the Clipwise `post_jobs.id` that originated the post.

**Why this priority**: Dadsapp's `analytics_service.refresh_analytics()` exists today and depends on Publer's `/post_insights`. This endpoint is the half of the swap that can ship today (the `video.list` scope is already approved) and is required for dadsapp to drop Publer entirely.

**Independent Test**: With at least one connected TikTok account that has published posts in the last 30 days, GET `/v1/analytics/:account_id/posts?from=YYYY-MM-DD&to=YYYY-MM-DD`. Confirm the response contains posts with non-zero view counts and matches what TikTok's own analytics UI shows for the same account over the same window.

**Acceptance Scenarios**:

1. **Given** a valid API key, an `account_id` belonging to its tenant, and `from`/`to` query parameters, **When** the consumer GETs `/v1/analytics/:account_id/posts`, **Then** the system returns a paginated response shaped as `{posts: [...], cursor, has_more}` where each post carries `id, tiktok_video_id, tiktok_share_url, title, video_description, create_time, analytics: {reach, likes, comments, shares, saves, engagement_rate}`.
2. **Given** the date window contains posts, **When** the system fetches from TikTok's `video.list` paginated with cursor, **Then** it stops paginating as soon as `create_time` of a returned video is older than `from`, even if `has_more` is true on TikTok's side.
3. **Given** a post in the response was originally published through Clipwise, **When** the system constructs the response item, **Then** the `id` field is set to the matching `post_jobs.id` (matched on `tiktok_video_id`).
4. **Given** a post in the response was NOT published through Clipwise (e.g., posted directly from the TikTok app), **When** the system constructs the response item, **Then** the `id` field is set to `null` and `video_description` is populated so the consumer can fall back to caption matching.
5. **Given** the `saves` field, **When** any post is returned, **Then** `analytics.saves.value` is always `0`; the response includes a top-level `notes: { saves_unavailable: true }` field documenting this once.

---

### User Story 2 — Engagement rate is computed consistently (Priority: P1)

Engagement rate is computed server-side from `(likes + comments + shares) / views` because TikTok's Display API does not expose engagement rate directly and does not expose saves.

**Why this priority**: Dadsapp's `_extract_metrics()` currently consumes `analytics.engagement_rate.value` from Publer. To keep its parser unchanged, Clipwise must return engagement_rate in the same nested shape with the same percent-formatted value Publer uses.

**Independent Test**: Pick a post with known view/like/comment/share counts. Verify the response's `engagement_rate.value` equals `(likes + comments + shares) / views * 100`, rounded to one decimal.

**Acceptance Scenarios**:

1. **Given** a post with `views = 12450, likes = 890, comments = 23, shares = 12`, **When** the system computes engagement_rate, **Then** the response returns `engagement_rate.value = 7.4` (expressed as a percentage, one decimal).
2. **Given** a post with `views = 0`, **When** the system computes engagement_rate, **Then** the response returns `engagement_rate.value = 0` and does not divide by zero.
3. **Given** a post is freshly published and metrics are still propagating on TikTok's side, **When** the system fetches it, **Then** missing counts default to `0` (not `null`) so downstream parsers do not crash.

---

### User Story 3 — Account-level growth dashboard data (Priority: P2)

A consumer or the Clipwise UI fetches account-level stats over time (followers, total likes, video count) and computes day-over-day deltas to surface "your account grew by X% this week."

**Why this priority**: Publer surfaces account growth as a first-class feature; Clipwise needs parity for solo creators and for dadsapp's account-level reporting. Uses the already-approved `user.info.stats` scope.

**Independent Test**: Trigger a manual snapshot for a connected account. Wait 24 hours, trigger another. GET `/v1/analytics/:account_id/stats?from=&to=` and confirm two daily snapshots are returned with computed deltas.

**Acceptance Scenarios**:

1. **Given** a connected account, **When** the daily stats snapshot worker runs, **Then** it calls TikTok's `/user/info/?fields=stats` and persists a row in `account_stat_snapshots` with `{tenant_id, tiktok_account_id, follower_count, following_count, likes_count, video_count, snapshot_date}`.
2. **Given** at least two snapshots exist in the date window, **When** the consumer GETs `/v1/analytics/:account_id/stats?from=&to=`, **Then** the system returns the snapshot series plus pre-computed deltas (follower_delta, likes_delta) versus the prior snapshot.
3. **Given** an account has been connected for less than one day, **When** the consumer requests stats, **Then** the response contains exactly the one bootstrap snapshot and a top-level `notes: { insufficient_history: true }` field.

---

### User Story 4 — Per-post matching back to Clipwise jobs (Priority: P1)

Each post returned from TikTok must be matched back to the `post_jobs` row that originated it, so dadsapp's existing carousel/topic-performance feedback loop continues to work without behavioral change.

**Why this priority**: Dadsapp's `_extract_metrics` -> `PostMetrics` upsert pipeline keys on the originating Publer job ID. The Clipwise replacement must provide the equivalent: a Clipwise `post_jobs.id` exposed as the response item's `id` whenever a match exists.

**Independent Test**: Publish a post through Clipwise (spec 003), wait until `post_jobs.tiktok_video_id` is filled by the status poller. Call the analytics endpoint over the right date window. Confirm the post appears with `id = the post_jobs.id`.

**Acceptance Scenarios**:

1. **Given** a `post_jobs` row with `tiktok_video_id` set, **When** the analytics endpoint receives a TikTok video result with the same `video_id`, **Then** it joins on `tiktok_video_id` and exposes `id = post_jobs.id` in the response.
2. **Given** a TikTok video result with no matching `post_jobs.tiktok_video_id`, **When** the analytics endpoint constructs the response, **Then** it returns the item with `id = null` and includes a `tiktok_video_id` field so the consumer can apply its own fallback matching (e.g., caption similarity).
3. **Given** a `post_jobs` row exists but `tiktok_video_id` is still null (status poller has not yet captured it), **When** the analytics endpoint runs, **Then** the post may appear with `id = null` until the poll catches up; this is a known eventual-consistency window.

---

### Edge Cases

- TikTok's `video.list` returns photo carousels alongside videos (confirmed prerequisite). If it does not, dadsapp's whole metrics pipeline goes dark; spec 003's QA gate must verify this before this spec is implemented.
- The connected account has been re-authorized with reduced scopes (e.g., the user removed `video.list` consent) — every analytics call returns 403 with a clear `account_requires_reconnect` directive.
- TikTok's API returns a video the consumer no longer wants to see (e.g., the user deleted the post on TikTok directly) — the system surfaces it as long as `video.list` returns it; deletions on TikTok cause it to drop out of subsequent fetches naturally.
- A post was published more than 1 year ago — TikTok's `video.list` has a cursor-defined retention window; beyond it, the post simply does not appear. The system does not synthesize history.
- Two consumers poll analytics for the same account within seconds — the system serves both from a short-lived (e.g., 60-second) per-account cache to avoid burning TikTok rate limits.
- A response window contains 500+ posts — pagination is required; the system caps `limit` at 100 and forces clients to page.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expose `GET /v1/analytics/:account_id/posts?from=&to=&cursor=&limit=` that returns paginated per-post analytics for the named TikTok account.
- **FR-002**: System MUST expose `GET /v1/analytics/:account_id/stats?from=&to=` that returns daily account-level snapshots with computed deltas.
- **FR-003**: System MUST source per-post data from TikTok's official `video.list` Display API endpoint and account stats from TikTok's `/user/info/?fields=stats` endpoint. No third-party scrapers, no unofficial APIs, no headless-browser data collection are permitted.
- **FR-004**: System MUST stop paginating TikTok results once a returned video's `create_time` is older than the `from` parameter.
- **FR-005**: System MUST return per-post fields shaped as `{ id, tiktok_video_id, tiktok_share_url, title, video_description, create_time, analytics: { reach: {value}, likes: {value}, comments: {value}, shares: {value}, saves: {value: 0}, engagement_rate: {value} } }`. The nested `{value}` shape matches Publer's so dadsapp's `_extract_metrics()` works unchanged.
- **FR-006**: System MUST always return `analytics.saves.value = 0` because TikTok's API does not expose save count. The top-level response MUST include `notes: { saves_unavailable: true }`.
- **FR-007**: System MUST compute `engagement_rate.value` server-side as `(likes + comments + shares) / views * 100`, rounded to one decimal. When `views == 0`, the result MUST be `0`, never NaN or null.
- **FR-008**: System MUST match each TikTok video to a Clipwise `post_jobs` row on `tiktok_video_id`. When matched, the response's `id` field is set to `post_jobs.id`. When not matched, `id` is `null`.
- **FR-009**: System MUST persist daily account-level snapshots in `account_stat_snapshots` with at minimum `{tenant_id, tiktok_account_id, follower_count, following_count, likes_count, video_count, snapshot_date}`. The snapshot worker runs once per day per connected account.
- **FR-010**: System MUST cache TikTok responses per `(account_id, from, to, cursor)` for at least 60 seconds to avoid burning TikTok rate limits when two consumers fetch the same window simultaneously.
- **FR-011**: System MUST cap `limit` at 100 per response page; values higher are silently clamped.
- **FR-012**: System MUST authorize every analytics request against the requesting API key's tenant; `account_id` belonging to another tenant returns 404.
- **FR-013**: System MUST respond with 403 `account_requires_reconnect` when the connected account is flagged `requires_reconnect` (per spec 002) and not call TikTok.
- **FR-014**: System MUST log every TikTok analytics API call (endpoint, account, latency, status) for observability; raw video metadata MUST NOT be logged.
- **FR-015**: System MUST surface TikTok's HTTP status and error code on failure (e.g., 429 from TikTok → 503 with `Retry-After` and a `tiktok_error_code` field).
- **FR-016**: System MUST gracefully degrade: if `video.list` is temporarily unavailable, the endpoint may return cached data with an `is_stale: true` flag and a `cached_at` timestamp rather than failing.
- **FR-017**: System MUST NOT make analytics enrichment calls to any non-TikTok-official source (no Apify, no scraping libraries, no Display-Card data harvesting).

### Key Entities

- **PostMetrics** (cache layer): Optional persisted cache of recent per-post analytics fetched from TikTok. Carries tenant FK, account FK, `tiktok_video_id`, optional `post_jobs.id` link, all metric fields, `fetched_at`. Refreshed on each fetch within the 60-second window or persisted longer if desired for historical charting.
- **AccountStatSnapshot**: A daily snapshot of account-level stats. Carries tenant FK, account FK, follower_count, following_count, likes_count, video_count, snapshot_date. Unique on `(account_id, snapshot_date)`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A 30-day per-post analytics fetch for a typical account (≤ 100 posts in window) returns in under 3 seconds at p95.
- **SC-002**: Per-post matching: at least 95% of posts originally published through Clipwise (with `tiktok_video_id` filled) are returned with `id = post_jobs.id`. The other 5% are eventual-consistency lag (status poller hasn't filled the ID yet).
- **SC-003**: Zero third-party-scraping dependencies in the dependency tree of this endpoint, verified by an automated lockfile audit.
- **SC-004**: TikTok rate limit budget is respected: per-account fetch frequency is throttled such that no account is queried more than once per minute across all consumers.
- **SC-005**: Engagement rate values returned by this endpoint match Publer's values within ±0.1 percentage points for the same source data, validated against a sample of historical posts during the dadsapp swap.
- **SC-006**: Dadsapp's `_extract_metrics()` function (per session reference) runs against this endpoint's response with no code changes and produces correct `PostMetrics` rows.
- **SC-007**: Account-level snapshot worker successfully captures at least 99% of enabled accounts per day.

## Assumptions

- The TikTok `video.list` scope is approved on the Clipwise app (confirmed during session). The `user.info.stats` scope is approved.
- TikTok's `video.list` endpoint returns photo carousel posts alongside video posts; this is a hard prerequisite. If it does not, this spec is invalidated and the analytics replacement path needs to be redesigned. Verifying this is a Phase 0 task in spec 003's QA gate.
- The `saves` count is permanently unavailable from TikTok's official APIs to third-party developers. The product accepts this permanent gap; no third-party enrichment is pursued (decision recorded during session research).
- The 60-second response cache is sufficient to absorb burst polling by dadsapp's worker without hitting TikTok rate limits. Tighter caching can be added later if needed.
- Account-level snapshots are captured once per day; sub-daily granularity is out of scope for v1.
- Historical metrics older than TikTok's `video.list` retention window are not synthesized or backfilled; the consumer's own database is the historical record.
- Dadsapp's caption-fallback matching (`analytics_service.py:219-238`) continues to run on the dadsapp side using `video_description` returned in the response, when `id` is null.
- The analytics endpoint shape intentionally mirrors Publer's nested `{value}` shape to minimize the dadsapp diff; this design debt is accepted for the migration, with freedom to deprecate the shape later once dadsapp's parser is updated.
