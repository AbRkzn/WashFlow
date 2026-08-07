import { db } from '@/data/db';
import {
  CustomerRepository,
  JobRepository,
  normalizePlate,
  RecentPlateRepository,
  ServiceRepository,
  VehicleRepository,
  type QueueEntry,
} from '@/data/repositories';
import type { Customer, Job, Vehicle } from '@/data/schema';

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

export async function checkIn(input: CheckInInput): Promise<CheckInResult> {
  const plate = normalizePlate(input.plate);
  if (!plate) {
    throw new Error('Plate number is required.');
  }

  let vehicle = await vehicleRepository.findByPlate(plate);
  let customer = vehicle?.customerId ? await customerRepository.findById(vehicle.customerId) : undefined;

  if (!vehicle) {
    if (!customer) {
      customer = await customerRepository.create({
        name: input.newCustomer?.name?.trim() || GUEST_CUSTOMER_NAME,
        phone: input.newCustomer?.phone?.trim() || null,
      });
    }
    vehicle = await vehicleRepository.create({ plateNumber: plate, customerId: customer.id });
  }

  const service = await serviceRepository.findById(input.serviceId);
  if (!service) {
    throw new Error('Selected service no longer exists.');
  }

  if (!customer || !vehicle) {
    throw new Error('Vehicle and customer could not be resolved.');
  }

  const job = await jobRepository.create({
    customerId: customer.id,
    vehicleId: vehicle.id,
    serviceId: service.id,
    status: 'queued',
    priceCents: service.priceCents,
  });

  await recentPlateRepository.record(plate);

  return { job, customer, vehicle };
}

export function listQueuedWithDetails(): Promise<QueueEntry[]> {
  return jobRepository.listQueuedWithDetails();
}

export function countQueuedJobs(): Promise<number> {
  return jobRepository.countByStatus('queued');
}

export function listActiveServices() {
  return serviceRepository.listActive();
}

export function listRecentPlates(limit = 5) {
  return recentPlateRepository.listRecent(limit);
}
