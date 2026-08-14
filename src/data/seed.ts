import type { Database } from './db';

import {
  AppointmentRepository,
  AuditLogRepository,
  CustomerRepository,
  DayCloseRepository,
  ExpenseRepository,
  InventoryRepository,
  JobRepository,
  PaymentRepository,
  RecentPlateRepository,
  ServiceInventoryRepository,
  ServiceRepository,
  SettingsRepository,
  StockAdjustmentRepository,
  UserRepository,
  VehicleRepository,
  VoidRequestRepository,
} from './repositories';
import { DEFAULT_SCHEDULE, SETTING_KEYS } from '@/domain/settings';
import { toDateKey } from '@/domain/appointment';
import { dateKey } from '@/domain/day-close';
import { dedupeDuplicateServices } from '@/services/services';
import type { NewAuditLog } from '@/data/repositories';

const defaultWashers = [
  { id: 'seed-washer-1', email: 'washer1@washflow.app', name: 'Rico Bautista', role: 'washer' as const },
  { id: 'seed-washer-2', email: 'washer2@washflow.app', name: 'Jojo Villanueva', role: 'washer' as const },
];

const defaultServices = [
  {
    id: 'seed-service-express',
    name: 'Express Wash',
    description: 'Exterior wash, wheels, and windows.',
    priceCents: 19900,
    durationMinutes: 20,
    sortOrder: 1,
  },
  {
    id: 'seed-service-full-detail',
    name: 'Full Detail',
    description: 'Express wash plus interior vacuum and wipe-down.',
    priceCents: 49900,
    durationMinutes: 45,
    sortOrder: 2,
  },
  {
    id: 'seed-service-premium',
    name: 'Premium Detail',
    description: 'Full detail plus wax, polishing, and engine bay.',
    priceCents: 79900,
    durationMinutes: 60,
    sortOrder: 3,
  },
];

const defaultInventoryItems = [
  {
    name: 'Car shampoo',
    category: 'cleaning' as const,
    unit: 'L',
    quantity: 6,
    lowStockThreshold: 2,
  },
  {
    name: 'Microfiber towels',
    category: 'supplies' as const,
    unit: 'pc',
    quantity: 24,
    lowStockThreshold: 10,
  },
  {
    name: 'Glass cleaner',
    category: 'chemicals' as const,
    unit: 'bottle',
    quantity: 1,
    lowStockThreshold: 2,
  },
  {
    name: 'Interior protectant',
    category: 'chemicals' as const,
    unit: 'bottle',
    quantity: 4,
    lowStockThreshold: 2,
  },
];

const demoVehicles = [
  { customerId: 'seed-customer-juan', vehicleId: 'seed-vehicle-abc-1234', customerName: 'Juan Dela Cruz', phone: '09171234567', plate: 'ABC-1234', make: 'Toyota', model: 'Vios', color: 'White', year: 2019 },
  { customerId: 'seed-customer-maria', vehicleId: 'seed-vehicle-xyz-5678', customerName: 'Maria Santos', phone: '09179876543', plate: 'XYZ-5678', make: 'Honda', model: 'Civic', color: 'Black', year: 2021 },
  { customerId: 'seed-customer-guest', vehicleId: 'seed-vehicle-qwe-9999', customerName: 'Walk-in Guest', phone: null, plate: 'QWE-9999', make: 'Mitsubishi', model: 'Mirage', color: 'Gray', year: 2020 },
  { customerId: 'seed-customer-ana', vehicleId: 'seed-vehicle-fgh-2345', customerName: 'Ana Reyes', phone: '09172345678', plate: 'FGH-2345', make: 'Suzuki', model: 'Ertiga', color: 'Red', year: 2022 },
  { customerId: 'seed-customer-carlo', vehicleId: 'seed-vehicle-klm-8765', customerName: 'Carlo Mendoza', phone: '09176543210', plate: 'KLM-8765', make: 'Nissan', model: 'Navara', color: 'Blue', year: 2018 },
];

