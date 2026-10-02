import type {
  HypothesisClassification,
  HypothesisConfig,
  NextExperimentRecommendation,
  RegressionAnalysis,
} from '../types/autonomous'

export function recommendNextExperiment(
  currentLevels: number[],
  regression: RegressionAnalysis,
  classification: HypothesisClassification,
  hypothesis: HypothesisConfig,
): NextExperimentRecommendation {
  const sorted = [...currentLevels].sort((a, b) => a - b)
  const minLvl = sorted[0] ?? 50
  const maxLvl = sorted[sorted.length - 1] ?? 80
  const step = sorted.length > 1 ? sorted[1] - sorted[0] : 10

  if (classification.outcome === 'SUPPORTS') {
    // Current evidence confirms linear increase up to maxLvl.
    // Autonomous recommendation: Push boundary to explore saturation or thermal degradation threshold.
    const next1 = maxLvl + step * 0.5
    const next2 = maxLvl + step * 1.0
    const next3 = maxLvl + step * 1.5

    return {
      recommendedLevels: [next1, next2, next3],
      targetVariables: `${hypothesis.independentVar} (${next1}°, ${next2}°, ${next3}°)`,
      rationale: `Current observations support a positive relationship up to ${maxLvl}°. However, real physical processes exhibit non-linear saturation or degradation at higher levels. We recommend probing higher bounds to characterize peak yield.`,
      expectedInfoGain: `Reduces epistemic uncertainty in the high-${hypothesis.independentVar} regime by quantifying non-linear curvature and boundary saturation.`,
      expectedOutcome: `Establish whether ${hypothesis.dependentVar} continues to increase linearly or reaches an optimal peak before thermal degradation.`,
    }
  } else if (classification.outcome === 'PARTIAL') {
    // Current evidence is noisy (CI crosses zero).
    // Autonomous recommendation: Densify sampling around mid-to-high levels to reduce standard error.
    const mid1 = minLvl + step * 0.5
    const mid2 = (minLvl + maxLvl) / 2
    const mid3 = maxLvl - step * 0.5

    return {
      recommendedLevels: [+mid1.toFixed(1), +mid2.toFixed(1), +mid3.toFixed(1)],
      targetVariables: `${hypothesis.independentVar} (${mid1.toFixed(1)}°, ${mid2.toFixed(1)}°, ${mid3.toFixed(1)}°)`,
      rationale: `Current observations show a weak or noisy trend where standard error is wide (95% CI = [${regression.ciLower.toFixed(
        2,
      )}, ${regression.ciUpper.toFixed(2)}]). Intermediate sampling is needed to narrow variance.`,
      expectedInfoGain: `Reduces variance and narrows the standard error of slope by 40-50% through targeted intermediate level sampling.`,
      expectedOutcome: `Determine if the relationship becomes statistically significant when intermediate noise is constrained.`,
    }
  } else {
    // Falsified: Trend is negative or zero.
    // Autonomous recommendation: Test lower levels or alternative process parameters.
    const alt1 = Math.max(10, minLvl - step * 1.5)
    const alt2 = Math.max(20, minLvl - step * 1.0)
    const alt3 = minLvl

    return {
      recommendedLevels: [+alt1.toFixed(1), +alt2.toFixed(1), +alt3.toFixed(1)],
      targetVariables: `${hypothesis.independentVar} (${alt1.toFixed(1)}°, ${alt2.toFixed(1)}°, ${alt3.toFixed(1)}°)`,
      rationale: `The hypothesis was falsified because higher ${hypothesis.independentVar} failed to increase ${hypothesis.dependentVar}. We recommend exploring lower level regimes to isolate optimal operating windows.`,
      expectedInfoGain: `Identifies non-monotonic inverted-U relationships and establishes true lower baseline constraints.`,
      expectedOutcome: `Verify if lower ${hypothesis.independentVar} levels prevent material degradation and restore baseline ${hypothesis.dependentVar}.`,
    }
  }
}
