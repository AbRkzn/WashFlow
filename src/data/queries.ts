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
  reassignJob,
  releaseJob,
  startJob,
} from '@/services/jobs';
import {
  countQueuedJobs,
  listActiveServices,
  listQueuedWithDetails,
  listRecentPlates,
} from '@/services/checkin';
import {
  approveVoidRequest,
  listCollectibleJobs,
  listCollectionHistory,
  listPendingVoidRequests,
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
  listDaySlots,
} from '@/services/appointments';
import { getSchedule } from '@/services/settings';
import { adjustStock, createInventoryItem, deleteInventoryItem, listInventory, listLowStockItems, listStockMovements, updateInventoryItem } from '@/services/inventory';
import { listDayExpenses, logExpense } from '@/services/expenses';
import { loadDemoData } from '@/services/demo';
import {
  closeDay,
  computeDayReport,
  getDayClose,
  listDayCloses,
  listEmployeePerformance,
  reopenDay,
} from '@/services/day-close';
import { countPendingConflicts, listPendingConflicts, resolveConflict } from '@/services/conflicts';
import { listAllUsers, provisionUserOnServer, resetRemoteUserPassword, updateRemoteUserRole } from '@/services/users';
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
  active: ['services', 'active'] as const,
};

export const recentPlatesKeys = {
  list: ['recent-plates'] as const,
};

export const userKeys = {
  all: ['users'] as const,
  washers: ['users', 'washers'] as const,
};

export const photoKeys = {
  all: ['photos'] as const,
  job: (jobId: string) => ['photos', 'job', jobId] as const,
};

export const paymentKeys = {
  collectible: ['payments', 'collectible'] as const,
  history: ['payments', 'history'] as const,
};

export const voidRequestKeys = {
  all: ['void-requests'] as const,
  pending: ['void-requests', 'pending'] as const,
};

export const conflictKeys = {
  all: ['conflicts'] as const,
  pending: ['conflicts', 'pending'] as const,
  pendingCount: ['conflicts', 'pending', 'count'] as const,
};

export const appointmentKeys = {
  all: ['appointments'] as const,
  day: (date: string) => ['appointments', 'day', date] as const,
};

export const scheduleKeys = {
  current: ['schedule', 'current'] as const,
};

export const inventoryKeys = {
  all: ['inventory'] as const,
  list: ['inventory', 'list'] as const,
  lowStock: ['inventory', 'low-stock'] as const,
  movements: ['inventory', 'movements'] as const,
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

export function useRecentPlates() {
  return useQuery({
    queryKey: recentPlatesKeys.list,
    queryFn: () => listRecentPlates(5),
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
    },
  });
}

export function usePendingVoidRequests() {
  return useQuery({
    queryKey: voidRequestKeys.pending,
    queryFn: listPendingVoidRequests,
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
    },
  });
}

export function usePendingConflicts() {
  return useQuery({
    queryKey: conflictKeys.pending,
    queryFn: listPendingConflicts,
  });
}

export function useCountPendingConflicts() {
  return useQuery({
    queryKey: conflictKeys.pendingCount,
    queryFn: countPendingConflicts,
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

export function useSchedule() {
  return useQuery({
    queryKey: scheduleKeys.current,
    queryFn: getSchedule,
  });
}

export function useDaySlots(date: string) {
  return useQuery({
    queryKey: appointmentKeys.day(date),
    queryFn: () => listDaySlots(date),
    enabled: Boolean(date),
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
    queryFn: listStockMovements,
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

export function useUpdateInventoryItem() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: (input: {
      itemId: string;
      patch: Parameters<typeof updateInventoryItem>[1];
      actorId: string;
    }) => updateInventoryItem(input.itemId, input.patch, input.actorId),
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
    }) => adjustStock(input.itemId, input.changeQty, input.type, input.actorId, input.reason),
    onSuccess: invalidate,
  });
}

export function useDayExpenses(timestamp: number) {
  return useQuery({
    queryKey: expenseKeys.day(String(timestamp)),
    queryFn: () => listDayExpenses(timestamp),
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

export function useLoadDemoData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: loadDemoData,
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}
