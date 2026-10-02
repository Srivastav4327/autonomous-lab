export type OptimizationDirection = 'maximize' | 'minimize' | 'target-range'
export type ExpectedDirection = 'positive' | 'negative'
export type HypothesisStatus = 'active' | 'supports' | 'partial' | 'falsifies'

export type CampaignConfig = {
  id: string
  name: string
  domain: string
  question: string
  targetMetric: string
  optimizationDirection: OptimizationDirection
  createdAt: string
}

export type HypothesisConfig = {
  id: string
  statement: string
  independentVar: string
  dependentVar: string
  expectedDirection: ExpectedDirection
  prior: number            // P(H) ∈ (0, 1)
  uncertainty: number      // σ_H ∈ (0, 1)
  prediction: string
  falsifier: string        // Plain text kill criterion or numerical threshold
  status: HypothesisStatus
}

export type ObservationPoint = {
  id: string
  independentValue: number
  dependentValue: number
}

export type ExperimentDesignConfig = {
  id: string
  hypothesisId: string
  independentVar: string
  dependentVar: string
  levels: number[]
  observationsPerLevel: number
  observations: ObservationPoint[]
}

export type DescriptiveStats = {
  count: number
  meanX: number
  meanY: number
  medianX: number
  medianY: number
  minX: number
  maxX: number
  minY: number
  maxY: number
  stdDevX: number
  stdDevY: number
}

export type RegressionAnalysis = {
  slope: number
  intercept: number
  correlation: number
  rSquared: number
  stdErrSlope: number
  tStat: number
  pValue: number
  ciLower: number
  ciUpper: number
  confidenceLevel: number
}

export type EffectAnalysis = {
  baselineMean: number
  treatmentMean: number
  absoluteDiff: number
  percentDiff: number
}

export type BayesianAnalysis = {
  prior: number
  likelihoodH: number
  likelihoodNotH: number
  posterior: number
  bayesFactor: number
  explanation: string
}

export type HypothesisClassification = {
  outcome: 'SUPPORTS' | 'PARTIAL' | 'FALSIFIES'
  reasoning: string[]
  summary: string
}

export type AnalysisResult = {
  descriptive: DescriptiveStats
  regression: RegressionAnalysis
  effect: EffectAnalysis
  bayesian: BayesianAnalysis
  classification: HypothesisClassification
  timestamp: string
}

export type NextExperimentRecommendation = {
  recommendedLevels: number[]
  rationale: string
  expectedInfoGain: string
  expectedOutcome: string
  targetVariables: string
}

export type KGNode = {
  id: string
  label: string
  type: 'Campaign' | 'Hypothesis' | 'Variable' | 'Experiment' | 'Result'
}

export type KGEdge = {
  id: string
  source: string
  target: string
  relation: 'HAS_HYPOTHESIS' | 'TESTED_BY' | 'PRODUCED' | 'SUPPORTS' | 'FALSIFIE_STATUS'
}

export type KnowledgeGraphData = {
  nodes: KGNode[]
  edges: KGEdge[]
}

export type CycleRecord = {
  cycleNumber: number
  timestamp: string
  campaign: CampaignConfig
  hypothesis: HypothesisConfig
  experiment: ExperimentDesignConfig
  analysis: AnalysisResult
  recommendation: NextExperimentRecommendation
  knowledgeGraph: KnowledgeGraphData
}
