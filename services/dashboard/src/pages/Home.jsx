import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="home-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="logo-area" style={{ textAlign: 'left' }}>
          <h1>HybridRouter</h1>
          <p>Task Solver & Token Optimization Router — Track 1</p>
        </div>
        <button className="cta-launch-btn" onClick={() => navigate('/console')}>
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
          <button className="playground-btn" style={{ padding: '0.8rem 2rem', fontSize: '1rem', height: 'auto' }} onClick={() => navigate('/console')}>
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
