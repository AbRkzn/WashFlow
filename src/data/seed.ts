import type { Database } from './db';

import {
  AppointmentRepository,
  CustomerRepository,
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
}
