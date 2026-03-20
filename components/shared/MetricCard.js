export default function MetricCard({ label, value, icon, color = 'var(--accent-primary)', trend, trendValue }) {
  return (
    <div className="stat-card" style={{ '--card-color': color }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-icon" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>{icon}</div>
      {trend && trendValue && (
        <div className="stat-trend" style={{ color: trend === 'up' ? 'var(--success)' : 'var(--danger)' }}>
          {trend === 'up' ? '↑' : '↓'} {trendValue}
          <span className="stat-trend-label">vs last month</span>
        </div>
      )}
    </div>
  )
}
