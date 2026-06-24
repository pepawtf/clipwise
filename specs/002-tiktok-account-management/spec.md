# Feature Specification: TikTok Account Management

**Feature Branch**: `002-tiktok-account-management`

**Created**: 2026-05-20

**Status**: Draft

**Input**: User description: "Persist TikTok account connections per tenant so that one tenant can manage multiple TikTok accounts, tokens are stored encrypted and auto-refreshed, and disconnecting an account cleanly removes all associated state."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Tenant owner connects their first TikTok account (Priority: P1)

A tenant owner clicks "Connect TikTok," completes the OAuth consent flow, and lands back in Clipwise with the account visible in their dashboard. The encrypted tokens are persisted against the tenant and the account is immediately usable for publishing (subject to scope availability per spec 003).

**Why this priority**: Without persisted TikTok accounts, every other capability in Clipwise (publishing, analytics) is a one-off ephemeral session. This is the linchpin spec.

**Independent Test**: Connect one TikTok account in a fresh tenant. Verify the account row appears, the access token can be decrypted, and a probe call to TikTok `/user/info/` succeeds using the stored token.

**Acceptance Scenarios**:

1. **Given** a signed-in tenant owner with no connected TikTok accounts, **When** they initiate OAuth and authorize Clipwise, **Then** the system creates a `tiktok_accounts` row with the encrypted access/refresh tokens, expiry timestamp, TikTok open_id, display name, and avatar URL.
2. **Given** an OAuth callback returns successfully, **When** the user is redirected back to Clipwise, **Then** they see the new account listed in the dashboard within 2 seconds.
3. **Given** the user denies consent or closes the OAuth window, **When** the callback fires (or the popup closes without callback), **Then** Clipwise shows a clear "connection cancelled" message and no partial row is left in the database.

---

### User Story 2 — Tenant manages multiple TikTok accounts in one workspace (Priority: P1)

A user managing several TikTok brands (or an agency owner managing client accounts) needs to connect more than one TikTok account into a single tenant and pick the active one when publishing.

**Why this priority**: Dadsapp's existing `schedule_multi_account` flow distributes posts across multiple accounts in the same tenant. Without multi-account support this whole integration path breaks.

**Independent Test**: Connect a second TikTok account into the same tenant. Both must appear in the account-listing endpoint. Publishing to the second account must not collide with the first.

**Acceptance Scenarios**:

1. **Given** a tenant already has one connected TikTok account, **When** the user connects a second TikTok account, **Then** the system creates a new `tiktok_accounts` row distinct from the first and both are returned by the listing endpoint.
2. **Given** the same TikTok account (same `open_id`) is already connected to the tenant, **When** the user re-initiates OAuth for that account, **Then** the system updates the existing row's tokens and metadata rather than creating a duplicate, and preserves the row's identifier.
3. **Given** the same TikTok `open_id` is connected to a different tenant, **When** a user in another tenant connects it, **Then** the system creates a separate row for the other tenant; the TikTok account can legitimately exist under multiple tenants.

---

### User Story 3 — Access tokens are refreshed automatically before they expire (Priority: P1)

TikTok access tokens expire after 24 hours. Without a refresher, every publish attempt the next day would fail. The system must refresh tokens transparently.

**Why this priority**: Token expiry is a silent failure mode that breaks every downstream flow. Has to ship with the foundation, not after.

**Independent Test**: Manually set `token_expires_at` on a stored account to 30 minutes in the future, wait for the refresh worker to run, confirm the access token has changed and the new expiry is ~24 hours out.

**Acceptance Scenarios**:

1. **Given** an account whose access token expires within the next 2 hours, **When** the token-refresh worker runs, **Then** it calls TikTok's refresh endpoint, updates both the access token and the new expiry, and rotates the refresh token if TikTok returned a new one.
2. **Given** a refresh call fails because TikTok returns "invalid_grant" (refresh token expired or revoked), **When** the refresh worker observes the failure, **Then** the account is marked as `requires_reconnect`, no further refresh attempts are made for that account, and the tenant owner is notified out-of-band.
3. **Given** a refresh call fails with a transient network or 5xx error, **When** the refresh worker observes the failure, **Then** it retries with exponential backoff and does not mark the account as failed until retries are exhausted.

---

### User Story 4 — Owner disconnects an account and all related state is removed (Priority: P2)

A user removes a TikTok account from their workspace. Future publish jobs against that account must fail clearly, and historical jobs/metrics should be deletable cleanly.

**Why this priority**: Connect is P1; disconnect can ship a sprint later. But it's required for ToS compliance ("user can withdraw consent") and clean GDPR/CCPA story.

**Independent Test**: Connect an account, publish one post, disconnect the account, verify the `tiktok_accounts` row is gone and the publish_jobs row's foreign key is null'd or removed per the cascade behavior.

**Acceptance Scenarios**:

1. **Given** an account with no in-flight publish jobs, **When** the user disconnects it, **Then** the `tiktok_accounts` row is hard-deleted along with all dependent post_jobs and metrics (via `ON DELETE CASCADE`).
2. **Given** an account with at least one publish job in `pending` or `publishing` status, **When** the user disconnects it, **Then** the disconnect is rejected with a message naming the in-flight jobs, OR (operator choice) the in-flight jobs are cancelled and the disconnect proceeds. Pick one and stick to it.
3. **Given** the account has been disconnected, **When** any API call references its `tiktok_account_id`, **Then** the response is a clean 404, not a 500.

---

### Edge Cases

