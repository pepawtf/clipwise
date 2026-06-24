# Feature Specification: Multi-tenant Foundation

**Feature Branch**: `001-multi-tenant-foundation`

**Created**: 2026-05-20

**Status**: Draft

**Input**: User description: "Add users, tenants, memberships, and tenant-scoped authentication to Clipwise so that it can support both solo creators and agencies managing multiple TikTok-brand workspaces, and can serve API consumers (dadsapp) under a tenant-scoped API key model."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Solo creator gets a usable workspace on first signup (Priority: P1)

A new user signs in for the first time and lands in a working dashboard without ever seeing the word "tenant" or "workspace." Behind the scenes Clipwise provisions a personal tenant, makes the user its owner, and binds their session to it.

**Why this priority**: This is the default path for the largest user segment (solo creators). If it's not frictionless, the multi-tenant model has paid for itself in negative ROI. Everything else in this spec assumes this path works.

**Independent Test**: Sign in with a brand-new account → land on the dashboard → confirm an account-connect button is visible. Verify in the database that exactly one tenant and one membership row were created for this user.

**Acceptance Scenarios**:

1. **Given** a new visitor with no prior Clipwise account, **When** they complete sign-in for the first time, **Then** Clipwise creates a user record, a personal tenant (name = user's display name, slug auto-derived), and an owner-role membership joining them, and issues a session that is scoped to that tenant.
2. **Given** an existing user who only ever uses Clipwise solo, **When** they sign in on subsequent visits, **Then** they land directly in their personal tenant with no tenant-picker shown.
3. **Given** a session whose tenant has been deleted or whose membership has been revoked, **When** the user makes any tenant-scoped request, **Then** the request is rejected and the user is routed back to sign-in.

---

### User Story 2 — Agency owner manages multiple client workspaces (Priority: P2)

An agency owner needs to keep client A's content, accounts, and analytics fully separated from client B's. They create a separate tenant for each client and switch between them.

**Why this priority**: The agency segment is the differentiator vs. building a pure single-user product. If solo creators are the volume, agencies are the revenue. Worth supporting from day one because retrofitting tenancy later is a re-platform.

**Independent Test**: As a signed-in user, create a second tenant via the workspace creator → switch active tenant → confirm that resource queries return only the active tenant's data (zero rows of the other tenant's data leak through).

**Acceptance Scenarios**:

1. **Given** a signed-in user with only a personal tenant, **When** they create a new tenant with a unique name, **Then** Clipwise creates the tenant and an owner-role membership, and the new tenant is selectable in the workspace switcher.
2. **Given** a user who is a member of multiple tenants, **When** they switch to a different active tenant, **Then** the session is re-scoped to that tenant and every subsequent resource query is filtered by it.
3. **Given** a user attempts to switch to a tenant they are not a member of, **When** the switch request is made, **Then** the request is rejected with a permission error and the previous active tenant remains in effect.

---

### User Story 3 — API consumer authenticates under a tenant's identity (Priority: P1)

An external service (dadsapp) holds an API key generated inside a Clipwise tenant. Every call it makes is automatically scoped to that tenant, with no chance of touching another tenant's data.

**Why this priority**: This is the foundation for the dadsapp swap from Publer. Without tenant-scoped API keys, the publishing and analytics APIs in specs 003 and 004 cannot be safely exposed.

**Independent Test**: Generate two API keys in two different tenants. Use each to call a list-resources endpoint. Confirm each returns only its own tenant's resources.

**Acceptance Scenarios**:

1. **Given** a tenant owner generates an API key, **When** the key is created, **Then** the displayed value (`sk_live_…`) is shown only once and its hash is stored against the tenant; subsequent fetches show only a non-secret prefix and metadata.
2. **Given** an API consumer presents a valid API key, **When** they call any resource endpoint, **Then** the call is authorized as the tenant that owns the key and the consumer's tenant context is fixed for the duration of the request.
3. **Given** a tenant owner revokes an API key, **When** the next call is made with that key, **Then** the call is rejected with 401 and the key cannot be re-enabled.

---

### Edge Cases

