# EBB ATM Operations Intelligence

Foundation build of an ATM operations and reconciliation platform.

This phase delivers a running, navigable skeleton: authentication, a protected
application shell, a database schema with row-level security, a service layer,
and every module either implemented or stubbed with a clearly labelled
placeholder. **The reconciliation engine and the AI agents are deliberately not
implemented.**

---

## Contents

- [Quick start](#quick-start)
- [Demo mode](#demo-mode)
- [Supabase setup](#supabase-setup)
- [Architecture](#architecture)
- [Folder structure](#folder-structure)
- [Database schema](#database-schema)
- [Routes](#routes)
- [What works, what is a placeholder](#what-works-what-is-a-placeholder)
- [Security notes](#security-notes)
- [Not included in this phase](#not-included-in-this-phase)

---

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — the app runs without it
npm run dev
```

Open <http://localhost:3000>. With no `.env.local`, the app boots in **demo
mode** and every screen is explorable immediately.

| Command | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` in strict mode |

Requires Node.js 20.9+ (Next.js 16).

---

## Demo mode

The application runs with **no Supabase project configured**. When
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are absent, every
repository falls back to an in-memory synthetic dataset
(`src/lib/database/demo/dataset.ts`) and the session resolves to a fixed demo
administrator.

This is a development convenience, not a login bypass:

- The moment Supabase credentials are present, demo mode switches off entirely.
  Unauthenticated requests are redirected to `/login` by the proxy and refused
  again by the protected layout.
- A **Demo mode** badge is shown in the header and the sidebar explains that
  writes are held in the server process and lost on restart.
- Uploads are disabled in demo mode — there is no bucket to write to, and the
  API returns an explicit `NOT_IMPLEMENTED` rather than pretending to succeed.

Set `NEXT_PUBLIC_ALLOW_DEMO_MODE=false` to disable the fallback and require a
real project.

All demo data is fictional: `Demo Bank A/B/C`, `ATM-1001…`, invented staff names
and phone numbers in the reserved `555` range.

---

## Supabase setup

1. **Create a project** at [supabase.com](https://supabase.com).

2. **Fill in `.env.local`:**

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   SUPABASE_SERVICE_ROLE_KEY=<service role key>   # server only, never NEXT_PUBLIC_
   SUPABASE_STORAGE_BUCKET=ebb-documents
   ```

3. **Apply the migrations.** With the Supabase CLI:

   ```bash
   supabase link --project-ref <project-ref>
   supabase db push
   ```

   Or paste the files in `supabase/migrations/` into the SQL editor, in
   filename order.

4. **Load demo data (optional):** run `supabase/seed.sql`, or
   `supabase db reset` against a local stack.

5. **Create a user.** Sign-ups are disabled by default, so add the user in the
   Supabase dashboard under Authentication → Users. A `profiles` row is created
   automatically by the `on_auth_user_created` trigger with the least-privileged
   role. Promote it:

   ```sql
   update public.profiles set role = 'ADMIN' where email = 'you@example.com';
   ```

6. **Restart the dev server** so the new environment variables are picked up.

The `ebb-documents` storage bucket is created by the RLS migration as a
**private** bucket with a 25 MB limit and an allow-list of MIME types.

---

## Architecture

The layering rule is enforced by imports, not convention alone:

```
        UI  (app/, components/)
         │  server components read; forms post to server actions
         ▼
   API / Actions  (app/api/, app/**/actions.ts)
         │  translate transport ↔ ServiceError
         ▼
     Services  (services/)
         │  authorize → validate → mutate → audit
         ▼
   Repositories  (lib/database/repositories/)
         │  Supabase adapter, or in-memory demo adapter
         ▼
      PostgreSQL  (+ Row Level Security)
```

Concretely:

- **Route handlers and server actions are thin.** They never validate business
  rules or write to a repository directly.
- **Every mutating service** calls `requirePermission(...)`, parses input with a
  Zod schema, then writes an audit entry. Skipping a step is visible in review
  because the pattern is identical across all of them.
- **Repositories are the only place** that knows whether the data came from
  Supabase or the demo dataset. Callers cannot tell the difference.
- **`ServiceError`** is the only error type that crosses the service boundary.
  `apiError()` is the single place that decides what a client sees, so an
  internal message can never leak.
- **Money is integer minor units** (`bigint` in SQL, `number` of cents in TS).
  No floating point touches a monetary value, and formatting happens only in
  `lib/utils/format.ts`.

### AI architecture

Declared, not implemented.

```
                 Orchestrator
                      │
   ┌──────────┬───────┴────┬─────────────┬───────────────┐
  Data   Reconciliation  Investigation  Reporting   Communication
```

- `AIProvider` is the swap point. `MockAIProvider` is the only implementation;
  it explains how a request *would* be routed and marks every response
  `simulated: true`, which the UI renders as a visible badge.
- `AITool` declares `requiresApproval`, because mutating tools must be gated
  behind explicit human confirmation.
- `AGENT_REGISTRY` carries `implemented: false` on every specialist. The
  Command Center reads that flag rather than hard-coding "coming soon" text.
- Two rules are structural, not configurable: **financial figures always come
  from the deterministic reconciliation service, never from a model**, and
  **actions that change data require human approval**.

---

## Folder structure

```
supabase/
├── config.toml
├── migrations/
│   ├── 20260810000100_init_schema.sql
│   └── 20260810000200_rls_policies.sql
└── seed.sql

src/
├── app/
│   ├── (auth)/                    # unauthenticated shell
│   │   └── login/
│   ├── (app)/                     # protected shell (sidebar + header)
│   │   ├── dashboard/
│   │   ├── operations/            # atms, atms/[id], daily, reconciliation,
│   │   │                          # reconciliation/[id], exceptions
│   │   ├── data/                  # banks, custodians, engineers, documents
│   │   ├── intelligence/          # ai, reports
│   │   └── system/                # notifications, audit-logs, settings
│   ├── api/                       # REST route handlers
│   ├── auth/callback/             # OAuth / magic-link code exchange
│   ├── globals.css                # design tokens, light + dark
│   ├── layout.tsx
│   └── not-found.tsx
│
├── components/
│   ├── ui/                        # design system primitives
│   ├── layout/                    # shell, sidebar, theme, page header
│   ├── dashboard/                 # metrics, operations table, activity, AI panel
│   ├── atm/  data/  documents/  ai/  settings/
│
├── lib/
│   ├── api/                       # response envelope
│   ├── auth/                      # session, permissions, sign-in actions
│   ├── database/
│   │   ├── demo/                  # synthetic dataset + query helpers
│   │   ├── repositories/          # one module per entity
│   │   └── errors.ts
│   ├── supabase/                  # browser / server / admin / proxy clients
│   ├── utils/
│   └── validation/                # Zod schemas
│
├── services/                      # atm, banks, people, operations,
│                                  # reconciliation, exceptions, documents,
│                                  # reports, notifications, audit, dashboard, ai
├── types/                         # common, auth, domain, ai
├── config/                        # app, env, navigation
└── proxy.ts                       # route protection (Next 16 middleware)
```

---

## Database schema

Sixteen tables. All have `id`, `created_at`, `updated_at`; all have RLS enabled.

| Table | Purpose | Notable columns |
| --- | --- | --- |
| `roles` | Role vocabulary | `key`, `label` |
| `profiles` | Application identity, 1:1 with `auth.users` | `user_id`, `role`, `is_active` |
| `users` *(view)* | Safe projection of identity | `id`, `email`, `role` |
| `banks` | Institutions | `code` (unique), `status` |
| `branches` | Bank branches | `bank_id`, unique `(bank_id, code)` |
| `custodians` | Cash custodians | `employee_id` (unique), `bank_id` |
| `engineers` | Field engineers | `employee_id` (unique), `specialization` |
| `atms` | Terminals | `atm_code` (unique), `custodian_id`, `engineer_id` |
| `daily_operations` | Per-terminal daily activity | unique `(operation_date, atm_id)` |
| `reconciliations` | Reconciliation records | `expected_minor`, `actual_minor`, `variance_minor` |
| `exceptions` | Discrepancies | `reference`, `type`, `priority`, `status` |
| `documents` | Uploaded files | `storage_path` (private bucket), `status` |
| `reports` | Generated reports | `type`, `format`, `status` |
| `notifications` | In-app alerts | `type`, `read_at`, NULL `user_id` = broadcast |
| `audit_logs` | Append-only trail | `action`, `entity`, `entity_id`, `metadata` |
| `ai_conversations` | Threads | `agent`, `last_message_at` |
| `ai_messages` | Turns | `role`, `content`, `tool_calls` |

Design decisions worth knowing:

- **Money is `bigint` minor units.** A missing figure is `NULL`, never a
  misleading `0`.
- **Statuses are `text` + `CHECK`**, not PostgreSQL enums — adding a value later
  is a one-line migration rather than an enum rewrite.
- **No `DELETE` policy exists on any table.** Records are deactivated so
  operational history survives.
- **`audit_logs` is append-only for users.** No policy grants insert; entries
  are written with the service role, so a user cannot forge or erase their own
  trail.
- **`ON DELETE SET NULL`** between ATMs and people: removing a person must never
  delete a terminal, and vice versa.

---

## Routes

### Pages

| Route | Module |
| --- | --- |
| `/login` | Sign in |
| `/dashboard` | Metrics, today's operations, activity, AI preview |
| `/operations/atms` | ATM list, search, filters, add / edit / activate |
| `/operations/atms/[id]` | ATM detail |
| `/operations/daily` | Daily operations |
| `/operations/reconciliation` | Reconciliation dashboard |
| `/operations/reconciliation/[id]` | Reconciliation detail |
| `/operations/exceptions` | Exception queue |
| `/data/banks` | Bank management |
| `/data/custodians` | Custodian management |
| `/data/engineers` | Engineer management |
| `/data/documents` | Document library + upload |
| `/intelligence/ai` | AI Command Center |
| `/intelligence/reports` | Report centre |
| `/system/notifications` | Notification centre |
| `/system/audit-logs` | Audit trail |
| `/system/settings` | Settings (8 sections) |

### API

| Endpoint | Methods |
| --- | --- |
| `/api/atms`, `/api/atms/[id]` | `GET`, `POST` / `GET`, `PATCH` |
| `/api/banks`, `/api/banks/[id]` | `GET`, `POST` / `GET`, `PATCH` |
| `/api/custodians`, `/api/engineers` | `GET`, `POST` |
| `/api/daily-operations` | `GET` |
| `/api/reconciliations` | `GET` |
| `/api/exceptions` | `GET` |
| `/api/documents` | `GET`, `POST` (confirm upload) |
| `/api/documents/uploads` | `POST` (signed upload URL) |
| `/api/reports` | `GET`, `POST` → `501` by design |
| `/api/notifications` | `GET`, `PATCH` (mark all read) |
| `/api/audit-logs` | `GET` |
| `/api/ai/chat` | `POST` |
| `/auth/callback` | `GET` |

Every response uses the envelope `{ ok: true, data }` or
`{ ok: false, error: { code, message, details? } }`.

---

## What works, what is a placeholder

### Functional

- Supabase email/password sign-in, sign-out, session, protected routes
- Role-based permissions (5 roles) filtering navigation and gating every service
- Responsive sidebar with a mobile drawer; light / dark / system theme
- **ATM management** — list, search, filter by status and bank, pagination,
  create, edit, activate/deactivate, detail page
- **Bank management** — list, search, filter, create, edit, activate/deactivate
- **Custodian and engineer management** — list, search, filter, create, edit,
  activate/deactivate, derived assigned-ATM column
- **Daily operations** — list with business-date, operational-status and
  reconciliation-status filters
- **Reconciliation** — dashboard, summary tiles, list, detail page (read-only)
- **Exceptions** — queue with status/type/priority filters, urgency ordering
- **Documents** — list, filter, and a complete upload path (signed URL → direct
  storage upload → metadata confirmation) when Supabase is configured
- **Notifications** — centre with type and unread filters, unread badge
- **Audit logs** — written automatically on every mutation, browsable and
  filterable
- **Settings** — eight sections reflecting live configuration
- **Dashboard** — six metric tiles, today's operations, activity feed, AI panel
- Full REST API with Zod-validated input and a uniform response envelope

### Placeholder — structure only, and labelled as such in the UI

| Area | State |
| --- | --- |
| **Reconciliation engine** | Not implemented. `startReconciliation()` authorizes correctly then throws `NOT_IMPLEMENTED`. Amounts shown are stored sample values — nothing is calculated. |
| **Exception workflow** | Read-only. No investigation, assignment or resolution. |
| **Report generation** | Not implemented. `POST /api/reports` returns `501`; download buttons are disabled rather than returning an empty file. |
| **OCR / document extraction** | Not implemented. Documents land in `UPLOADED` and stay there. |
| **AI provider** | Not connected. `MockAIProvider` explains routing and marks every reply "Simulated". |
| **AI agents** | Declared as typed contracts with `implemented: false`. None reason. |
| **Notification delivery** | Database + UI only. No realtime, email or push. |
| **Settings editing** | Read-only. |
| **GL / journal / cash counting / SLA** | Not started. Schema is shaped to receive them. |

Placeholder modules show a standard amber notice explaining exactly what is and
is not implemented. Nothing simulates a result it cannot produce.

---

## Security notes

- **Service role key never reaches the browser.** `lib/supabase/admin.ts` is
  marked `server-only` (a client import is a build error) and `serverEnv()`
  throws if it is ever evaluated in a browser.
- **Sessions are verified, not trusted.** Both the proxy and the session helper
  use `supabase.auth.getUser()`, which revalidates the JWT, rather than
  `getSession()`, which only reads a tamperable cookie.
- **Defence in depth on routes.** The proxy redirects unauthenticated requests;
  the protected layout checks again on the server; RLS enforces it a third time
  in the database.
- **RLS on every table**, with a `SECURITY DEFINER` role helper that pins
  `search_path` to defeat search-path hijacking. A trigger prevents a user from
  changing their own role or reactivating their own account.
- **Uploads.** File names are never used to build a storage path — the path is a
  server-generated UUID. Path separators and `..` are rejected outright. Type
  and size are enforced in Zod, in the route, and again by the bucket policy.
  The bucket is private; downloads use 60-second signed URLs.
- **No open redirects.** `/auth/callback` and notification links accept only
  relative paths, rejecting `//evil.com`.
- **Errors are opaque.** Only `ServiceError` messages reach the client; anything
  else becomes a generic 500 with the detail logged server-side.
- **Sign-in does not enumerate accounts** — unknown email and wrong password
  return the same message.
- **Audit metadata stores field names, not values**, so the trail does not
  become a second copy of sensitive data.
- Security headers (`X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`) are set in `next.config.ts`.

---

## Not included in this phase

Deliberate omissions, listed so they are choices rather than oversights:

- **No test suite.** Worth adding before the reconciliation engine — that module
  is the one that genuinely needs unit tests, and it should arrive with them.
- **No linter.** `npm run typecheck` runs TypeScript in strict mode with
  `noUncheckedIndexedAccess`. Add ESLint if you want stylistic enforcement too.
- **No generated Supabase types.** Repositories cast query results to
  hand-written domain types. Run `supabase gen types typescript` and wire the
  generated `Database` type into the clients when the schema settles.
- **No CI pipeline, rate limiting, or observability.**

---

## Stack

Next.js 16 (App Router) · React 19 · TypeScript 5.9 (strict) · Tailwind CSS 4 ·
Supabase (Postgres, Auth, Storage) · Zod 4 · lucide-react

Runtime dependencies are limited to those eight; there is no component library,
state manager, or data-fetching library.
