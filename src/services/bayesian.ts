import type { BayesianAnalysis, ExpectedDirection, RegressionAnalysis } from '../types/autonomous'

export function updateBayesianBelief(
  priorP: number,
  regression: RegressionAnalysis,
  expectedDirection: ExpectedDirection,
  _falsifierCriterionText: string,
): BayesianAnalysis {
  // Clamp prior between 0.05 and 0.95 to avoid probability degeneration
  const P_H = Math.max(0.05, Math.min(0.95, priorP))
  const P_NotH = 1 - P_H

  const directionMatches =
    (expectedDirection === 'positive' && regression.slope > 0) ||
    (expectedDirection === 'negative' && regression.slope < 0)

  const isSignificantlyNonZero = regression.ciLower * regression.ciUpper > 0
  const r2 = regression.rSquared
  const pVal = regression.pValue

  // Calculate likelihood P(E|H) - probability of observed evidence under hypothesis
  let P_E_H = 0.5
  let P_E_NotH = 0.5

  if (directionMatches && isSignificantlyNonZero && pVal < 0.05) {
    // Strong supporting evidence
    P_E_H = Math.min(0.95, 0.70 + r2 * 0.25)
    P_E_NotH = Math.max(0.05, 0.25 - r2 * 0.20)
  } else if (directionMatches && (!isSignificantlyNonZero || pVal >= 0.05)) {
    // Partial / ambiguous evidence
    P_E_H = 0.58
    P_E_NotH = 0.42
  } else {
    // Contradictory / falsifying evidence
    P_E_H = Math.max(0.05, 0.15 * (1 - r2))
    P_E_NotH = Math.min(0.95, 0.80 + r2 * 0.15)
  }

  // Bayes' Rule calculation
  const num = P_E_H * P_H
  const den = P_E_H * P_H + P_E_NotH * P_NotH
  const posterior = den === 0 ? P_H : num / den

  const bayesFactor = P_E_NotH === 0 ? 99 : P_E_H / P_E_NotH

  const explanation = `Prior P(H) = ${(P_H * 100).toFixed(0)}%. Likelihood under hypothesis P(E|H) = ${P_E_H.toFixed(
    2,
  )}; Likelihood under alternative P(E|¬H) = ${P_E_NotH.toFixed(
    2,
  )}. Bayes Factor BF₁₀ = ${bayesFactor.toFixed(2)}. Posterior belief P(H|E) updated to ${(
    posterior * 100
  ).toFixed(1)}%.`

  return {
    prior: +P_H.toFixed(4),
    likelihoodH: +P_E_H.toFixed(4),
    likelihoodNotH: +P_E_NotH.toFixed(4),
    posterior: +posterior.toFixed(4),
    bayesFactor: +bayesFactor.toFixed(2),
    explanation,
  }
}
