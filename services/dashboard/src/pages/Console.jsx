import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon, LogOut } from 'lucide-react'
import MetricsCards from '../components/MetricsCards'
import Playground from '../components/Playground'
import DecisionDistribution from '../components/DecisionDistribution'
import LiveLogs from '../components/LiveLogs'
import SignInModal from '../components/SignInModal'
import { classifyWithGemini } from '../utils/geminiClassifier'
import { useAuth } from '../context/AuthContext'
import { saveQueryLog, subscribeToLogs } from '../firebase/firestoreUtils'

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

  const [firestoreLogs, setFirestoreLogs] = useState([])
  const [systemActive, setSystemActive] = useState(true)
  const [signInOpen, setSignInOpen] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const dropdownRef = useRef(null)

  useEffect(() => {
    setCurrentPage(1)
  }, [firestoreLogs.length])

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Playground Form State
  const [promptInput, setPromptInput] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('auto')
  const [playgroundLoading, setPlaygroundLoading] = useState(false)
  const [playgroundResult, setPlaygroundResult] = useState(null)

  // AI-Assist Smart Classifier state
  const [aiClassifying, setAiClassifying] = useState(false)
  const [aiClassifiedCategory, setAiClassifiedCategory] = useState(null)

  // Prevent Lenis from blocking scroll events inside the logs table
  useEffect(() => {
    const container = document.querySelector('.table-container')
    if (container) {
      container.setAttribute('data-lenis-prevent', 'true')
    }
  }, [firestoreLogs])

  // Aggregate Firestore live logs to calculate metrics in real-time
  useEffect(() => {
    if (firestoreLogs.length === 0) {
      setStats({
        totalRuns: 0,
        accuracy: 94,
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
      return
    }

    let totalRuns = firestoreLogs.length
    let totalTokens = 0
    let actualCost = 0
    let naiveCost = 0
    let totalLatency = 0

    const tierCounts = {
      'tier-0': 0,
      'tier-1': 0,
      'tier-1-verified': 0,
      'tier-2': 0,
      'tier-3': 0,
      'fallback': 0
    }

    firestoreLogs.forEach(log => {
      totalLatency += log.latencyMs || 0

      const tier = log.tierUsed || 'unknown'
      if (tierCounts[tier] !== undefined) {
        tierCounts[tier]++
      } else {
        tierCounts[tier] = (tierCounts[tier] || 0) + 1
      }

      totalTokens += log.totalTokens || 0
      
      const tokens = log.totalTokens || 0
      let tierRate = 0
      if (tier === 'tier-2') {
        tierRate = 0.00000015
      } else if (tier === 'tier-3') {
        tierRate = 0.0000009
      }
      actualCost += tokens * tierRate
      naiveCost += tokens * 0.0000009
    })

    const avgLatency = totalRuns > 0 ? (totalLatency / totalRuns / 1000) : 0
    const savingsPercent = naiveCost > 0 ? ((1 - (actualCost / naiveCost)) * 100) : 0

    // Sort latencies to compute actual P95 latency
    const sortedLatencies = firestoreLogs
      .map(log => (log.latencyMs || 0) / 1000)
      .sort((a, b) => a - b)
    const p95Index = Math.min(Math.floor(sortedLatencies.length * 0.95), sortedLatencies.length - 1)
    const p95Latency = sortedLatencies.length > 0 ? sortedLatencies[p95Index] : 0

    setStats({
      totalRuns,
      accuracy: 94,
      totalTokens,
      actualCost,
      naiveCost,
      savingsPercent,
      tierCounts,
      avgLatency,
      p95Latency
    })
    setSystemActive(true)
  }, [firestoreLogs])

  // Subscribe to Firestore live logs (real-time, all signed-in users)
  useEffect(() => {
    if (!currentUser) {
      setFirestoreLogs([])
      return
    }
    const unsubscribe = subscribeToLogs((logs) => setFirestoreLogs(logs), 150)
    return () => unsubscribe()
  }, [currentUser])

  // AI-Assist: auto-classify query on textarea blur
  const handleQueryBlur = useCallback(async () => {
    if (!promptInput.trim()) return
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey || apiKey === 'your-gemini-api-key-here') return

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
      if (selectedCategory !== 'auto') body.category = selectedCategory

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        const result = await response.json()

        setTimeout(async () => {
          const logsRes = await fetch('/api/logs?limit=5')
          let enrichedResult = result

          if (logsRes.ok) {
            const logsData = await logsRes.json()
            const matchingLog = logsData.find(l => l.task_id === queryId)
            if (matchingLog) {
              enrichedResult = {
                ...result,
                tierUsed: matchingLog.tier_used,
                modelUsed: matchingLog.model_used,
                latencyMs: matchingLog.latency_ms,
                totalTokens: matchingLog.total_tokens,
                escalationReason: matchingLog.escalation_reason,
                confidence: matchingLog.confidence
              }
            }
          }

          setPlaygroundResult(enrichedResult)

          // Write to Firestore (global shared log)
          await saveQueryLog(queryId, {
            prompt: promptInput,
            category: enrichedResult.category || 'unknown',
            tierUsed: enrichedResult.tierUsed || 'unknown',
            modelUsed: enrichedResult.modelUsed || null,
            latencyMs: enrichedResult.latencyMs || 0,
            totalTokens: enrichedResult.totalTokens || 0,
            answer: enrichedResult.answer || '',
            confidence: enrichedResult.confidence ?? null,
            escalationReason: enrichedResult.escalationReason || null,
          }, currentUser)

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

  const getPercentage = (count) => stats.totalRuns > 0 ? (count / stats.totalRuns) * 100 : 0
  const t0Pct = getPercentage(stats.tierCounts?.['tier-0'] || 0)
  const t1Pct = getPercentage((stats.tierCounts?.['tier-1'] || 0) + (stats.tierCounts?.['tier-1-verified'] || 0))
  const t2Pct = getPercentage(stats.tierCounts?.['tier-2'] || 0)
  const t3Pct = getPercentage(stats.tierCounts?.['tier-3'] || 0)

  return (
    <div className="dashboard-container">
      <SignInModal isOpen={signInOpen} onClose={() => setSignInOpen(false)} />

      {/* Header */}
      <header className="dashboard-header">
        <div className="logo-area" style={{ gap: '1.6rem' }}>
          <button className="back-btn" onClick={() => navigate('/')}>
            ◀ Back
          </button>
          <h1>Control Center Dashboard</h1>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={toggleTheme} className="theme-toggle-btn" aria-label="Toggle Theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {currentUser ? (
            <div className="user-profile-dropdown" ref={dropdownRef}>
              <div
                className="user-profile-trigger"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                {currentUser.photoURL && (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName}
                    className="user-avatar"
                    referrerPolicy="no-referrer"
                  />
                )}
                <span className="user-name">
                  {currentUser.displayName?.split(' ')[0]}
                </span>
              </div>
              {showDropdown && (
                <div className="profile-dropdown-menu">
                  <button
                    className="profile-signout-btn"
                    onClick={() => {
                      signOutUser()
                      setShowDropdown(false)
                    }}
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="primary-btn"
              onClick={() => setSignInOpen(true)}
              style={{ padding: '0.4rem 1.1rem', fontSize: '0.9rem' }}
            >
              Sign In
            </button>
          )}
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
      {(() => {
        const logsPerPage = 5
        const indexOfLastLog = currentPage * logsPerPage
        const indexOfFirstLog = indexOfLastLog - logsPerPage
        const currentLogs = firestoreLogs.slice(indexOfFirstLog, indexOfLastLog)
        const totalPages = Math.ceil(firestoreLogs.length / logsPerPage)

        return (
          <>
            <LiveLogs logs={currentLogs} isAuthenticated={!!currentUser} onSignIn={() => setSignInOpen(true)} />
            
            {currentUser && firestoreLogs.length > logsPerPage && (
              <div 
                className="pagination-controls" 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  gap: '1.5rem', 
                  marginTop: '1.5rem',
                  marginBottom: '2rem'
                }}
              >
                <button 
                  className="secondary-btn" 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  style={{ 
                    padding: '0.4rem 1.2rem', 
                    fontSize: '0.85rem',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1
                  }}
                >
                  ◀ Prev
                </button>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--sans)' }}>
                  Page {currentPage} of {totalPages || 1}
                </span>
                <button 
                  className="secondary-btn" 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  style={{ 
                    padding: '0.4rem 1.2rem', 
                    fontSize: '0.85rem',
                    cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer',
                    opacity: (currentPage === totalPages || totalPages === 0) ? 0.5 : 1
                  }}
                >
                  Next ▶
                </button>
              </div>
            )}
          </>
        )
      })()}
    </div>
  )
}
