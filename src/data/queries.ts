import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PhotoKind } from '@/data/schema';
import { addJobPhoto, listJobPhotos } from '@/services/photos';
import {
  approveQuality,
  claimJob,
  claimNextJob,
  forceAssign,
  listWasherBoard,
  listWashers,
  listWorkingBoard,
  markDone,
  moveQueuedJob,
  reassignJob,
  releaseJob,
  setJobNotes,
  startJob,
} from '@/services/jobs';
import {
  clearRecentPlates,
  countQueuedJobs,
  listActiveServices,
  listQueuedWithDetails,
  listRecentPlates,
  listVehicleHistory,
} from '@/services/checkin';
import {
  approveVoidRequest,
  listCollectibleJobs,
  listCollectionHistory,
  listPendingVoidRequests,
  listVoidHistory,
  payJob,
  rejectVoidRequest,
  requestVoid,
  voidJob,
  voidJobAsManager,
} from '@/services/payments';
import {
  bookAppointment,
  cancelAppointment,
  checkInAppointment,
  findAppointmentConflict,
  listDaySlots,
  markAppointmentNoShow,
  listDayNoShows,
} from '@/services/appointments';
import { adjustStock, createInventoryItem, deleteInventoryItem, listInventory, listLowStockItems, listStockMovements } from '@/services/inventory';
import { listServiceUsageConfig, saveServiceUsages } from '@/services/service-inventory';
import { createService, deleteService, listAllServices, updateService } from '@/services/services';
import { deleteExpense, listDayExpenses, listRecentExpenses, logExpense } from '@/services/expenses';
import { listCustomerDirectory, registerCustomer, updateCustomer } from '@/services/customers';
import { listVehicleDirectory, registerVehicle } from '@/services/vehicles';
import { loadDemoData } from '@/services/demo';
import {
  closeDay,
  computeDayReport,
  getDayClose,
  listDayCloses,
  listEmployeePerformance,
  reopenDay,
} from '@/services/day-close';
import { listPendingConflicts, resolveConflict } from '@/services/conflicts';
import { buildReceiptForPayment, buildReceiptForJob } from '@/services/receipts';
import { listAllUsers, provisionUserOnServer, resetRemoteUserPassword, updateRemoteUserRole } from '@/services/users';
import { computeMonthlyReport, listMonthlyEmployeePerformance } from '@/services/monthly';
import { getSchedule, setSchedule, getWasherPriceVisibility, setWasherPriceVisibility } from '@/services/settings';
import { listAuditTrail } from '@/services/audit';
import { listRecentActivity } from '@/services/notifications-feed';
import { listPendingSyncEntries } from '@/services/sync-pending';
import type { AdjustmentType } from '@/domain/inventory';
import type { ExpenseCategory } from '@/domain/expense';
import type { ConflictResolution } from '@/domain/conflict';
import type { UserRole } from '@/domain/user';
import type { PaymentMethod } from '@/domain/payment';
import { dateKey } from '@/domain/day-close';

export const jobKeys = {
  all: ['jobs'] as const,
  queued: ['jobs', 'queued'] as const,
  queuedCount: ['jobs', 'queued', 'count'] as const,
  washer: (washerId: string) => ['jobs', 'washer', washerId] as const,
  working: ['jobs', 'working'] as const,
};

export const serviceKeys = {
  all: ['services', 'all'] as const,
  active: ['services', 'active'] as const,
};

export const recentPlatesKeys = {
  list: ['recent-plates', 'list'] as const,
};

export const vehicleHistoryKeys = {
  all: ['vehicle-history'] as const,
  forVehicle: (vehicleId: string) => ['vehicle-history', 'vehicle', vehicleId] as const,
};

export const userKeys = {
  all: ['users'] as const,
  washers: ['users', 'washers'] as const,
};

export const auditKeys = {
  all: ['audit'] as const,
  trail: ['audit', 'trail'] as const,
};

export const photoKeys = {
  all: ['photos'] as const,
  job: (jobId: string) => ['photos', 'job', jobId] as const,
};

export const paymentKeys = {
  collectible: ['payments', 'collectible'] as const,
  history: ['payments', 'history'] as const,
  receipt: (id: string) => ['payments', 'receipt', id] as const,
};

export const voidRequestKeys = {
  all: ['void-requests'] as const,
  pending: ['void-requests', 'pending'] as const,
  history: ['void-requests', 'history'] as const,
};

export const conflictKeys = {
  all: ['conflicts'] as const,
  pending: ['conflicts', 'pending'] as const,
};

