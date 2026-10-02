import { DOMAIN_COPY, hashish } from '../data/catalog'
import type {
  Campaign,
  Experiment,
  Hypothesis,
  Provenance,
  Result,
  Stage,
} from '../types'

const STAGE_ORDER: Stage[] = [
  'ingest',
  'hypothesize',
  'design',
  'approve',
  'queue',
  'run',
  'measure',
  'update',
]

const AGENTS = {
  ingest: 'Hermes',
  hypothesize: 'Athena',
  design: 'Daedalus',
  approve: 'Pythia',
  queue: 'Hermes',
  run: 'instrument',
  measure: 'Pythia',
  update: 'Mnemosyne',
} as const

export function nextStage(stage: Stage): Stage {
  const i = STAGE_ORDER.indexOf(stage)
  return STAGE_ORDER[(i + 1) % STAGE_ORDER.length]
}

export function advance(campaign: Campaign, nowLabel: string): Campaign {
  if (!campaign.running) return campaign

  const stage = campaign.stage
  let next = { ...campaign }
  const actor = AGENTS[stage]
  const kind =
    actor === 'instrument'
      ? 'instrument'
      : actor === campaign.owner
        ? 'human'
        : 'agent'

  if (stage === 'hypothesize') {
    const hyps = inventHypotheses(campaign)
    next.hypotheses = hyps
    next.selectedHypothesisId = hyps[0]?.id ?? null
    next = log(next, nowLabel, actor, kind, 'Ranked cycle hypotheses', `hyp/${campaign.cycle}`)
  }

  if (stage === 'design' && next.selectedHypothesisId) {
    next.experiment = inventExperiment(next, next.selectedHypothesisId)
    next = log(
      next,
      nowLabel,
      'Daedalus',
      'agent',
      'Compiled protocol + controls',
      next.experiment.id,
    )
  }

  if (stage === 'approve') {
    const risk = next.experiment?.risk ?? 'medium'
    if (risk === 'high' || (risk === 'medium' && !next.autoApproveLow)) {
      next.waitingApproval = true
      next.running = false
      next = log(
        next,
        nowLabel,
        'Pythia',
        'agent',
        `Held for human gate (${risk} risk)`,
        'approval-queue',
      )
      return next
    }
    next.waitingApproval = false
    next = log(
      next,
      nowLabel,
      'system',
      'system',
      `Auto-cleared ${risk} risk protocol`,
      next.experiment?.id ?? 'exp',
    )
  }

  if (stage === 'queue') {
    next.metrics = {
      ...next.metrics,
      experimentsQueued: next.metrics.experimentsQueued + 1,
    }
    next = log(
      next,
      nowLabel,
      'Hermes',
      'agent',
      `Queued on ${next.experiment?.site ?? DOMAIN_COPY[next.domain].site}`,
      next.experiment?.hardware ?? 'queue',
    )
  }

  if (stage === 'measure' && next.experiment) {
    next.lastResult = inventResult(next)
    next = log(
      next,
      nowLabel,
      'instrument',
      'instrument',
      `Readout ${next.lastResult.metric} ${next.lastResult.value}`,
      next.lastResult.id,
    )
  }

  if (stage === 'update') {
    next = applyKnowledge(next, nowLabel)
    next.cycle += 1
    const newKg = Math.min(99, next.metrics.knowledgeGain + 3 + Math.round(Math.random() * 4))
    const newCal = Math.min(99, next.metrics.modelCalibration + 2 + Math.round(Math.random() * 3))
    const avgUnc = +(Math.max(0.05, 0.45 - next.cycle * 0.03 + (Math.random() * 0.04 - 0.02))).toFixed(2)
    next.metrics = {
      ...next.metrics,
      cyclesClosed: next.metrics.cyclesClosed + 1,
      knowledgeGain: newKg,
      modelCalibration: newCal,
    }
    next.history = [
      ...(next.history || []),
      {
        cycle: next.cycle,
        knowledgeGain: newKg,
        modelCalibration: newCal,
        uncertaintyAvg: avgUnc,
      },
    ]
  }

  next.stage = nextStage(stage)
  return next
}

export function decide(
  campaign: Campaign,
  decision: 'approve' | 'reject',
  nowLabel: string,
): Campaign {
  if (!campaign.waitingApproval) return campaign
  if (decision === 'reject') {
    return log(
      {
        ...campaign,
        waitingApproval: false,
        running: true,
        stage: 'hypothesize',
        experiment: null,
      },
      nowLabel,
      campaign.owner,
      'human',
      'Rejected protocol — recycle hypotheses',
      'gate/reject',
    )
  }
  return log(
    {
      ...campaign,
      waitingApproval: false,
      running: true,
      stage: 'queue',
    },
    nowLabel,
    campaign.owner,
    'human',
    'Approved high-stakes experiment',
    campaign.experiment?.id ?? 'exp',
  )
}

