import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon, User, LogOut } from 'lucide-react'
import MetricsCards from '../components/MetricsCards'
import Playground from '../components/Playground'
import DecisionDistribution from '../components/DecisionDistribution'
import LiveLogs from '../components/LiveLogs'
import { classifyWithGemini } from '../utils/geminiClassifier'

export default function Console({ theme, toggleTheme, isSignedIn, setIsSignedIn }) {
  const navigate = useNavigate()
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

  // AI-Assist Smart Classifier state
  const [aiClassifying, setAiClassifying] = useState(false)
  const [aiClassifiedCategory, setAiClassifiedCategory] = useState(null)

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

  // AI-Assist: auto-classify query on textarea blur
  const handleQueryBlur = useCallback(async () => {
    if (!promptInput.trim()) return
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey || apiKey === 'your-gemini-api-key-here') return // skip if key not configured

    setAiClassifying(true)
    setAiClassifiedCategory(null)
    try {
      const category = await classifyWithGemini(promptInput, apiKey)
      if (category) {
        setSelectedCategory(category)
        setAiClassifiedCategory(category)
      }
    } finally {
      setAiClassifying(false)
    }
  }, [promptInput])

  // Submit Query to Router
  const handleRouteQuery = async (e) => {
    e.preventDefault()
    if (!isSignedIn) {
      alert("Please Sign In first to test queries.")
      return
    }
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

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="logo-area" style={{ gap: '1.6rem' }}>
          <button className="back-btn" onClick={() => navigate('/')}>
            ◄ Back
          </button>
          <h1>Control Center Dashboard</h1>
        </div>
        <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
          <button onClick={toggleTheme} className="theme-toggle-btn" aria-label="Toggle Theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          {isSignedIn ? (
            <button 
              className="secondary-btn" 
              onClick={() => setIsSignedIn(false)}
              style={{ padding: '0.4rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <LogOut size={16} /> Sign Out
            </button>
          ) : (
            <button 
              className="primary-btn" 
              onClick={() => setIsSignedIn(true)}
              style={{ padding: '0.4rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <User size={16} /> Sign In
            </button>
          )}

          <div className="status-badge">
            <div className={`status-dot ${systemActive ? 'active' : 'inactive'}`} />
            <span>{systemActive ? 'SYSTEM ACTIVE' : 'CONNECTION ERROR'}</span>
          </div>
        </div>
      </header>

      {/* Metrics Cards Grid */}
      <MetricsCards 
        stats={stats} 
        savingsInDollars={savingsInDollars} 
        localRate={localRate} 
      />

      {/* Upper Grid Layout: Playground and Decision Distribution side-by-side */}
      <div className="dashboard-middle">
        {/* Left Side: Playground */}
        <Playground 
          promptInput={promptInput}
          setPromptInput={setPromptInput}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          playgroundLoading={playgroundLoading}
          playgroundResult={playgroundResult}
          handleRouteQuery={handleRouteQuery}
          handleQueryBlur={handleQueryBlur}
          aiClassifying={aiClassifying}
          aiClassifiedCategory={aiClassifiedCategory}
        />

        {/* Right Side: Decision Distribution */}
        <DecisionDistribution 
          t0Pct={t0Pct}
          t1Pct={t1Pct}
          t2Pct={t2Pct}
          t3Pct={t3Pct}
        />
      </div>

      {/* Lower Row: Full-width Live Logs Explorer */}
      <LiveLogs logs={logs} />
    </div>
  )
}
