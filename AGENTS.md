# WashFlow — Project Brief

Offline-first car wash management system. React Native + Expo + TypeScript + Expo Router + NativeWind, Zustand + TanStack Query, SQLite + Drizzle ORM, Supabase, Expo Notifications (FCM deferred). Portfolio-first, designed to be deployable.

## 1. Product Summary

- Single-branch car wash management system for check-in, queueing, washing, and payment.
- Supports BOTH appointments (fixed 30-min slots, configurable) and walk-ins.
- Fully offline-capable: check-in, queue, payments, job completion, appointments, inventory, expenses all work without internet for 2–7 days.
- Sync engine is the portfolio centerpiece and the single most important feature.
- Cash-only payments in v1. GCash, Maya, and cards are FUTURE (documented, out of v1).
- Mobile-only. No web dashboard in v1. No hardware/POS integration in v1.

## 2. User Summary

Roles (hierarchy: Admin > Manager > Cashier > Washer):

- **Admin**: user management, settings, inventory management, config, day-close reopen.
- **Manager**: open/close day, reconciliation with declared-cash variance, conflict review queue, force-assign/reassign jobs, void approval, create accounts (provisioned via backend).
- **Cashier**: check-in, queue assignment, take cash payment, mark complete, register vehicles, log expenses. CANNOT void paid/claimed jobs, edit prices, apply discounts, see revenue reports, manage inventory/users.
- **Washer**: sees queue + jobs only. No prices, no revenue, no customer contact beyond name/vehicle. Can pull jobs, complete, attach photos, Quality Check (self-check or manager).

Devices: shared counter devices with sign-in/sign-out switching (session persists until sign-out; new sign-in requires network). Per-user audit trails on device.

## 3. Scope Summary

In v1:
- Walk-in + appointment check-in, queue, job lifecycle, cash payment, vehicle/customer registry with history, optional before/after photos, manual inventory + low-stock alerts, expense logging, daily reports + employee performance, local notifications, light-first theme with dark mode, in-app user provisioning, offline-first everything.

Explicitly OUT OF SCOPE (v1):
- Hardware/POS integration, receipt printing, GCash/Maya/cards, push notifications (FCM), customer notifications, web dashboard, multi-branch/tenant, payroll/leave, loyalty program, auto-deduct inventory, free-form appointment times.

## 4. Core Workflows

### Walk-in check-in (3 taps)
1. Plate number → auto-match existing vehicle.
2. Select service preset (Express/Full Detail/Premium) — no price typing.
3. Confirm & Queue.
New vehicle → prompts name + phone (optional). "Last 5 plates" chips on home for one-tap re-entry.

### Appointment booking
Fixed 30-min slots. Offline double-booking resolved by First-Write-Wins: first upload on sync wins the slot; the loser is auto-moved to next available slot and flagged "Rescheduled by system" for Manager.

### Job lifecycle
`Queued → Assigned → In Progress → Quality Check → Completed → Paid` + terminal `Voided`.
- Washers pull next job ("Claim Next") or tap a specific job; Manager/Cashier can force-assign/reassign/reorder.
- First-claim-wins on offline multi-device claims; loser sees "Already claimed".
- Photos: 1–2 before/after, optional, never blocks completion, compressed + deferred upload.

### Payment
Cash at pickup. Payment is its own event (washed ≠ paid). Voids: allowed only while unclaimed AND unpaid; once claimed or paid, void requires Manager approval.

### Day-close (manual)
Manager taps "Close Day" (works offline, idempotent, once per day; reopen = Admin). Auto-generates Daily Report: job count, revenue by payment type, voids with reason, expenses, expected vs declared cash with variance.

### Sync
- Offline queue with retry/backoff; background merge with "synced" indicator.
- Conflict: Last-Write-Wins for routine data; financial events (payments, voids, price edits) go to a Manager conflict-review queue.
- Soft-delete everywhere with tombstones that propagate.
- Server-assigned sequence/timestamp on sync (never device clocks).

### Notifications (v1)
Local only: job-assignment buzz to Washer, day-close summary to Manager. No customer notifications.

## 5. Business Rules

- Cashier void: only if job unclaimed and unpaid.
- Void after claim/payment: Manager approval required.
- Day-close: manual, offline-capable, idempotent, one per day.
- Appointment slot conflict: first-write-wins + auto-reflow to next slot, flagged.
- Job claim conflict: first-claim-wins, loser notified.
- Deletion: soft-delete + tombstone, propagates.
- Financial conflicts: Manager review queue on reconnect.
- Washer never sees prices/revenue/customer contact.
- Sign-in requires network; session persists until sign-out.

## 6. Assumptions

