import type { KnowledgeGraphData } from '../types/autonomous'

export function KnowledgeGraphViewer({ graph }: { graph: KnowledgeGraphData | null }) {
  if (!graph || graph.nodes.length === 0) {
    return <div className="empty-chart">Knowledge Graph will construct upon running Cycle 1.</div>
  }

  const width = 500
  const height = 240

  // Standard clean layout positioning for nodes
  const layoutPos: Record<string, { x: number; y: number }> = {
    'node-camp': { x: 70, y: 120 },
    'node-hyp': { x: 180, y: 70 },
    'node-var': { x: 180, y: 170 },
    'node-exp': { x: 310, y: 120 },
    'node-res': { x: 430, y: 120 },
  }

  return (
    <div className="chart-container">
      <svg className="svg-chart" viewBox={`0 0 ${width} ${height}`}>
        {/* Render Edges */}
        {graph.edges.map((e) => {
          const sourcePos = layoutPos[e.source]
          const targetPos = layoutPos[e.target]
          if (!sourcePos || !targetPos) return null
          const isFalsified = e.relation === 'FALSIFIE_STATUS'
          return (
            <g key={e.id}>
              <line
                x1={sourcePos.x}
                y1={sourcePos.y}
                x2={targetPos.x}
                y2={targetPos.y}
                stroke={isFalsified ? '#e0624d' : '#6fbfb4'}
                strokeWidth="1.5"
                strokeDasharray={isFalsified ? '4 2' : 'none'}
              />
              <text
                x={(sourcePos.x + targetPos.x) / 2}
                y={(sourcePos.y + targetPos.y) / 2 - 6}
                fill="#8b9786"
                fontSize="8"
                textAnchor="middle"
                fontFamily="monospace"
              >
                {e.relation}
              </text>
            </g>
          )
        })}

        {/* Render Nodes */}
        {graph.nodes.map((n) => {
          const pos = layoutPos[n.id] ?? { x: 250, y: 120 }
          const colorMap: Record<string, string> = {
            Campaign: '#d6f25a',
            Hypothesis: '#6fbfb4',
            Variable: '#d08a58',
            Experiment: '#e2a24a',
            Result: '#cfc6a4',
          }
          const fill = colorMap[n.type] ?? '#6fbfb4'

          return (
            <g key={n.id} transform={`translate(${pos.x}, ${pos.y})`}>
              <circle r={14} fill="#171d16" stroke={fill} strokeWidth="2" />
              <text y={26} fill="#e7efe3" fontSize="9" textAnchor="middle" fontFamily="monospace">
                {n.label}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="chart-footer-caption">
        Knowledge Graph Nodes: Campaign ➔ Hypothesis ➔ Experiment ➔ Result ➔ Hypothesis
      </div>
    </div>
  )
}
