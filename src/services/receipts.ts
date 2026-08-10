import { db } from '@/data/db';
import {
  JobRepository,
  PaymentRepository,
  UserRepository,
} from '@/data/repositories';
import { buildReceiptNumber, type Receipt } from '@/domain/receipt';

const jobRepository = new JobRepository(db);
const paymentRepository = new PaymentRepository(db);
const userRepository = new UserRepository(db);

/**
 * Builds a receipt for a settled payment. Throws when the payment or its job
 * cannot be found (e.g. a voided/removed job). The collector name is resolved
 * from the local users table (best-effort; null if the row is missing).
 */
export async function buildReceiptForPayment(paymentId: string): Promise<Receipt> {
  const payment = await paymentRepository.findById(paymentId);
  if (!payment) {
    throw new Error('Payment not found.');
  }
  if (!payment.jobId) {
    throw new Error('This payment is not linked to a job.');
  }
  const details = await jobRepository.findByIdWithDetails(payment.jobId);
  if (!details) {
    throw new Error('The job for this payment could not be found.');
  }
  const { job, vehicle, customer, service } = details;

  let receivedByName: string | null = null;
  if (payment.receivedBy) {
    const collector = await userRepository.findById(payment.receivedBy);
    receivedByName = collector?.name ?? null;
  }

  return {
    receiptNumber: buildReceiptNumber(payment.id, payment.paidAt),
    issuedAt: payment.paidAt,
    plateNumber: vehicle.plateNumber,
    customerName: customer.name,
    serviceName: service?.name ?? 'Service',
    amountCents: payment.amountCents,
    method: payment.method,
    receivedByName,
    jobId: job.id,
    paymentId: payment.id,
  };
}

/** Builds a receipt from the job side (used right after collecting payment). */
export async function buildReceiptForJob(jobId: string): Promise<Receipt> {
  const payment = await paymentRepository.findForJob(jobId);
  if (!payment) {
    throw new Error('This job has no payment yet.');
  }
  return buildReceiptForPayment(payment.id);
}
