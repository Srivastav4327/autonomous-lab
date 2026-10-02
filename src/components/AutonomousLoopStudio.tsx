import { useEffect, useState } from 'react'
import { updateBayesianBelief } from '../services/bayesian'
import { classifyHypothesis } from '../services/classification'
import { buildKnowledgeGraph } from '../services/knowledgeGraph'
import { clearCycleRecords, loadCycleRecords, saveCycleRecords } from '../services/persistence'
import { recommendNextExperiment } from '../services/recommendation'
import { calculateDescriptiveStats, calculateEffectAnalysis, calculateLinearRegression } from '../services/statistics'
import type {
  AnalysisResult,
  CampaignConfig,
  CycleRecord,
  ExperimentDesignConfig,
  HypothesisConfig,
  NextExperimentRecommendation,
  ObservationPoint,
} from '../types/autonomous'
import { ConfidenceTrendChart } from './ConfidenceTrendChart'
import { KnowledgeGraphViewer } from './KnowledgeGraphViewer'
import { RegressionChart } from './RegressionChart'

export function AutonomousLoopStudio() {
  // Step 1: Campaign Configuration State
  const [campaign, setCampaign] = useState<CampaignConfig>({
    id: 'cmp-material-strength',
    name: 'Material Strength Thermal Optimization',
    domain: 'Process / Materials Science',
    question: 'How does curing temperature affect material tensile strength?',
    targetMetric: 'Tensile Strength (MPa)',
    optimizationDirection: 'maximize',
    createdAt: new Date().toISOString(),
  })

  // Step 2: Hypothesis Configuration State
  const [hypothesis, setHypothesis] = useState<HypothesisConfig>({
    id: 'hyp-1',
    statement: 'Increasing curing temperature increases material tensile strength.',
    independentVar: 'Curing Temperature (°C)',
    dependentVar: 'Tensile Strength (MPa)',
    expectedDirection: 'positive',
    prior: 0.6,
    uncertainty: 0.4,
    prediction: 'Tensile strength should increase as curing temperature rises from 50°C to 80°C.',
    falsifier: 'If the 95% CI for the linear slope includes zero or negative values, the hypothesis is falsified.',
    status: 'active',
  })

  // Step 3: Experiment Design State
  const [experiment, setExperiment] = useState<ExperimentDesignConfig>({
    id: 'exp-cycle-1',
    hypothesisId: 'hyp-1',
    independentVar: 'Curing Temperature (°C)',
    dependentVar: 'Tensile Strength (MPa)',
    levels: [50, 60, 70, 80],
    observationsPerLevel: 2,
    observations: [
      { id: '1', independentValue: 50, dependentValue: 61 },
      { id: '2', independentValue: 50, dependentValue: 63 },
      { id: '3', independentValue: 60, dependentValue: 67 },
      { id: '4', independentValue: 60, dependentValue: 69 },
      { id: '5', independentValue: 70, dependentValue: 72 },
      { id: '6', independentValue: 70, dependentValue: 74 },
      { id: '7', independentValue: 80, dependentValue: 77 },
      { id: '8', independentValue: 80, dependentValue: 79 },
    ],
  })

  // Analysis & Cycle History State
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [recommendation, setRecommendation] = useState<NextExperimentRecommendation | null>(null)
  const [cycleHistory, setCycleHistory] = useState<CycleRecord[]>([])

  // Load persistence on mount
  useEffect(() => {
    const saved = loadCycleRecords()
    if (saved.length > 0) {
      setCycleHistory(saved)
      const last = saved[saved.length - 1]
      setAnalysis(last.analysis)
      setRecommendation(last.recommendation)
    }
  }, [])

  // Update level observation rows if level set changes
  const handleLevelChange = (index: number, val: number) => {
    const newLevels = [...experiment.levels]
    newLevels[index] = val
    setExperiment((prev) => {
      const newObs: ObservationPoint[] = []
      let idCounter = 1
      newLevels.forEach((lvl) => {
        for (let i = 0; i < prev.observationsPerLevel; i++) {
          const existing = prev.observations.find((o) => o.independentValue === lvl)
          newObs.push({
            id: String(idCounter++),
            independentValue: lvl,
            dependentValue: existing ? existing.dependentValue : Math.round(50 + lvl * 0.35),
          })
        }
      })
      return { ...prev, levels: newLevels, observations: newObs }
    })
  }

  const handleObservationChange = (id: string, dependentVal: number) => {
    setExperiment((prev) => ({
      ...prev,
      observations: prev.observations.map((o) => (o.id === id ? { ...o, dependentValue: dependentVal } : o)),
    }))
  }

  // STEP 4 — Real Data Analysis & Bayesian Calculation Trigger
  const runAutonomousAnalysis = () => {
    const desc = calculateDescriptiveStats(experiment.observations)
    const reg = calculateLinearRegression(experiment.observations)
    const eff = calculateEffectAnalysis(experiment.observations)
    const bayes = updateBayesianBelief(hypothesis.prior, reg, hypothesis.expectedDirection, hypothesis.falsifier)
    const classif = classifyHypothesis(reg, eff, bayes, hypothesis.expectedDirection, hypothesis.falsifier)

    const currentCycleNum = cycleHistory.length + 1

    const resultObj: AnalysisResult = {
      descriptive: desc,
      regression: reg,
      effect: eff,
      bayesian: bayes,
      classification: classif,
      timestamp: new Date().toLocaleTimeString(),
    }

    const rec = recommendNextExperiment(experiment.levels, reg, classif, hypothesis)
    const kg = buildKnowledgeGraph(campaign, hypothesis, experiment, resultObj, currentCycleNum)

    setAnalysis(resultObj)
    setRecommendation(rec)

    // Append cycle record
    const record: CycleRecord = {
      cycleNumber: currentCycleNum,
      timestamp: new Date().toLocaleTimeString(),
      campaign,
      hypothesis,
      experiment,
      analysis: resultObj,
      recommendation: rec,
      knowledgeGraph: kg,
    }

    const updatedHistory = [...cycleHistory, record]
    setCycleHistory(updatedHistory)
    saveCycleRecords(updatedHistory)
  }

  // STEP 8/9 — Autonomous Next Cycle Trigger
  const startNextCycleWithRecommendation = () => {
    if (!recommendation) return
    const nextCycleNum = cycleHistory.length + 1
    const recLevels = recommendation.recommendedLevels

    const newObs: ObservationPoint[] = []
    let idCounter = 1
    recLevels.forEach((lvl) => {
      for (let i = 0; i < 2; i++) {
        // Generate realistic initial measurement for next level based on trend
        const base = analysis ? analysis.regression.slope * lvl + analysis.regression.intercept : 70
        newObs.push({
          id: String(idCounter++),
          independentValue: lvl,
          dependentValue: +(base + (Math.random() * 2 - 1)).toFixed(1),
        })
      }
    })

    const newExp: ExperimentDesignConfig = {
      id: `exp-cycle-${nextCycleNum}`,
      hypothesisId: hypothesis.id,
      independentVar: hypothesis.independentVar,
      dependentVar: hypothesis.dependentVar,
      levels: recLevels,
      observationsPerLevel: 2,
      observations: newObs,
    }

    // Update hypothesis prior to posterior from prior cycle
    const updatedHyp: HypothesisConfig = {
      ...hypothesis,
      prior: analysis ? analysis.bayesian.posterior : hypothesis.prior,
      uncertainty: analysis ? +(1 - analysis.bayesian.posterior).toFixed(2) : hypothesis.uncertainty,
    }

    setHypothesis(updatedHyp)
    setExperiment(newExp)
    setAnalysis(null)
    setRecommendation(null)
  }

  const handleReset = () => {
    clearCycleRecords()
    setCycleHistory([])
    setAnalysis(null)
    setRecommendation(null)
    setHypothesis((prev) => ({ ...prev, prior: 0.6, uncertainty: 0.4 }))
  }

  return (
    <div className="autonomous-studio">
      <div className="studio-header">
        <div>
          <h2>Closed-Loop Autonomous R&amp;D Studio</h2>
          <p className="subtext">
            Deterministically calculated statistics, Bayesian belief updating &amp; autonomous experiment selection.
          </p>
        </div>
        <div className="studio-actions">
          <button className="btn" onClick={handleReset}>
            Reset Cycle History
          </button>
        </div>
      </div>

      {/* Cycle Progress Tracker Banner */}
      <div className="cycle-tracker">
        <div className="cycle-badge">Active Cycle: #{cycleHistory.length + 1}</div>
        <div className="cycle-metric">
          <span>Hypothesis Confidence:</span>
          <b>{(hypothesis.prior * 100).toFixed(1)}%</b>
        </div>
        <div className="cycle-metric">
          <span>Latest Outcome:</span>
          <b>{analysis ? analysis.classification.outcome : 'Pending Analysis'}</b>
        </div>
        <div className="cycle-metric">
          <span>Recorded Cycles:</span>
          <b>{cycleHistory.length}</b>
        </div>
      </div>

      <div className="studio-grid">
        {/* Step 1 & Step 2: Campaign & Hypothesis Configuration */}
        <article className="card">
          <header>
            <h3>Step 1 &amp; 2 · Campaign &amp; Hypothesis</h3>
            <span>Falsifiable Setup</span>
          </header>

          <form className="studio-form" onSubmit={(e) => e.preventDefault()}>
            <label>
              Campaign Name
              <input
                type="text"
                value={campaign.name}
                onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
              />
            </label>

            <label>
              Research Question
              <textarea
                rows={2}
                value={campaign.question}
                onChange={(e) => setCampaign({ ...campaign, question: e.target.value })}
              />
            </label>

            <div className="form-row">
              <label>
                Independent Variable
                <input
                  type="text"
                  value={hypothesis.independentVar}
                  onChange={(e) =>
                    setHypothesis({ ...hypothesis, independentVar: e.target.value })
                  }
                />
              </label>
              <label>
                Dependent Variable
                <input
                  type="text"
                  value={hypothesis.dependentVar}
                  onChange={(e) =>
                    setHypothesis({ ...hypothesis, dependentVar: e.target.value })
                  }
                />
              </label>
            </div>

            <div className="form-row">
              <label>
                Prior Belief P(H)
                <input
                  type="number"
                  step="0.05"
                  min="0.05"
                  max="0.95"
                  value={hypothesis.prior}
                  onChange={(e) =>
                    setHypothesis({ ...hypothesis, prior: Number(e.target.value) })
                  }
                />
              </label>

              <label>
                Expected Trend
                <select
                  value={hypothesis.expectedDirection}
                  onChange={(e) =>
                    setHypothesis({
                      ...hypothesis,
                      expectedDirection: e.target.value as 'positive' | 'negative',
                    })
                  }
                >
                  <option value="positive">Positive (+ slope)</option>
                  <option value="negative">Negative (- slope)</option>
                </select>
              </label>
            </div>

            <label>
              Falsification Criterion (Kill Rule)
              <textarea
                rows={2}
                value={hypothesis.falsifier}
                onChange={(e) => setHypothesis({ ...hypothesis, falsifier: e.target.value })}
              />
            </label>
          </form>
        </article>

        {/* Step 3 & Step 4: Experiment Design & Real Data Entry */}
        <article className="card">
          <header>
            <h3>Step 3 &amp; 4 · Experiment Design &amp; Data Entry</h3>
            <span>Empirical Sampling</span>
          </header>

          <div className="exp-levels-config">
            <span className="label">Levels ({hypothesis.independentVar}):</span>
            <div className="levels-inputs">
              {experiment.levels.map((lvl, idx) => (
                <input
                  key={idx}
                  type="number"
                  value={lvl}
                  onChange={(e) => handleLevelChange(idx, Number(e.target.value))}
                />
              ))}
            </div>
          </div>

          <table className="obs-table">
            <thead>
              <tr>
                <th>{hypothesis.independentVar}</th>
                <th>Observed {hypothesis.dependentVar}</th>
              </tr>
            </thead>
            <tbody>
              {experiment.observations.map((obs) => (
                <tr key={obs.id}>
                  <td>{obs.independentValue}</td>
                  <td>
                    <input
                      type="number"
                      step="0.1"
                      value={obs.dependentValue}
                      onChange={(e) => handleObservationChange(obs.id, Number(e.target.value))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button className="btn primary full-width" onClick={runAutonomousAnalysis}>
            ▶ Analyze Evidence &amp; Update Belief
          </button>
        </article>
      </div>

      {/* Statistical Analysis & Bayesian Results Panel */}
      {analysis && (
        <div className="analysis-section">
          {/* Classification Banner */}
          <div className={`classification-banner ${analysis.classification.outcome.toLowerCase()}`}>
            <div className="class-status">{analysis.classification.outcome}</div>
            <div className="class-summary">{analysis.classification.summary}</div>
          </div>

          <div className="studio-grid">
            {/* Step 5: Real Statistical Calculations */}
            <article className="card">
              <header>
                <h3>Statistical Engine Output</h3>
                <span>Deterministic Calculations</span>
              </header>

              <ul className="kv">
                <li><span>Sample Count (n)</span><b>{analysis.descriptive.count}</b></li>
                <li><span>Mean X ({hypothesis.independentVar})</span><b>{analysis.descriptive.meanX}</b></li>
                <li><span>Mean Y ({hypothesis.dependentVar})</span><b>{analysis.descriptive.meanY}</b></li>
                <li><span>Linear Slope (m)</span><b>{analysis.regression.slope >= 0 ? '+' : ''}{analysis.regression.slope}</b></li>
                <li><span>Standard Error of Slope</span><b>± {analysis.regression.stdErrSlope}</b></li>
                <li><span>95% Confidence Interval</span><b>[{analysis.regression.ciLower}, {analysis.regression.ciUpper}]</b></li>
                <li><span>R² (Coeff of Determination)</span><b>{(analysis.regression.rSquared * 100).toFixed(1)}%</b></li>
                <li><span>t-Statistic / p-Value</span><b>t = {analysis.regression.tStat} (p = {analysis.regression.pValue})</b></li>
                <li><span>Baseline vs Treatment Delta</span><b>{analysis.effect.percentDiff >= 0 ? '+' : ''}{analysis.effect.percentDiff}% ({analysis.effect.absoluteDiff} units)</b></li>
              </ul>
            </article>

            {/* Step 6: Bayesian Update Calculation Breakdown */}
            <article className="card">
              <header>
                <h3>Bayesian Calculation Breakdown</h3>
                <span>Bayes' Rule P(H|E)</span>
              </header>

              <div className="bayesian-box">
                <div className="bayes-formula">
                  <code>P(H|E) = [P(E|H) × P(H)] / [P(E|H)P(H) + P(E|¬H)P(¬H)]</code>
                </div>

                <ul className="kv">
                  <li><span>Prior Belief P(H)</span><b>{(analysis.bayesian.prior * 100).toFixed(0)}%</b></li>
                  <li><span>Likelihood P(E|H)</span><b>{analysis.bayesian.likelihoodH}</b></li>
                  <li><span>Likelihood P(E|¬H)</span><b>{analysis.bayesian.likelihoodNotH}</b></li>
                  <li><span>Bayes Factor (BF₁₀)</span><b>{analysis.bayesian.bayesFactor}</b></li>
                  <li><span>Posterior Belief P(H|E)</span><b>{(analysis.bayesian.posterior * 100).toFixed(1)}%</b></li>
                </ul>

                <p className="proto" style={{ marginTop: '10px' }}>
                  {analysis.bayesian.explanation}
                </p>
              </div>
            </article>
          </div>

          {/* Charts Row */}
          <div className="studio-grid">
            <article className="card">
              <header>
                <h3>Chart 1 · Empirical Data &amp; Regression Fit</h3>
                <span>Scatter + Fitted Line</span>
              </header>
              <RegressionChart
                points={experiment.observations}
                regression={analysis.regression}
                independentVar={hypothesis.independentVar}
                dependentVar={hypothesis.dependentVar}
              />
            </article>

            <article className="card">
              <header>
                <h3>Chart 2 · Hypothesis Belief Evolution</h3>
                <span>P(H|E) over Cycles</span>
              </header>
              <ConfidenceTrendChart cycles={cycleHistory} />
            </article>
          </div>

          {/* Step 7: Knowledge Graph */}
          <div className="studio-grid">
            <article className="card span-2">
              <header>
                <h3>Step 7 · Lightweight Knowledge Graph</h3>
                <span>Campaign ➔ Hypothesis ➔ Experiment ➔ Result</span>
              </header>
              <KnowledgeGraphViewer graph={cycleHistory[cycleHistory.length - 1]?.knowledgeGraph ?? null} />
            </article>
          </div>

          {/* Step 8 & Step 9: Autonomous Next Experiment Recommendation */}
          {recommendation && (
            <div className="recommendation-card">
              <header>
                <h3>Autonomous Next Experiment Recommendation</h3>
                <span className="badge-user">Closed-Loop Active Learning</span>
              </header>

              <div className="rec-grid">
                <div>
                  <div className="rec-label">Target Variables &amp; Recommended Levels</div>
                  <div className="rec-val">{recommendation.targetVariables}</div>
                </div>

                <div>
                  <div className="rec-label">Expected Information Gain</div>
                  <div className="rec-val">{recommendation.expectedInfoGain}</div>
                </div>
              </div>

              <div className="rec-rationale">
                <b>Why this experiment?</b> {recommendation.rationale}
              </div>

              <div className="rec-outcome">
                <b>Expected Outcome:</b> {recommendation.expectedOutcome}
              </div>

              <button className="btn primary rec-btn" onClick={startNextCycleWithRecommendation}>
                ⚡ Execute Next Recommended Cycle (Cycle #{cycleHistory.length + 1})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
