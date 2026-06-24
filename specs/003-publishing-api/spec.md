# Feature Specification: Publishing API

**Feature Branch**: `003-publishing-api`

**Created**: 2026-05-20

**Status**: Draft

**Input**: User description: "Expose Clipwise's TikTok publishing capabilities (photo carousels, videos, drafts to inbox, direct-to-profile when scope approves) as a versioned HTTP API consumable by external services (dadsapp) and by Clipwise's own UI, with API-key authentication, idempotent submission, server-side status polling against TikTok, and clear job lifecycle reporting."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — API consumer publishes a photo carousel to TikTok inbox (Priority: P1)

An external service (dadsapp) holds an API key for a Clipwise tenant. It uploads carousel slide images, then submits a publish request in `draft` mode. Clipwise pushes the carousel to the TikTok user's inbox so the user can finalize it in the TikTok app. A job identifier is returned for polling.

**Why this priority**: This is the path that can ship today against existing approved TikTok scopes (`video.upload` / Content Posting API draft mode). It unblocks dadsapp staging integration immediately without waiting on the `video.publish` review.

**Independent Test**: From a curl or Postman client, upload 3 slide images, then POST a publish request with `mode: draft` referencing those media IDs and a connected `account_id`. Within 30 seconds, the job's status becomes `published` and the TikTok user receives an inbox notification in the TikTok app.

**Acceptance Scenarios**:

1. **Given** a valid API key, an existing `tiktok_account_id` for that tenant, and one or more uploaded media IDs, **When** the consumer POSTs `/v1/posts/publish` with `media_type: photo_carousel` and `mode: draft`, **Then** the system creates a `post_jobs` row in `publishing` state and returns `{job_id, status: "publishing"}` synchronously.
2. **Given** a publish request whose `account_id` does not belong to the API key's tenant, **When** the system receives the request, **Then** it responds with 404 (not 403) so as not to leak cross-tenant existence.
3. **Given** a publish request whose `media_type` and `media` payload are inconsistent (e.g., `video` type with multiple media items), **When** the system validates the request, **Then** it returns 400 with a field-specific error before any TikTok call is made.
4. **Given** the same `Idempotency-Key` header is sent on two publish requests within 24 hours, **When** the second request arrives, **Then** the system returns the original `job_id` and the original status, not a duplicate publish.

---

### User Story 2 — API consumer publishes a video directly to a user's profile (Priority: P1, GATED)

An API consumer publishes a video file that lands directly on the connected user's TikTok profile with no manual confirmation step. This is the flow dadsapp needs in production.

**Why this priority**: Direct-to-profile is the end-state for the dadsapp swap. This story is gated behind TikTok's pending `video.publish` scope review; the system must be ready to flip on when the approval lands.

**Independent Test**: With the `video.publish` feature flag enabled and an approved scope on the test account, upload a video, POST a publish request with `mode: direct`, observe a job that progresses to `POST_COMPLETED` and confirm the video appears on the TikTok profile within 2 minutes.

**Acceptance Scenarios**:

1. **Given** the `video.publish` feature flag is OFF (default), **When** any consumer sends a publish request with `mode: direct`, **Then** the system responds with 503 `feature_not_available` and a message explaining the scope is pending.
2. **Given** the feature flag is ON and the scope is approved for the connected account, **When** the consumer POSTs `/v1/posts/publish` with `media_type: video` and `mode: direct`, **Then** the system uploads the video to TikTok (chunked if required) and triggers direct publish.
3. **Given** the feature flag is ON but the connected account's stored scopes do not include `video.publish`, **When** the consumer sends a direct publish request, **Then** the system responds with 403 `insufficient_scope` naming the missing scope and DOES NOT call TikTok.
4. **Given** TikTok rejects the publish (e.g., privacy_level not allowed for unaudited client, content violates policy), **When** Clipwise's status poll observes the failure, **Then** the job's status moves to `failed`, the TikTok error code and message are persisted on the job, and the consumer's next `/v1/jobs/:id` call surfaces them verbatim (not a generic "failed").

---

### User Story 3 — Media upload returns a stable, TikTok-postable URL (Priority: P1)

A consumer uploads an image or video file to Clipwise's media endpoint and receives back a media identifier and a URL. The URL is hosted on Clipwise's verified domain so that TikTok's PULL_FROM_URL flow accepts it for carousel posts.

**Why this priority**: TikTok carousel posting requires images to come from a TikTok-verified domain. dadsapp's S3 isn't verified; Clipwise's `clipwise.tech` is. This endpoint is the unblocking primitive for the whole carousel path.

**Independent Test**: POST a JPEG to `/v1/media`, receive back `{id, url, mime, bytes}`. Open the URL in a browser and confirm the image renders. Use the returned URL in a TikTok PULL_FROM_URL test and confirm TikTok accepts the source.

**Acceptance Scenarios**:

