export default function MetricsCards({ stats, savingsInDollars, localRate }) {
  return (
    <div className="metrics-grid">
      <div className="metric-card runs">
        <div className="metric-title">Total Requests</div>
        <div className="metric-value">{stats.totalRuns}</div>
        <div className="metric-desc">Total processed evaluation runs</div>
      </div>

      <div className="metric-card savings">
        <div className="metric-title">Estimated Savings</div>
        <div className="metric-value">{(stats.savingsPercent || 0).toFixed(1)}%</div>
        <div className="metric-desc">
          Saved vs Naive Cloud: <span className="desc-accent-green">${Math.max(0, savingsInDollars).toFixed(4)}</span>
        </div>
      </div>

      <div className="metric-card local">
        <div className="metric-title">Local Solver Rate</div>
        <div className="metric-value">{localRate.toFixed(0)}%</div>
        <div className="metric-desc">Resolved on zero-token Tiers 0 & 1</div>
      </div>

      <div className="metric-card latency">
        <div className="metric-title">P95 Pipeline Latency</div>
        <div className="metric-value">{((stats.p95Latency || 0) / 1000).toFixed(2)}s</div>
        <div className="metric-desc">
          Average latency: <span>{((stats.avgLatency || 0) / 1000).toFixed(2)}s</span>
        </div>
      </div>
    </div>
  )
}
