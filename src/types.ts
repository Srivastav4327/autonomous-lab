export type Domain =
  | 'energy'
  | 'pharma'
  | 'materials'
  | 'manufacturing'
  | 'agriculture'

export type Stage =
  | 'ingest'
  | 'hypothesize'
  | 'design'
  | 'approve'
  | 'queue'
  | 'run'
  | 'measure'
  | 'update'

export type Risk = 'low' | 'medium' | 'high'
export type Hardware = 'robotic-lab' | 'simulation' | 'testbed' | 'edge-sensor'
export type ActorKind = 'agent' | 'human' | 'instrument' | 'system'

export type Hypothesis = {
  id: string
  title: string
  statement: string
  mechanism: string
  prior: number
  uncertainty: number
  expectedLift: string
  falsifier: string
  evidence: string[]
  agents: string[]
  submittedBy?: string
}

export type Experiment = {
  id: string
  hypothesisId: string
  title: string
  protocol: string
  hardware: Hardware
  site: string
  durationHours: number
  cost: string
  risk: Risk
  controls: string[]
  readout: string
  telemetryStream?: {
    time: string[]
    value: number[]
    label: string
  }
}

export type Result = {
  id: string
  experimentId: string
  outcome: 'supports' | 'partial' | 'falsifies'
  metric: string
  value: string
  delta: string
  confidenceInterval: string
  notes: string
}

export type GraphNode = {
  id: string
  label: string
  kind: 'entity' | 'property' | 'mechanism' | 'constraint' | 'measurement'
  x: number
  y: number
  confidence: number
  description?: string
  lastUpdatedCycle?: number
}

export type GraphEdge = {
  id: string
  from: string
  to: string
  rel: string
}

export type Provenance = {
  id: string
  at: string
  cycle: number
  actor: string
  kind: ActorKind
  action: string
  artifact: string
  hash: string
}

export type CampaignHistoryPoint = {
  cycle: number
  knowledgeGain: number
  modelCalibration: number
  uncertaintyAvg: number
}

export type Campaign = {
  id: string
  name: string
  domain: Domain
  question: string
  owner: string
  stage: Stage
  cycle: number
  running: boolean
  waitingApproval: boolean
  autoApproveLow: boolean
  hypotheses: Hypothesis[]
  selectedHypothesisId: string | null
  experiment: Experiment | null
  lastResult: Result | null
  nodes: GraphNode[]
  edges: GraphEdge[]
  provenance: Provenance[]
  history: CampaignHistoryPoint[]
  metrics: {
    knowledgeGain: number
    modelCalibration: number
    cyclesClosed: number
    experimentsQueued: number
  }
}