- Single store, single location; no tenant/org modeling in v1 (data model stays extensible for future multi-branch).
- Deployment is a future goal; architecture must stay production-honest (proper auth, Supabase schema built for real deployment).
- Fixed 30-min appointment slots (configurable), not free-form.
- Employee performance reporting included in v1; monthly trends deferred.
- Inventory is manual (no auto-deduct); restocking logged as expenses; low-stock thresholds alert.
- Branding: default water-themed palette (blue/teal) used for now, swappable later.
- Receipts are digital/in-app only.
- FCM push notifications deferred to phase 2 (noted as future).
- A new day may be opened while an old one is unclosed; only Admin can retroactively close it.

## 7. Open Questions

- Reporting: employee performance confirmed; confirm whether monthly trends are needed in v1 (currently deferred).
- Branding: confirm default blue/teal palette is acceptable.
- None blocking architecture.

## 8. Risks

- Offline sync complexity (ordering, clock skew) — mitigated by server-assigned sequences.
- Appointment auto-reflow may surprise customers — requires explicit notice UI.
- Photo sync payload weight — compression + deferred upload so it never starves critical sync.
- Shared devices + offline auth — new sign-in requires network; deactivated users may hold cached sessions (audit + server-side revocation on reconnect).
- Multi-device claims/voids require strict first-write-wins semantics across all mutation types.

## GitHub Workflow (locked)

- Git Flow: `main` (production), `develop`, `feature/*`.
- Conventional commits (`feat:`, `fix:`, ...), short PRs.
- **Phase merge ritual (always do this):** after each phase is verified and approved, merge `develop` into `main` with:
  `git checkout main; git pull origin main; git merge develop; git push origin main` — then switch back: `git checkout develop`.
- Demo strategy: seed script with realistic fake data + one-tap "Demo Mode" pre-populated app + README architecture section.
- Portfolio showcase centerpiece: the sync engine (conflict resolution, offline queue, tombstones).

## Technical Architecture (approved)

### Stack
- Expo (latest stable) + React Native + TypeScript (strict) + Expo Router (file-based routing).
- NativeWind v4 (Tailwind-style) for styling; tokens support light-first + dark mode.
- Zustand (session, UI, ephemeral app state) + TanStack Query (server state, backed by SQLite).
- SQLite via `expo-sqlite` + Drizzle ORM (local-first source of truth).
- Supabase (Postgres mirror + Auth + admin user provisioning). Zod for shape contracts.

### Layered design
1. **Domain** — pure TS entities, business rules, validation (framework-agnostic). Rules live here: void permissions, day-close idempotency, slot reflow, claim-wins.
2. **Data** — Drizzle schema + migrations (local SQLite; remote Postgres mirror keeps column parity), repositories.
3. **Sync engine** (centerpiece) — outbox/change-log on every mutation, retry/backoff queue, server-assigned sequence (never device clocks), LWW resolver, financial-events conflict queue for Manager, deferred low-priority photo upload, tombstone propagation.
4. **State** — Zustand for ephemeral; TanStack Query caches over SQLite-backed repos.
5. **Services** — auth/session, notifications, camera/media, filesystem.
6. **UI** — Expo Router screens + reusable NativeWind components + role-based guards.

### Sync invariants
- Every table: `id` (UUIDv7), `version`, `server_seq`, `deleted_at` (tombstone), `origin_device`.
- Local write → optimistic apply to SQLite → outbox push (ordered) → server assigns `seq` → pull `seq > last_pulled`.
- Routine conflicts: Last-Write-Wins. Financial rows (payments, voids, price edits): routed to `conflict_review` → Manager screen.
- Slots + claims: server-side atomic checks during push (first-write-wins / first-claim-wins).

### Data entities
`users`, `sessions` (local), `roles`, `customers`, `vehicles`, `services` (price presets), `jobs` (status lifecycle, assigned washer), `appointments` (slots, reschedule flags), `payments`, `expenses`, `inventory_items`, `stock_adjustments`, `photos` (before/after, sync priority), `outbox`, `sync_state`, `conflict_review`, `audit_log`, `day_closes`.

### Folder layout (high level)
- `app/` — Expo Router routes (auth, cashier, manager, admin, washer role groups).
- `src/domain/` `src/data/` `src/sync/` `src/services/` `src/stores/` `src/api/` `src/components/` `src/theme/` `src/utils/`
- `drizzle/` — local migrations. `supabase/` — remote schema + migrations + seed. `scripts/` — seed/demo data.

### Auth
Supabase Auth (email/password) + Admin API for in-app provisioning. Offline session persisted until sign-out; new sign-in requires network; deactivated users revoked on reconnect. Per-user audit log on device.

### Notifications (v1)
`expo-notifications` local only: job-assignment buzz (washer), day-close summary (manager). FCM = phase 2.

## Implementation Roadmap (locked, phase-gated)

Each phase ends with a STOP + approval gate (Push to GitHub / Review / UI mockups / Continue).