export const appointmentKeys = {
  all: ['appointments'] as const,
  day: (date: string) => ['appointments', 'day', date] as const,
  noShows: (date: string) => ['appointments', 'no-shows', date] as const,
  conflict: (date: string, start: number, duration: number) =>
    ['appointments', 'conflict', date, start, duration] as const,
};

export const inventoryKeys = {
  all: ['inventory'] as const,
  list: ['inventory', 'list'] as const,
  lowStock: ['inventory', 'low-stock'] as const,
  movements: ['inventory', 'movements'] as const,
};

export const serviceInventoryKeys = {
  all: ['service-inventory'] as const,
  config: ['service-inventory', 'config'] as const,
};

export const expenseKeys = {
  all: ['expenses'] as const,
  day: (day: string) => ['expenses', 'day', day] as const,
};

export const dayCloseKeys = {
  all: ['day-closes'] as const,
  list: ['day-closes', 'list'] as const,
  byDay: (day: string) => ['day-closes', 'day', day] as const,
  report: (day: string) => ['day-closes', 'report', day] as const,
  performance: (day: string) => ['day-closes', 'performance', day] as const,
};

export const monthlyKeys = {
  all: ['monthly'] as const,
  report: (month: string) => ['monthly', 'report', month] as const,
  performance: (month: string) => ['monthly', 'performance', month] as const,
};

export const scheduleKeys = {
  all: ['settings', 'schedule'] as const,
};

export const washerSettingsKeys = {
  showPrices: ['settings', 'washer', 'show-prices'] as const,
};

export function useQueuedJobs() {
  return useQuery({
    queryKey: jobKeys.queued,
    queryFn: listQueuedWithDetails,
  });
}

export function useQueuedCount() {
  return useQuery({
    queryKey: jobKeys.queuedCount,
    queryFn: countQueuedJobs,
  });
}

export function useActiveServices() {
  return useQuery({
    queryKey: serviceKeys.active,
    queryFn: listActiveServices,
  });
}

export function useAllServices() {
  return useQuery({
    queryKey: serviceKeys.all,
    queryFn: listAllServices,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createService>[0]) => createService(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
      queryClient.invalidateQueries({ queryKey: serviceKeys.active });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; patch: Parameters<typeof updateService>[1] }) =>
      updateService(input.id, input.patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
      queryClient.invalidateQueries({ queryKey: serviceKeys.active });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
      queryClient.invalidateQueries({ queryKey: serviceKeys.active });
    },
  });
}

export function useRecentPlates() {
  return useQuery({
    queryKey: recentPlatesKeys.list,
    queryFn: () => listRecentPlates(5),
  });
}

export function useClearRecentPlates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (actorId: string) => clearRecentPlates(actorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recentPlatesKeys.list });
    },
  });
}

export function useVehicleHistory(vehicleId: string) {
  return useQuery({
    queryKey: vehicleHistoryKeys.forVehicle(vehicleId),
    queryFn: () => listVehicleHistory(vehicleId),
    enabled: Boolean(vehicleId),
  });
}

export const customerDirectoryKeys = {
  all: ['customers', 'directory'] as const,
};

export const vehicleDirectoryKeys = {
  all: ['vehicles', 'directory'] as const,
};

export function useVehicleDirectory() {
  return useQuery({
    queryKey: vehicleDirectoryKeys.all,
    queryFn: listVehicleDirectory,
  });
}

export function useRegisterVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof registerVehicle>[0]) => registerVehicle(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleDirectoryKeys.all });
      queryClient.invalidateQueries({ queryKey: customerDirectoryKeys.all });
    },
  });
}

export function useCustomerDirectory() {
  return useQuery({
    queryKey: customerDirectoryKeys.all,
    queryFn: listCustomerDirectory,
  });
}

export function useRegisterCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof registerCustomer>[0]) => registerCustomer(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerDirectoryKeys.all });
      queryClient.invalidateQueries({ queryKey: recentPlatesKeys.list });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof updateCustomer>[0]) => updateCustomer(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerDirectoryKeys.all });
    },
  });
}

export function useWasherBoard(washerId: string) {
  return useQuery({
    queryKey: jobKeys.washer(washerId),
    queryFn: () => listWasherBoard(washerId),
    enabled: Boolean(washerId),
  });
}

export function useWorkingBoard() {
  return useQuery({
    queryKey: jobKeys.working,
    queryFn: listWorkingBoard,
  });
}

export function useWashers() {
  return useQuery({
    queryKey: userKeys.washers,
    queryFn: listWashers,
  });
}

export function useAllUsers() {
  return useQuery({
    queryKey: userKeys.all,
    queryFn: listAllUsers,
  });
}