1. **Given** a valid API key and a JPEG/PNG/WebP body under the size limit, **When** the consumer POSTs `/v1/media` (multipart or raw body), **Then** the system stores the file in object storage (Vercel Blob), returns `{id, url, mime, bytes, expires_at}`, and the URL is served from `clipwise.tech`.
2. **Given** a media file exceeds the configured size limit, **When** the upload is received, **Then** the system rejects it with 413 before persisting any bytes.
3. **Given** a media file's MIME type is not in the allowlist (e.g., GIF, SVG, video), **When** the upload is received, **Then** the system rejects it with 415 and a clear allowed-types list.
4. **Given** a media item has not been referenced by any publish job within its TTL, **When** the cleanup worker runs, **Then** the blob is deleted and the media row is hard-deleted.

---

### User Story 4 — Consumer polls job status until terminal state (Priority: P1)

After submitting a publish request, the consumer polls `/v1/jobs/:id` until the job reaches a terminal state (`published` or `failed`). The endpoint surfaces TikTok's actual error codes when relevant.

**Why this priority**: Without status polling, the consumer never knows whether a publish actually landed. Dadsapp's existing Celery worker polls Publer's `/job_status/` every minute; the replacement must be at least that observable.

**Independent Test**: Submit a publish request, poll `/v1/jobs/:id` every 10 seconds, observe at least one transition (e.g., `publishing` → `published`), and confirm the response shape is stable across polls.

**Acceptance Scenarios**:

1. **Given** a valid API key and a job ID owned by the key's tenant, **When** the consumer GETs `/v1/jobs/:id`, **Then** the system returns `{job_id, status, tiktok_publish_id, tiktok_video_id, error_code, error_message, scheduled_at, published_at, updated_at}`.
2. **Given** a job ID that does not exist or belongs to another tenant, **When** the consumer GETs `/v1/jobs/:id`, **Then** the system returns 404 (not 403).
3. **Given** a job in `publishing` state, **When** Clipwise's internal status poll runs against TikTok and TikTok reports `POST_COMPLETED`, **Then** the job's status moves to `published`, `tiktok_video_id` is filled, and `published_at` is set to the time TikTok confirmed.
4. **Given** the consumer polls more frequently than once per second per job, **When** the rate limit triggers, **Then** the system responds with 429 and a `Retry-After` header.

---

### Edge Cases

- A consumer sends a publish request with a media ID that was uploaded to a different tenant — must 404 (no cross-tenant media reuse).
- A consumer sends 4 media items for a carousel but TikTok's current limit is different (and may change) — system surfaces TikTok's exact error rather than imposing a stale client-side cap.
- The chunked video upload fails partway through — TikTok protocol-level retry happens server-side; the job stays in `publishing` until terminal.
- A scheduled job's `scheduled_at` has passed by the time the consumer polls it but the worker hasn't drained it yet — status is `pending` not `failed`; SLO on drain latency is defined in spec 005.
- The API key's tenant has zero connected TikTok accounts — every publish request returns 400 `no_account_specified` if no `account_id` is supplied (system never auto-picks).
- A privacy_level value is sent that TikTok rejects for unaudited clients (e.g., `PUBLIC_TO_EVERYONE` while still in audit) — the failure is surfaced from TikTok, not pre-checked, because the constraint changes between sandbox/audit/approved states.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expose an HTTP API under the version path `/v1/` with the routes: `POST /v1/media`, `POST /v1/posts/publish`, `GET /v1/jobs/:id`, `GET /v1/accounts`.
- **FR-002**: All API routes under `/v1/` MUST require an API key presented as `Authorization: Bearer sk_live_…`; missing or invalid keys return 401.
- **FR-003**: System MUST scope every request to the API key's owning tenant; cross-tenant lookups MUST return 404 (never 403, to avoid leaking existence).
- **FR-004**: System MUST persist a `post_jobs` row for every publish request, with at minimum: `id`, `tenant_id`, `tiktok_account_id`, `status`, `mode`, `media_type`, `caption`, `privacy_level`, `options` (JSON), `idempotency_key` (nullable), `tiktok_publish_id` (nullable), `tiktok_video_id` (nullable), `scheduled_at` (nullable), `published_at` (nullable), `error_code` (nullable), `error_message` (nullable), `retry_count`, `created_at`, `updated_at`.
- **FR-005**: Job lifecycle states MUST be: `pending` (scheduled, not yet executed) → `publishing` (TikTok call in flight) → `published` (terminal success) or `failed` (terminal failure). Backwards transitions are not allowed.
- **FR-006**: System MUST accept publish requests with `mode: "draft" | "direct"`. Draft mode uses TikTok's inbox endpoint and ships immediately. Direct mode is gated behind a per-deployment feature flag and returns 503 when the flag is off.
- **FR-007**: System MUST accept publish requests with `media_type: "photo_carousel" | "video"` and reject any request where the `media` array length is incompatible with the type (carousel: 1+ images; video: exactly 1 video).
- **FR-008**: System MUST validate that all `media` IDs in a publish request belong to the API key's tenant and exist at submit time; otherwise 400 `invalid_media`.
- **FR-009**: System MUST accept an optional `Idempotency-Key` header on publish requests. When the same key is presented within 24 hours, the system MUST return the original job's response rather than creating a duplicate.
- **FR-010**: System MUST upload media to a Vercel-Blob-backed store and serve the media URL from `clipwise.tech` so that TikTok's PULL_FROM_URL flow accepts it.
- **FR-011**: System MUST allow only `image/jpeg`, `image/png`, and `image/webp` for carousel media and `video/mp4` (and any other TikTok-accepted MP4-container codec) for video media; other MIME types return 415.
- **FR-012**: System MUST enforce per-media-type size limits aligned with TikTok's documented limits, configurable per deployment.
- **FR-013**: System MUST run an internal status-polling worker that polls TikTok's `/post/publish/status/fetch/` for every job in `publishing` state until the job is terminal; consumers MUST NOT need to call TikTok themselves.
- **FR-014**: System MUST persist TikTok's response error code and message verbatim onto the job's `error_code` and `error_message` fields on failure; clients MUST see TikTok's actual error, not a generic message.
- **FR-015**: System MUST rate-limit per-API-key requests; default: 100 publish requests per minute, 600 job-status polls per minute. Exceeded limits return 429 with `Retry-After`.
- **FR-016**: System MUST expose `GET /v1/accounts` that lists the connected TikTok accounts for the API key's tenant, returning at least: `id`, `display_name`, `avatar_url`, `tiktok_open_id`, `is_enabled`, `requires_reconnect`.
- **FR-017**: System MUST clean up unreferenced media after a configurable TTL (default 24 hours) by deleting both the blob and the database row.
- **FR-018**: System MUST refuse publish requests against an account flagged `requires_reconnect` (per spec 002), returning 409 `account_requires_reconnect`.
- **FR-019**: System MUST sign and validate webhook callbacks when the consumer registers one (out of scope for v1; FR documents the placeholder).
- **FR-020**: System MUST log every publish submission, status transition, and TikTok call (request and response) with the tenant, job, and timing.
- **FR-021**: System MUST NOT log API key plaintext values, media file contents, or video bytes.

