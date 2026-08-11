# WashFlow

Offline-first car wash management system for a single branch: check-in, queueing, washing, payments, appointments, inventory, expenses, and daily reporting — all working without internet for days.

Built with **Expo + React Native + TypeScript (strict) + Expo Router + NativeWind**, backed by **SQLite + Drizzle ORM** locally and **Supabase** (Postgres mirror + Auth) as the cloud sync target.

## Highlights

- **Offline-first, always available.** Every mutation writes to local SQLite immediately; sync happens in the background when connectivity returns. The app never blocks on the network.
- **Sync engine as the centerpiece.** Outbox change-log on every mutation, ordered flush, server-assigned sequences (never device clocks), Last-Write-Wins for routine data, and a Manager conflict-review queue for financial rows (payments, voids, price edits). First-claim-wins for job claims, first-write-wins for appointment slots.
- **Role-based screens** for Admin, Manager, Cashier, and Washer — including strict guards (a Washer never sees prices or revenue).
- **Demo mode.** Tap "Load demo data" on the sign-in screen to seed realistic data (customers, jobs in every status, bookings, expenses, inventory, a closed day) and explore the app instantly.
- **Beyond v1.** GCash/Maya/card payments, digital receipts, FCM push notifications, a read-only web dashboard, free-form booking times, auto-deduct inventory, and monthly trends.

## Screenshots

> TODO: drop screenshots or a demo GIF here. Run `npx expo start`, sign in with
> a demo account, and capture: Check-in (with last-5-plates chips), Cashier
> Queue, Bookings slot grid, Manager Day Board, Sync Conflicts, Day Close
> variance, Washer jobs, Admin Inventory, and the light/dark toggle.

## Quick start

```bash
npm install
npx expo start
```

Run checks:

```bash
npm run lint
npm run typecheck
npm test          # domain rule tests (Vitest)
npm run db:generate   # regenerate Drizzle migrations from schema
```

Demo accounts are provisioned via Supabase Auth (see `supabase/schema.sql` and the `provision-user` Edge Function). First admin: `admin@washflow.app`.

## Architecture

### Layered design

```
app/                Expo Router routes, grouped by role
src/domain/         Pure TS entities + business rules (no framework deps)
src/data/           Drizzle schema, SQLite migrations, repositories, seed
src/sync/           Outbox, sequence ordering, conflict resolution, engine
src/services/       Auth, jobs, payments, appointments, photos, day-close, ...
src/stores/         Zustand (session, ephemeral UI state)
src/api/            Supabase client
src/components/     Reusable NativeWind components
src/theme/          Brand tokens (light-first + dark mode)
drizzle/            Local SQLite migrations
supabase/           Remote Postgres schema + sync RPCs + Edge Functions
web/                Read-only web dashboard (Vite + React + Supabase)
tests/              Domain unit tests (Vitest)
```

The layering rule: **domain is pure and testable** — business rules (void permissions, day-close idempotency, slot reflow, claim-wins) live in `src/domain` with no database or React Native imports, so they run under Vitest without a device.

### Data layer

Local source of truth is SQLite via `expo-sqlite` + Drizzle ORM. Every synced table carries the sync invariants:

- `id` — UUIDv7
- `version` — bumped on every local mutation (LWW ordering)
- `server_seq` — assigned by the server on sync, never the device clock
- `deleted_at` — soft-delete tombstone that propagates
- `origin_device` — where the row was created

Migrations are generated with `drizzle-kit` into `drizzle/` and inlined into the bundle. Core entities: users, customers, vehicles, services, service_inventory_items, jobs, appointments, payments, void_requests, expenses, inventory_items, stock_adjustments, photos, day_closes, settings, recent_plates, outbox, sync_state, conflict_reviews, audit_log. (Local-only tables — sessions, push_tokens, photo_uploads — never sync.)

### Sync engine (portfolio centerpiece)

```
local write → optimistic apply to SQLite → outbox push (ordered)
            → server assigns seq → pull rows with seq > last_pulled
```