export function useAuditTrail() {
  return useQuery({
    queryKey: auditKeys.trail,
    queryFn: () => listAuditTrail(200),
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ['activity', 'recent'] as const,
    queryFn: () => listRecentActivity(50),
  });
}

export function useProvisionUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { values: Parameters<typeof provisionUserOnServer>[0]; adminId: string }) =>
      provisionUserOnServer(input.values, input.adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; role: UserRole; adminId: string }) =>
      updateRemoteUserRole(input.userId, input.role, input.adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useResetUserPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; password: string; adminId: string }) =>
      resetRemoteUserPassword(input.userId, input.password, input.adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useJobPhotos(jobId: string) {
  return useQuery({
    queryKey: photoKeys.job(jobId),
    queryFn: () => listJobPhotos(jobId),
    enabled: Boolean(jobId),
  });
}

export function useAddJobPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { jobId: string; kind: PhotoKind; uri: string }) =>
      addJobPhoto(input.jobId, input.kind, input.uri),
    onSuccess: (_photo, vars) => {
      queryClient.invalidateQueries({ queryKey: photoKeys.job(vars.jobId) });
    },
  });
}

function useInvalidateJobs() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: jobKeys.all });
}

export function useClaimNextJob() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: (washerId: string) => claimNextJob(washerId),
    onSuccess: invalidate,
  });
}

export function useClaimJob() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: (input: { jobId: string; washerId: string }) =>
      claimJob(input.jobId, input.washerId),
    onSuccess: invalidate,
  });
}

export function useStartJob() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: (input: { jobId: string; washerId: string }) =>
      startJob(input.jobId, input.washerId),
    onSuccess: invalidate,
  });
}

export function useMarkDone() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: (input: { jobId: string; washerId: string }) =>
      markDone(input.jobId, input.washerId),
    onSuccess: invalidate,
  });
}

export function useApproveQuality() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: (input: { jobId: string; actorId: string }) =>
      approveQuality(input.jobId, input.actorId),
    onSuccess: invalidate,
  });
}

export function useForceAssign() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: (input: { jobId: string; washerId: string; actorId: string }) =>
      forceAssign(input.jobId, input.washerId, input.actorId),
    onSuccess: invalidate,
  });
}

export function useReassignJob() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: (input: { jobId: string; washerId: string; actorId: string }) =>
      reassignJob(input.jobId, input.washerId, input.actorId),
    onSuccess: invalidate,
  });
}

export function useReleaseJob() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: (input: { jobId: string; actorId: string }) => releaseJob(input.jobId, input.actorId),
    onSuccess: invalidate,
  });
}

export function useSetJobNotes() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: (input: { jobId: string; notes: string | null; actorId: string }) =>
      setJobNotes(input.jobId, input.notes, input.actorId),
    onSuccess: invalidate,
  });
}

export function useMoveQueuedJob() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: (input: { jobId: string; direction: 'up' | 'down'; actorId: string }) =>
      moveQueuedJob(input.jobId, input.direction, input.actorId),
    onSuccess: invalidate,
  });
}

export function useCollectibleJobs() {
  return useQuery({
    queryKey: paymentKeys.collectible,
    queryFn: listCollectibleJobs,
  });
}

export function useCollectionHistory() {
  return useQuery({
    queryKey: paymentKeys.history,
    queryFn: () => listCollectionHistory(),
  });
}

export function useReceiptForPayment(paymentId: string | null) {
  return useQuery({
    queryKey: paymentKeys.receipt(paymentId ?? ''),
    queryFn: () => buildReceiptForPayment(paymentId!),
    enabled: !!paymentId,
  });
}

export function useReceiptForJob(jobId: string | null) {
  return useQuery({
    queryKey: paymentKeys.receipt(`job:${jobId ?? ''}`),
    queryFn: () => buildReceiptForJob(jobId!),
    enabled: !!jobId,
  });
}

export function usePayJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { jobId: string; actorId: string; method: PaymentMethod }) =>
      payJob(input.jobId, input.actorId, input.method),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
      queryClient.invalidateQueries({ queryKey: paymentKeys.collectible });
      queryClient.invalidateQueries({ queryKey: paymentKeys.history });
    },
  });
}

export function useVoidJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { jobId: string; actorId: string; reason?: string }) =>
      voidJob(input.jobId, input.actorId, input.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
      queryClient.invalidateQueries({ queryKey: paymentKeys.collectible });
      queryClient.invalidateQueries({ queryKey: voidRequestKeys.pending });
      queryClient.invalidateQueries({ queryKey: voidRequestKeys.history });
    },
  });
}

