import { db } from '@/data/db';
import {
  CustomerRepository,
  JobRepository,
  normalizePlate,
  RecentPlateRepository,
  ServiceRepository,
  VehicleRepository,
  type QueueEntry,
  type VehicleHistoryEntry,
} from '@/data/repositories';
import type { Customer, Job, Vehicle } from '@/data/schema';
import { logAudit } from '@/services/audit';

const customerRepository = new CustomerRepository(db);
const vehicleRepository = new VehicleRepository(db);
const serviceRepository = new ServiceRepository(db);
const jobRepository = new JobRepository(db);
const recentPlateRepository = new RecentPlateRepository(db);

export const GUEST_CUSTOMER_NAME = 'Walk-in Guest';

export interface VehicleMatch {
  vehicle: Vehicle;
  customer: Customer;
}

export interface CheckInInput {
  plate: string;
  serviceId: string;
  newCustomer?: {
    name?: string;
    phone?: string;
  };
}

export interface CheckInResult {
  job: Job;
  customer: Customer;
  vehicle: Vehicle;
}

export async function lookupByPlate(plate: string): Promise<VehicleMatch | null> {
  if (!plate.trim()) {
    return null;
  }
  const vehicle = await vehicleRepository.findByPlate(plate);
  if (!vehicle?.customerId) {
    return null;
  }
  const customer = await customerRepository.findById(vehicle.customerId);
  if (!customer) {
    return null;
  }
  return { vehicle, customer };
}

export async function resolveVehicleCustomer(
  plate: string,
  newCustomer?: {
    name?: string;
    phone?: string;
  },
): Promise<{ vehicle: Vehicle; customer: Customer }> {
  const normalized = normalizePlate(plate);
  if (!normalized) {
    throw new Error('Plate number is required.');
  }
  let vehicle = await vehicleRepository.findByPlate(normalized);
  let customer = vehicle?.customerId ? await customerRepository.findById(vehicle.customerId) : undefined;
  if (!vehicle) {
    if (!customer) {
      customer = await customerRepository.create({
        name: newCustomer?.name?.trim() || GUEST_CUSTOMER_NAME,
        phone: newCustomer?.phone?.trim() || null,
      });
    }
    vehicle = await vehicleRepository.create({ plateNumber: normalized, customerId: customer.id });
  }
  if (!vehicle || !customer) {
    throw new Error('Vehicle and customer could not be resolved.');
  }
  return { vehicle, customer };
}

export async function checkIn(input: CheckInInput & { actorId?: string }): Promise<CheckInResult> {
  const plate = normalizePlate(input.plate);
  const { vehicle, customer } = await resolveVehicleCustomer(plate, input.newCustomer);

  const service = await serviceRepository.findById(input.serviceId);
  if (!service) {
    throw new Error('Selected service no longer exists.');
  }

  const job = await jobRepository.create({
    customerId: customer.id,
    vehicleId: vehicle.id,
    serviceId: service.id,
    status: 'queued',
    priceCents: service.priceCents,
  });

  await recentPlateRepository.record(plate);

  if (input.actorId) {
    await logAudit({
      actorId: input.actorId,
      action: 'job-checked-in',
      entity: 'job',
      entityId: job.id,
      details: { plate, service: service.name, priceCents: service.priceCents },
    });
  }

  return { job, customer, vehicle };
}

export function listQueuedWithDetails(): Promise<QueueEntry[]> {
  return jobRepository.listQueuedWithDetails();
}

export function listVehicleHistory(vehicleId: string): Promise<VehicleHistoryEntry[]> {
  return jobRepository.listForVehicle(vehicleId);
}

export function countQueuedJobs(): Promise<number> {
  return jobRepository.countByStatus('queued');
}

export function listActiveServices() {
  return serviceRepository.listActive();
}

export function listRecentPlates(limit = 5) {
  return recentPlateRepository.listRecentWithCustomers(limit);
}

/** Most recent active (queued→quality_check) job for a plate, if any. */
export function findActiveJobForPlate(plate: string): Promise<QueueEntry | null> {
  const normalized = normalizePlate(plate);
  if (!normalized) {
    return Promise.resolve(null);
  }
  return jobRepository.findActiveByPlate(normalized).then((entry) => entry ?? null);
}
