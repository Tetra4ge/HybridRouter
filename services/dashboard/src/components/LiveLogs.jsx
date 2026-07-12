/**
 * components/LiveLogs.jsx
 * Displays Firestore real-time log feed (global, all signed-in users).
 * Shows a sign-in prompt if user is not authenticated.
 */
export default function LiveLogs({ logs, isAuthenticated, onSignIn }) {
  if (!isAuthenticated) {
    return (
      <div className="main-panel" style={{ marginTop: ''1.5rem'', textAlign: ''center'', padding: ''3rem 2rem'' }}>
        <div className="panel-title" style={{ justifyContent: ''center'', marginBottom: ''1.5rem'' }}>
          <span>Live Logs Feed</span>
        </div>
        <p style={{ color: ''var(--text-muted)'', marginBottom: ''1.2rem'', fontSize: ''0.95rem'' }}>
          Sign in to view the real-time query log feed powered by Cloud Firestore.
        </p>
        <button className="primary-btn" onClick={onSignIn} style={{ padding: ''0.6rem 2rem'' }}>
          Sign In to View Logs
        </button>
      </div>
    )
  }

  return (
    <div className="main-panel" style={{ marginTop: ''1.5rem'' }}>
      <div className="panel-title">
        <span>Live Logs Feed</span>
        <span style={{ fontSize: ''0.8rem'', fontWeight: ''normal'', color: ''var(--text-muted)'' }}>
          Firestore real-time · All users
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
              <th>Submitted By</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: ''center'', color: ''var(--text-muted)'', padding: ''3rem'' }}>
                  No queries yet. Submit one from the playground above!
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const tier = log.tierUsed || ''unknown''
                const taskCost = tier === ''tier-3''
                  ? ((log.totalTokens || 0) * 1.74e-6)
                  : (tier === ''tier-2'' || tier === ''tier-1-verified'')
                    ? ((log.totalTokens || 0) * 0.20e-6)
                    : 0

                return (
                  <tr key={log.id || log.queryId}>
                    <td className="mono">{log.queryId}</td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{log.category}</span>
                    </td>
                    <td>
                      <span className={`badge ${tier}`}>{tier}</span>
                    </td>
                    <td className="mono">{((log.latencyMs || 0) / 1000).toFixed(2)}s</td>
                    <td className="mono">${taskCost.toFixed(4)}</td>
                    <td>
                      <div style={{ display: ''flex'', alignItems: ''center'', gap: ''0.5rem'' }}>
                        {log.submittedByPhoto && (
                          <img
                            src={log.submittedByPhoto}
                            alt={log.submittedByName}
                            style={{ width: ''20px'', height: ''20px'', objectFit: ''cover'' }}
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <span style={{ fontSize: ''0.85rem'' }}>{log.submittedByName || ''Unknown''}</span>
                      </div>
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
