import { JOB_STATUS_LABELS, formatClockTime, todayKey } from '../format';
import {
  customerById,
  plateOf,
  serviceNameOf,
  userById,
  vehicleById,
  type DashboardData,
} from '../lookup';

const STATUS_ORDER = ['queued', 'assigned', 'in_progress', 'quality_check', 'completed', 'paid', 'voided'];

function JobCard({ data, job }: { data: DashboardData; job: (typeof data.jobs)[number] }) {
  const vehicle = vehicleById(data, job.vehicle_id);
  const customer = customerById(data, job.customer_id ?? vehicle?.customer_id ?? null);
  const washer = userById(data, job.assigned_to);
  const voided = job.status === 'voided';
  return (
    <div className={`job-row${voided ? ' voided' : ''}`}>
      <div className="job-plate">{plateOf(data, job)}</div>
      <div className="job-main">
        <div className="job-service">{serviceNameOf(data, job)}</div>
        <div className="job-meta">
          {customer?.name ? `${customer.name} · ` : ''}
          {formatClockTime(job.created_at)}
        </div>
      </div>
      <div className="job-side">
        {washer?.name ? <span className="chip">{washer.name}</span> : null}
        <span className="job-amount">
          ₱{(job.price_cents / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}

export function TodayView({ data }: { data: DashboardData }) {
  const today = todayKey();
  const todayJobs = data.jobs.filter((j) => j.created_at > 0 && new Date(j.created_at).toISOString().slice(0, 10) === today);

  // Device-created jobs carry local wall-clock timestamps; also include jobs
  // created in the last 24h to avoid missing a day-boundary mismatch.
  const recent = data.jobs.filter(
    (j) => j.created_at > Date.now() - 24 * 60 * 60 * 1000 && !todayJobs.includes(j),
  );
  const jobs = [...todayJobs, ...recent];

  const active = jobs.filter((j) => !['paid', 'voided'].includes(j.status));
  const completedToday = jobs.filter((j) => j.status === 'completed' || j.status === 'paid');

  const todayAppointments = data.appointments
    .filter((a) => a.date === today && a.status === 'booked')
    .sort((a, b) => a.slot_start - b.slot_start);

  return (
    <div className="grid">
      <section className="panel">
        <div className="panel-head">
          <h2>Queue</h2>
          <span className="count-badge">{active.length} active</span>
        </div>
        <div className="panel-body">
          {jobs.length === 0 && <div className="empty">No jobs today.</div>}
          {STATUS_ORDER.map((status) => {
            const bucket = active.filter((j) => j.status === status);
            if (bucket.length === 0) return null;
            return (
              <div key={status} className="group">
                <div className="group-head">
                  <span className={`status-dot status-${status}`} />
                  {JOB_STATUS_LABELS[status]}
                  <span className="count-badge">{bucket.length}</span>
                </div>
                {bucket.map((job) => (
                  <JobCard key={job.id} data={data} job={job} />
                ))}
              </div>
            );
          })}
          {active.length === 0 && jobs.length > 0 && (
            <div className="empty">All jobs finished for today.</div>
          )}
        </div>
      </section>

      <div className="stack">
        <section className="panel">
          <div className="panel-head">
            <h2>Completed</h2>
            <span className="count-badge">{completedToday.length}</span>
          </div>
          <div className="panel-body">
            {completedToday.length === 0 && <div className="empty">Nothing completed yet.</div>}
            {completedToday.slice(0, 5).map((job) => (
              <JobCard key={job.id} data={data} job={job} />
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Bookings</h2>
            <span className="count-badge">{todayAppointments.length}</span>
          </div>
          <div className="panel-body">
            {todayAppointments.length === 0 && <div className="empty">No bookings today.</div>}
            {todayAppointments.map((a) => {
              const vehicle = vehicleById(data, a.vehicle_id);
              const service = data.services.find((s) => s.id === a.service_id);
              return (
                <div key={a.id} className="job-row">
                  <div className="job-plate">{vehicle?.plate_number ?? '—'}</div>
                  <div className="job-main">
                    <div className="job-service">{service?.name ?? '—'}</div>
                    <div className="job-meta">
                      {a.rescheduled ? 'Rescheduled by system' : 'Booked'} · {new Date(a.slot_start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