export function useVoidJobAsManager() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { jobId: string; actorId: string; reason?: string }) =>
      voidJobAsManager(input.jobId, input.actorId, input.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
      queryClient.invalidateQueries({ queryKey: paymentKeys.collectible });
      queryClient.invalidateQueries({ queryKey: voidRequestKeys.pending });
      queryClient.invalidateQueries({ queryKey: voidRequestKeys.history });
    },
  });
}

export function useRequestVoid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { jobId: string; actorId: string; reason?: string }) =>
      requestVoid(input.jobId, input.actorId, input.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
      queryClient.invalidateQueries({ queryKey: voidRequestKeys.pending });
      queryClient.invalidateQueries({ queryKey: voidRequestKeys.history });
    },
  });
}

export function usePendingVoidRequests() {
  return useQuery({
    queryKey: voidRequestKeys.pending,
    queryFn: listPendingVoidRequests,
  });
}

export function useVoidHistory() {
  return useQuery({
    queryKey: voidRequestKeys.history,
    queryFn: listVoidHistory,
  });
}

export function useApproveVoidRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { requestId: string; managerId: string }) =>
      approveVoidRequest(input.requestId, input.managerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
      queryClient.invalidateQueries({ queryKey: voidRequestKeys.pending });
      queryClient.invalidateQueries({ queryKey: voidRequestKeys.history });
    },
  });
}

export function useRejectVoidRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { requestId: string; managerId: string }) =>
      rejectVoidRequest(input.requestId, input.managerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voidRequestKeys.pending });
      queryClient.invalidateQueries({ queryKey: voidRequestKeys.history });
    },
  });
}

export function usePendingConflicts() {
  return useQuery({
    queryKey: conflictKeys.pending,
    queryFn: listPendingConflicts,
  });
}

export function useResolveConflict() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { conflictId: string; resolution: ConflictResolution; managerId: string }) =>
      resolveConflict(input.conflictId, input.resolution, input.managerId),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

export function useDaySlots(date: string) {
  return useQuery({
    queryKey: appointmentKeys.day(date),
    queryFn: () => listDaySlots(date),
    enabled: Boolean(date),
  });
}

export function useAppointmentConflict(
  date: string,
  slotStart: number | null,
  durationMinutes: number,
) {
  return useQuery({
    queryKey: appointmentKeys.conflict(date, slotStart ?? 0, durationMinutes),
    queryFn: () => findAppointmentConflict(date, slotStart!, durationMinutes),
    enabled: Boolean(date) && slotStart !== null && !Number.isNaN(slotStart),
  });
}

export function useBookAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof bookAppointment>[0]) => bookAppointment(input),
    onSuccess: (_result, vars) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.day(vars.date) });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { appointmentId: string; date: string; actorId: string }) =>
      cancelAppointment(input.appointmentId, input.actorId),
    onSuccess: (_void, vars) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.day(vars.date) });
    },
  });
}

export function useCheckInAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { appointmentId: string; date: string; actorId: string }) =>
      checkInAppointment(input.appointmentId, input.actorId),
    onSuccess: (_appointment, vars) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.day(vars.date) });
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
      queryClient.invalidateQueries({ queryKey: jobKeys.queuedCount });
    },
  });
}

export function useDayNoShows(date: string) {
  return useQuery({
    queryKey: appointmentKeys.noShows(date),
    queryFn: () => listDayNoShows(date),
    enabled: Boolean(date),
  });
}

export function useMarkNoShow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { appointmentId: string; date: string; actorId: string }) =>
      markAppointmentNoShow(input.appointmentId, input.actorId),
    onSuccess: (_appointment, vars) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.day(vars.date) });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.noShows(vars.date) });
      queryClient.invalidateQueries({ queryKey: dayCloseKeys.all });
      queryClient.invalidateQueries({ queryKey: monthlyKeys.all });
    },
  });
}

export function useSchedule() {
  return useQuery({
    queryKey: scheduleKeys.all,
    queryFn: getSchedule,
  });
}

export function useSetSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (schedule: Parameters<typeof setSchedule>[0]) => setSchedule(schedule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}

export function useWasherPriceVisibility() {
  return useQuery({
    queryKey: washerSettingsKeys.showPrices,
    queryFn: getWasherPriceVisibility,
  });
}

export function useSetWasherPriceVisibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (visible: boolean) => setWasherPriceVisibility(visible),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: washerSettingsKeys.showPrices });
    },
  });
}

export function useInventory() {
  return useQuery({
    queryKey: inventoryKeys.list,
    queryFn: listInventory,
  });
}

