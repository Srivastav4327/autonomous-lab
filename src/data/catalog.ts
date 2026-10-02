import type { Campaign, Domain } from '../types'

export const DOMAIN_COPY: Record<
  Domain,
  { label: string; site: string; unit: string }
> = {
  energy: {
    label: 'Energy storage',
    site: 'Cell foundry · Bay 4',
    unit: 'mS/cm',
  },
  pharma: {
    label: 'Drug discovery',
    site: 'Closed-loop HTS · Rack C',
    unit: 'nM',
  },
  materials: {
    label: 'Materials science',
    site: 'Autonomous catalysis lab',
    unit: '% Faraday',
  },
  manufacturing: {
    label: 'Process optimization',
    site: 'LPBF testbed · Line 2',
    unit: '% density',
  },
  agriculture: {
    label: 'Agriculture',
    site: 'Phenotyping greenhouse · Block N',
    unit: 'NUE',
  },
}

export const STAGES: { id: Campaign['stage']; label: string; note: string }[] = [
  { id: 'ingest', label: 'Ingest', note: 'Enterprise + lab streams' },
  { id: 'hypothesize', label: 'Hypothesize', note: 'Multi-agent priors' },
  { id: 'design', label: 'Design', note: 'Protocol + controls' },
  { id: 'approve', label: 'Approve', note: 'Scientist-in-the-loop' },
  { id: 'queue', label: 'Queue', note: 'Lab / testbed / sensor' },
  { id: 'run', label: 'Run', note: 'Physical or digital twin' },
  { id: 'measure', label: 'Measure', note: 'Uncertainty-aware readout' },
  { id: 'update', label: 'Update', note: 'Ontology + next cycle' },
]

export function seedCampaigns(): Campaign[] {
  const list = [
    makeCampaign({
      id: 'cmp-electrolyte',
      name: 'Li-metal solid electrolyte',
      domain: 'energy',
      question:
        'Can a sulfide–halide composite raise room-temperature ionic conductivity above 12 mS/cm without dendrite breakthrough at 2 mA/cm²?',
      owner: 'Dr. N. Iyer',
      cycle: 7,
      stage: 'run',
      running: true,
      waitingApproval: false,
      knowledgeGain: 62,
      modelCalibration: 71,
    }),
    makeCampaign({
      id: 'cmp-jak2',
      name: 'JAK2 allosteric series',
      domain: 'pharma',
      question:
        'Does occupancy of the allosteric C-helix pocket improve isoform selectivity over JAK1 without raising hERG liability?',
      owner: 'Dr. M. Chen',
      cycle: 4,
      stage: 'approve',
      running: true,
      waitingApproval: true,
      knowledgeGain: 48,
      modelCalibration: 54,
    }),
    makeCampaign({
      id: 'cmp-lpbf',
      name: 'Ti-6Al-4V process window',
      domain: 'manufacturing',
      question:
        'Which scan strategy closes keyhole porosity below 0.2% while holding residual stress under 180 MPa?',
      owner: 'A. Okonkwo',
      cycle: 11,
      stage: 'update',
      running: true,
      waitingApproval: false,
      knowledgeGain: 77,
      modelCalibration: 82,
    }),
    makeCampaign({
      id: 'cmp-wheat',
      name: 'Wheat nitrogen-use loop',
      domain: 'agriculture',
      question:
        'Can rhizosphere inocula plus deficit irrigation lift nitrogen-use efficiency 18% without grain-protein collapse?',
      owner: 'Dr. L. Rahman',
      cycle: 2,
      stage: 'ingest',
      running: false,
      waitingApproval: false,
      knowledgeGain: 21,
      modelCalibration: 33,
    }),
  ]
  return list.map(hydrateInFlight)
}