export async function seedIfEmpty(db: Database): Promise<void> {
  const services = new ServiceRepository(db);
  await dedupeDuplicateServices();
  for (const service of defaultServices) {
    if (!(await services.findByName(service.name))) {
      await services.create(service);
    }
  }

  const users = new UserRepository(db);
  if ((await users.listWashers()).length === 0) {
    for (const washer of defaultWashers) {
      await users.upsert(washer);
    }
  }

  const settings = new SettingsRepository(db);
  if ((await settings.get(SETTING_KEYS.slotMinutes)) === null) {
    await settings.set(SETTING_KEYS.businessOpenMinutes, String(DEFAULT_SCHEDULE.openMinutes));
    await settings.set(SETTING_KEYS.businessCloseMinutes, String(DEFAULT_SCHEDULE.closeMinutes));
    await settings.set(SETTING_KEYS.slotMinutes, String(DEFAULT_SCHEDULE.slotMinutes));
  }

  const inventory = new InventoryRepository(db);
  if ((await inventory.listAll()).length === 0) {
    const stock = new StockAdjustmentRepository(db);
    for (const item of defaultInventoryItems) {
      const created = await inventory.create(item);
      await stock.create({
        itemId: created.id,
        changeQty: item.quantity,
        type: 'restock',
        reason: 'Initial stock (demo)',
      });
    }
  }

  // ── Service recipes (auto-deduct inventory) ─────────────────────────────
  const serviceRecipes = new ServiceInventoryRepository(db);
  if ((await serviceRecipes.listAll()).length === 0) {
    const byService = new Map(
      (await services.listActive()).map((service) => [service.name, service]),
    );
    const express = byService.get('Express Wash');
    const fullDetail = byService.get('Full Detail');
    const premium = byService.get('Premium Detail');
    const byItemName = new Map((await inventory.listAll()).map((item) => [item.name, item]));
    const shampoo = byItemName.get('Car shampoo');
    const towels = byItemName.get('Microfiber towels');
    const protectant = byItemName.get('Interior protectant');
    if (express && shampoo) {
      await serviceRecipes.create({ serviceId: express.id, inventoryItemId: shampoo.id, quantityUsed: 1 });
    }
    if (fullDetail && shampoo && towels) {
      await serviceRecipes.create({ serviceId: fullDetail.id, inventoryItemId: shampoo.id, quantityUsed: 1 });
      await serviceRecipes.create({ serviceId: fullDetail.id, inventoryItemId: towels.id, quantityUsed: 2 });
    }
    if (premium && shampoo && towels && protectant) {
      await serviceRecipes.create({ serviceId: premium.id, inventoryItemId: shampoo.id, quantityUsed: 1 });
      await serviceRecipes.create({ serviceId: premium.id, inventoryItemId: towels.id, quantityUsed: 3 });
      await serviceRecipes.create({ serviceId: premium.id, inventoryItemId: protectant.id, quantityUsed: 1 });
    }
  }

  // Demo dataset only auto-seeds on a fresh install (no customers yet). The
  // "Load demo data" button calls `seedDemoData` directly to force it.
  const demoCustomers = new CustomerRepository(db);
  if ((await demoCustomers.list()).length === 0) {
    await seedDemoData(db);
  } else {
    // Already seeded: still ensure the demo audit trail exists so the
    // notifications feed is populated (idempotent per row).
    await seedDemoAuditTrail(db);
  }
}

/** Idempotent demo dataset: creates demo customers/vehicles/jobs/etc. only when
 *  their deterministic rows are missing, so re-running is always safe. */
