import { useState } from 'react'
import { AutonomousLoopStudio } from './components/AutonomousLoopStudio'
import { DOMAIN_COPY, STAGES } from './data/catalog'
import { DiscoveryProvider, useClockLabel, useDiscovery } from './engine/store'
import type { Campaign, Domain, GraphNode, Hardware, Stage } from './types'

type ViewTab = 'autonomous' | 'dashboard' | 'hardware' | 'analytics' | 'ledger'

export default function App() {
  return (
    <DiscoveryProvider>
      <Shell />
    </DiscoveryProvider>
  )
}

function Shell() {
  const { state, selected, dispatch } = useDiscovery()
  const clock = useClockLabel()
  const [activeTab, setActiveTab] = useState<ViewTab>('autonomous')
  const [showNewCampModal, setShowNewCampModal] = useState(false)
  const [showNewHypModal, setShowNewHypModal] = useState(false)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)

  return (
    <div className="app">
      <header className="mast">
        <div className="brand">
          <span className="mark" aria-hidden>
            ⌘
          </span>
          <div>
            <strong>HELIX</strong>
            <small>Closed-loop discovery OS</small>
          </div>
        </div>
        <p className="claim">
          Hypothesis → physical experiment → knowledge. Real statistical reasoning,
          Bayesian updates &amp; autonomous next experiment recommendations.
        </p>
        <div className="mast-meta">
          <span className="pill">{clock}</span>
          <span className="pill">{state.campaigns.length} campaigns</span>
          <label className="speed">
            cadence
            <select
              value={state.speedMs}
              onChange={(e) => dispatch({ type: 'speed', ms: Number(e.target.value) })}
            >
              <option value={2200}>slow</option>
              <option value={1400}>live</option>
              <option value={700}>fast</option>
            </select>
          </label>
          <button className="btn primary" onClick={() => setShowNewCampModal(true)}>
            + New Campaign
          </button>
        </div>
      </header>

      <nav className="campaigns" aria-label="Campaigns">
        {state.campaigns.map((c) => (
          <button
            key={c.id}
            className={c.id === selected.id ? 'camp on' : 'camp'}
            onClick={() => dispatch({ type: 'select', id: c.id })}
          >
            <span className="camp-dom">{DOMAIN_COPY[c.domain]?.label ?? c.domain}</span>
            <span className="camp-name">{c.name}</span>
            <span className="camp-st">
              C{c.cycle} · {c.stage}
              {c.waitingApproval ? ' · GATE' : c.running ? ' · LIVE' : ' · HOLD'}
            </span>
          </button>
        ))}
      </nav>

      <div className="view-switcher">
        <button
          className={activeTab === 'autonomous' ? 'tab on highlight' : 'tab'}
          onClick={() => setActiveTab('autonomous')}
        >
          ⚡ Autonomous Loop (Real Engine)
        </button>
        <button
          className={activeTab === 'dashboard' ? 'tab on' : 'tab'}
          onClick={() => setActiveTab('dashboard')}
        >
          Control Room
        </button>
        <button
          className={activeTab === 'hardware' ? 'tab on' : 'tab'}
          onClick={() => setActiveTab('hardware')}
        >
          Hardware &amp; Telemetry
        </button>
        <button
          className={activeTab === 'analytics' ? 'tab on' : 'tab'}
          onClick={() => setActiveTab('analytics')}
        >
          Convergence Analytics
        </button>
        <button
          className={activeTab === 'ledger' ? 'tab on' : 'tab'}
          onClick={() => setActiveTab('ledger')}
        >
          Audit Ledger ({selected.provenance.length})
        </button>
      </div>

      {activeTab === 'autonomous' && (
        <section className="view-container">
          <AutonomousLoopStudio />
        </section>
      )}

      {activeTab === 'dashboard' && (
        <>
          <section className="hero">
            <LoopRing stage={selected.stage} waiting={selected.waitingApproval} />
            <div className="brief">
              <p className="kicker">Open scientific question</p>
              <h1>{selected.question}</h1>
              <dl className="facts">
                <div>
                  <dt>Owner</dt>
                  <dd>{selected.owner}</dd>
                </div>
                <div>
                  <dt>Site</dt>
                  <dd>{DOMAIN_COPY[selected.domain]?.site ?? 'Autonomous Site'}</dd>
                </div>
                <div>
                  <dt>Cycle</dt>
                  <dd>{selected.cycle}</dd>
                </div>
                <div>
                  <dt>Calibration</dt>
                  <dd>{selected.metrics.modelCalibration}%</dd>
                </div>
              </dl>
              <div className="actions">
                <button
                  className="btn primary"
                  onClick={() => dispatch({ type: 'toggle-run' })}
                  disabled={selected.waitingApproval}
                >
                  {selected.running ? 'Pause loop' : 'Run loop'}
                </button>
                <button className="btn" onClick={() => dispatch({ type: 'toggle-auto' })}>
                  Auto-clear low risk: {selected.autoApproveLow ? 'on' : 'off'}
                </button>
                <button className="btn" onClick={() => setShowNewHypModal(true)}>
                  + Propose Hypothesis
                </button>
              </div>
              <div className="meters">
                <Meter label="Knowledge gain" value={selected.metrics.knowledgeGain} />
                <Meter label="Model vs. reality" value={selected.metrics.modelCalibration} />
                <Meter
                  label="Cycles closed"
                  value={Math.min(99, selected.metrics.cyclesClosed * 8)}
                  display={String(selected.metrics.cyclesClosed)}
                />
              </div>
            </div>
          </section>

          <section className="grid">
            <HypothesisBoard campaign={selected} onSelectHypothesis={(id) => dispatch({ type: 'select-hypothesis', hypothesisId: id })} />
            <ExperimentPanel campaign={selected} />
            <ApprovalPanel campaign={selected} />
            <KnowledgePanel campaign={selected} onSelectNode={(node) => setSelectedNode(node)} />
            <ProvenancePanel campaign={selected} />
            <WhyPanel />
          </section>
        </>
      )}

      {activeTab === 'hardware' && <HardwareView campaign={selected} />}
      {activeTab === 'analytics' && <AnalyticsView campaign={selected} />}
      {activeTab === 'ledger' && <LedgerView campaign={selected} />}

      {showNewCampModal && <NewCampaignModal onClose={() => setShowNewCampModal(false)} />}
      {showNewHypModal && <NewHypothesisModal campaign={selected} onClose={() => setShowNewHypModal(false)} />}
      {selectedNode && <NodeInspectorModal node={selectedNode} onClose={() => setSelectedNode(null)} />}
    </div>
  )
}

