export default function LiveLogs({ logs }) {
  return (
    <div className="main-panel" style={{ marginTop: '1.5rem' }}>
      <div className="panel-title">
        <span>Live Logs Feed</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>
          Polling active (5s)
        </span>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Task ID</th>
              <th>Category</th>
              <th>Selected Tier</th>
              <th>Latency</th>
              <th>Cost</th>
              <th>Verify Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                  No requests processed yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const taskCost = log.tier_used === 'tier-3' 
                  ? (log.prompt_tokens * 1.74e-6 + log.completion_tokens * 3.48e-6)
                  : (log.tier_used === 'tier-2' || log.tier_used === 'tier-1-verified')
                    ? (log.prompt_tokens * 0.20e-6 + log.completion_tokens * 0.20e-6)
                    : 0

                return (
                  <tr key={log.id}>
                    <td className="mono">{log.task_id}</td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{log.category}</span>
                    </td>
                    <td>
                      <span className={`badge ${log.tier_used}`}>{log.tier_used}</span>
                    </td>
                    <td className="mono">{((log.latency_ms || 0) / 1000).toFixed(2)}s</td>
                    <td className="mono">${taskCost.toFixed(4)}</td>
                    <td style={{ textAlign: 'center' }}>
                      {log.is_correct === 1 ? (
                        <span className="correct-icon">✓</span>
                      ) : log.is_correct === 0 ? (
                        <span className="incorrect-icon">✗</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
