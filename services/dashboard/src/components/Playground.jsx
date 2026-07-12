export default function Playground({
  promptInput,
  setPromptInput,
  selectedCategory,
  setSelectedCategory,
  playgroundLoading,
  playgroundResult,
  handleRouteQuery,
  handleQueryBlur,
  aiClassifying,
  aiClassifiedCategory
}) {
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

  return (
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
            onBlur={handleQueryBlur}
            placeholder="e.g. Calculate 24 * 15, or Classify sentiment: 'This is great!'"
            required
          />

          {/* AI-Assist Status Badge */}
          {(aiClassifying || aiClassifiedCategory) && (
            <div className={`ai-classify-badge ${aiClassifying ? 'classifying' : 'done'}`}>
              {aiClassifying
                ? '✦ AI classifying...'
                : `✓ AI detected: ${aiClassifiedCategory}`
              }
            </div>
          )}
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
  )
}
