import type {
  AnalysisResult,
  CampaignConfig,
  ExperimentDesignConfig,
  HypothesisConfig,
  KGEdge,
  KGNode,
  KnowledgeGraphData,
} from '../types/autonomous'

export function buildKnowledgeGraph(
  campaign: CampaignConfig,
  hypothesis: HypothesisConfig,
  experiment: ExperimentDesignConfig,
  analysis: AnalysisResult,
  cycleNumber: number,
): KnowledgeGraphData {
  const nodes: KGNode[] = [
    { id: 'node-camp', label: campaign.name, type: 'Campaign' },
    { id: 'node-hyp', label: `H: ${hypothesis.statement.slice(0, 24)}...`, type: 'Hypothesis' },
    { id: 'node-var', label: `${experiment.independentVar} → ${experiment.dependentVar}`, type: 'Variable' },
    { id: 'node-exp', label: `Exp: ${experiment.id} (C${cycleNumber})`, type: 'Experiment' },
    {
      id: 'node-res',
      label: `Slope: ${analysis.regression.slope > 0 ? '+' : ''}${analysis.regression.slope} (${analysis.classification.outcome})`,
      type: 'Result',
    },
  ]

  const edges: KGEdge[] = [
    { id: 'e1', source: 'node-camp', target: 'node-hyp', relation: 'HAS_HYPOTHESIS' },
    { id: 'e2', source: 'node-hyp', target: 'node-var', relation: 'HAS_HYPOTHESIS' },
    { id: 'e3', source: 'node-hyp', target: 'node-exp', relation: 'TESTED_BY' },
    { id: 'e4', source: 'node-exp', target: 'node-res', relation: 'PRODUCED' },
    {
      id: 'e5',
      source: 'node-res',
      target: 'node-hyp',
      relation: analysis.classification.outcome === 'SUPPORTS' ? 'SUPPORTS' : 'FALSIFIE_STATUS',
    },
  ]

  return { nodes, edges }
}