function inventHypotheses(c: Campaign): Hypothesis[] {
  const cycle = c.cycle
  const bank: Record<Campaign['domain'], Hypothesis[]> = {
    energy: [
      h(
        c,
        0,
        'Halide-rich grain boundary film',
        'A 2–4 nm LiI-rich interphase lowers grain-boundary resistance while pinning Li filaments.',
        'Space-charge + halide polarizability locally increases Li⁺ hop rate without opening electronic paths.',
        'If EIS semicircle 2 does not shrink ≥18%, film is not rate-limiting.',
      ),
      h(
        c,
        1,
        'Cold-pressed vs. sintered density trade',
        '95% relative density via warm uniaxial press beats sintering for dendrite delay at 2 mA/cm².',
        'Sintering coarsens grains and creates chemo-mechanical weak paths.',
        'If critical current density falls vs. sintered control, density hypothesis fails.',
      ),
      h(
        c,
        2,
        'Dual-anion argyrodite',
        `Cl/Br 70/30 on P-site neighbors yields σ ≥ ${11 + cycle * 0.2} mS/cm at 25°C.`,
        'Anion disorder flattens Li occupancy landscape.',
        'If activation energy stays >0.32 eV, disorder is insufficient.',
      ),
    ],
    pharma: [
      h(
        c,
        0,
        'C-helix glycine swing',
        'A small amide vector into the C-helix hinge buys JAK2/JAK1 > 40× without hERG basic nitrogen.',
        'Isoform difference is a 1.2 Å helix register, not ATP-site electronics.',
        'If JAK1 ΔTm moves in lockstep with JAK2, pocket is not isoform-selective.',
      ),
      h(
        c,
        1,
        'Water-network displacement',
        'Displacing conserved water W3 is the selectivity switch; occupancy should correlate with SPR off-rate.',
        'Entropy of released water, not enthalpy of H-bond, drives ΔΔG.',
        'If ITC ΔS is unchanged, water hypothesis is wrong.',
      ),
      h(
        c,
        2,
        'Soft-spot metabolism shield',
        'α-fluoro on the solvent vector cuts CLint 3× without raising LogD into hERG range.',
        'Metabolic soft spot is benzylic, orthogonal to hERG pharmacophore.',
        'If hERG IC50 drops below 10 µM, shield is not orthogonal.',
      ),
    ],
    materials: [
      h(
        c,
        0,
        'Proton inventory, not N2 activation',
        'Faradaic efficiency is limited by surface H* coverage, not N≡N cleavage on Fe–N–C.',
        'Pulsed potential that depletes H* should raise NH3 vs. steady DC.',
        'If pulse duty does not move FE, N2 activation remains rate-limiting.',
      ),
      h(
        c,
        1,
        'Li+ promoter on nitrogen',
        'Trace Li+ at the outer Helmholtz plane polarizes N2 and lifts FE 8–12 points.',
        'Cation effect is electrostatic, reversible on wash-out.',
        'If wash-out does not reverse FE, Li is a bulk poison/dopant.',
      ),
      h(
        c,
        2,
        'Microporous O2 exclusion',
        'Sub-0.7 nm pores exclude O2 enough to run at 50 ppm O2 without Fe oxidation.',
        'Mass-transport selectivity, not catalyst electronics.',
        'If XPS shows Fe³⁺ after 2 h, exclusion failed.',
      ),
    ],
    manufacturing: [
      h(
        c,
        0,
        'Skywriting delay vs. island size',
        '80 µs skywriting with 2.2 mm islands closes keyholes better than hatch-only slowdown.',
        'Turnaround melt-pool overshoot, not average energy density, seeds porosity.',
        'If µCT voids cluster mid-hatch, skywriting is not causal.',
      ),
      h(
        c,
        1,
        'Preheat 180°C residual stress',
        'Bed preheat to 180°C drops residual stress under 180 MPa without coarsening α laths.',
        'Thermal gradient, not peak temperature, dominates stress.',
        'If EBSD shows lath > 5 µm, preheat window is too hot.',
      ),
      h(
        c,
        2,
        'Gas-flow recirculation',
        'Inert recirculation above 2.4 m/s re-deposits condensate that seeds lack-of-fusion.',
        'Condensate, not oxygen, is the hidden variable.',
        'If coupons at high flow stay dense, recirculation hypothesis fails.',
      ),
    ],
    agriculture: [
      h(
        c,
        0,
        'Exudate-timed inoculum',
        'Inoculating at peak root exudation (DAS 12) beats seed-coat application for NUE.',
        'Carbon pulse, not CFU count, establishes the consortium.',
        'If DAS 0 and DAS 12 CFU equalize by DAS 20, timing is irrelevant.',
      ),
      h(
        c,
        1,
        'Deficit irrigation synergy',
        '30% ET deficit concentrates exudates and lifts NUE 18% without protein collapse.',
        'Mild drought upregulates N transporters already primed by inocula.',
        'If grain protein drops >1.5 pts, constraint is binding.',
      ),
      h(
        c,
        2,
        'Split-N with biological credit',
        'Cut synthetic N 25% if consortium nitrate reductase stays above threshold.',
        'Biological N is additive only under low residual soil N.',
        'If yield falls in high-residual plots, credit model is wrong.',
      ),
    ],
  }
  return bank[c.domain]
}