export async function seedDemoData(db: Database): Promise<void> {
  const services = new ServiceRepository(db);
  const customers = new CustomerRepository(db);
  const vehicles = new VehicleRepository(db);
  const jobs = new JobRepository(db);
  const payments = new PaymentRepository(db);
  const voidRequests = new VoidRequestRepository(db);
  const appointments = new AppointmentRepository(db);
  const recentPlates = new RecentPlateRepository(db);
  const expenses = new ExpenseRepository(db);
  const dayCloses = new DayCloseRepository(db);

  const byService = new Map(
    (await services.listActive()).map((service) => [service.name, service]),
  );
  const express = byService.get('Express Wash');
  const fullDetail = byService.get('Full Detail');
  const premium = byService.get('Premium Detail');
  if (!express || !fullDetail || !premium) {
    return;
  }

  const vehicleRows: { customerId: string; vehicleId: string }[] = [];
  for (const demo of demoVehicles) {
    let customer = await customers.findById(demo.customerId);
    if (!customer) {
      customer = await customers.create({
        id: demo.customerId,
        name: demo.customerName,
        phone: demo.phone ?? undefined,
      });
    }
    let vehicle = await vehicles.findById(demo.vehicleId);
    if (!vehicle) {
      vehicle = await vehicles.create({
        id: demo.vehicleId,
        plateNumber: demo.plate,
        customerId: customer.id,
        make: demo.make,
        model: demo.model,
        color: demo.color,
        year: demo.year,
      });
    }
    vehicleRows.push({ customerId: customer.id, vehicleId: vehicle.id });
    await recentPlates.record(demo.plate);
  }

  const [juan, maria, guest, ana, carlo] = vehicleRows;

  const ensureJob = async (id: string, input: Parameters<typeof jobs.create>[0]) => {
    const existing = await jobs.findById(id);
    if (existing) return existing;
    return jobs.create({ ...input, id });
  };

  const queuedJuan = await ensureJob('seed-job-queued-juan', {
    customerId: juan.customerId,
    vehicleId: juan.vehicleId,
    serviceId: express.id,
    priceCents: express.priceCents,
    status: 'queued',
  });
  await ensureJob('seed-job-queued-maria', {
    customerId: maria.customerId,
    vehicleId: maria.vehicleId,
    serviceId: fullDetail.id,
    priceCents: fullDetail.priceCents,
    status: 'queued',
  });
  await ensureJob('seed-job-assigned-ana', {
    customerId: ana.customerId,
    vehicleId: ana.vehicleId,
    serviceId: express.id,
    priceCents: express.priceCents,
    status: 'assigned',
    assignedTo: 'seed-washer-1',
  });
  await ensureJob('seed-job-progress-carlo', {
    customerId: carlo.customerId,
    vehicleId: carlo.vehicleId,
    serviceId: premium.id,
    priceCents: premium.priceCents,
    status: 'in_progress',
    assignedTo: 'seed-washer-2',
  });
  await ensureJob('seed-job-qc-guest', {
    customerId: guest.customerId,
    vehicleId: guest.vehicleId,
    serviceId: fullDetail.id,
    priceCents: fullDetail.priceCents,
    status: 'quality_check',
    assignedTo: 'seed-washer-1',
  });
  await ensureJob('seed-job-completed-juan', {
    customerId: juan.customerId,
    vehicleId: juan.vehicleId,
    serviceId: express.id,
    priceCents: express.priceCents,
    status: 'completed',
    assignedTo: 'seed-washer-2',
  });
  const paidMaria = await ensureJob('seed-job-paid-maria', {
    customerId: maria.customerId,
    vehicleId: maria.vehicleId,
    serviceId: express.id,
    priceCents: express.priceCents,
    status: 'paid',
    assignedTo: 'seed-washer-2',
  });
  const paidCarlo = await ensureJob('seed-job-paid-carlo', {
    customerId: carlo.customerId,
    vehicleId: carlo.vehicleId,
    serviceId: fullDetail.id,
    priceCents: fullDetail.priceCents,
    status: 'paid',
    assignedTo: 'seed-washer-1',
  });
  const voidedAna = await ensureJob('seed-job-voided-ana', {
    customerId: ana.customerId,
    vehicleId: ana.vehicleId,
    serviceId: express.id,
    priceCents: express.priceCents,
    status: 'voided',
  });

  if (!(await payments.findById('seed-payment-paid-maria'))) {
    await payments.add({ id: 'seed-payment-paid-maria', jobId: paidMaria.id, amountCents: paidMaria.priceCents, receivedBy: 'seed-washer-1' });
  }
  if (!(await payments.findById('seed-payment-paid-carlo'))) {
    await payments.add({ id: 'seed-payment-paid-carlo', jobId: paidCarlo.id, amountCents: paidCarlo.priceCents, method: 'gcash', receivedBy: 'seed-washer-1' });
  }
  if (!(await voidRequests.findById('seed-void-voided-ana'))) {
    await voidRequests.create({
      id: 'seed-void-voided-ana',
      jobId: voidedAna.id,
      requestedBy: 'seed-washer-2',
      reason: 'Customer did not push through',
      status: 'approved',
      resolvedBy: 'seed-washer-1',
    });
  }
  if (!(await voidRequests.findById('seed-void-pending-juan'))) {
    await voidRequests.create({
      id: 'seed-void-pending-juan',
      jobId: queuedJuan.id,
      requestedBy: 'seed-washer-2',
      reason: 'Customer found a scratch and asked to cancel',
      status: 'pending',
    });
  }

  const today = toDateKey(Date.now());
  const slotStart = (clock: string) => new Date(`${today}T${clock}:00`).getTime();
  if (!(await appointments.findById('seed-appt-juan-0900'))) {
    await appointments.create({
      id: 'seed-appt-juan-0900',
      vehicleId: juan.vehicleId,
      customerId: juan.customerId,
      serviceId: premium.id,
      date: today,
      slotStart: slotStart('09:00'),
    });
  }
  if (!(await appointments.findById('seed-appt-maria-1030'))) {
    await appointments.create({
      id: 'seed-appt-maria-1030',
      vehicleId: maria.vehicleId,
      customerId: maria.customerId,
      serviceId: fullDetail.id,
      date: today,
      slotStart: slotStart('10:30'),
    });
  }
  if (!(await appointments.findById('seed-appt-guest-noshow'))) {
    await appointments.create({
      id: 'seed-appt-guest-noshow',
      vehicleId: guest.vehicleId,
      customerId: guest.customerId,
      serviceId: express.id,
      date: today,
      slotStart: slotStart('08:00'),
      status: 'no-show',
    });
  }

  if (!(await expenses.findById('seed-expense-shampoo'))) {
    await expenses.create({
      id: 'seed-expense-shampoo',
      amountCents: 89900,
      category: 'supplies',
      description: 'Shampoo + microfiber refill',
      incurredAt: Date.now(),
      loggedBy: null,
    });
  }
  if (!(await expenses.findById('seed-expense-water'))) {
    await expenses.create({
      id: 'seed-expense-water',
      amountCents: 250000,
      category: 'utilities',
      description: 'Water bill',
      incurredAt: Date.now(),
      loggedBy: null,
    });
  }

  const yesterday = dateKey(Date.now() - 24 * 60 * 60 * 1000);
  if (!(await dayCloses.findByDay(yesterday))) {
    await dayCloses.create({
      id: 'seed-day-close-yesterday',
      day: yesterday,
      closedBy: 'seed-washer-1',
      closedAt: Date.now() - 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000,
      jobCount: 14,
      revenueCents: 359800,
      revenueByMethodCents: { cash: 259800, gcash: 100000 },
      voidedCount: 1,
      voidedAmountCents: 19900,
      expensesCents: 89900,
      noShowCount: 1,
      expectedCashCents: 359800,
      declaredCashCents: 360000,
      varianceCents: 200,
      notes: 'Demo close — balanced drawer.',
    });
  }

  // ── Demo audit trail (local-only; feeds the notifications feed) ─────────
  await seedDemoAuditTrail(db);
}

