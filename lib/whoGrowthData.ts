export interface PercentilePoint {
  age: number
  p3: number
  p15: number
  p50: number
  p85: number
  p97: number
}

// ── Raw sparse WHO data ────────────────────────────────────────────────────────
// Linear interpolation fills in the missing ages.

const WEIGHT_M_RAW: PercentilePoint[] = [
  { age: 0,  p3: 2.5,  p15: 2.9,  p50: 3.3,  p85: 3.9,  p97: 4.4  },
  { age: 1,  p3: 7.7,  p15: 8.6,  p50: 9.6,  p85: 10.8, p97: 11.8 },
  { age: 2,  p3: 9.7,  p15: 10.8, p50: 12.2, p85: 13.6, p97: 15.3 },
  { age: 5,  p3: 14.1, p15: 15.8, p50: 18.3, p85: 21.5, p97: 24.7 },
  { age: 10, p3: 24.2, p15: 27.8, p50: 32.5, p85: 40.1, p97: 48.5 },
  { age: 15, p3: 44.9, p15: 51.5, p50: 59.0, p85: 70.1, p97: 80.1 },
  { age: 19, p3: 55.2, p15: 62.8, p50: 71.2, p85: 84.2, p97: 96.0 },
]

const HEIGHT_M_RAW: PercentilePoint[] = [
  { age: 0,  p3: 46.1, p15: 47.5, p50: 49.9, p85: 52.3, p97: 53.7  },
  { age: 1,  p3: 71.0, p15: 73.0, p50: 75.7, p85: 78.6, p97: 80.5  },
  { age: 2,  p3: 81.7, p15: 84.0, p50: 87.1, p85: 90.4, p97: 92.3  },
  { age: 5,  p3: 100.7,p15: 103.5,p50: 107.4,p85: 111.7,p97: 114.6 },
  { age: 10, p3: 123.8,p15: 127.5,p50: 132.6,p85: 138.1,p97: 141.8 },
  { age: 15, p3: 157.5,p15: 162.0,p50: 167.0,p85: 172.3,p97: 175.2 },
  { age: 19, p3: 162.0,p15: 166.5,p50: 171.2,p85: 176.2,p97: 179.4 },
]

const WEIGHT_F_RAW: PercentilePoint[] = [
  { age: 0,  p3: 2.4,  p15: 2.8,  p50: 3.2,  p85: 3.7,  p97: 4.2  },
  { age: 1,  p3: 7.0,  p15: 7.9,  p50: 8.9,  p85: 10.0, p97: 11.0 },
  { age: 2,  p3: 9.0,  p15: 10.1, p50: 11.5, p85: 13.0, p97: 14.8 },
  { age: 5,  p3: 13.7, p15: 15.3, p50: 17.7, p85: 21.0, p97: 24.2 },
  { age: 10, p3: 23.2, p15: 27.0, p50: 32.5, p85: 41.5, p97: 51.0 },
  { age: 15, p3: 40.5, p15: 46.5, p50: 54.0, p85: 64.8, p97: 74.0 },
  { age: 19, p3: 43.5, p15: 50.0, p50: 58.0, p85: 70.0, p97: 81.0 },
]

const HEIGHT_F_RAW: PercentilePoint[] = [
  { age: 0,  p3: 45.6, p15: 47.2, p50: 49.1, p85: 51.4, p97: 52.9  },
  { age: 1,  p3: 68.9, p15: 71.0, p50: 74.0, p85: 76.8, p97: 78.9  },
  { age: 2,  p3: 79.3, p15: 82.0, p50: 85.7, p85: 88.9, p97: 91.0  },
  { age: 5,  p3: 98.7, p15: 101.7,p50: 105.9,p85: 110.2,p97: 113.0 },
  { age: 10, p3: 121.7,p15: 126.0,p50: 132.2,p85: 138.6,p97: 143.0 },
  { age: 15, p3: 150.5,p15: 154.5,p50: 159.1,p85: 164.3,p97: 167.7 },
  { age: 19, p3: 151.4,p15: 155.6,p50: 160.0,p85: 165.0,p97: 168.3 },
]

// ── Interpolation helpers ──────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a)
}

function interpolate(data: PercentilePoint[], age: number): PercentilePoint {
  if (age <= data[0].age) return { ...data[0], age }
  if (age >= data[data.length - 1].age) return { ...data[data.length - 1], age }

  let lo = data[0]
  let hi = data[1]
  for (let i = 0; i < data.length - 1; i++) {
    if (data[i].age <= age && data[i + 1].age >= age) {
      lo = data[i]
      hi = data[i + 1]
      break
    }
  }
  if (lo.age === age) return lo
  const t = (age - lo.age) / (hi.age - lo.age)
  return {
    age,
    p3:  lerp(lo.p3,  hi.p3,  t),
    p15: lerp(lo.p15, hi.p15, t),
    p50: lerp(lo.p50, hi.p50, t),
    p85: lerp(lo.p85, hi.p85, t),
    p97: lerp(lo.p97, hi.p97, t),
  }
}

function rawFor(type: 'weight' | 'height', gender: 'M' | 'F'): PercentilePoint[] {
  if (type === 'weight') return gender === 'M' ? WEIGHT_M_RAW : WEIGHT_F_RAW
  return gender === 'M' ? HEIGHT_M_RAW : HEIGHT_F_RAW
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** All integer ages 0–19 with interpolated percentile values */
export function getWeightPercentiles(gender: 'M' | 'F'): PercentilePoint[] {
  const raw = rawFor('weight', gender)
  return Array.from({ length: 20 }, (_, i) => interpolate(raw, i))
}

export function getHeightPercentiles(gender: 'M' | 'F'): PercentilePoint[] {
  const raw = rawFor('height', gender)
  return Array.from({ length: 20 }, (_, i) => interpolate(raw, i))
}

/** Percentile values at any fractional age (for merging patient data into charts) */
export function getPercentilesAtAge(
  age: number,
  type: 'weight' | 'height',
  gender: 'M' | 'F',
): PercentilePoint {
  return interpolate(rawFor(type, gender), age)
}

/** Calculates which WHO percentile a weight measurement falls at for a given age/gender */
export function getWeightPercentileForAge(
  weight: number,
  age: number,
  gender: 'M' | 'F',
): number {
  const pt = interpolate(rawFor('weight', gender), age)
  return percentileForValue(weight, pt)
}

/** Calculates which WHO percentile a height measurement falls at for a given age/gender */
export function getHeightPercentileForAge(
  height: number,
  age: number,
  gender: 'M' | 'F',
): number {
  const pt = interpolate(rawFor('height', gender), age)
  return percentileForValue(height, pt)
}

function percentileForValue(value: number, pt: PercentilePoint): number {
  const pairs: [number, number][] = [
    [pt.p3, 3], [pt.p15, 15], [pt.p50, 50], [pt.p85, 85], [pt.p97, 97],
  ]
  if (value <= pairs[0][0]) return 1
  if (value >= pairs[4][0]) return 99
  for (let i = 0; i < pairs.length - 1; i++) {
    const [v0, pct0] = pairs[i]
    const [v1, pct1] = pairs[i + 1]
    if (value >= v0 && value <= v1) {
      return pct0 + (value - v0) / (v1 - v0) * (pct1 - pct0)
    }
  }
  return 50
}
