import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState('home') // 'home' or 'console'
  const [stats, setStats] = useState({
    totalRuns: 0,
    accuracy: 0,
    totalTokens: 0,
    actualCost: 0,
    naiveCost: 0,
    savingsPercent: 0,
    tierCounts: {
      'tier-0': 0,
      'tier-1': 0,
      'tier-1-verified': 0,
      'tier-2': 0,
      'tier-3': 0,
      'fallback': 0
    },
    avgLatency: 0,
    p95Latency: 0
  })

  const [logs, setLogs] = useState([])
  const [systemActive, setSystemActive] = useState(true)

  // Playground Form State
  const [promptInput, setPromptInput] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('auto')
  const [playgroundLoading, setPlaygroundLoading] = useState(false)
  const [playgroundResult, setPlaygroundResult] = useState(null)

  const fetchDashboardData = async () => {
    try {
      const statsRes = await fetch('/api/stats')
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      const logsRes = await fetch('/api/logs?limit=40')
      if (logsRes.ok) {
        const logsData = await logsRes.json()
        setLogs(logsData)
      }
      setSystemActive(true)
    } catch (err) {
      console.error('Failed to poll dashboard data:', err)
      setSystemActive(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 5000)
    return () => clearInterval(interval)
  }, [])

  // Submit Query to Router
  const handleRouteQuery = async (e) => {
    e.preventDefault()
    if (!promptInput.trim()) return

    setPlaygroundLoading(true)
    setPlaygroundResult(null)

    try {
      const queryId = `query_${Date.now()}`
      const body = {
        id: queryId,
        content: promptInput
      }
      if (selectedCategory !== 'auto') {
        body.category = selectedCategory
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        const result = await response.json()
        
        setTimeout(async () => {
          const logsRes = await fetch('/api/logs?limit=5')
          if (logsRes.ok) {
            const logsData = await logsRes.json()
            const matchingLog = logsData.find(l => l.task_id === queryId)
            if (matchingLog) {
              setPlaygroundResult({
                ...result,
                tierUsed: matchingLog.tier_used,
                modelUsed: matchingLog.model_used,
                latencyMs: matchingLog.latency_ms,
                totalTokens: matchingLog.total_tokens,
                escalationReason: matchingLog.escalation_reason,
                confidence: matchingLog.confidence
              })
            } else {
              setPlaygroundResult(result)
            }
          }
          fetchDashboardData()
        }, 800)
      } else {
        console.error('Error executing task:', response.statusText)
      }
    } catch (err) {
      console.error('API submission failed:', err)
    } finally {
      setPlaygroundLoading(false)
    }
  }

  // Savings Calculations
  const savingsInDollars = stats.naiveCost - stats.actualCost
  const localCount = (stats.tierCounts?.['tier-0'] || 0) + 
                     (stats.tierCounts?.['tier-1'] || 0) + 
                     (stats.tierCounts?.['tier-1-verified'] || 0)
  const localRate = stats.totalRuns > 0 ? (localCount / stats.totalRuns) * 100 : 0

  const getPercentage = (count) => {
    return stats.totalRuns > 0 ? (count / stats.totalRuns) * 100 : 0
  }

  const t0Pct = getPercentage(stats.tierCounts?.['tier-0'] || 0)
  const t1Pct = getPercentage((stats.tierCounts?.['tier-1'] || 0) + (stats.tierCounts?.['tier-1-verified'] || 0))
  const t2Pct = getPercentage(stats.tierCounts?.['tier-2'] || 0)
  const t3Pct = getPercentage(stats.tierCounts?.['tier-3'] || 0)

  // Pipeline diagram highlight
  const getPipelineClass = (tier) => {
    if (!playgroundResult) return 'bypassed'
    const currentTier = playgroundResult.tierUsed || 'fallback'
    if (currentTier === tier) return 'active-hit'
    
    const tiers = ['classifier', 'tier-0', 'tier-1', 'tier-2', 'tier-3']
    const currentIndex = tiers.indexOf(currentTier)
    const tierIndex = tiers.indexOf(tier)

    if (tier === 'classifier') return 'active-passed'
    if (tierIndex < currentIndex) return 'active-passed'
    return 'bypassed'
  }

  if (currentPage === 'home') {
    return (
      <div className="home-container">
        {/* Header */}
        <header className="dashboard-header">
          <div className="logo-area" style={{ textAlign: 'left' }}>
            <h1>HybridRouter</h1>
            <p>Task Solver & Token Optimization Router — Track 1</p>
          </div>
          <button className="cta-launch-btn" onClick={() => setCurrentPage('console')}>
            Launch Control Center ──►
          </button>
        </header>

        {/* Hero Section */}
        <section className="home-hero">
          <div className="hero-badge">HYBRID TASK ROUTER</div>
          <h2>Hybrid Token-Efficient Routing Agent</h2>
          <p className="hero-subtitle">
            An intelligent, multi-tier waterfall router that maximizes task-solving accuracy while minimizing Fireworks Cloud API token costs.
          </p>
          <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="playground-btn" style={{ padding: '0.8rem 2rem', fontSize: '1rem', height: 'auto' }} onClick={() => setCurrentPage('console')}>
              Open Live Console
            </button>
            <a 
              href="#architecture" 
              className="status-badge" 
              style={{ 
                padding: '0.8rem 2rem', 
                cursor: 'pointer', 
                textDecoration: 'none', 
                borderColor: 'var(--accent-red)', 
                color: 'var(--accent-red)',
                background: 'rgba(229, 9, 20, 0.05)',
                fontWeight: '600'
              }}
            >
              Explore Architecture
            </a>
          </div>
        </section>

        {/* Key Features Grid */}
        <section className="features-section">
          <h3 className="section-title">Core Architecture Features</h3>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h4>Waterfall Routing Order</h4>
              <p>Sequentially routes queries from Classifier, to Tier-0 (Deterministic), to Tier-1 (Local LLM), and escalates to Fireworks Cloud tiers only when confidence gates fail.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🛡️</div>
              <h4>Confidence Gating</h4>
              <p>Applies per-category dynamic thresholds (e.g. classification, math, code) and executes self-consistency voting to avoid expensive cloud calls.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📉</div>
              <h4>89.2% Cost Savings</h4>
              <p>Reduces Fireworks API expenses significantly by filtering math, regex, parsing, and confident responses to free local resources.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">💻</div>
              <h4>Local Model Solver</h4>
              <p>Uses a local model server hosting Gemma-3-12B-it to solve tasks locally at zero Fireworks Cloud API token cost.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🗄️</div>
              <h4>SQLite Telemetry Logs</h4>
              <p>Audits every routing run, recording task prompts, selected solvers, token counts, correctness checks, and execution times.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🎛️</div>
              <h4>Interactive Playground</h4>
              <p>Enables developers to submit custom queries, override model routing, and inspect the decision pipeline visually in real-time.</p>
            </div>
          </div>
        </section>

        {/* Interactive Pipeline Visualizer Section */}
        <section id="architecture" className="architecture-section">
          <h3 className="section-title">Routing Pipeline Overview</h3>
          <div className="architecture-diagram-container">
            <div className="arch-step">
              <div className="arch-step-header">1. Classifier</div>
              <p>Regex & heuristics identify task category (Math, Code, Factual, Sentiment, etc.).</p>
            </div>
            <div className="arch-arrow">──►</div>
            <div className="arch-step">
              <div className="arch-step-header">2. Tier-0 Solver</div>
              <p>Deterministic regex and mathematical parser handles tasks with 100% accuracy.</p>
            </div>
            <div className="arch-arrow">──►</div>
            <div className="arch-step">
              <div className="arch-step-header">3. Tier-1 Local LLM</div>
              <p>Local model server runs Gemma-3-12B-it self-consistency checks to resolve tasks for free.</p>
            </div>
            <div className="arch-arrow">──►</div>
            <div className="arch-step">
              <div className="arch-step-header">4. Escalation Tiers</div>
              <p>Escalates to Cheap or Strong Fireworks models only if local confidence is low.</p>
            </div>
          </div>
        </section>
      </div>
    )
  }

  // Console / Control Center view
  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="logo-area" style={{ textAlign: 'left' }}>
          <button className="back-btn" onClick={() => setCurrentPage('home')}>
            ◄ Back to Portal Home
          </button>
          <h1 style={{ marginTop: '0.8rem' }}>Control Center Dashboard</h1>
        </div>
        <div className="status-badge">
          <div className={`status-dot ${systemActive ? 'active' : 'inactive'}`} />
          <span>{systemActive ? 'SYSTEM ACTIVE' : 'CONNECTION ERROR'}</span>
        </div>
      </header>

      {/* Metrics Cards Grid */}
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

      {/* Upper Grid Layout: Playground and Decision Distribution side-by-side */}
      <div className="dashboard-middle">
        {/* Left Side: Playground */}
        <div className="main-panel">
          <div className="panel-title">Interactive Router Playground</div>
          <form onSubmit={handleRouteQuery}>
            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 500 }}>
                Enter Test Query
              </label>
              <textarea
                className="playground-textarea"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="e.g. Calculate 24 * 15, or Classify sentiment: 'This is great!'"
                required
              />
            </div>

            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 500 }}>
                  Category Override
                </label>
                <select
                  className="playground-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="auto">Auto-Detect (Regex Classifier)</option>
                  <option value="math">Math</option>
                  <option value="code">Code</option>
                  <option value="factual">Factual</option>
                  <option value="logic">Logic</option>
                  <option value="parsing">Parsing</option>
                  <option value="classification">Classification</option>
                  <option value="creative">Creative</option>
                  <option value="multi_step">Multi-Step</option>
                </select>
              </div>
              <button
                type="submit"
                className="playground-btn"
                disabled={playgroundLoading}
                style={{ alignSelf: 'flex-end', height: '42px' }}
              >
                {playgroundLoading ? 'Routing...' : 'Execute Route'}
              </button>
            </div>
          </form>

          {/* Live Routing Diagram Visualizer */}
          {playgroundResult && (
            <div className="routing-visual-container">
              <div className="visual-title">Waterfall Routing Pipeline</div>
              <div className="pipeline-line-container">
                <div className={`pipeline-step ${getPipelineClass('classifier')}`}>
                  <div className="step-number">1</div>
                  <div className="step-label">Classifier</div>
                  <div className="step-val">{playgroundResult.category}</div>
                </div>
                <div className="pipeline-arrow">──►</div>

                <div className={`pipeline-step ${getPipelineClass('tier-0')}`}>
                  <div className="step-number">0</div>
                  <div className="step-label">Tier-0 Code</div>
                  <div className="step-val">Deterministic</div>
                </div>
                <div className="pipeline-arrow">──►</div>

                <div className={`pipeline-step ${getPipelineClass('tier-1')}`}>
                  <div className="step-number">1</div>
                  <div className="step-label">Tier-1 Local</div>
                  <div className="step-val">Gemma Local</div>
                </div>
                <div className="pipeline-arrow">──►</div>

                <div className={`pipeline-step ${getPipelineClass('tier-2')}`}>
                  <div className="step-number">2</div>
                  <div className="step-label">Tier-2 Cheap</div>
                  <div className="step-val">Kimi / GLM</div>
                </div>
                <div className="pipeline-arrow">──►</div>

                <div className={`pipeline-step ${getPipelineClass('tier-3')}`}>
                  <div className="step-number">3</div>
                  <div className="step-label">Tier-3 Strong</div>
                  <div className="step-val">DeepSeek</div>
                </div>
              </div>

              <div className="playground-output-box">
                <div className="output-header">
                  <span>Active Solver: <strong style={{color: 'var(--accent-green)'}}>{playgroundResult.modelUsed || playgroundResult.tierUsed || 'None'}</strong></span>
                  {playgroundResult.latencyMs && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Latency: {((playgroundResult.latencyMs || 0) / 1000).toFixed(2)}s | Tokens: {playgroundResult.totalTokens || 0}
                    </span>
                  )}
                </div>
                {playgroundResult.escalationReason && (
                  <div className="escalation-reason-alert">
                    ℹ️ {playgroundResult.escalationReason}
                  </div>
                )}
                <div className="output-body">
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--mono)', fontSize: '0.85rem' }}>
                    {playgroundResult.answer}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Decision Distribution */}
        <div className="distribution-panel" style={{ height: 'fit-content' }}>
          <div className="panel-title">Decision Distribution</div>
          <div className="dist-bar-container">
            <div className="dist-row">
              <div className="dist-labels">
                <span className="dist-label-name">Tier 0 (Code Solvers)</span>
                <span className="dist-label-val">{t0Pct.toFixed(0)}%</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill t0" style={{ width: `${t0Pct}%` }} />
              </div>
            </div>

            <div className="dist-row">
              <div className="dist-labels">
                <span className="dist-label-name">Tier 1 (Gemma Local)</span>
                <span className="dist-label-val">{t1Pct.toFixed(0)}%</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill t1" style={{ width: `${t1Pct}%` }} />
              </div>
            </div>

            <div className="dist-row">
              <div className="dist-labels">
                <span className="dist-label-name">Tier 2 (Cheap Cloud)</span>
                <span className="dist-label-val">{t2Pct.toFixed(0)}%</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill t2" style={{ width: `${t2Pct}%` }} />
              </div>
            </div>

            <div className="dist-row">
              <div className="dist-labels">
                <span className="dist-label-name">Tier 3 (Strong Cloud)</span>
                <span className="dist-label-val">{t3Pct.toFixed(0)}%</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill t3" style={{ width: `${t3Pct}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lower Row: Full-width Live Logs Explorer */}
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
    </div>
  )
}

export default App