export function useLowStockItems() {
  return useQuery({
    queryKey: inventoryKeys.lowStock,
    queryFn: listLowStockItems,
  });
}

export function useStockMovements() {
  return useQuery({
    queryKey: inventoryKeys.movements,
    queryFn: () => listStockMovements(),
  });
}

function useInvalidateInventory() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
  };
}

export function useCreateInventoryItem() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: (input: { values: Parameters<typeof createInventoryItem>[0]; actorId: string }) =>
      createInventoryItem(input.values, input.actorId),
    onSuccess: invalidate,
  });
}

export function useDeleteInventoryItem() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: (input: { itemId: string; actorId: string }) =>
      deleteInventoryItem(input.itemId, input.actorId),
    onSuccess: invalidate,
  });
}

export function useAdjustStock() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: (input: {
      itemId: string;
      changeQty: number;
      type: AdjustmentType;
      actorId: string;
      reason?: string;
      costCents?: number;
    }) =>
      adjustStock(
        input.itemId,
        input.changeQty,
        input.type,
        input.actorId,
        input.reason,
        input.costCents,
      ),
    onSuccess: invalidate,
  });
}

export function useServiceUsageConfig() {
  return useQuery({
    queryKey: serviceInventoryKeys.config,
    queryFn: listServiceUsageConfig,
  });
}

export function useSaveServiceUsages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      serviceId: string;
      usages: { inventoryItemId: string; quantityUsed: number }[];
      actorId: string;
    }) => saveServiceUsages(input.serviceId, input.usages, input.actorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceInventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export function useDayExpenses(timestamp: number) {
  return useQuery({
    queryKey: expenseKeys.day(String(timestamp)),
    queryFn: () => listDayExpenses(timestamp),
  });
}

export function useRecentExpenses() {
  return useQuery({
    queryKey: expenseKeys.all,
    queryFn: () => listRecentExpenses(),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { expenseId: string; actorId: string }) =>
      deleteExpense(input.expenseId, input.actorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}

export function useLogExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { values: { amountCents: number; category: ExpenseCategory; description?: string | null; incurredAt?: number }; actorId: string }) =>
      logExpense(input.values, input.actorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}

export function useDayReport(day: string) {
  return useQuery({
    queryKey: dayCloseKeys.report(day),
    queryFn: () => computeDayReport(day),
    enabled: Boolean(day),
  });
}

export function useDayClose(day: string) {
  return useQuery({
    queryKey: dayCloseKeys.byDay(day),
    queryFn: () => getDayClose(day),
    enabled: Boolean(day),
  });
}

export function useDayCloses() {
  return useQuery({
    queryKey: dayCloseKeys.list,
    queryFn: listDayCloses,
  });
}

export function useCloseDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { declaredCashCents: number; notes?: string; managerId: string }) =>
      closeDay(input.managerId, input.declaredCashCents, input.notes),
    onSuccess: () => {
      const day = dateKey();
      queryClient.invalidateQueries({ queryKey: dayCloseKeys.all });
      queryClient.invalidateQueries({ queryKey: dayCloseKeys.byDay(day) });
      queryClient.invalidateQueries({ queryKey: dayCloseKeys.report(day) });
      queryClient.invalidateQueries({ queryKey: dayCloseKeys.performance(day) });
    },
  });
}

export function useReopenDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { day: string; adminId: string }) => reopenDay(input.day, input.adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dayCloseKeys.all });
      queryClient.invalidateQueries({ queryKey: dayCloseKeys.byDay(dateKey()) });
    },
  });
}

export function useEmployeePerformance(day: string) {
  return useQuery({
    queryKey: dayCloseKeys.performance(day),
    queryFn: () => listEmployeePerformance(day),
    enabled: Boolean(day),
  });
}

export function useMonthlyReport(month: string) {
  return useQuery({
    queryKey: monthlyKeys.report(month),
    queryFn: () => computeMonthlyReport(month),
    enabled: Boolean(month),
  });
}

export function useMonthlyEmployeePerformance(month: string) {
  return useQuery({
    queryKey: monthlyKeys.performance(month),
    queryFn: () => listMonthlyEmployeePerformance(month),
    enabled: Boolean(month),
  });
}

export function useLoadDemoData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: loadDemoData,
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

export const syncPendingKeys = {
  all: ['sync', 'pending'] as const,
};

export function usePendingSyncEntries() {
  return useQuery({
    queryKey: syncPendingKeys.all,
    queryFn: listPendingSyncEntries,
    refetchInterval: 10_000,
  });
}
