import type { Database } from './db';

import { CustomerRepository, ServiceRepository, UserRepository, VehicleRepository } from './repositories';

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
    await vehicles.create({
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
  }

  const users = new UserRepository(db);
  if ((await users.listWashers()).length === 0) {
    for (const washer of defaultWashers) {
      await users.upsert(washer);
    }
  }
}