- **Outbox** — every repository mutation enqueues a change (`upsert`/`delete`). Pending rows flush in order with exponential backoff.
- **Sequencing** — the server owns the sequence; device clocks are never trusted for ordering.
- **Conflicts** — routine rows resolve with Last-Write-Wins. Financial rows (`payment`, `void_request`) are routed to `conflict_reviews` and shown on the Manager's **Sync Conflicts** screen (Keep remote / Keep local). Job claims and appointment slots use server-side atomic checks (first-write-wins) with typed conflict responses and auto-reflow for the slot loser.
- **Tombstones** — deletes propagate everywhere through `deleted_at`.
- **Photos** — before/after binaries are queued in a separate low-priority table and uploaded to Supabase Storage *outside* the critical sync cycle, so a large photo never starves row sync.

#### How a sync cycle works

```
Device                                                        Server (sync_mirror)
------                                                        -------------------
mutation → SQLite (optimistic) → outbox.enqueue(entity, id)
      │
      │ runSync() every ~20s while signed in (single-flight)
      ▼
coalescePending()  ── one entry per entity:id, ordered by createdAt
      │
      ▼
pushPending()
      │  remotePush() → sync_upsert(entity, full_snake_case_row)
      │                        │
      │                        ▼  advisory lock + first-write-wins checks
      │                        │  ok    → assign nextval(sync_seq) → upsert mirror
      │                        │  claim → {ok:false, code:'job_claimed'}
      │                        │  slot  → {ok:false, code:'slot_taken'}
      │                        ▼
      │  ok:true  → save server_seq on local row, mark outbox synced
      │  ok:false → settle outbox, record conflict_review (Manager), reflow slot
      │  network error → mark failed, retry after 1000 * 2^n ms (cap 60s)
      ▼
pullChanges()
      │  remotePull(after_seq = last_pulled) → sync_changes()
      ▼
      for each change:
        row already dirty locally? ──yes──► financial → conflict_review
                                            routine → skip (local wins by seq)
        clean? ──────────────────────────► upsert local, advance last_pulled
```

The **dirty check** is the heart of Last-Write-Wins: if a row still has a
pending outbox entry, the local device *already has* a newer change queued,
so it ignores the remote version and lets its own push win the sequence later.

#### Conflict matrix

| Row / condition | Resolution | Who decides |
| --- | --- | --- |
| Same routine row edited on 2 devices | Last-Write-Wins by `server_seq` (device with newer change wins) | automatic |
| `payment` row diverged | routed to `conflict_reviews` as `payment` | Manager |
| `void_request` row diverged | routed to `conflict_reviews` as `void` | Manager |
| Same job claimed by 2 washers | server returns `job_claimed`; first claim wins, loser gets a `claim` review entry | server + Manager |
| Same appointment slot booked by 2 devices | server returns `slot_taken`; winner keeps the slot, loser auto-reflows to the next free slot and gets a `slot` review entry | server + Manager |
| Soft-delete on one device | tombstone (`deleted_at`) propagates to all devices via normal upsert | automatic |

Manager actions on the **Sync Conflicts** screen: **Keep remote** (apply the
remote row, drop the queued local change), **Keep local** (leave the local
change queued so it wins on the next push), or **Dismiss** (no-op, for audit
only). Every resolution is audit-logged.

### Auth

Supabase Auth (email/password) with the role stored in `app_metadata.role` (fallback `washer`). Sessions persist on device until sign-out; new sign-ins require network. Sign-in/out is audit-logged, and in-app provisioning goes through an admin-only Edge Function. The web dashboard uses the same Supabase Auth with a manager/admin-only data gate.

### Notifications

- **Local** (`expo-notifications`): job-assignment buzz to washers, day-close summary to managers, and a "vehicle ready for pickup" alert.
- **Push** (V2): FCM/APNs routed through the Expo push service. Devices register an Expo push token, and the `send-push` Edge Function delivers assignment notifications to a washer's device. Push requires a dev/production build — Expo Go has no push.

## Roles

