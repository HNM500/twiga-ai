# Twiga Web Internal Admin API

This server-only contract powers the private Twiga Admin application. It is not a public product API and must not be called directly from browser code.

## Request authorization

Every request must include:

- the staff member's Better Auth cookie
- `x-twiga-admin-secret`, matching the 32-plus-character `TWIGA_ADMIN_SERVICE_SECRET`

Twiga Web then requires the staff email to appear in `ADMIN_EMAIL_ALLOWLIST`, the account to be active, the database-backed role to permit the requested action, and the current session to have been created less than eight hours ago. Failed checks return `401` or `403`. The service secret alone is never sufficient.

Roles are `super_admin`, `support`, `quality_reviewer` and `ai_operations`. The canonical permission matrix is in `/ADMIN_PANEL_PLAN.md` at the workspace root and in `lib/admin/security-primitives.ts`.

## Reads

| Method and path | Permission | Purpose |
|---|---|---|
| `GET /api/internal/admin/session` | `overview:read` | Current actor, roles and visible modules |
| `GET /api/internal/admin/overview` | `overview:read` | Companion KPIs and route distribution |
| `GET /api/internal/admin/users` | `users:read` | Paginated account search and status filter |
| `GET /api/internal/admin/users/:id` | `users:read` | Account summary and active sessions |
| `GET /api/internal/admin/feedback` | `feedback:read` | Paginated feedback and review filters |
| `GET /api/internal/admin/feedback/:id` | `feedback:read` | Feedback metadata, review state and staff notes |
| `GET /api/internal/admin/operations` | `operations:read` | Seven-day generation route/model telemetry |
| `GET /api/internal/admin/system` | `system:read` | Dependency, release and sanitized Sentry status |
| `GET /api/internal/admin/audit` | `audit:read` | Paginated administrator audit events |

## Mutations

All mutations require a trimmed reason between 8 and 500 characters and return a `requestId` that matches the append-only audit event.

| Method and path | Permission | Body |
|---|---|---|
| `POST /api/internal/admin/users/:id/status` | `users:suspend` | `{ "status": "active" | "suspended", "reason": "..." }` |
| `POST /api/internal/admin/users/:id/sessions/:sessionId/revoke` | `sessions:revoke` | `{ "reason": "..." }` |
| `POST /api/internal/admin/feedback/:id/review` | `feedback:write` | Assignment, unassignment, note, resolve or reopen action plus reason |

An administrator cannot suspend their own account. Non-Super-Admin roles cannot suspend or revoke a session belonging to any administrator.

There are deliberately no endpoints for impersonation, credential viewing, password reset, role assignment, account deletion, unrestricted conversation browsing, model mutation or billing actions in Phase 1.
