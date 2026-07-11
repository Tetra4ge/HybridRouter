import React, { useState } from 'react'

export default function SavingsCalculator() {
  const [queries, setQueries] = useState(100000)

  // Calculations:
  // Naive Cloud Cost: assuming average 1000 tokens (500 in, 500 out) routed entirely to paid Llama-3 70B ($0.90 per million)
  const naiveCost = queries * 0.0009
  // HybridRouter Cost: T0 (35% at $0) + T1 Local (40% at $0) + T2 Cheap (20% at $0.0002) + T3 Strong (5% at $0.0009)
  const hybridCost = queries * 0.000085
  const savings = naiveCost - hybridCost
  const percentSaved = ((naiveCost - hybridCost) / naiveCost) * 100

  return (
    <section id="simulator" className="calculator-section" style={{ marginTop: '5rem', marginBottom: '5rem', textAlign: 'left' }}>
      <h3 className="section-title">Token Cost Savings Simulator</h3>
      <div className="feature-card" style={{ padding: '2.5rem' }}>
        <p style={{ marginBottom: '1.8rem', opacity: 0.8, lineHeight: '1.6' }}>
          Estimate your token savings by routing queries through HybridRouter's waterfall pipeline instead of sending all requests directly to high-capacity cloud models. Use the slider below to adjust query volume.
        </p>

        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, marginBottom: '0.8rem', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>
            <span>Monthly Query Volume</span>
            <span style={{ color: 'var(--accent-color)', fontFamily: 'var(--mono)' }}>{queries.toLocaleString()} runs</span>
          </div>
          <input 
            type="range" 
            min="10000" 
            max="1000000" 
            step="10000" 
            value={queries} 
            onChange={(e) => setQueries(parseInt(e.target.value))}
            className="slider-input"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.6 }}>Naive Cloud Cost</span>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'var(--display)', marginTop: '0.5rem', color: '#ff1744' }}>
              ${naiveCost.toFixed(2)}
            </div>
            <p style={{ fontSize: '0.8rem', opacity: 0.5, marginTop: '0.2rem' }}>Direct routing to Llama-3 70B</p>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.6 }}>HybridRouter Cost</span>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'var(--display)', marginTop: '0.5rem', color: '#00e676' }}>
              ${hybridCost.toFixed(2)}
            </div>
            <p style={{ fontSize: '0.8rem', opacity: 0.5, marginTop: '0.2rem' }}>Waterfall routing with local models</p>
          </div>

          <div className="savings-highlight">
            <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.6 }}>Estimated Savings</span>
            <div style={{ fontSize: '2.6rem', fontWeight: 800, fontFamily: 'var(--display)', marginTop: '0.4rem', color: 'var(--accent-color)' }}>
              ${savings.toFixed(2)}
            </div>
            <p style={{ fontSize: '0.85rem', color: '#00e676', fontWeight: 800, marginTop: '0.2rem' }}>{percentSaved.toFixed(1)}% Cost Reduction</p>
          </div>
        </div>
      </div>
    </section>
  )
}