/** Seeds the local-only demo audit trail (feeds the notifications feed and
 *  audit trail viewer). Idempotent per row. Requires demo jobs/payments to
 *  exist so their ids + amounts can be referenced. */
export async function seedDemoAuditTrail(db: Database): Promise<void> {
  const audits = new AuditLogRepository(db);
  const jobs = new JobRepository(db);

  const job = async (id: string) => (await jobs.findById(id)) ?? { id, priceCents: 0 };

  const queuedJuan = await job('seed-job-queued-juan');
  const queuedMaria = await job('seed-job-queued-maria');
  const completedJuan = await job('seed-job-completed-juan');
  const voidedAna = await job('seed-job-voided-ana');
  const paidMaria = await job('seed-job-paid-maria');
  const paidCarlo = await job('seed-job-paid-carlo');

  const yesterday = dateKey(Date.now() - 24 * 60 * 60 * 1000);
  const demoAuditRows: (NewAuditLog & { id: string })[] = [
    { id: 'seed-audit-checkin-juan', actorId: 'seed-washer-1', action: 'job-checked-in', entity: 'job', entityId: queuedJuan.id, details: JSON.stringify({ plate: 'ABC-1234', service: 'Express Wash' }) },
    { id: 'seed-audit-checkin-maria', actorId: 'seed-washer-1', action: 'job-checked-in', entity: 'job', entityId: queuedMaria.id, details: JSON.stringify({ plate: 'XYZ-5678', service: 'Full Detail' }) },
    { id: 'seed-audit-claim-ana', actorId: 'seed-washer-1', action: 'job-claim', entity: 'job', entityId: voidedAna.id, details: JSON.stringify({ plate: 'FGH-2345' }) },
    { id: 'seed-audit-claim-carlo', actorId: 'seed-washer-2', action: 'job-claim', entity: 'job', entityId: 'seed-job-progress-carlo', details: JSON.stringify({ plate: 'KLM-8765' }) },
    { id: 'seed-audit-completed-juan', actorId: 'seed-washer-2', action: 'job-completed', entity: 'job', entityId: completedJuan.id, details: JSON.stringify({ plate: 'ABC-1234' }) },
    { id: 'seed-audit-paid-maria', actorId: 'seed-washer-1', action: 'job-paid', entity: 'payment', entityId: 'seed-payment-paid-maria', details: JSON.stringify({ plate: 'XYZ-5678', amountCents: paidMaria.priceCents, method: 'cash' }) },
    { id: 'seed-audit-paid-carlo', actorId: 'seed-washer-1', action: 'job-paid', entity: 'payment', entityId: 'seed-payment-paid-carlo', details: JSON.stringify({ plate: 'KLM-8765', amountCents: paidCarlo.priceCents, method: 'gcash' }) },
    { id: 'seed-audit-void-request', actorId: 'seed-washer-2', action: 'void-requested', entity: 'void_request', entityId: 'seed-void-pending-juan', details: JSON.stringify({ plate: 'ABC-1234', reason: 'Customer found a scratch and asked to cancel' }) },
    { id: 'seed-audit-void-approved', actorId: 'seed-washer-1', action: 'void-approved', entity: 'void_request', entityId: 'seed-void-voided-ana', details: JSON.stringify({ plate: 'FGH-2345', amountCents: voidedAna.priceCents }) },
    { id: 'seed-audit-appointment-booked', actorId: 'seed-washer-1', action: 'appointment-booked', entity: 'appointment', entityId: 'seed-appt-juan-0900', details: JSON.stringify({ plate: 'ABC-1234', time: '09:00' }) },
    { id: 'seed-audit-expense', actorId: 'seed-washer-1', action: 'expense-logged', entity: 'expense', entityId: 'seed-expense-shampoo', details: JSON.stringify({ amountCents: 89900, category: 'supplies', description: 'Shampoo + microfiber refill' }) },
    { id: 'seed-audit-day-close', actorId: 'seed-washer-1', action: 'day-close', entity: 'day_close', entityId: 'seed-day-close-yesterday', details: JSON.stringify({ day: yesterday, revenueCents: 359800, declaredCashCents: 360000, varianceCents: 200 }) },
    { id: 'seed-audit-signin', actorId: 'seed-washer-1', action: 'sign-in', entity: 'user', entityId: 'seed-washer-1' },
  ];
  for (const row of demoAuditRows) {
    if (!(await audits.findById(row.id))) {
      await audits.create(row);
    }
  }
}
