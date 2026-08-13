export const AUDIT_ACTION_LABELS: Record<string, string> = {
  'sign-in': 'Sign in',
  'sign-out': 'Sign out',
  'job-checked-in': 'Job checked in',
  'job-claim': 'Job claimed',
  'job-started': 'Job started',
  'job-quality-check': 'Sent to quality check',
  'job-completed': 'Job completed',
  'job-force-assign': 'Job force-assigned',
  'job-reassign': 'Job reassigned',
  'job-release': 'Job released',
  'job-notes': 'Job note changed',
  'job-reorder': 'Queue reordered',
  'job-paid': 'Payment collected',
  'job-void': 'Job voided',
  'job-void-manager': 'Job voided (manager)',
  'void-requested': 'Void requested',
  'void-approved': 'Void approved',
  'void-rejected': 'Void rejected',
  'appointment-booked': 'Appointment booked',
  'appointment-auto-rescheduled': 'Appointment rescheduled',
  'appointment-sync-reflowed': 'Appointment reflowed',
  'appointment-cancelled': 'Appointment cancelled',
  'appointment-checked-in': 'Appointment checked in',
  'expense-logged': 'Expense logged',
  'customer-registered': 'Customer registered',
  'customer-updated': 'Customer updated',
  'inventory-item-created': 'Inventory item created',
  'inventory-item-deleted': 'Inventory item deleted',
  'stock-adjusted': 'Stock adjusted',
  'inventory-auto-deducted': 'Inventory auto-deducted',
  'service-inventory-recipe-saved': 'Service recipe saved',
  'day-close': 'Day closed',
  'day-reopen': 'Day reopened',
  'cash-drawer-opened': 'Cash drawer opened',
  'conflict-resolved': 'Conflict resolved',
  'user-provisioned': 'User provisioned',
  'user-role-changed': 'User role changed',
  'user-password-reset': 'User password reset',
};

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  job: 'Job',
  appointment: 'Appointment',
  payment: 'Payment',
  void_request: 'Void request',
  expense: 'Expense',
  customer: 'Customer',
  vehicle: 'Vehicle',
  inventory_item: 'Inventory',
  stock_adjustment: 'Stock',
  service_inventory_item: 'Service recipe',
  day_close: 'Day close',
  session: 'Session',
  conflict_review: 'Conflict',
  user: 'User',
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action.replace(/-/g, ' ');
}

export function auditEntityLabel(entity: string): string {
  return AUDIT_ENTITY_LABELS[entity] ?? entity.replace(/-/g, ' ');
}

/** Short human summary of the audit `details` JSON blob (best-effort). */
export function auditDetailsSummary(details: string | null): string {
  if (!details) return '';
  try {
    const parsed = JSON.parse(details) as Record<string, unknown>;
    const parts = Object.entries(parsed).map(([key, value]) => {
      if (value === null || value === undefined || value === '') return null;
      if (typeof value === 'number') {
        return `${key}: ₱${(value / 100).toFixed(2)}`;
      }
      return `${key}: ${String(value)}`;
    });
    return parts.filter((part): part is string => part !== null).join(' · ');
  } catch {
    return details;
  }
}