function h(
  c: Campaign,
  i: number,
  title: string,
  statement: string,
  mechanism: string,
  falsifier: string,
): Hypothesis {
  const prior = 0.42 + i * -0.07 + c.cycle * 0.015
  return {
    id: `${c.id}-h${c.cycle}-${i}`,
    title,
    statement,
    mechanism,
    prior: clamp(prior, 0.12, 0.88),
    uncertainty: clamp(0.38 - c.cycle * 0.02 + i * 0.05, 0.08, 0.55),
    expectedLift: c.domain === 'pharma' ? '+selectivity band' : '+primary metric',
    falsifier,
    evidence: [
      'Prior cycle posterior',
      'Literature graph overlap',
      'Instrument calibration card',
    ],
    agents: ['Athena', 'Pythia'],
  }
}

function inventExperiment(c: Campaign, hypothesisId: string): Experiment {
  const hyp = c.hypotheses.find((x) => x.id === hypothesisId)
  const hardwareMap = {
    energy: 'robotic-lab',
    pharma: 'robotic-lab',
    materials: 'simulation',
    manufacturing: 'testbed',
    agriculture: 'edge-sensor',
  } as const
  const risk: Experiment['risk'] =
    c.domain === 'pharma' || c.cycle % 4 === 0 ? 'high' : c.cycle % 3 === 0 ? 'medium' : 'low'
  
  const points = 10
  const timeLabels = Array.from({ length: points }, (_, i) => `T+${i * 10}m`)
  const baseVal = c.domain === 'energy' ? 8 : c.domain === 'pharma' ? 250 : c.domain === 'manufacturing' ? 98.2 : 12
  const telemetryValues = Array.from({ length: points }, (_, i) => 
    +(baseVal + (Math.sin(i / 1.5) * 1.8) + (Math.random() * 0.4)).toFixed(2)
  )

  return {
    id: `${c.id}-x${c.cycle}`,
    hypothesisId,
    title: hyp ? `Test: ${hyp.title}` : 'Cycle protocol',
    protocol: hyp
      ? `n=6 + 2 controls. Blinded readout. Falsifier: ${hyp.falsifier}`
      : 'Standard campaign protocol.',
    hardware: hardwareMap[c.domain],
    site: DOMAIN_COPY[c.domain].site,
    durationHours: c.domain === 'agriculture' ? 72 : c.domain === 'pharma' ? 18 : 8,
    cost: c.domain === 'manufacturing' ? '$2.4k coupons' : c.domain === 'pharma' ? '$8.1k assay' : '$1.1k run',
    risk,
    controls: ['historical best', 'negative / sham', 'calibration standard'],
    readout: DOMAIN_COPY[c.domain].unit,
    telemetryStream: {
      time: timeLabels,
      value: telemetryValues,
      label: DOMAIN_COPY[c.domain].unit,
    },
  }
}

function inventResult(c: Campaign): Result {
  const roll = Math.random()
  const outcome: Result['outcome'] =
    roll > 0.62 ? 'supports' : roll > 0.28 ? 'partial' : 'falsifies'
  const unit = DOMAIN_COPY[c.domain].unit
  const base = 8 + c.cycle * 0.35
  const jitter = (Math.random() - 0.4) * 2.2
  const value = (base + jitter).toFixed(2)
  return {
    id: `${c.id}-r${c.cycle}`,
    experimentId: c.experiment?.id ?? 'x',
    outcome,
    metric: unit,
    value: `${value} ${unit}`,
    delta: outcome === 'falsifies' ? '− vs. prior' : outcome === 'partial' ? '~ mixed' : '+ vs. prior',
    confidenceInterval:
      '95% CI ± ' + (0.12 + (c.hypotheses[0]?.uncertainty ?? 0.2)).toFixed(2),
    notes:
      outcome === 'supports'
        ? 'Posterior mass shifted; keep mechanism, tighten prior.'
        : outcome === 'partial'
          ? 'Effect present in one stratum only — split next design.'
          : 'Falsifier triggered. Retire mechanism, expand ontology branch.',
  }
}

