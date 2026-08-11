import { db } from '@/data/db';
import { ServiceRepository, type NewService, type ServicePatch } from '@/data/repositories';

const serviceRepository = new ServiceRepository(db);

export function listAllServices() {
  return serviceRepository.listAll();
}

export function createService(input: NewService) {
  return serviceRepository.create(input);
}

export function updateService(id: string, patch: ServicePatch) {
  return serviceRepository.update(id, patch);
}

export function deleteService(id: string) {
  return serviceRepository.softDelete(id);
}
