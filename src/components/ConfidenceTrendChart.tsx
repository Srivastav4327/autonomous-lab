import type { CycleRecord } from '../types/autonomous'

export function ConfidenceTrendChart({ cycles }: { cycles: CycleRecord[] }) {
  if (cycles.length === 0) {
    return <div className="empty-chart">No cycle history recorded yet.</div>
  }

  const width = 440
  const height = 180
  const padding = 36

  const points = cycles.map((c) => ({
    cycle: c.cycleNumber,
    confidence: c.analysis.bayesian.posterior,
    label: `C${c.cycleNumber}`,
  }))

  // Add initial cycle 0 prior if available
  const data = [
    { cycle: 0, confidence: cycles[0].hypothesis.prior, label: 'Prior' },
    ...points,
  ]

  const scaleX = (idx: number) => padding + (idx / Math.max(1, data.length - 1)) * (width - 2 * padding)
  const scaleY = (val: number) => height - padding - val * (height - 2 * padding)

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(d.confidence)}`)
    .join(' ')

  return (
    <div className="chart-container">
      <svg className="svg-chart" viewBox={`0 0 ${width} ${height}`}>
        {/* Baseline Line at 50% */}
        <line x1={padding} y1={scaleY(0.5)} x2={width - padding} y2={scaleY(0.5)} stroke="#2a3528" strokeDasharray="3 3" />
        
        {/* Confidence Line */}
        <path d={linePath} fill="none" stroke="#d6f25a" strokeWidth="2.5" />

        {/* Data Points */}
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={scaleX(i)} cy={scaleY(d.confidence)} r={4.5} fill="#10140f" stroke="#d6f25a" strokeWidth="2" />
            <text x={scaleX(i)} y={scaleY(d.confidence) - 10} fill="#e7efe3" fontSize="9" textAnchor="middle" fontFamily="monospace">
              {(d.confidence * 100).toFixed(0)}%
            </text>
            <text x={scaleX(i)} y={height - 10} fill="#8b9786" fontSize="9" textAnchor="middle" fontFamily="monospace">
              {d.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="chart-footer-caption">
        Hypothesis Belief Progression P(H|E) over Cycle Iterations
      </div>
    </div>
  )
}