### Key Entities

- **Media**: A file (image or video) uploaded by a consumer and stored in object storage. Carries tenant FK, blob URL, MIME, bytes, optional source filename, created_at, expires_at.
- **PostJob**: A single publish operation. Carries tenant FK, TikTok account FK, mode, media_type, list of media IDs (denormalized into JSON payload), caption, privacy, options, idempotency_key, status, TikTok IDs, error fields, scheduled_at, published_at, retry_count, timestamps.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `POST /v1/posts/publish` returns synchronously in under 1 second at p95 for draft mode (the TikTok call itself is async via status polling).
- **SC-002**: Status-poll endpoint `GET /v1/jobs/:id` returns in under 200ms at p95.
- **SC-003**: TikTok's actual error code and message appear in the job's response on failure 100% of the time (no generic "failed" with no detail).
- **SC-004**: Idempotent re-submission with the same `Idempotency-Key` returns the original `job_id` in 100% of test cases within the 24-hour window.
- **SC-005**: Cross-tenant resource references (media, accounts, jobs) return 404 in 100% of automated cross-tenant isolation tests.
- **SC-006**: Direct mode (gated) ships disabled by default with zero TikTok calls made when the feature flag is off; enabling the flag is a configuration change requiring no code deploy.
- **SC-007**: The dadsapp integration (spec 006) can replace `PUBLER_BASE_URL` + `Bearer-API` header with Clipwise equivalents and run end-to-end against draft mode without changes to dadsapp's scheduling logic.

## Assumptions

- API consumer authentication uses tenant-scoped API keys defined in spec 001 (FR-008 to FR-010 of that spec).
- TikTok account model and OAuth flow are defined in spec 002; this spec only references TikTok accounts by `id`.
- The internal status-polling worker runs on the runtime defined in spec 005; this spec describes the requirement (continuous polling of in-flight jobs against TikTok), not the runtime.
- Vercel Blob is the object-storage backend; `clipwise.tech` is already verified with TikTok and serves blob content via a proxy route.
- Per Phase 1 scope (per session conversation): photo carousel + video draft + video direct-publish (behind flag) are in. Scheduling (POST a job for the future) is in scope as `scheduled_at` field acceptance only; the scheduler worker itself is spec 005.
- Webhook callbacks for job status changes are out of scope for v1; consumers poll.
- Per-tenant rate limit defaults are sized for one heavy consumer (dadsapp); raising them is a configuration change.
- The `saves` count gap from spec 004 does not affect this spec; publishing has no save metric concept.