function hydrateInFlight(c: Campaign): Campaign {
  if (c.stage === 'ingest') return c
  const hyp = {
    id: `${c.id}-h-live`,
    title:
      c.domain === 'pharma'
        ? 'C-helix glycine swing'
        : c.domain === 'manufacturing'
          ? 'Skywriting delay vs. island size'
          : c.domain === 'agriculture'
            ? 'Exudate-timed inoculum'
            : 'Halide-rich grain boundary film',
    statement: c.question,
    mechanism: 'Carried forward from the previous posterior.',
    prior: 0.61,
    uncertainty: 0.22,
    expectedLift: 'Primary metric',
    falsifier: 'If the registered control matches treatment, retire this branch.',
    evidence: ['Cycle posterior', 'Instrument card'],
    agents: ['Athena', 'Pythia'],
  }
  const experiment = {
    id: `${c.id}-x-live`,
    hypothesisId: hyp.id,
    title: `Test: ${hyp.title}`,
    protocol: `n=6 + 2 controls. Blinded readout. ${hyp.falsifier}`,
    hardware:
      c.domain === 'manufacturing'
        ? ('testbed' as const)
        : c.domain === 'agriculture'
          ? ('edge-sensor' as const)
          : ('robotic-lab' as const),
    site: DOMAIN_COPY[c.domain].site,
    durationHours: 8,
    cost: '$2.1k',
    risk: c.domain === 'pharma' ? ('high' as const) : ('medium' as const),
    controls: ['historical best', 'negative / sham'],
    readout: DOMAIN_COPY[c.domain].unit,
  }
  return {
    ...c,
    hypotheses: [hyp],
    selectedHypothesisId: hyp.id,
    experiment,
    running: c.waitingApproval ? false : c.running,
  }
}

function makeCampaign(partial: {
  id: string
  name: string
  domain: Domain
  question: string
  owner: string
  cycle: number
  stage: Campaign['stage']
  running: boolean
  waitingApproval: boolean
  knowledgeGain: number
  modelCalibration: number
}): Campaign {
  const nodes = graphFor(partial.domain, partial.cycle)
  const history: Campaign['history'] = []
  for (let c = 1; c <= partial.cycle; c++) {
    history.push({
      cycle: c,
      knowledgeGain: Math.max(10, Math.round(partial.knowledgeGain * (c / partial.cycle) + (Math.sin(c) * 3))),
      modelCalibration: Math.max(15, Math.round(partial.modelCalibration * (c / partial.cycle) + (Math.cos(c) * 2))),
      uncertaintyAvg: Math.max(0.08, +(0.45 - c * 0.035).toFixed(2)),
    })
  }
  return {
    ...partial,
    autoApproveLow: true,
    hypotheses: [],
    selectedHypothesisId: null,
    experiment: null,
    lastResult: null,
    nodes: nodes.nodes,
    edges: nodes.edges,
    provenance: seedProvenance(partial.id, partial.cycle, partial.owner),
    history,
    metrics: {
      knowledgeGain: partial.knowledgeGain,
      modelCalibration: partial.modelCalibration,
      cyclesClosed: Math.max(0, partial.cycle - 1),
      experimentsQueued: partial.cycle + 2,
    },
  }
}

function seedProvenance(
  campaignId: string,
  cycle: number,
  owner: string,
): Campaign['provenance'] {
  return [
    {
      id: `${campaignId}-p1`,
      at: 'T−18h',
      cycle: Math.max(1, cycle - 1),
      actor: 'Mnemosyne',
      kind: 'agent',
      action: 'Merged ontology delta',
      artifact: 'kg:rev+' + (cycle - 1),
      hash: hashish(campaignId + 'm'),
    },
    {
      id: `${campaignId}-p2`,
      at: 'T−11h',
      cycle,
      actor: 'Athena',
      kind: 'agent',
      action: 'Proposed ranked hypotheses',
      artifact: 'hyp-set/' + cycle,
      hash: hashish(campaignId + 'a'),
    },
    {
      id: `${campaignId}-p3`,
      at: 'T−4h',
      cycle,
      actor: owner,
      kind: 'human',
      action: 'Signed high-stakes protocol',
      artifact: 'irb/lab-gate',
      hash: hashish(campaignId + 'h'),
    },
  ]
}

export function hashish(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return '0x' + (h >>> 0).toString(16).padStart(8, '0')
}

