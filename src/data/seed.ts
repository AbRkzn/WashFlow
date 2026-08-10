import type { Database } from './db';

import {
  AppointmentRepository,
  CustomerRepository,
  DayCloseRepository,
  ExpenseRepository,
  InventoryRepository,
  JobRepository,
  PaymentRepository,
  RecentPlateRepository,
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

const defaultWashers = [
  { id: 'seed-washer-1', email: 'washer1@washflow.app', name: 'Rico Bautista', role: 'washer' as const },
  { id: 'seed-washer-2', email: 'washer2@washflow.app', name: 'Jojo Villanueva', role: 'washer' as const },
];

const defaultServices = [
  {
    name: 'Express Wash',
    description: 'Exterior wash, wheels, and windows.',
    priceCents: 19900,
    durationMinutes: 20,
    sortOrder: 1,
  },
  {
    name: 'Full Detail',
    description: 'Express wash plus interior vacuum and wipe-down.',
    priceCents: 49900,
    durationMinutes: 45,
    sortOrder: 2,
  },
  {
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
  { customerName: 'Juan Dela Cruz', phone: '09171234567', plate: 'ABC-1234', make: 'Toyota', model: 'Vios', color: 'White', year: 2019 },
  { customerName: 'Maria Santos', phone: '09179876543', plate: 'XYZ-5678', make: 'Honda', model: 'Civic', color: 'Black', year: 2021 },
  { customerName: 'Walk-in Guest', phone: null, plate: 'QWE-9999', make: 'Mitsubishi', model: 'Mirage', color: 'Gray', year: 2020 },
  { customerName: 'Ana Reyes', phone: '09172345678', plate: 'FGH-2345', make: 'Suzuki', model: 'Ertiga', color: 'Red', year: 2022 },
  { customerName: 'Carlo Mendoza', phone: '09176543210', plate: 'KLM-8765', make: 'Nissan', model: 'Navara', color: 'Blue', year: 2018 },
];

export async function seedIfEmpty(db: Database): Promise<void> {
  const services = new ServiceRepository(db);
  if ((await services.listActive()).length === 0) {
    for (const service of defaultServices) {
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

  const customers = new CustomerRepository(db);
  if ((await customers.list()).length > 0) {
    return;
  }

  // ── Demo dataset ─────────────────────────────────────────────────────────
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
    const customer = await customers.create({
      name: demo.customerName,
      phone: demo.phone ?? undefined,
    });
    const vehicle = await vehicles.create({
      plateNumber: demo.plate,
      customerId: customer.id,
      make: demo.make,
      model: demo.model,
      color: demo.color,
      year: demo.year,
    });
    vehicleRows.push({ customerId: customer.id, vehicleId: vehicle.id });
    await recentPlates.record(demo.plate);
  }

  const [juan, maria, guest, ana, carlo] = vehicleRows;

  const queuedJuan = await jobs.create({
    customerId: juan.customerId,
    vehicleId: juan.vehicleId,
    serviceId: express.id,
    priceCents: express.priceCents,
    status: 'queued',
  });
  const queuedMaria = await jobs.create({
    customerId: maria.customerId,
    vehicleId: maria.vehicleId,
    serviceId: fullDetail.id,
    priceCents: fullDetail.priceCents,
    status: 'queued',
  });
  await jobs.create({
    customerId: ana.customerId,
    vehicleId: ana.vehicleId,
    serviceId: express.id,
    priceCents: express.priceCents,
    status: 'assigned',
    assignedTo: 'seed-washer-1',
  });
  await jobs.create({
    customerId: carlo.customerId,
    vehicleId: carlo.vehicleId,
    serviceId: premium.id,
    priceCents: premium.priceCents,
    status: 'in_progress',
    assignedTo: 'seed-washer-2',
  });
  await jobs.create({
    customerId: guest.customerId,
    vehicleId: guest.vehicleId,
    serviceId: fullDetail.id,
    priceCents: fullDetail.priceCents,
    status: 'quality_check',
    assignedTo: 'seed-washer-1',
  });
  const completedJuan = await jobs.create({
    customerId: juan.customerId,
    vehicleId: juan.vehicleId,
    serviceId: express.id,
    priceCents: express.priceCents,
    status: 'completed',
    assignedTo: 'seed-washer-2',
  });
  const paidMaria = await jobs.create({
    customerId: maria.customerId,
    vehicleId: maria.vehicleId,
    serviceId: express.id,
    priceCents: express.priceCents,
    status: 'paid',
    assignedTo: 'seed-washer-2',
  });
  const paidCarlo = await jobs.create({
    customerId: carlo.customerId,
    vehicleId: carlo.vehicleId,
    serviceId: fullDetail.id,
    priceCents: fullDetail.priceCents,
    status: 'paid',
    assignedTo: 'seed-washer-1',
  });
  const voidedAna = await jobs.create({
    customerId: ana.customerId,
    vehicleId: ana.vehicleId,
    serviceId: express.id,
    priceCents: express.priceCents,
    status: 'voided',
  });

  await payments.add({ jobId: paidMaria.id, amountCents: paidMaria.priceCents, receivedBy: 'seed-washer-1' });
  await payments.add({ jobId: paidCarlo.id, amountCents: paidCarlo.priceCents, method: 'gcash', receivedBy: 'seed-washer-1' });
  await voidRequests.create({
    jobId: voidedAna.id,
    requestedBy: 'seed-washer-2',
    reason: 'Customer did not push through',
    status: 'approved',
    resolvedBy: 'seed-washer-1',
  });

  const today = toDateKey(Date.now());
  const slotStart = (clock: string) => new Date(`${today}T${clock}:00`).getTime();
  await appointments.create({
    vehicleId: juan.vehicleId,
    customerId: juan.customerId,
    serviceId: premium.id,
    date: today,
    slotStart: slotStart('09:00'),
  });
  await appointments.create({
    vehicleId: maria.vehicleId,
    customerId: maria.customerId,
    serviceId: fullDetail.id,
    date: today,
    slotStart: slotStart('10:30'),
  });

  await expenses.create({
    amountCents: 89900,
    category: 'supplies',
    description: 'Shampoo + microfiber refill',
    incurredAt: Date.now(),
    loggedBy: null,
  });
  await expenses.create({
    amountCents: 250000,
    category: 'utilities',
    description: 'Water bill',
    incurredAt: Date.now(),
    loggedBy: null,
  });

  if ((await dayCloses.list()).length === 0) {
    const yesterday = dateKey(Date.now() - 24 * 60 * 60 * 1000);
    await dayCloses.create({
      day: yesterday,
      closedBy: 'seed-washer-1',
      closedAt: Date.now() - 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000,
      jobCount: 14,
      revenueCents: 359800,
      revenueByMethodCents: { cash: 259800, gcash: 100000 },
      voidedCount: 1,
      voidedAmountCents: 19900,
      expensesCents: 89900,
      expectedCashCents: 359800,
      declaredCashCents: 360000,
      varianceCents: 200,
      notes: 'Demo close — balanced drawer.',
    });
  }

  void queuedJuan;
  void queuedMaria;
  void completedJuan;
}