- **P0 Foundation** — Expo scaffold, TypeScript strict, NativeWind + theme tokens (light/dark), Expo Router skeleton, lint/typecheck, Git Flow init.
- **P1 Local data layer** — Drizzle schema, SQLite migrations, repositories, seed script (vehicles/customers/services).
- **P2 Auth + roles** — Supabase Auth, in-app provisioning, sessions, audit trail, RBAC guards.
- **P3 Check-in flow** — 3-tap walk-in, vehicle match + create, last-5-plates chips, queue screen.
- **P4 Job lifecycle** — statuses, Claim Next, force-assign/reassign, quality check, photos (deferred upload), local notifications.
- **P5 Payments + voids** — cash payment, cashier void rules, Manager approval flow.
- **P6 Appointments** — fixed slots, booking, first-write-wins + auto-reflow, "Rescheduled by system" notice.
- **P7 Inventory + expenses** — manual stock, low-stock alerts, expense logging.
- **P8 Sync engine** — outbox, sequence ordering, conflict resolver + review queue, sync UI, tombstones, photo deferral. (Split into P8a/b/c — largest phase.)
- **P9 Reports + day-close** — daily report, declared-cash variance, employee performance, audit.
- **P10 Polish + demo** — dark mode pass, Demo Mode, seed script, README architecture section, tests, portfolio packaging.

### Phase status

- **P0 Foundation — DONE** (commit `b943fa9`, branch `main`): Expo SDK 57 + TS strict, NativeWind v4.2.6 (Tailwind 3.4, `darkMode: class`) + brand tokens (water palette), Expo Router skeleton with `(auth)` + `(app)` role groups (admin/manager/cashier/washer) + `RoleGuard`, Zustand session store, TanStack Query provider, ESLint (eslint-config-expo flat) + `typecheck`. Git Flow: `main`/`develop` on GitHub.
- **P1 Local data layer — DONE** (on `develop`): Drizzle schema (`src/data/schema/`: customers/vehicles/services + sync columns `id/version/server_seq/deleted_at/origin_device`), migrations generated (`drizzle/`, inlined via `babel-plugin-inline-import` + `metro sourceExts: sql`), DB bootstrap `src/data/db.ts` (gated in root layout), repositories (`src/data/repositories/`), UUIDv7 util, dev seed (`src/data/seed.ts`). `npm run db:generate` regenerates migrations.
- **P2 Auth + roles — DONE** (commit `f31a26d` on `develop`, merged to `main`): Supabase client (`src/api/supabase.ts`, AsyncStorage-persisted session), `src/domain/user.ts` roles (role from `app_metadata.role`, least-privilege fallback `washer`), auth service (`src/services/auth.ts`: sign-in/sign-out/restore, offline-aware errors), Zustand session store (`hydrate/signIn/signOut`, hydrated in root layout), real email/password sign-in screen, `SessionHeader` (role badge + sign out) on all role homes, `audit_log` table (migration `0001`) + repository + `logAudit()` service wired to sign-in/out, in-app provisioning: `provision-user` Edge Function (admin-only, service role) + client `src/services/provisioning.ts`, `supabase/schema.sql` (profiles + signup trigger + RLS). VERIFIED: lint + typecheck + Android bundle export; live sign-in flow works against `slanciuxvgusuperrjdj`. First admin provisioned: `admin@washflow.app` (dev password, change it). PENDING (needs Supabase PAT or dashboard): deploy `provision-user` function + run `schema.sql` (SQL Editor). Supabase CLI v2.111.0 at `%LOCALAPPDATA%\supabase-cli`.
- **P3 Check-in flow — DONE** (commit `5c19509` on `develop`, merged to `main`): `jobs` + `recent_plates` tables (migration `0002`) + repositories, `src/domain/job.ts` status lifecycle, `src/services/checkin.ts` (plate match, check-in, recent plates), TanStack hooks (`src/data/queries.ts`), `formatPesos`/`formatClockTime` utils, cashier screens with bottom tabs (`src/app/cashier/_layout.tsx` via Expo Router `Tabs`, index = check-in, queue) + admin Quick Access links to all role homes. VERIFIED: lint + typecheck + Android bundle export; check-in → queue + tabs work on-device. `@expo/vector-icons` added for tab icons.
- **P4a Job lifecycle — DONE** (commit `6171a83` on `develop`, merged to `main`): transition engine in `src/domain/job.ts` (`JOB_TRANSITIONS`/`canTransition`/`assertTransition`/`WORKING_STATUSES`), `users` local table (migration `0003`, seeded with dev washers, auto-upsert of signed-in users), `JobRepository` atomic `claim`/`assignTo`/`reassign`/`release`/`transition` (first-claim-wins via `WHERE status='queued' AND assigned_to IS NULL`) + washer/working board queries, `src/services/jobs.ts` (claim next, claim, start, mark done, approve QC, force-assign, reassign, release + audit logs), TanStack hooks + mutations, real washer screen (Claim Next, My Jobs with Start/Mark Done/Approve QC, no prices/contact), manager Day Board (grouped by status, Assign/Reassign/Release + washer picker modal). VERIFIED: lint + typecheck + Android bundle export. PENDING (P4b): before/after photos + local notifications (expo-notifications).
