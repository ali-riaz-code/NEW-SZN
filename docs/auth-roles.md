> Status: stub — expand during Phase 2 (Auth) build

# Auth Roles & Permission Matrix

NEW SZN has four roles with strict client-level data isolation. Every data query must be scoped to the authenticated user's permitted clients.

## Role definitions

| Role | Can see | Can write | Client scope |
|---|---|---|---|
| **Admin** | All clients, all data | Everything including settings, goals, user management | All clients |
| **Closer** | Own calls and performance only | Log calls, update own lead tags | Assigned clients only |
| **Setter** | Own activity logs only | Log daily activity, update own follow-up queues | Assigned clients only |
| **Client** | Own business performance only | Nothing (read-only) | Single client (their own) |

## Key rules
- A Client user must **never** see another client's data — enforce with row-level client_id checks in every query.
- Role checks live in `apps/api/src/middleware/auth.ts`, never scattered in route handlers (see CLAUDE.md).
- Admins can reassign leads between closers and manage all user-client assignments.

## TODO
- Full permission matrix per route/action (to be filled in during Phase 2)
- Client-scoping middleware implementation
- Session/JWT structure
