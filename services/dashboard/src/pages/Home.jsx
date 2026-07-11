import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Zap, 
  ShieldCheck, 
  TrendingDown, 
  Cpu, 
  Database, 
  Sliders, 
  ArrowRight,
  Sun,
  Moon,
  Menu,
  X
} from 'lucide-react'

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 }
  }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 90, damping: 14 }
  }
}

export default function Home({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <motion.div 
      className="home-container"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header / Navbar */}
      <motion.header className="dashboard-header" variants={itemVariants}>
        <div className="logo-area">
          <div className="logo-icon-box">
            <Cpu size={22} />
          </div>
          <h1 style={{ fontFamily: 'var(--display)' }}>HybridRouter</h1>
        </div>

        <button 
          className="menu-toggle-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <nav className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <a href="#features" className="nav-link" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="#architecture" className="nav-link" onClick={() => setMenuOpen(false)}>Architecture</a>
          <button onClick={toggleTheme} className="theme-toggle-btn" aria-label="Toggle Theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </nav>
      </motion.header>

      {/* Hero Section */}
      <section className="home-hero">
        <motion.div 
          className="hero-badge"
          variants={itemVariants}
        >
          HYBRID TASK ROUTER
        </motion.div>
        
        <motion.h2 variants={itemVariants}>
          Hybrid Token-Efficient Routing Agent
        </motion.h2>
        
        <motion.p className="hero-subtitle" variants={itemVariants}>
          An intelligent, multi-tier waterfall router that maximizes task-solving accuracy while minimizing Fireworks Cloud API token costs using AMD ROCm powered local Gemma inference.
        </motion.p>
        
        <motion.div 
          className="hero-buttons"
          variants={itemVariants}
        >
          <motion.button 
            className="primary-btn" 
            style={{ padding: '0.8rem 2.5rem', fontSize: '1.05rem' }} 
            onClick={() => navigate('/console')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Open Live Console
          </motion.button>
          
          <motion.a 
            href="#architecture" 
            className="secondary-btn" 
            style={{ padding: '0.8rem 2.5rem', fontSize: '1.05rem' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Explore Architecture
          </motion.a>
        </motion.div>
      </section>

      {/* Key Features Grid */}
      <motion.section id="features" className="features-section" variants={containerVariants}>
        <motion.h3 className="section-title" variants={itemVariants}>
          Core Architecture Features
        </motion.h3>
        
        <div className="features-grid">
          <motion.div className="feature-card" variants={itemVariants} whileHover={{ y: -6 }}>
            <div className="feature-icon" style={{ color: 'var(--accent-butter)' }}>
              <Zap size={32} />
            </div>
            <h4>Waterfall Routing Order</h4>
            <p>Sequentially routes queries from Classifier, to Tier-0 (Deterministic), to Tier-1 (Local LLM), and escalates to Fireworks Cloud tiers only when confidence gates fail.</p>
          </motion.div>

          <motion.div className="feature-card" variants={itemVariants} whileHover={{ y: -6 }}>
            <div className="feature-icon" style={{ color: 'var(--accent-butter)' }}>
              <ShieldCheck size={32} />
            </div>
            <h4>Confidence Gating</h4>
            <p>Applies per-category dynamic thresholds and executes self-consistency voting to avoid expensive cloud calls.</p>
          </motion.div>

          <motion.div className="feature-card" variants={itemVariants} whileHover={{ y: -6 }}>
            <div className="feature-icon" style={{ color: 'var(--accent-butter)' }}>
              <TrendingDown size={32} />
            </div>
            <h4>89.2% Cost Savings</h4>
            <p>Reduces Fireworks API expenses significantly by filtering math, regex, parsing, and confident responses to free local resources.</p>
          </motion.div>

          <motion.div className="feature-card" variants={itemVariants} whileHover={{ y: -6 }}>
            <div className="feature-icon" style={{ color: 'var(--accent-butter)' }}>
              <Cpu size={32} />
            </div>
            <h4>Local Model Solver</h4>
            <p>Uses a local model server hosting Gemma-3-12B-it to solve tasks locally at zero Fireworks Cloud API token cost.</p>
          </motion.div>

          <motion.div className="feature-card" variants={itemVariants} whileHover={{ y: -6 }}>
            <div className="feature-icon" style={{ color: 'var(--accent-butter)' }}>
              <Database size={32} />
            </div>
            <h4>SQLite Telemetry Logs</h4>
            <p>Audits every routing run, recording task prompts, selected solvers, token counts, correctness checks, and execution times.</p>
          </motion.div>

          <motion.div className="feature-card" variants={itemVariants} whileHover={{ y: -6 }}>
            <div className="feature-icon" style={{ color: 'var(--accent-butter)' }}>
              <Sliders size={32} />
            </div>
            <h4>Interactive Playground</h4>
            <p>Enables developers to submit custom queries, override model routing, and inspect the decision pipeline visually in real-time.</p>
          </motion.div>
        </div>
      </motion.section>

      {/* Interactive Pipeline Visualizer Section */}
      <motion.section id="architecture" className="architecture-section" variants={containerVariants}>
        <motion.h3 className="section-title" variants={itemVariants}>
          Routing Pipeline Overview
        </motion.h3>
        
        <motion.div className="architecture-diagram-container" variants={itemVariants}>
          <div className="arch-step">
            <div className="arch-step-header">1. Classifier</div>
            <p>Regex & heuristics identify task category (Math, Code, Factual, Sentiment, etc.).</p>
          </div>
          <div className="arch-arrow">
            <ArrowRight size={20} />
          </div>
          <div className="arch-step">
            <div className="arch-step-header">2. Tier-0 Solver</div>
            <p>Deterministic regex and mathematical parser handles tasks with 100% accuracy.</p>
          </div>
          <div className="arch-arrow">
            <ArrowRight size={20} />
          </div>
          <div className="arch-step">
            <div className="arch-step-header">3. Tier-1 Local LLM</div>
            <p>Local model server runs Gemma-3-12B-it self-consistency checks to resolve tasks for free.</p>
          </div>
          <div className="arch-arrow">
            <ArrowRight size={20} />
          </div>
          <div className="arch-step">
            <div className="arch-step-header">4. Escalation Tiers</div>
            <p>Escalates to Cheap or Strong Fireworks models only if local confidence is low.</p>
          </div>
        </motion.div>
      </motion.section>
    </motion.div>
  )
}