function graphFor(domain: Domain, cycle: number) {
  const layouts: Record<
    Domain,
    { nodes: Campaign['nodes']; edges: Campaign['edges'] }
  > = {
    energy: {
      nodes: [
        n('n1', 'Li₆PS₅Cl', 'entity', 180, 90, 0.82),
        n('n2', 'σ_ionic', 'property', 340, 70, 0.74),
        n('n3', 'LiI doping', 'mechanism', 80, 200, 0.61),
        n('n4', 'Dendrite onset', 'constraint', 280, 210, 0.55),
        n('n5', 'EIS @ 25°C', 'measurement', 420, 180, 0.88),
        n('n6', 'Halide grain boundary', 'mechanism', 160, 300, 0.48),
      ],
      edges: [
        e('e1', 'n1', 'n2', 'exhibits'),
        e('e2', 'n3', 'n2', 'raises'),
        e('e3', 'n4', 'n1', 'limits'),
        e('e4', 'n5', 'n2', 'measures'),
        e('e5', 'n6', 'n4', 'modulates'),
      ],
    },
    pharma: {
      nodes: [
        n('n1', 'JAK2 JH2', 'entity', 160, 80, 0.79),
        n('n2', 'Selectivity JAK1', 'property', 360, 90, 0.52),
        n('n3', 'C-helix lock', 'mechanism', 90, 210, 0.66),
        n('n4', 'hERG', 'constraint', 300, 230, 0.71),
        n('n5', 'SPR KD', 'measurement', 430, 170, 0.84),
      ],
      edges: [
        e('e1', 'n3', 'n1', 'stabilizes'),
        e('e2', 'n1', 'n2', 'drives'),
        e('e3', 'n4', 'n2', 'trades-off'),
        e('e4', 'n5', 'n1', 'binds'),
      ],
    },
    materials: {
      nodes: [
        n('n1', 'Fe–N–C site', 'entity', 170, 100, 0.7),
        n('n2', 'NH₃ Faraday', 'property', 350, 80, 0.44),
        n('n3', 'Proton inventory', 'mechanism', 100, 230, 0.5),
      ],
      edges: [
        e('e1', 'n1', 'n2', 'catalyzes'),
        e('e2', 'n3', 'n2', 'limits'),
      ],
    },
    manufacturing: {
      nodes: [
        n('n1', 'Island scan', 'entity', 150, 90, 0.8),
        n('n2', 'Density', 'property', 340, 70, 0.86),
        n('n3', 'Keyhole collapse', 'mechanism', 90, 220, 0.73),
        n('n4', 'Residual stress', 'constraint', 300, 230, 0.68),
        n('n5', 'µCT void %', 'measurement', 430, 160, 0.91),
        n('n6', 'Hatch 80µm', 'entity', 200, 310, 0.64),
      ],
      edges: [
        e('e1', 'n1', 'n3', 'suppresses'),
        e('e2', 'n3', 'n2', 'reduces'),
        e('e3', 'n6', 'n4', 'raises'),
        e('e4', 'n5', 'n2', 'measures'),
      ],
    },
    agriculture: {
      nodes: [
        n('n1', 'Azospirillum mix', 'entity', 160, 100, 0.46),
        n('n2', 'NUE', 'property', 350, 90, 0.4),
        n('n3', 'Root exudate C', 'mechanism', 110, 230, 0.38),
        n('n4', 'Grain protein', 'constraint', 320, 240, 0.72),
      ],
      edges: [
        e('e1', 'n1', 'n2', 'improves'),
        e('e2', 'n3', 'n1', 'feeds'),
        e('e3', 'n4', 'n2', 'constrains'),
      ],
    },
  }
  const g = layouts[domain]
  return {
    nodes: g.nodes.map((node) => ({
      ...node,
      confidence: Math.min(0.97, node.confidence + cycle * 0.012),
    })),
    edges: g.edges,
  }
}

function n(
  id: string,
  label: string,
  kind: Campaign['nodes'][number]['kind'],
  x: number,
  y: number,
  confidence: number,
): Campaign['nodes'][number] {
  return { id, label, kind, x, y, confidence }
}

function e(
  id: string,
  from: string,
  to: string,
  rel: string,
): Campaign['edges'][number] {
  return { id, from, to, rel }
}
