/**
 * Sync conflict kinds.
 * - `payment` / `void`: financial rows diverged across devices → Manager decides.
 * - `claim`: two devices claimed the same job; the server settled first-claim-wins.
 * - `slot`: two devices booked the same appointment slot; the server settled
 *   first-write-wins. The loser is auto-reflowed locally and this entry is the
 *   audit trail for the Manager.
 */
export const CONFLICT_KINDS = ['payment', 'void', 'claim', 'slot'] as const;

export type ConflictKind = (typeof CONFLICT_KINDS)[number];

export const CONFLICT_KIND_LABELS: Record<ConflictKind, string> = {
  payment: 'Payment conflict',
  void: 'Void conflict',
  claim: 'Job claim conflict',
  slot: 'Appointment slot conflict',
};

export const CONFLICT_RESOLUTIONS = ['approved', 'rejected', 'dismissed'] as const;

export type ConflictResolution = (typeof CONFLICT_RESOLUTIONS)[number];

export const CONFLICT_RESOLUTION_LABELS: Record<ConflictResolution, string> = {
  approved: 'Keep remote',
  rejected: 'Keep local',
  dismissed: 'Dismiss',
};

export const CONFLICT_STATUSES = ['pending', 'resolved'] as const;

export type ConflictStatus = (typeof CONFLICT_STATUSES)[number];

/**
 * Entities whose conflicts are always financial and must be reviewed by a
 * Manager rather than silently resolved with Last-Write-Wins.
 */
export const FINANCIAL_ENTITIES = ['payment', 'void_request'] as const;

export function conflictKindForEntity(entity: string): ConflictKind | null {
  if (entity === 'payment') return 'payment';
  if (entity === 'void_request') return 'void';
  return null;
}

/** The price of a job is the service price at check-in; a late price edit is a financial conflict. */
export function jobPriceChanged(local: Record<string, unknown>, remote: Record<string, unknown>): boolean {
  return local['price_cents'] !== remote['price_cents'] && remote['price_cents'] !== undefined;
}

export function describeConflict(kind: ConflictKind): string {
  switch (kind) {
    case 'payment':
      return 'A payment was recorded differently on two devices. Review which version is correct.';
    case 'void':
      return 'A void was recorded differently on two devices. Review which version is correct.';
    case 'claim':
      return 'Two washers claimed the same job. The first claim won; the other claim was rejected.';
    case 'slot':
      return 'The same appointment slot was booked on two devices. The first booking won; this one was moved.';
  }
}
