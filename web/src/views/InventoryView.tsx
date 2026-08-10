import { type DashboardData } from '../lookup';

export function InventoryView({ data }: { data: DashboardData }) {
  const low = data.inventory.filter(
    (item) => item.low_stock_threshold !== null && item.quantity <= item.low_stock_threshold,
  );
  const inStock = data.inventory.filter((item) => item.quantity > (item.low_stock_threshold ?? -1));

  return (
    <div className="grid">
      <section className="panel">
        <div className="panel-head">
          <h2>Low stock</h2>
          <span className="count-badge warn-badge">{low.length}</span>
        </div>
        <div className="panel-body">
          {low.length === 0 && <div className="empty">All items above threshold.</div>}
          {low.map((item) => (
            <div key={item.id} className="row-between">
              <div>
                <div className="job-service">{item.name}</div>
                <div className="job-meta">
                  {item.category} · threshold {item.low_stock_threshold} {item.unit}
                </div>
              </div>
              <span className="badge badge-err">{item.quantity} left</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>On hand</h2>
          <span className="count-badge">{inStock.length}</span>
        </div>
        <div className="panel-body">
          {inStock.length === 0 && <div className="empty">No inventory items.</div>}
          {inStock.map((item) => (
            <div key={item.id} className="row-between">
              <div>
                <div className="job-service">{item.name}</div>
                <div className="job-meta">
                  {item.category} · {item.unit}
                </div>
              </div>
              <span className="chip">
                {item.quantity} {item.unit}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