- TikTok returns a refresh token with a longer lifetime than the access token (typical: refresh = 365 days). The expiry tracking for refresh vs. access must be separate.
- The encryption key in env is rotated. Existing rows still need to decrypt — supports keyed rotation by storing a key version with each encrypted blob.
- A connect attempt times out at the OAuth callback step (user took 20 minutes, TikTok's code expired). The system must not leave partial rows or session state.
- Two simultaneous OAuth callbacks for the same `open_id` (user double-clicked, refreshed) — race-safe upsert with no duplicate rows.
- A TikTok account is suspended on the TikTok side. Refresh succeeds but every publish fails with a specific TikTok error code — surface this clearly without retrying.
- The tenant is deleted while an account's refresh worker is mid-flight. The worker must not commit changes to a deleted tenant.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST store TikTok access tokens, refresh tokens, and their separate expiry timestamps in encrypted form using a symmetric cipher with the key sourced from environment configuration.
- **FR-002**: System MUST tag each encrypted token with the key version used to encrypt it, so that key rotation is possible without invalidating existing rows.
- **FR-003**: System MUST associate each TikTok account with exactly one tenant via a `tenant_id` foreign key with `ON DELETE CASCADE`.
- **FR-004**: System MUST enforce uniqueness on `(tenant_id, tiktok_open_id)` so the same TikTok account cannot be connected twice within a single tenant; it MAY exist under multiple tenants.
- **FR-005**: System MUST upsert (not insert-or-error) when an OAuth callback completes for an `open_id` that already exists in the same tenant, updating tokens and metadata in place.
- **FR-006**: System MUST capture TikTok's `open_id`, `display_name`, `avatar_url`, and any user-info fields available through the `user.info.basic` and `user.info.profile` scopes at connect time, and refresh them when they change.
- **FR-007**: System MUST run a token-refresh worker on a schedule (target: every 1 hour) that refreshes any account whose `token_expires_at` is within the next 2 hours.
- **FR-008**: System MUST mark an account as `requires_reconnect` and stop refresh attempts when TikTok returns `invalid_grant` or equivalent terminal failure on refresh.
- **FR-009**: System MUST retry transient refresh failures (network errors, 5xx responses) with exponential backoff and a maximum of 5 attempts before marking the account `requires_reconnect`.
- **FR-010**: System MUST expose a tenant-scoped listing endpoint returning all `tiktok_accounts` for the active tenant, with the encrypted token fields excluded.
- **FR-011**: System MUST expose a disconnect endpoint that hard-deletes a `tiktok_accounts` row, with downstream cascade behavior defined by FR-013.
- **FR-012**: System MUST reject a disconnect when any dependent `post_jobs` row for that account is in `pending` or `publishing` state; the response MUST name the blocking jobs. (Implementation may alternatively cancel in-flight jobs; the operator chooses one rule and applies it consistently.)
- **FR-013**: System MUST cascade-delete all dependent rows (post_jobs, post_metrics, account_stat_snapshots) when an account is disconnected.
- **FR-014**: System MUST log every connect, disconnect, refresh-success, and refresh-failure event with the tenant, account, actor, and outcome.
- **FR-015**: System MUST NOT log the plaintext value of any access token or refresh token in any log destination.
- **FR-016**: System MUST handle simultaneous OAuth callbacks for the same `open_id` race-safely (database-level upsert with unique constraint resolution, not application-level check-then-write).
- **FR-017**: System MUST never attempt to refresh tokens for an account whose tenant has been deleted.

### Key Entities

- **TikTokAccount**: Represents a TikTok account connection persisted under a tenant. Carries the tenant FK, TikTok `open_id`, encrypted access/refresh tokens + key version, separate access/refresh expiries, display metadata (name, avatar, bio if available), an `is_enabled` flag, a `requires_reconnect` flag, and connect/refresh timestamps. Unique on `(tenant_id, open_id)`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: OAuth connect flow (click "Connect" → account visible in dashboard) completes in under 10 seconds at p95.
- **SC-002**: Token refresh worker succeeds on at least 99% of accounts with non-expired refresh tokens in any 24-hour period.
- **SC-003**: No plaintext token value ever appears in application logs, audit logs, or error reports (verified by automated log scanning).
- **SC-004**: A disconnect operation either completes cleanly within 2 seconds OR returns a clear blocking-jobs error within 500ms; no operations time out.
- **SC-005**: Cross-tenant access to a TikTok account is impossible: 100% of attempts in automated isolation tests return 404, regardless of how the requesting tenant references the account.

## Assumptions

- TikTok's OAuth redirect is already configured to `clipwise.tech/auth/tiktok/callback` and the existing handler at that route is extended (not rewritten) to write to the new `tiktok_accounts` table.
- The encryption key is provided via environment variable, with a versioning scheme such that old rows decrypt with the old key while new writes use the current key.
- TikTok scopes already approved or in active review: `user.info.basic`, `user.info.profile`, `user.info.stats`, `video.upload`, `video.list`. The `video.publish` scope is in review; this spec does not depend on it.
- Refresh worker runs as a scheduled cron (Vercel Cron or equivalent) defined in spec 005; this spec describes the requirement, not the runtime.
- Reconnect-required notifications to tenant owners are out of scope for this spec; an event is logged and a flag is set, surfacing notifications is handled in a future UX spec.
- The disconnect-with-in-flight-jobs rule (FR-012) is resolved as "reject the disconnect" in v1; cancellation-on-disconnect is deferred.