| Role | Can do |
| --- | --- |
| Admin | Users, settings, inventory + recipes, config, day-close reopen, closed-days list |
| Manager | Open/close day, reconciliation + variance, conflict review, force-assign/reassign, void approval, monthly trends, create accounts |
| Cashier | Check-in, queue, appointments, cash/GCash/Maya/card payment, digital receipts, mark complete, register vehicles, log expenses (no voids of claimed/paid jobs, no revenue reports) |
| Washer | Queue + jobs only — no prices, no revenue, no contact beyond name/vehicle |

## Out of scope

Hardware/POS, receipt printing, multi-branch/tenant, payroll, loyalty. (Web dashboard, FCM push, GCash/Maya/cards, digital receipts, free-form booking, customer-ready alerts, and auto-deduct inventory shipped in V2 — see Roadmap.)

## Deployment

The remote side is deployed to Supabase project `slanciuxvgusuperrjdj`:

- `supabase/schema.sql` — profiles table, signup trigger, RLS, push_tokens (idempotent, apply in SQL Editor)
- `supabase/sync.sql` — `sync_mirror` store + `sync_upsert` / `sync_changes` RPCs with server-side first-write-wins for claims and slots
- `supabase/dashboard.sql` — `dashboard_snapshot` RPC for the read-only web dashboard (manager/admin only)
- `provision-user` Edge Function — admin-only in-app provisioning, deployed ACTIVE with `verify_jwt: true`
- `send-push` Edge Function — JWT-verified push delivery via the Expo push service

To deploy to a fresh project: run `schema.sql` + `sync.sql` + `dashboard.sql` in the SQL Editor, then deploy both Edge Functions via the Supabase CLI (`supabase functions deploy`) or dashboard. `supabase/config.toml` is checked in for CLI deploys. Until a remote is configured the app works fully offline by design and the outbox grows locally.

## Roadmap

All v1 phases are complete and merged to `main`.

- **P0 Foundation** — Expo + TS strict scaffold, NativeWind theme tokens, Expo Router + role groups, CI (lint/typecheck/test).
- **P1 Local data layer** — Drizzle schema, SQLite migrations, repositories, seed.
- **P2 Auth + roles** — Supabase Auth, in-app provisioning Edge Function, sessions, audit trail, RBAC guards.
- **P3 Check-in** — 3-tap walk-in, vehicle match/create, last-5-plates chips, queue.
- **P4 Job lifecycle + photos + notifications** — status engine, Claim Next, force-assign/reassign, quality check, before/after photos (deferred upload), local notifications.
- **P5 Payments + voids** — cash payment, cashier void rules, Manager approval flow.
- **P6 Appointments** — fixed 30-min slots, booking, first-write-wins + auto-reflow, reschedule notices.
- **P7 Inventory + expenses** — manual stock, low-stock alerts, expense logging.
- **P8 Sync engine** — outbox, server-assigned sequences, LWW + conflict-review queue, tombstones, photo deferral. (Centerpiece; split P8a/b.)
- **P9 Reports + day-close** — daily report, declared-cash variance, employee performance.
- **P10 Polish + demo** — Demo Mode, in-app theme toggle (light/dark/system), domain unit tests, README.
- **Post-P10** — admin user management (list/edit/reset, provision via Edge Function), collection history, photo viewer, self-healing DB init.

### V2 (shipped on `develop`, merged to `main`)

- **V2-T1** — payment methods (cash/gcash/maya/card) with per-method day-close breakdown, FCM push via the Expo push service, and a read-only web dashboard (`web/`) for Manager/Admin.
- **V2-T2** — digital receipts (in-app + shareable), free-form appointment times (any start + duration, overlap-based conflict + auto-reflow), and customer-ready notices (local alert + shareable status text).
- **V2-T3** — auto-deduct inventory (per-service recipes clamped to on-hand), monthly trends (revenue/jobs/voids/expenses by month + team performance).

Future ideas (not yet built): multi-branch/tenant, receipt printing, payroll, loyalty.
