import { useState, useEffect, useCallback } from ''react''
import { useNavigate } from ''react-router-dom''
import { Sun, Moon, LogOut } from ''lucide-react''
import MetricsCards from ''../components/MetricsCards''
import Playground from ''../components/Playground''
import DecisionDistribution from ''../components/DecisionDistribution''
import LiveLogs from ''../components/LiveLogs''
import SignInModal from ''../components/SignInModal''
import { classifyWithGemini } from ''../utils/geminiClassifier''
import { useAuth } from ''../context/AuthContext''
import { saveQueryLog, subscribeToLogs } from ''../firebase/firestoreUtils''

export default function Console({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const { currentUser, signOutUser } = useAuth()

  const [stats, setStats] = useState({
    totalRuns: 0,
    accuracy: 0,
    totalTokens: 0,
    actualCost: 0,
    naiveCost: 0,
    savingsPercent: 0,
    tierCounts: {
      ''tier-0'': 0,
      ''tier-1'': 0,
      ''tier-1-verified'': 0,
      ''tier-2'': 0,
      ''tier-3'': 0,
      ''fallback'': 0
    },
    avgLatency: 0,
    p95Latency: 0
  })

  const [firestoreLogs, setFirestoreLogs] = useState([])
  const [systemActive, setSystemActive] = useState(true)
  const [signInOpen, setSignInOpen] = useState(false)

  // Playground Form State
  const [promptInput, setPromptInput] = useState('''')
  const [selectedCategory, setSelectedCategory] = useState(''auto'')
  const [playgroundLoading, setPlaygroundLoading] = useState(false)
  const [playgroundResult, setPlaygroundResult] = useState(null)

  // AI-Assist Smart Classifier state
  const [aiClassifying, setAiClassifying] = useState(false)
  const [aiClassifiedCategory, setAiClassifiedCategory] = useState(null)

  // Poll SQLite stats for metrics cards only
  const fetchStats = async () => {
    try {
      const statsRes = await fetch(''/api/stats'')
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
      setSystemActive(true)
    } catch (err) {
      console.error(''Failed to poll stats:'', err)
      setSystemActive(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 5000)
    return () => clearInterval(interval)
  }, [])

  // Subscribe to Firestore live logs (real-time, all signed-in users)
  useEffect(() => {
    if (!currentUser) {
      setFirestoreLogs([])
      return
    }
    const unsubscribe = subscribeToLogs((logs) => setFirestoreLogs(logs), 50)
    return () => unsubscribe()
  }, [currentUser])

  // AI-Assist: auto-classify query on textarea blur
  const handleQueryBlur = useCallback(async () => {
    if (!promptInput.trim()) return
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey || apiKey === ''your-gemini-api-key-here'') return

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
    if (!currentUser) {
      setSignInOpen(true)
      return
    }
    if (!promptInput.trim()) return

    setPlaygroundLoading(true)
    setPlaygroundResult(null)

    try {
      const queryId = `query_${Date.now()}`
      const body = { id: queryId, content: promptInput }
      if (selectedCategory !== ''auto'') body.category = selectedCategory

      const response = await fetch(''/api/tasks'', {
        method: ''POST'',
        headers: { ''Content-Type'': ''application/json'' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        const result = await response.json()

        setTimeout(async () => {
          const logsRes = await fetch(''/api/logs?limit=5'')
          let enrichedResult = result

          if (logsRes.ok) {
            const logsData = await logsRes.json()
            const matchingLog = logsData.find(l => l.task_id === queryId)
            if (matchingLog) {
              enrichedResult = {
                ...result,
                tierUsed:          matchingLog.tier_used,
                modelUsed:         matchingLog.model_used,
                latencyMs:         matchingLog.latency_ms,
                totalTokens:       matchingLog.total_tokens,
                escalationReason:  matchingLog.escalation_reason,
                confidence:        matchingLog.confidence
              }
            }
          }

          setPlaygroundResult(enrichedResult)

          // Write to Firestore (global shared log)
          await saveQueryLog(queryId, {
            prompt:           promptInput,
            category:         enrichedResult.category || ''unknown'',
            tierUsed:         enrichedResult.tierUsed || ''unknown'',
            modelUsed:        enrichedResult.modelUsed || null,
            latencyMs:        enrichedResult.latencyMs || 0,
            totalTokens:      enrichedResult.totalTokens || 0,
            answer:           enrichedResult.answer || '''',
            confidence:       enrichedResult.confidence ?? null,
            escalationReason: enrichedResult.escalationReason || null,
          }, currentUser)

          fetchStats()
        }, 800)
      } else {
        console.error(''Error executing task:'', response.statusText)
      }
    } catch (err) {
      console.error(''API submission failed:'', err)
    } finally {
      setPlaygroundLoading(false)
    }
  }

  // Savings Calculations
  const savingsInDollars = stats.naiveCost - stats.actualCost
  const localCount = (stats.tierCounts?.[''tier-0''] || 0) +
                     (stats.tierCounts?.[''tier-1''] || 0) +
                     (stats.tierCounts?.[''tier-1-verified''] || 0)
  const localRate = stats.totalRuns > 0 ? (localCount / stats.totalRuns) * 100 : 0

  const getPercentage = (count) => stats.totalRuns > 0 ? (count / stats.totalRuns) * 100 : 0
  const t0Pct = getPercentage(stats.tierCounts?.[''tier-0''] || 0)
  const t1Pct = getPercentage((stats.tierCounts?.[''tier-1''] || 0) + (stats.tierCounts?.[''tier-1-verified''] || 0))
  const t2Pct = getPercentage(stats.tierCounts?.[''tier-2''] || 0)
  const t3Pct = getPercentage(stats.tierCounts?.[''tier-3''] || 0)

  return (
    <div className="dashboard-container">
      <SignInModal isOpen={signInOpen} onClose={() => setSignInOpen(false)} />

      {/* Header */}
      <header className="dashboard-header">
        <div className="logo-area" style={{ gap: ''1.6rem'' }}>
          <button className="back-btn" onClick={() => navigate(''/'')}>
            ◄ Back
          </button>
          <h1>Control Center Dashboard</h1>
        </div>
        <div style={{ display: ''flex'', gap: ''1rem'', alignItems: ''center'' }}>
          <button onClick={toggleTheme} className="theme-toggle-btn" aria-label="Toggle Theme">
            {theme === ''dark'' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {currentUser ? (
            <div className="auth-user-chip">
              {currentUser.photoURL && (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName}
                  className="user-avatar"
                  referrerPolicy="no-referrer"
                />
              )}
              <span className="user-name">{currentUser.displayName?.split('' '')[0]}</span>
              <button
                className="secondary-btn"
                onClick={signOutUser}
                style={{ padding: ''0.3rem 0.8rem'', fontSize: ''0.85rem'', display: ''flex'', alignItems: ''center'', gap: ''0.4rem'' }}
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          ) : (
            <button
              className="primary-btn"
              onClick={() => setSignInOpen(true)}
              style={{ padding: ''0.4rem 1.1rem'', fontSize: ''0.9rem'' }}
            >
              Sign In
            </button>
          )}

          <div className="status-badge">
            <div className={`status-dot ${systemActive ? ''active'' : ''inactive''}`} />
            <span>{systemActive ? ''SYSTEM ACTIVE'' : ''CONNECTION ERROR''}</span>
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
        <DecisionDistribution
          t0Pct={t0Pct}
          t1Pct={t1Pct}
          t2Pct={t2Pct}
          t3Pct={t3Pct}
        />
      </div>

      {/* Firestore Live Logs (sign-in required) */}
      <LiveLogs logs={firestoreLogs} isAuthenticated={!!currentUser} onSignIn={() => setSignInOpen(true)} />
    </div>
  )
}
