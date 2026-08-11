import { db } from '@/data/db';
import { CustomerRepository } from '@/data/repositories';

const customerRepository = new CustomerRepository(db);

export function listCustomerDirectory() {
  return customerRepository.listDirectory();
}