function applyKnowledge(c: Campaign, nowLabel: string): Campaign {
  const result = c.lastResult
  const id = `n${c.nodes.length + 1}`
  const label =
    result?.outcome === 'falsifies'
      ? `Retired: cycle ${c.cycle}`
      : result?.outcome === 'partial'
        ? `Stratum ${c.cycle}`
        : `Confirmed ${c.cycle}`
  const kind: Campaign['nodes'][number]['kind'] =
    result?.outcome === 'falsifies' ? 'constraint' : 'measurement'
  const node = {
    id,
    label,
    kind,
    x: 80 + ((c.nodes.length * 67) % 360),
    y: 70 + ((c.nodes.length * 41) % 250),
    confidence:
      result?.outcome === 'supports' ? 0.86 : result?.outcome === 'partial' ? 0.58 : 0.41,
    description: `Discovered in cycle ${c.cycle} based on readout outcome '${result?.outcome}'.`,
    lastUpdatedCycle: c.cycle,
  }
  const edge = c.nodes[0]
    ? {
        id: `e${c.edges.length + 1}`,
        from: c.nodes[0].id,
        to: id,
        rel: result?.outcome === 'falsifies' ? 'contradicted-by' : 'updated-by',
      }
    : null
  let next: Campaign = {
    ...c,
    nodes: [...c.nodes, node],
    edges: edge ? [...c.edges, edge] : c.edges,
  }
  next = log(next, nowLabel, 'Mnemosyne', 'agent', 'Wrote ontology delta + provenance', `kg:${id}`)
  return next
}

export function submitCustomHypothesis(
  c: Campaign,
  title: string,
  statement: string,
  mechanism: string,
  falsifier: string,
  author: string,
  nowLabel: string,
): Campaign {
  const newHyp: Hypothesis = {
    id: `${c.id}-h-custom-${Date.now()}`,
    title,
    statement,
    mechanism,
    prior: 0.55,
    uncertainty: 0.3,
    expectedLift: 'User submission',
    falsifier,
    evidence: ['Scientist proposal', 'Manual injection'],
    agents: ['Athena', author],
    submittedBy: author,
  }
  const updatedHyps = [newHyp, ...c.hypotheses]
  const updated = {
    ...c,
    hypotheses: updatedHyps,
    selectedHypothesisId: newHyp.id,
  }
  return log(
    updated,
    nowLabel,
    author,
    'human',
    `Submitted hypothesis: ${title}`,
    newHyp.id,
  )
}

export function createCustomCampaign(
  name: string,
  domain: Campaign['domain'],
  question: string,
  owner: string,
  nowLabel: string,
): Campaign {
  const id = `cmp-custom-${Date.now()}`
  const initialNodes = [
    { id: 'n1', label: name.slice(0, 14), kind: 'entity' as const, x: 180, y: 100, confidence: 0.75, description: 'Target research entity' },
    { id: 'n2', label: 'Primary Target', kind: 'property' as const, x: 340, y: 90, confidence: 0.65, description: 'Key performance metric' },
  ]
  const initialEdges = [
    { id: 'e1', from: 'n1', to: 'n2', rel: 'exhibits' },
  ]

  const campaign: Campaign = {
    id,
    name,
    domain,
    question,
    owner,
    stage: 'ingest',
    cycle: 1,
    running: true,
    waitingApproval: false,
    autoApproveLow: true,
    hypotheses: [],
    selectedHypothesisId: null,
    experiment: null,
    lastResult: null,
    nodes: initialNodes,
    edges: initialEdges,
    provenance: [],
    history: [
      { cycle: 1, knowledgeGain: 15, modelCalibration: 20, uncertaintyAvg: 0.45 },
    ],
    metrics: {
      knowledgeGain: 15,
      modelCalibration: 20,
      cyclesClosed: 0,
      experimentsQueued: 0,
    },
  }

  return log(
    campaign,
    nowLabel,
    owner,
    'human',
    `Initialized custom campaign: ${name}`,
    `cmp:${id}`,
  )
}

function log(
  c: Campaign,
  at: string,
  actor: string,
  kind: Provenance['kind'],
  action: string,
  artifact: string,
): Campaign {
  const entry: Provenance = {
    id: `${c.id}-p${c.provenance.length + 1}-${Date.now()}`,
    at,
    cycle: c.cycle,
    actor,
    kind,
    action,
    artifact,
    hash: hashish(actor + action + c.cycle + at),
  }
  return { ...c, provenance: [entry, ...c.provenance].slice(0, 40) }
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

