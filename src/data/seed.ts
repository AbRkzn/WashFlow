import type { Database } from './db';

import {
  AppointmentRepository,
  CustomerRepository,
  ExpenseRepository,
  InventoryRepository,
  JobRepository,
  ServiceRepository,
  SettingsRepository,
  UserRepository,
  VehicleRepository,
} from './repositories';
import { DEFAULT_SCHEDULE, SETTING_KEYS } from '@/domain/settings';
import { toDateKey } from '@/domain/appointment';

const defaultWashers = [
  { id: 'seed-washer-1', email: 'washer1@washflow.app', name: 'Washflow Washer 1', role: 'washer' as const },
  { id: 'seed-washer-2', email: 'washer2@washflow.app', name: 'Washflow Washer 2', role: 'washer' as const },
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

export async function seedIfEmpty(db: Database): Promise<void> {
  const services = new ServiceRepository(db);
  if ((await services.listActive()).length === 0) {
    for (const service of defaultServices) {
      await services.create(service);
    }
  }

  const customers = new CustomerRepository(db);
  if ((await customers.list()).length === 0) {
    const vehicles = new VehicleRepository(db);

    const juan = await customers.create({ name: 'Juan Dela Cruz', phone: '09171234567' });
    const juanVehicle = await vehicles.create({
      plateNumber: 'ABC-1234',
      customerId: juan.id,
      make: 'Toyota',
      model: 'Vios',
      color: 'White',
      year: 2019,
    });

    const maria = await customers.create({ name: 'Maria Santos', phone: '09179876543' });
    await vehicles.create({
      plateNumber: 'XYZ-5678',
      customerId: maria.id,
      make: 'Honda',
      model: 'Civic',
      color: 'Black',
      year: 2021,
    });

    const guest = await customers.create({ name: 'Walk-in Guest' });
    await vehicles.create({
      plateNumber: 'QWE-9999',
      customerId: guest.id,
      make: 'Mitsubishi',
      model: 'Mirage',
      color: 'Gray',
      year: 2020,
    });

    const express = (await services.listActive()).find((service) => service.name === 'Express Wash');
    if (express) {
      const jobs = new JobRepository(db);
      await jobs.create({
        customerId: juan.id,
        vehicleId: juanVehicle.id,
        serviceId: express.id,
        priceCents: express.priceCents,
        status: 'completed',
      });
    }

    const premium = (await services.listActive()).find((service) => service.name === 'Premium Detail');
    if (premium) {
      const today = toDateKey(Date.now());
      const slotStart = new Date(`${today}T09:00:00`).getTime();
      const appointmentsRepo = new AppointmentRepository(db);
      await appointmentsRepo.create({
        vehicleId: juanVehicle.id,
        customerId: juan.id,
        serviceId: premium.id,
        date: today,
        slotStart,
      });
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
    for (const item of defaultInventoryItems) {
      await inventory.create(item);
    }
  }

  const expenses = new ExpenseRepository(db);
  if ((await expenses.listBetween(0, Date.now())).length === 0) {
    await expenses.create({
      amountCents: 89900,
      category: 'supplies',
      description: 'Seed demo expense — shampoo refill',
      incurredAt: Date.now(),
      loggedBy: null,
    });
  }
}
