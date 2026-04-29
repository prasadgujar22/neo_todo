export default function Stats({ total, active, completed }) {
  return (
    <div className="stats" aria-label="Todo statistics">
      <span>Total: {total}</span>
      <span>Active: {active}</span>
      <span>Completed: {completed}</span>
    </div>
  )
}