function LoopRing({ stage, waiting }: { stage: Stage; waiting: boolean }) {
  const n = STAGES.length
  const r = 118
  const cx = 150
  const cy = 150
  return (
    <svg className="ring" viewBox="0 0 300 300" role="img" aria-label="Discovery loop">
      <circle cx={cx} cy={cy} r={r} className="ring-track" />
      {STAGES.map((s, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2
        const x = cx + Math.cos(a) * r
        const y = cy + Math.sin(a) * r
        const active = s.id === stage
        return (
          <g key={s.id} transform={`translate(${x},${y})`}>
            <circle
              r={active ? 16 : 9}
              className={
                active ? (waiting && s.id === 'approve' ? 'node wait' : 'node on') : 'node'
              }
            />
            <text y={active ? 32 : 24} className={active ? 'rlab on' : 'rlab'}>
              {s.label}
            </text>
          </g>
        )
      })}
      <text x={cx} y={cy - 6} className="ring-core">
        {waiting ? 'GATE' : stage.toUpperCase()}
      </text>
      <text x={cx} y={cy + 14} className="ring-sub">
        physical + digital
      </text>
    </svg>
  )
}

function Meter({
  label,
  value,
  display,
}: {
  label: string
  value: number
  display?: string
}) {
  return (
    <div className="meter">
      <div className="meter-top">
        <span>{label}</span>
        <b>{display ?? `${value}%`}</b>
      </div>
      <div className="bar">
        <i style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function HypothesisBoard({
  campaign,
  onSelectHypothesis,
}: {
  campaign: Campaign
  onSelectHypothesis: (id: string) => void
}) {
  const hyps = campaign.hypotheses
  return (
    <article className="card span-2">
      <header>
        <h2>Athena · ranked hypotheses</h2>
        <span>uncertainty-aware priors</span>
      </header>
      {hyps.length === 0 ? (
        <p className="empty">Loop is ingesting. Hypotheses appear at the hypothesize gate.</p>
      ) : (
        <ul className="hyps">
          {hyps.map((h, i) => {
            const isSelected = h.id === campaign.selectedHypothesisId
            return (
              <li
                key={h.id}
                className={isSelected ? 'picked' : 'clickable'}
                onClick={() => onSelectHypothesis(h.id)}
              >
                <div className="hyp-head">
                  <em>H{i + 1}</em>
                  <strong>{h.title}</strong>
                  {h.submittedBy && <span className="badge-user">by {h.submittedBy}</span>}
                  <span className="stat">
                    prior {(h.prior * 100).toFixed(0)}% · σ {(h.uncertainty * 100).toFixed(0)}%
                  </span>
                </div>
                <p>{h.statement}</p>
                <p className="mech">
                  <b>Mechanism.</b> {h.mechanism}
                </p>
                <p className="fals">
                  <b>Falsifier.</b> {h.falsifier}
                </p>
                {isSelected && <span className="active-tag">Active Protocol Candidate</span>}
              </li>
            )
          })}
        </ul>
      )}
    </article>
  )
}

function ExperimentPanel({ campaign }: { campaign: Campaign }) {
  const x = campaign.experiment
  const r = campaign.lastResult
  return (
    <article className="card">
      <header>
        <h2>Daedalus · experiment</h2>
        <span>design → hardware</span>
      </header>
      {!x ? (
        <p className="empty">No protocol this cycle yet.</p>
      ) : (
        <>
          <h3>{x.title}</h3>
          <p className="proto">{x.protocol}</p>
          <ul className="kv">
            <li>
              <span>Hardware</span>
              <b>{hw(x.hardware)}</b>
            </li>
            <li>
              <span>Site</span>
              <b>{x.site}</b>
            </li>
            <li>
              <span>Risk</span>
              <b className={`risk ${x.risk}`}>{x.risk}</b>
            </li>
            <li>
              <span>Readout</span>
              <b>{x.readout}</b>
            </li>
            <li>
              <span>Duration</span>
              <b>{x.durationHours} h sim</b>
            </li>
            <li>
              <span>Cost envelope</span>
              <b>{x.cost}</b>
            </li>
          </ul>
        </>
      )}
      {r && (
        <div className={`result ${r.outcome}`}>
          <p>
            Last result · <b>{r.outcome}</b>
          </p>
          <p>
            {r.value} · {r.delta} · {r.confidenceInterval}
          </p>
          <p>{r.notes}</p>
        </div>
      )}
    </article>
  )
}

function ApprovalPanel({ campaign }: { campaign: Campaign }) {
  const { dispatch } = useDiscovery()
  return (
    <article className="card gate">
      <header>
        <h2>Scientist gate</h2>
        <span>high-stakes only</span>
      </header>
      {campaign.waitingApproval ? (
        <>
          <p className="alert">
            Pythia held this protocol. {campaign.owner} must sign before hardware
            is scheduled.
          </p>
          <p className="proto">{campaign.experiment?.protocol}</p>
          <div className="actions">
            <button className="btn primary" onClick={() => dispatch({ type: 'approve' })}>
              Approve &amp; queue
            </button>
            <button className="btn danger" onClick={() => dispatch({ type: 'reject' })}>
              Reject · re-hypothesize
            </button>
          </div>
        </>
      ) : (
        <p className="empty">
          No pending signature. Low-risk runs auto-clear when that policy is on.
          Pharma and every fourth cycle escalate.
        </p>
      )}
    </article>
  )
}

function KnowledgePanel({
  campaign,
  onSelectNode,
}: {
  campaign: Campaign
  onSelectNode: (node: GraphNode) => void
}) {
  const [kindFilter, setKindFilter] = useState<string>('all')
  const filteredNodes = kindFilter === 'all' 
    ? campaign.nodes 
    : campaign.nodes.filter(n => n.kind === kindFilter)

  return (
    <article className="card span-2">
      <header>
        <h2>Mnemosyne · knowledge graph</h2>
        <span>click node to inspect</span>
      </header>
      <div className="filter-bar">
        <span className="filter-label">Filter:</span>
        {['all', 'entity', 'property', 'mechanism', 'constraint', 'measurement'].map((k) => (
          <button
            key={k}
            className={kindFilter === k ? 'btn-chip active' : 'btn-chip'}
            onClick={() => setKindFilter(k)}
          >
            {k}
          </button>
        ))}
      </div>
      <svg className="kg" viewBox="0 0 520 360" role="img" aria-label="Knowledge graph">
        {campaign.edges.map((e) => {
          const a = campaign.nodes.find((n) => n.id === e.from)
          const b = campaign.nodes.find((n) => n.id === e.to)
          if (!a || !b) return null
          const isVisible = (kindFilter === 'all' || a.kind === kindFilter || b.kind === kindFilter)
          if (!isVisible) return null
          return (
            <g key={e.id}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="kg-e" />
              <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 6} className="kg-rel">
                {e.rel}
              </text>
            </g>
          )
        })}
        {filteredNodes.map((n) => (
          <g
            key={n.id}
            transform={`translate(${n.x},${n.y})`}
            onClick={() => onSelectNode(n)}
            style={{ cursor: 'pointer' }}
          >
            <circle r={10 + n.confidence * 8} className={`kg-n ${n.kind}`} />
            <text y={26} className="kg-l">
              {n.label}
            </text>
          </g>
        ))}
      </svg>
      <ul className="legend">
        {(['entity', 'property', 'mechanism', 'constraint', 'measurement'] as GraphNode['kind'][]).map(
          (k) => (
            <li key={k}>
              <i className={k} />
              {k}
            </li>
          ),
        )}
      </ul>
    </article>
  )
}

function ProvenancePanel({ campaign }: { campaign: Campaign }) {
  return (
    <article className="card">
      <header>
        <h2>Provenance ledger</h2>
        <span>append-only</span>
      </header>
      <ol className="ledger">
        {campaign.provenance.slice(0, 7).map((p) => (
          <li key={p.id}>
            <code>{p.hash}</code>
            <span className="when">
              {p.at} · C{p.cycle}
            </span>
            <b>
              {p.actor}
              <em>{p.kind}</em>
            </b>
            <span>{p.action}</span>
            <span className="art">{p.artifact}</span>
          </li>
        ))}
      </ol>
    </article>
  )
}

function WhyPanel() {
  return (
    <article className="card why">
      <header>
        <h2>Why this is the loop</h2>
        <span>not another chat agent</span>
      </header>
      <ul>
        <li>
          <b>Physical close.</b> Protocols queue on robotic labs, manufacturing
          testbeds, and edge sensors — then come back as measurements, not
          summaries.
        </li>
        <li>
          <b>Compounding assets.</b> Each cycle writes the graph, calibrates the
          model against reality, and tightens uncertainty. The moat is the loop,
          not the LLM.
        </li>
        <li>
          <b>Human gates where it matters.</b> High-stakes chemistry, in vivo
          adjacent work, and irreversible process changes require a named
          scientist.
        </li>
        <li>
          <b>Falsifiers first.</b> Every hypothesis ships with a kill criterion
          so the ontology can retire bad mechanisms instead of accumulating
          folklore.
        </li>
      </ul>
    </article>
  )
}

function HardwareView({ campaign }: { campaign: Campaign }) {
  const x = campaign.experiment
  const stream = x?.telemetryStream
  
  return (
    <div className="view-container">
      <div className="card full">
        <header>
          <h2>Hermes · Hardware Telemetry &amp; Lab Instrument Feed</h2>
          <span>{x ? hw(x.hardware) : 'Equipment Idle'} · {x?.site ?? 'Site'}</span>
        </header>

        <div className="hw-grid">
          <div className="hw-status-box">
            <h3>Instrument Status</h3>
            <div className="status-indicator live">
              <span className="dot" />
              <span>{campaign.running ? 'ONLINE & RUNNING' : 'STANDBY'}</span>
            </div>
            <ul className="kv">
              <li><span>Active Hardware</span><b>{x ? hw(x.hardware) : 'N/A'}</b></li>
              <li><span>Site Designation</span><b>{x?.site ?? 'N/A'}</b></li>
              <li><span>Target Protocol</span><b>{x?.title ?? 'None queued'}</b></li>
              <li><span>Execution Risk</span><b>{x?.risk ?? 'Low'}</b></li>
              <li><span>Queue Position</span><b>#1 (Active)</b></li>
            </ul>
          </div>

          <div className="hw-telemetry-box">
            <h3>Real-time Sensor Stream ({stream?.label ?? 'Telemetry'})</h3>
            {stream ? (
              <div className="chart-wrapper">
                <svg className="spark-chart" viewBox="0 0 500 200">
                  <path
                    d={`M 0 200 ${stream.value.map((v, i) => `L ${(i / (stream.value.length - 1)) * 500} ${200 - (v / (Math.max(...stream.value) * 1.2)) * 180}`).join(' ')} L 500 200 Z`}
                    className="spark-area"
                  />
                  <path
                    d={stream.value.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / (stream.value.length - 1)) * 500} ${200 - (v / (Math.max(...stream.value) * 1.2)) * 180}`).join(' ')}
                    className="spark-line"
                  />
                  {stream.value.map((v, i) => (
                    <circle
                      key={i}
                      cx={(i / (stream.value.length - 1)) * 500}
                      cy={200 - (v / (Math.max(...stream.value) * 1.2)) * 180}
                      r={4}
                      className="spark-point"
                    />
                  ))}
                </svg>
                <div className="chart-labels">
                  {stream.time.map((t, i) => (
                    <span key={i}>{t}</span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="empty">No active telemetry stream for current stage.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function AnalyticsView({ campaign }: { campaign: Campaign }) {
  const history = campaign.history || []

  return (
    <div className="view-container">
      <div className="card full">
        <header>
          <h2>Convergence Analytics &amp; Epistemic Gain Curves</h2>
          <span>Multi-cycle posteriors and model calibration</span>
        </header>

        <div className="analytics-grid">
          <div className="analytics-card">
            <h3>Knowledge Gain vs. Cycle</h3>
            <svg className="spark-chart" viewBox="0 0 500 200">
              <path
                d={history.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${(i / Math.max(1, history.length - 1)) * 500} ${200 - (pt.knowledgeGain / 100) * 180}`).join(' ')}
                className="spark-line acid"
              />
              {history.map((pt, i) => (
                <circle
                  key={i}
                  cx={(i / Math.max(1, history.length - 1)) * 500}
                  cy={200 - (pt.knowledgeGain / 100) * 180}
                  r={4}
                  className="spark-point acid"
                />
              ))}
            </svg>
            <div className="chart-footer">Current: {campaign.metrics.knowledgeGain}% gain</div>
          </div>

          <div className="analytics-card">
            <h3>Model vs. Reality Calibration</h3>
            <svg className="spark-chart" viewBox="0 0 500 200">
              <path
                d={history.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${(i / Math.max(1, history.length - 1)) * 500} ${200 - (pt.modelCalibration / 100) * 180}`).join(' ')}
                className="spark-line teal"
              />
              {history.map((pt, i) => (
                <circle
                  key={i}
                  cx={(i / Math.max(1, history.length - 1)) * 500}
                  cy={200 - (pt.modelCalibration / 100) * 180}
                  r={4}
                  className="spark-point teal"
                />
              ))}
            </svg>
            <div className="chart-footer">Calibration: {campaign.metrics.modelCalibration}% alignment</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LedgerView({ campaign }: { campaign: Campaign }) {
  const [search, setSearch] = useState('')
  const filtered = campaign.provenance.filter(
    (p) =>
      p.actor.toLowerCase().includes(search.toLowerCase()) ||
      p.action.toLowerCase().includes(search.toLowerCase()) ||
      p.hash.toLowerCase().includes(search.toLowerCase()),
  )

  const downloadCSV = () => {
    const headers = 'Hash,Cycle,Actor,Kind,Action,Artifact,Timestamp\n'
    const rows = campaign.provenance
      .map((p) => `"${p.hash}",${p.cycle},"${p.actor}","${p.kind}","${p.action}","${p.artifact}","${p.at}"`)
      .join('\n')
    const blob = new Blob([headers + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `helix-provenance-${campaign.id}.csv`
    a.click()
  }

  return (
    <div className="view-container">
      <div className="card full">
        <header>
          <h2>Cryptographic Provenance Ledger</h2>
          <div className="header-actions">
            <input
              type="text"
              className="search-input"
              placeholder="Search ledger hash or actor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn primary" onClick={downloadCSV}>
              Export Signed CSV
            </button>
          </div>
        </header>

        <ol className="ledger full-ledger">
          {filtered.map((p) => (
            <li key={p.id}>
              <code>{p.hash}</code>
              <span className="when">
                {p.at} · Cycle {p.cycle}
              </span>
              <b>
                {p.actor}
                <em>{p.kind}</em>
              </b>
              <span>{p.action}</span>
              <span className="art">{p.artifact}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

function NewCampaignModal({ onClose }: { onClose: () => void }) {
  const { dispatch } = useDiscovery()
  const [name, setName] = useState('')
  const [domain, setDomain] = useState<Domain>('energy')
  const [question, setQuestion] = useState('')
  const [owner, setOwner] = useState('Dr. Scientist')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !question) return
    dispatch({
      type: 'create-campaign',
      name,
      domain,
      question,
      owner,
    })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Initialize Closed-Loop Campaign</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Campaign Title
            <input
              type="text"
              required
              placeholder="e.g. Perovskite Solar Degradation Loop"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label>
            Domain Area
            <select value={domain} onChange={(e) => setDomain(e.target.value as Domain)}>
              <option value="energy">Energy storage</option>
              <option value="pharma">Drug discovery</option>
              <option value="materials">Materials science</option>
              <option value="manufacturing">Process optimization</option>
              <option value="agriculture">Agriculture</option>
            </select>
          </label>

          <label>
            Open Scientific Question
            <textarea
              required
              rows={3}
              placeholder="Formulate the primary falsifiable research target..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </label>

          <label>
            Lead Scientist / Owner
            <input
              type="text"
              required
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary">
              Create Campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function NewHypothesisModal({
  campaign,
  onClose,
}: {
  campaign: Campaign
  onClose: () => void
}) {
  const { dispatch } = useDiscovery()
  const [title, setTitle] = useState('')
  const [statement, setStatement] = useState('')
  const [mechanism, setMechanism] = useState('')
  const [falsifier, setFalsifier] = useState('')
  const [author, setAuthor] = useState(campaign.owner)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !statement) return
    dispatch({
      type: 'submit-hypothesis',
      title,
      statement,
      mechanism,
      falsifier,
      author,
    })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Propose Scientist Hypothesis to Athena</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Hypothesis Title
            <input
              type="text"
              required
              placeholder="e.g. Anion-substituted grain boundary film"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label>
            Statement
            <textarea
              required
              rows={2}
              placeholder="What do you predict will occur?"
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
            />
          </label>

          <label>
            Causal Mechanism
            <textarea
              required
              rows={2}
              placeholder="Why does this happen physically or chemically?"
              value={mechanism}
              onChange={(e) => setMechanism(e.target.value)}
            />
          </label>

          <label>
            Kill Criterion (Falsifier)
            <input
              type="text"
              required
              placeholder="Under what precise observation should this hypothesis be retired?"
              value={falsifier}
              onChange={(e) => setFalsifier(e.target.value)}
            />
          </label>

          <label>
            Proposing Scientist
            <input
              type="text"
              required
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary">
              Inject Hypothesis
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function NodeInspectorModal({
  node,
  onClose,
}: {
  node: GraphNode
  onClose: () => void
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Ontology Node Inspector</h2>
        <ul className="kv">
          <li><span>Node ID</span><b>{node.id}</b></li>
          <li><span>Label</span><b>{node.label}</b></li>
          <li><span>Node Category</span><b>{node.kind}</b></li>
          <li><span>Confidence Score</span><b>{(node.confidence * 100).toFixed(1)}%</b></li>
          <li><span>Last Revision Cycle</span><b>Cycle {node.lastUpdatedCycle ?? 1}</b></li>
        </ul>
        <p className="proto" style={{ marginTop: '14px' }}>
          {node.description ?? 'This element forms part of Mnemosyne\'s active domain graph.'}
        </p>
        <div className="modal-actions">
          <button className="btn primary" onClick={onClose}>
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  )
}

function hw(h: Hardware) {
  return {
    'robotic-lab': 'Robotic lab',
    simulation: 'Digital twin',
    testbed: 'Manufacturing testbed',
    'edge-sensor': 'Edge sensor net',
  }[h]
}
