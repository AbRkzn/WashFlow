import { formatDateTime, formatPesos, PAYMENT_METHOD_LABELS } from '../format';
import { userById, type DashboardData } from '../lookup';
import { parseMethodBreakdown } from './dayCloseHelpers';

function VarianceBadge({ cents }: { cents: number }) {
  if (cents === 0) {
    return <span className="badge badge-ok">Balanced</span>;
  }
  if (cents > 0) {
    return <span className="badge badge-warn">Over {formatPesos(cents)}</span>;
  }
  return <span className="badge badge-err">Short {formatPesos(cents)}</span>;
}

export function DayCloseView({ data }: { data: DashboardData }) {
  const closes = [...data.dayCloses].sort((a, b) => (a.day < b.day ? 1 : -1));
  const latest = closes[0];

  if (closes.length === 0) {
    return (
      <section className="panel">
        <div className="panel-head">
          <h2>Day closes</h2>
        </div>
        <div className="panel-body">
          <div className="empty">No day closes yet. Close a day from the app.</div>
        </div>
      </section>
    );
  }

  return (
    <div className="grid">
      {latest && (
        <section className="panel">
          <div className="panel-head">
            <h2>{latest.day}</h2>
            <VarianceBadge cents={latest.variance_cents} />
          </div>
          <div className="panel-body">
            <div className="stat-grid">
              <div className="stat">
                <span className="stat-label">Jobs</span>
                <span className="stat-value">{latest.job_count}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Revenue</span>
                <span className="stat-value">{formatPesos(latest.revenue_cents)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Expenses</span>
                <span className="stat-value">{formatPesos(latest.expenses_cents)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Voids</span>
                <span className="stat-value">
                  {latest.voided_count} · {formatPesos(latest.voided_amount_cents)}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Expected</span>
                <span className="stat-value">{formatPesos(latest.expected_cash_cents)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Declared</span>
                <span className="stat-value">{formatPesos(latest.declared_cash_cents)}</span>
              </div>
            </div>
            {parseMethodBreakdown(latest).length > 0 && (
              <div className="method-box">
                <div className="group-head">By method</div>
                {parseMethodBreakdown(latest).map((entry) => (
                  <div key={entry.method} className="row-between">
                    <span className="chip">
                      {PAYMENT_METHOD_LABELS[entry.method] ?? entry.method}
                    </span>
                    <span>{formatPesos(entry.cents)}</span>
                  </div>
                ))}
              </div>
            )}
            {latest.notes && <p className="note">{latest.notes}</p>}
            <p className="muted">
              Closed by {userById(data, latest.closed_by)?.name ?? '—'} ·{' '}
              {formatDateTime(latest.closed_at)}
            </p>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-head">
          <h2>History</h2>
          <span className="count-badge">{closes.length}</span>
        </div>
        <div className="panel-body">
          {closes.map((close) => (
            <div key={close.id} className="row-between">
              <div>
                <div className="job-service">{close.day}</div>
                <div className="job-meta">
                  {close.job_count} jobs · {formatPesos(close.revenue_cents)}
                </div>
              </div>
              <VarianceBadge cents={close.variance_cents} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
