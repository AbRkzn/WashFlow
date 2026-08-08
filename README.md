# WashFlow

Offline-first car wash management system for a single branch: check-in, queueing, washing, payments, appointments, inventory, expenses, and daily reporting — all working without internet for days.

Built with **Expo + React Native + TypeScript (strict) + Expo Router + NativeWind**, backed by **SQLite + Drizzle ORM** locally and **Supabase** (Postgres mirror + Auth) as the cloud sync target.

## Highlights

- **Offline-first, always available.** Every mutation writes to local SQLite immediately; sync happens in the background when connectivity returns. The app never blocks on the network.
- **Sync engine as the centerpiece.** Outbox change-log on every mutation, ordered flush, server-assigned sequences (never device clocks), Last-Write-Wins for routine data, and a Manager conflict-review queue for financial rows (payments, voids, price edits). First-claim-wins for job claims, first-write-wins for appointment slots.
- **Role-based screens** for Admin, Manager, Cashier, and Washer — including strict guards (a Washer never sees prices or revenue).
- **Demo mode.** Tap "Load demo data" on the sign-in screen to seed realistic data (customers, jobs in every status, bookings, expenses, inventory, a closed day) and explore the app instantly.

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
supabase/           Remote Postgres schema + sync RPCs (deploy in SQL Editor)
scripts/            Seed/demo data
tests/              Domain unit tests
```

The layering rule: **domain is pure and testable** — business rules (void permissions, day-close idempotency, slot reflow, claim-wins) live in `src/domain` with no database or React Native imports, so they run under Vitest without a device.

### Data layer

Local source of truth is SQLite via `expo-sqlite` + Drizzle ORM. Every synced table carries the sync invariants:

- `id` — UUIDv7
- `version` — bumped on every local mutation (LWW ordering)
- `server_seq` — assigned by the server on sync, never the device clock
- `deleted_at` — soft-delete tombstone that propagates
- `origin_device` — where the row was created

Migrations are generated with `drizzle-kit` into `drizzle/` and inlined into the bundle. Core entities: users, customers, vehicles, services, jobs, appointments, payments, void_requests, expenses, inventory_items, stock_adjustments, photos, day_closes, outbox, sync_state, conflict_reviews, audit_log.

### Sync engine (portfolio centerpiece)

```
local write → optimistic apply to SQLite → outbox push (ordered)
            → server assigns seq → pull rows with seq > last_pulled
```

- **Outbox** — every repository mutation enqueues a change (`upsert`/`delete`). Pending rows flush in order with exponential backoff.
- **Sequencing** — the server owns the sequence; device clocks are never trusted for ordering.
- **Conflicts** — routine rows resolve with Last-Write-Wins. Financial rows (`payment`, `void_request`) are routed to `conflict_reviews` and shown on the Manager's **Sync Conflicts** screen (Keep remote / Keep local). Job claims and appointment slots use server-side atomic checks (first-write-wins) with typed conflict responses and auto-reflow for the slot loser.
- **Tombstones** — deletes propagate everywhere through `deleted_at`.

### Auth

Supabase Auth (email/password) with the role stored in `app_metadata.role` (fallback `washer`). Sessions persist on device until sign-out; new sign-ins require network. Sign-in/out is audit-logged, and in-app provisioning goes through an admin-only Edge Function.

### Notifications

`expo-notifications`, local only in v1 (job-assignment buzz to washers, day-close summary to managers). Push (FCM) is explicitly deferred to phase 2.

## Roles

| Role | Can do |
| --- | --- |
| Admin | Users, settings, inventory, config, day-close reopen |
| Manager | Open/close day, reconciliation + variance, conflict review, force-assign/reassign, void approval, create accounts |
| Cashier | Check-in, queue, cash payment, mark complete, register vehicles, log expenses (no voids of claimed/paid jobs, no revenue reports) |
| Washer | Queue + jobs only — no prices, no revenue, no contact beyond name/vehicle |

## Out of scope (v1)

Hardware/POS, receipt printing, GCash/Maya/cards, push notifications, customer notifications, web dashboard, multi-branch, payroll, loyalty, auto-deduct inventory, free-form appointment times.

## Deployment

`supabase/schema.sql` + `supabase/sync.sql` and the `provision-user` Edge Function must be deployed to your Supabase project (SQL Editor + Functions). Until then the app works fully offline by design and the outbox grows locally.

## Roadmap

Implemented: P0 Foundation · P1 Local data layer · P2 Auth + roles · P3 Check-in · P4 Job lifecycle + photos + local notifications · P5 Payments + voids · P6 Appointments · P7 Inventory + expenses · P8 Sync engine (outbox, conflicts) · P9 Reports + day-close · P10 Polish + demo (in progress).
