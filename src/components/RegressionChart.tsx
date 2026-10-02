import type { ObservationPoint, RegressionAnalysis } from '../types/autonomous'

export function RegressionChart({
  points,
  regression,
  independentVar,
  dependentVar,
}: {
  points: ObservationPoint[]
  regression: RegressionAnalysis | null
  independentVar: string
  dependentVar: string
}) {
  if (points.length === 0) {
    return <div className="empty-chart">Enter observation points to visualize regression fit.</div>
  }

  const width = 480
  const height = 220
  const padding = 40

  const xs = points.map((p) => p.independentValue)
  const ys = points.map((p) => p.dependentValue)

  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const spanX = maxX - minX || 10
  const spanY = maxY - minY || 10

  const scaleX = (val: number) => padding + ((val - minX) / spanX) * (width - 2 * padding)
  const scaleY = (val: number) => height - padding - ((val - minY) / spanY) * (height - 2 * padding)

  // Line points for linear regression line
  const x1 = minX
  const y1 = regression ? regression.slope * x1 + regression.intercept : minY
  const x2 = maxX
  const y2 = regression ? regression.slope * x2 + regression.intercept : maxY

  return (
    <div className="chart-container">
      <svg className="svg-chart" viewBox={`0 0 ${width} ${height}`}>
        {/* Background Grid */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#2a3528" strokeWidth="1" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#2a3528" strokeWidth="1" />

        {/* Fitted Regression Line */}
        {regression && (
          <line
            x1={scaleX(x1)}
            y1={scaleY(y1)}
            x2={scaleX(x2)}
            y2={scaleY(y2)}
            stroke="#d6f25a"
            strokeWidth="2"
            strokeDasharray="4 2"
          />
        )}

        {/* Data Scatter Points */}
        {points.map((p) => (
          <g key={p.id}>
            <circle cx={scaleX(p.independentValue)} cy={scaleY(p.dependentValue)} r={5} fill="#6fbfb4" stroke="#10140f" strokeWidth="1.5" />
          </g>
        ))}

        {/* Axis Labels */}
        <text x={width / 2} y={height - 8} fill="#8b9786" fontSize="10" textAnchor="middle" fontFamily="monospace">
          {independentVar}
        </text>
        <text x={12} y={height / 2} fill="#8b9786" fontSize="10" textAnchor="middle" transform={`rotate(-90 12 ${height / 2})`} fontFamily="monospace">
          {dependentVar}
        </text>
      </svg>
      {regression && (
        <div className="chart-footer-caption">
          Fitted Equation: <b>{dependentVar}</b> = {regression.slope >= 0 ? '+' : ''}{regression.slope} × {independentVar} {regression.intercept >= 0 ? '+' : ''}{regression.intercept} (R² = {(regression.rSquared * 100).toFixed(1)}%)
        </div>
      )}
    </div>
  )
}
