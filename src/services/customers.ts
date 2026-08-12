import { db } from '@/data/db';
import { CustomerRepository, normalizePlate, VehicleRepository } from '@/data/repositories';
import type { Customer, Vehicle } from '@/data/schema';
import { logAudit } from '@/services/audit';

const customerRepository = new CustomerRepository(db);
const vehicleRepository = new VehicleRepository(db);

export function listCustomerDirectory() {
  return customerRepository.listDirectory();
}

export interface RegisterCustomerInput {
  name: string;
  phone?: string;
  plates?: string[];
  actorId: string;
}

export interface RegisterCustomerResult {
  customer: Customer;
  vehicles: Vehicle[];
}

/** Pre-register a customer with one or more vehicles (no check-in required). */
export async function registerCustomer(input: RegisterCustomerInput): Promise<RegisterCustomerResult> {
  const name = input.name.trim();
  if (!name) {
    throw new Error('Customer name is required.');
  }

  const customer = await customerRepository.create({
    name,
    phone: input.phone?.trim() || undefined,
  });

  const seen = new Set<string>();
  const vehicles: Vehicle[] = [];
  for (const raw of input.plates ?? []) {
    const plate = normalizePlate(raw);
    if (!plate || seen.has(plate)) continue;
    seen.add(plate);
    const vehicle = await vehicleRepository.create({ plateNumber: plate, customerId: customer.id });
    vehicles.push(vehicle);
  }

  await logAudit({
    actorId: input.actorId,
    action: 'customer-registered',
    entity: 'customer',
    entityId: customer.id,
    details: { name, vehicleCount: vehicles.length },
  });

  return { customer, vehicles };
}

export interface UpdateCustomerInput {
  customerId: string;
  name: string;
  phone?: string;
  actorId: string;
  vehicles?: {
    renamed?: { vehicleId: string; plate: string }[];
    removed?: string[];
    added?: string[];
  };
}

/** Update a customer's name, phone, and vehicles from the directory. */
export async function updateCustomer(input: UpdateCustomerInput): Promise<void> {
  const name = input.name.trim();
  if (!name) {
    throw new Error('Customer name is required.');
  }

  await customerRepository.update(input.customerId, {
    name,
    phone: input.phone?.trim() || null,
  });

  const vehicles = input.vehicles;
  const seen = new Set<string>();
  if (vehicles) {
    for (const renamed of vehicles.renamed ?? []) {
      const plate = normalizePlate(renamed.plate);
      if (!plate || seen.has(plate)) continue;
      seen.add(plate);
      await vehicleRepository.update(renamed.vehicleId, { plateNumber: plate, customerId: input.customerId });
    }
    for (const vehicleId of vehicles.removed ?? []) {
      await vehicleRepository.softDelete(vehicleId);
    }
    for (const raw of vehicles.added ?? []) {
      const plate = normalizePlate(raw);
      if (!plate || seen.has(plate)) continue;
      seen.add(plate);
      await vehicleRepository.create({ plateNumber: plate, customerId: input.customerId });
    }
  }

  await logAudit({
    actorId: input.actorId,
    action: 'customer-updated',
    entity: 'customer',
    entityId: input.customerId,
    details: { name, vehicleCount: vehicles ? (seen.size) : 0 },
  });
}
