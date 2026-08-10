import { formatClockTime, formatPesos, PAYMENT_METHOD_LABELS, todayKey } from '../format';
import { jobById, plateOf, serviceNameOf, userById, type DashboardData } from '../lookup';

export function RevenueView({ data }: { data: DashboardData }) {
  const today = todayKey();
  const payments = data.payments
    .filter((p) => p.voided_at === null && p.paid_at > 0)
    .filter((p) => new Date(p.paid_at).toISOString().slice(0, 10) === today)
    .sort((a, b) => b.paid_at - a.paid_at);

  const total = payments.reduce((sum, p) => sum + p.amount_cents, 0);
  const byMethod = new Map<string, number>();
  for (const p of payments) {
    byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + p.amount_cents);
  }

  const voidedToday = data.payments
    .filter((p) => p.voided_at !== null)
    .filter((p) => p.paid_at > 0 && new Date(p.paid_at).toISOString().slice(0, 10) === today);

  return (
    <div className="grid">
      <section className="panel">
        <div className="panel-head">
          <h2>Revenue today</h2>
          <span className="amount-big">{formatPesos(total)}</span>
        </div>
        <div className="panel-body">
          {byMethod.size === 0 && <div className="empty">No payments collected today.</div>}
          {[...byMethod.entries()].map(([method, cents]) => (
            <div key={method} className="row-between">
              <span className="chip">{PAYMENT_METHOD_LABELS[method] ?? method}</span>
              <span>{formatPesos(cents)}</span>
            </div>
          ))}
          {voidedToday.length > 0 && (
            <div className="void-note">
              {voidedToday.length} payment{voidedToday.length > 1 ? 's' : ''} voided today
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Transactions</h2>
          <span className="count-badge">{payments.length}</span>
        </div>
        <div className="panel-body">
          {payments.length === 0 && <div className="empty">No transactions today.</div>}
          {payments.map((p) => {
            const job = jobById(data, p.job_id);
            const cashier = userById(data, p.received_by);
            return (
              <div key={p.id} className="tx-row">
                <div className="tx-main">
                  <div className="tx-plate">{job ? plateOf(data, job) : '—'}</div>
                  <div className="job-meta">
                    {job ? serviceNameOf(data, job) : ''}
                    {cashier ? ` · ${cashier.name}` : ''} · {formatClockTime(p.paid_at)}
                  </div>
                </div>
                <div className="tx-side">
                  <span className="chip">{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</span>
                  <span className="tx-amount">{formatPesos(p.amount_cents)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
