import { db } from '@/data/db';
import {
  CustomerRepository,
  VehicleRepository,
  normalizePlate,
  type CustomerDirectoryEntry,
} from '@/data/repositories';
import type { Vehicle } from '@/data/schema';
import { logAudit } from '@/services/audit';

const customerRepository = new CustomerRepository(db);
const vehicleRepository = new VehicleRepository(db);

export interface VehicleDirectoryEntry {
  vehicle: Vehicle;
  owner: { id: string; name: string; phone: string | null } | null;
}

export interface VehicleDirectoryResult {
  vehicles: VehicleDirectoryEntry[];
  owners: CustomerDirectoryEntry[];
}

/** Every non-deleted vehicle joined with its owner (if any). */
export async function listVehicleDirectory(): Promise<VehicleDirectoryResult> {
  const directory = await customerRepository.listDirectory();
  const vehicles: VehicleDirectoryEntry[] = [];
  for (const entry of directory) {
    for (const vehicle of entry.vehicles) {
      vehicles.push({
        vehicle,
        owner: { id: entry.customer.id, name: entry.customer.name, phone: entry.customer.phone },
      });
    }
  }
  vehicles.sort((a, b) => a.vehicle.plateNumber.localeCompare(b.vehicle.plateNumber));
  return { vehicles, owners: directory };
}

export interface RegisterVehicleInput {
  plate: string;
  customerId: string;
  make?: string;
  model?: string;
  color?: string;
  year?: number;
  actorId: string;
}

/** Register a vehicle against an existing customer. */
export async function registerVehicle(input: RegisterVehicleInput): Promise<Vehicle> {
  const plate = normalizePlate(input.plate);
  if (!plate) {
    throw new Error('Plate number is required.');
  }
  const existing = await vehicleRepository.findByPlate(plate);
  if (existing) {
    throw new Error(`Plate ${plate} is already registered.`);
  }
  const customer = await customerRepository.findById(input.customerId);
  if (!customer) {
    throw new Error('Select the customer who owns this vehicle.');
  }
  const vehicle = await vehicleRepository.create({
    plateNumber: plate,
    customerId: input.customerId,
    make: input.make?.trim() || undefined,
    model: input.model?.trim() || undefined,
    color: input.color?.trim() || undefined,
    year: input.year,
  });
  await logAudit({
    actorId: input.actorId,
    action: 'vehicle-registered',
    entity: 'vehicle',
    entityId: vehicle.id,
    details: { plate, customerId: input.customerId },
  });
  return vehicle;
}