- A user signs out and then signs in again on a different device — session tokens must not carry forward an old tenant context if memberships have changed.
- A tenant is deleted while a user has an active session scoped to it — the session must be invalidated on the next request.
- A user is a member of three tenants and their JWT expires mid-session — refresh must preserve the previously-active tenant choice, not silently reset to the first membership.
- Two users with the same display name sign up — tenant slug must be uniquified server-side; auto-derivation cannot rely on display name uniqueness.
- A user signs in via TikTok OAuth using an account whose `open_id` already exists under a different user record — this is treated as a sign-in for the existing user, not a new user.
- An API key is generated, but the tenant is later deleted — all keys for that tenant must be hard-deleted via `ON DELETE CASCADE`, not soft-disabled.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST model users, tenants, and memberships as three separate entities; a user MUST NOT be embedded inside a tenant.
- **FR-002**: System MUST enforce a unique `(tenant_id, user_id)` pair on memberships so the same user cannot have two membership rows in the same tenant.
- **FR-003**: System MUST auto-create a personal tenant and an owner-role membership on a new user's first successful sign-in, in a single transaction.
- **FR-004**: System MUST issue a session credential (JWT) that carries both a user identifier and an active tenant identifier; the active tenant MUST be the one used for all subsequent resource scoping.
- **FR-005**: System MUST verify on every authenticated request that the user identified in the session still holds an active membership in the tenant identified in the session.
- **FR-006**: System MUST allow a user to switch the active tenant within their session by requesting a new session credential bound to a tenant they are already a member of.
- **FR-007**: System MUST reject any attempt to switch the active tenant to one the user is not a member of, returning an authorization error.
- **FR-008**: System MUST support API keys that are owned by a tenant (not a user), with each key carrying a tenant identifier and a non-secret prefix that uniquely identifies it for log lookups.
- **FR-009**: System MUST store API keys as one-way hashes; the plaintext key value MUST be shown exactly once at creation and never retrievable afterward.
- **FR-010**: System MUST treat API-key-authenticated requests as tenant-scoped under the owning tenant, with no user identity attached.
- **FR-011**: System MUST cascade-delete all tenant-owned resources (memberships, API keys, and all tables defined in specs 002–004) when a tenant is deleted.
- **FR-012**: System MUST not expose any tenant's data to a session or API key scoped to a different tenant, including in listing, search, and aggregation responses.
- **FR-013**: Tenant slugs MUST be globally unique and URL-safe; the system MUST auto-uniquify slugs on creation if the requested slug is taken.
- **FR-014**: System MUST record the role on each membership and MUST default the role of the auto-created owner membership to `owner`; additional roles are out of scope for v1.
- **FR-015**: System MUST log every active-tenant switch and every API key creation, rotation, and revocation event with the actor and timestamp.

### Key Entities

- **User**: Represents a human who can sign in. Carries identity (email or TikTok-OAuth-derived identifier), display info, and account-level billing identifiers. Has many memberships.
- **Tenant**: Represents a data-isolation boundary (a workspace or brand). Carries a name, a unique URL-safe slug, and arbitrary tenant-level settings. Owns all business resources (TikTok accounts, media, post jobs, metrics, API keys) defined in specs 002–004.
- **TenantMembership**: A many-to-many join between users and tenants, carrying a role. Unique on `(tenant_id, user_id)`.
- **ApiKey**: A tenant-owned credential used by external services (e.g., dadsapp) to make authenticated calls scoped to the tenant. Carries a non-secret display prefix, a one-way hash, optional scope flags, and a last-used timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: First-time sign-in to landing on dashboard completes in under 3 seconds at p95, including personal-tenant provisioning.
- **SC-002**: A query made under tenant A's session/key MUST return zero rows from any other tenant in 100% of test cases across all resource listing endpoints (verified by an automated cross-tenant isolation test).
- **SC-003**: API key revocation propagates to active sessions within 5 seconds; the next request after revocation MUST receive 401.
- **SC-004**: A user can create a second tenant and switch into it in under 30 seconds of UI interaction, with no support contact needed.
- **SC-005**: Solo-creator sign-up shows zero tenant-related UI elements (no workspace picker, no "create tenant" prompt) when the user has only one tenant.

## Assumptions

- TikTok OAuth is the primary authentication method for Clipwise UI users in v1; Google/Apple/email-link sign-in are out of scope and deferred to a later spec.
- One default role (`owner`) is sufficient for v1; granular permissions (editor, viewer) are deferred.
- Tenant-level billing identifiers (Stripe customer_id) are out of scope for this spec; billing is deferred to its own future spec but the user record exposes a Stripe customer field for future use.
- API key scopes beyond "full tenant access" are out of scope for v1; a single key grants full access to all of its tenant's resources.
- Application-level enforcement of tenant scoping (every query carries `WHERE tenant_id = …`) is sufficient for v1; Postgres row-level security is not used.
- The session credential format is a signed JWT carrying `sub` (user_id), `tenant_id`, and `role`; verification happens in middleware on every authenticated request.
- All tenant-owned tables defined in specs 002–004 inherit a `tenant_id` foreign key with `ON DELETE CASCADE`, indexed on `tenant_id`.
- This spec depends on Clipwise's existing TikTok OAuth flow for user identity; no new identity provider is introduced.
