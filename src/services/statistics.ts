import type {
  DescriptiveStats,
  EffectAnalysis,
  ObservationPoint,
  RegressionAnalysis,
} from '../types/autonomous'

export function calculateDescriptiveStats(points: ObservationPoint[]): DescriptiveStats {
  const n = points.length
  if (n === 0) {
    return {
      count: 0,
      meanX: 0,
      meanY: 0,
      medianX: 0,
      medianY: 0,
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      stdDevX: 0,
      stdDevY: 0,
    }
  }

  const xs = points.map((p) => p.independentValue)
  const ys = points.map((p) => p.dependentValue)

  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = ys.reduce((a, b) => a + b, 0)
  const meanX = sumX / n
  const meanY = sumY / n

  const sortedX = [...xs].sort((a, b) => a - b)
  const sortedY = [...ys].sort((a, b) => a - b)

  const medianX =
    n % 2 === 0 ? (sortedX[n / 2 - 1] + sortedX[n / 2]) / 2 : sortedX[Math.floor(n / 2)]
  const medianY =
    n % 2 === 0 ? (sortedY[n / 2 - 1] + sortedY[n / 2]) / 2 : sortedY[Math.floor(n / 2)]

  const varianceX = xs.reduce((sum, x) => sum + Math.pow(x - meanX, 2), 0) / Math.max(1, n - 1)
  const varianceY = ys.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0) / Math.max(1, n - 1)

  return {
    count: n,
    meanX: +meanX.toFixed(3),
    meanY: +meanY.toFixed(3),
    medianX: +medianX.toFixed(3),
    medianY: +medianY.toFixed(3),
    minX: sortedX[0],
    maxX: sortedX[n - 1],
    minY: sortedY[0],
    maxY: sortedY[n - 1],
    stdDevX: +Math.sqrt(varianceX).toFixed(3),
    stdDevY: +Math.sqrt(varianceY).toFixed(3),
  }
}

export function calculateLinearRegression(
  points: ObservationPoint[],
  confidenceLevel = 0.95,
): RegressionAnalysis {
  const n = points.length
  if (n < 2) {
    return {
      slope: 0,
      intercept: 0,
      correlation: 0,
      rSquared: 0,
      stdErrSlope: 0,
      tStat: 0,
      pValue: 1,
      ciLower: 0,
      ciUpper: 0,
      confidenceLevel,
    }
  }

  const xs = points.map((p) => p.independentValue)
  const ys = points.map((p) => p.dependentValue)

  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n

  let num = 0
  let denX = 0
  let denY = 0

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX
    const dy = ys[i] - meanY
    num += dx * dy
    denX += dx * dx
    denY += dy * dy
  }

  const slope = denX === 0 ? 0 : num / denX
  const intercept = meanY - slope * meanX

  const correlation = denX === 0 || denY === 0 ? 0 : num / Math.sqrt(denX * denY)
  const rSquared = Math.max(0, Math.min(1, correlation * correlation))

  // Residual sum of squares (RSS)
  let rss = 0
  for (let i = 0; i < n; i++) {
    const yHat = slope * xs[i] + intercept
    rss += Math.pow(ys[i] - yHat, 2)
  }

  const df = Math.max(1, n - 2)
  const residualVar = rss / df
  const stdErrSlope = denX === 0 ? 0 : Math.sqrt(residualVar / denX)

  const tStat = stdErrSlope === 0 ? 0 : slope / stdErrSlope

  // Approximate critical t-value for 95% CI based on degrees of freedom df
  const tCrit = getTCritical(df)
  const marginOfError = tCrit * stdErrSlope

  const ciLower = slope - marginOfError
  const ciUpper = slope + marginOfError

  // Approximate p-value from t-statistic using standard normal / t approximation
  const pValue = calculatePValueFromT(tStat, df)

  return {
    slope: +slope.toFixed(4),
    intercept: +intercept.toFixed(4),
    correlation: +correlation.toFixed(4),
    rSquared: +rSquared.toFixed(4),
    stdErrSlope: +stdErrSlope.toFixed(4),
    tStat: +tStat.toFixed(4),
    pValue: +pValue.toFixed(4),
    ciLower: +ciLower.toFixed(4),
    ciUpper: +ciUpper.toFixed(4),
    confidenceLevel,
  }
}

export function calculateEffectAnalysis(points: ObservationPoint[]): EffectAnalysis {
  if (points.length === 0) {
    return { baselineMean: 0, treatmentMean: 0, absoluteDiff: 0, percentDiff: 0 }
  }

  // Sort by independent variable level
  const sortedLevels = [...new Set(points.map((p) => p.independentValue))].sort((a, b) => a - b)
  const minLevel = sortedLevels[0]
  const maxLevel = sortedLevels[sortedLevels.length - 1]

  const minLevelPoints = points.filter((p) => p.independentValue === minLevel)
  const maxLevelPoints = points.filter((p) => p.independentValue === maxLevel)

  const baselineMean =
    minLevelPoints.reduce((sum, p) => sum + p.dependentValue, 0) / Math.max(1, minLevelPoints.length)
  const treatmentMean =
    maxLevelPoints.reduce((sum, p) => sum + p.dependentValue, 0) / Math.max(1, maxLevelPoints.length)

  const absoluteDiff = treatmentMean - baselineMean
  const percentDiff = baselineMean === 0 ? 0 : (absoluteDiff / Math.abs(baselineMean)) * 100

  return {
    baselineMean: +baselineMean.toFixed(3),
    treatmentMean: +treatmentMean.toFixed(3),
    absoluteDiff: +absoluteDiff.toFixed(3),
    percentDiff: +percentDiff.toFixed(2),
  }
}

function getTCritical(df: number): number {
  // Two-tailed 95% critical t-values table
  const tTable: Record<number, number> = {
    1: 12.706,
    2: 4.303,
    3: 3.182,
    4: 2.776,
    5: 2.571,
    6: 2.447,
    7: 2.365,
    8: 2.306,
    9: 2.262,
    10: 2.228,
    15: 2.131,
    20: 2.086,
    30: 2.042,
  }
  if (tTable[df]) return tTable[df]
  if (df > 30) return 1.96
  return 2.2
}

function calculatePValueFromT(t: number, df: number): number {
  const absT = Math.abs(t)
  // Approximation for two-tailed p-value
  const x = df / (df + absT * absT)
  const p = Math.exp(-0.7 * absT) * Math.sqrt(x)
  return Math.min(1, Math.max(0.0001, +p.toFixed(4)))
}
