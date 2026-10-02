import type {
  BayesianAnalysis,
  EffectAnalysis,
  ExpectedDirection,
  HypothesisClassification,
  RegressionAnalysis,
} from '../types/autonomous'

export function classifyHypothesis(
  regression: RegressionAnalysis,
  effect: EffectAnalysis,
  bayesian: BayesianAnalysis,
  expectedDirection: ExpectedDirection,
  _falsifierCriterionText: string,
): HypothesisClassification {
  const reasoning: string[] = []

  const slope = regression.slope
  const ciLower = regression.ciLower
  const ciUpper = regression.ciUpper
  const r2 = regression.rSquared
  const pVal = regression.pValue

  reasoning.push(
    `Observed Linear Slope = ${slope > 0 ? '+' : ''}${slope.toFixed(4)} (R² = ${(r2 * 100).toFixed(
      1,
    )}%, Baseline → Treatment Delta = ${effect.percentDiff >= 0 ? '+' : ''}${effect.percentDiff}%).`,
  )
  reasoning.push(`95% Confidence Interval for Slope = [${ciLower.toFixed(4)}, ${ciUpper.toFixed(4)}].`)

  const crossesZero = ciLower * ciUpper <= 0
  if (crossesZero) {
    reasoning.push(
      `Statistical Assessment: The 95% Confidence Interval spans across zero. Therefore, the observed effect cannot be statistically distinguished from null variation at α = 0.05.`,
    )
  } else {
    reasoning.push(
      `Statistical Assessment: The 95% Confidence Interval does NOT include zero, demonstrating a statistically significant non-zero trend (p = ${pVal.toFixed(
        4,
      )}).`,
    )
  }

  const directionMatches =
    (expectedDirection === 'positive' && slope > 0) || (expectedDirection === 'negative' && slope < 0)

  if (!directionMatches) {
    reasoning.push(
      `Falsification Check: The observed slope direction (${
        slope > 0 ? 'positive' : 'negative'
      }) contradicts the predicted ${expectedDirection} direction.`,
    )
  } else {
    reasoning.push(`Directional Check: Observed direction aligns with predicted ${expectedDirection} trend.`)
  }

  reasoning.push(`Bayesian Update: P(H) updated from ${(bayesian.prior * 100).toFixed(0)}% → ${(
    bayesian.posterior * 100
  ).toFixed(1)}% (Bayes Factor BF₁₀ = ${bayesian.bayesFactor.toFixed(2)}).`)

  let outcome: 'SUPPORTS' | 'PARTIAL' | 'FALSIFIES'
  let summary = ''

  if (!directionMatches || slope === 0 || (expectedDirection === 'positive' && slope <= 0)) {
    outcome = 'FALSIFIES'
    summary = `FALSIFIED — Observed trend contradicts expected ${expectedDirection} direction. Falsification criterion triggered.`
  } else if (crossesZero || r2 < 0.35 || pVal >= 0.05) {
    outcome = 'PARTIAL'
    summary = `PARTIAL SUPPORT — Observed positive relationship, but statistical uncertainty is wide (CI crosses zero or R² < 0.35). Further sampling required.`
  } else {
    outcome = 'SUPPORTS'
    summary = `SUPPORTS HYPOTHESIS — Observed slope is statistically significant, positive, and 95% CI does not cross zero. Confidence increased to ${(
      bayesian.posterior * 100
    ).toFixed(1)}%.`
  }

  return {
    outcome,
    reasoning,
    summary,
  }
}
