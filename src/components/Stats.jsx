export default function Stats({ total, active, completed }) {
  return (
    <div className="stats" aria-label="Todo statistics">
      <span>Total: <span className="stat-num">{total}</span></span>
      <span>Active: <span className="stat-num">{active}</span></span>
      <span>Done: <span className="stat-num">{completed}</span></span>
    </div>
  )
}
