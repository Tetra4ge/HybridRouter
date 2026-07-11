export default function DecisionDistribution({ t0Pct, t1Pct, t2Pct, t3Pct }) {
  return (
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
  )
}
