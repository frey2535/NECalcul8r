/**
 * Seeded PRNG (mulberry32) — reproducible unique problem streams.
 * Each session uses Date.now() + counter so problems never loop the same set.
 */
export function createRng(seed = Date.now() ^ (Math.random() * 0xffffffff)) {
  let s = seed >>> 0
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    seed: s,
    next,
    int(min, max) {
      return Math.floor(next() * (max - min + 1)) + min
    },
    pick(arr) {
      return arr[Math.floor(next() * arr.length)]
    },
    shuffle(arr) {
      const a = [...arr]
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
      }
      return a
    },
  }
}

export function nearlyEqual(a, b, eps = 1e-9) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false
  const diff = Math.abs(a - b)
  if (diff <= eps) return true
  return diff <= eps * Math.max(1, Math.abs(a), Math.abs(b))
}

export function formatNumber(n, digits = 6) {
  if (!Number.isFinite(n)) return String(n)
  if (Number.isInteger(n)) return String(n)
  const s = Number(n.toPrecision(digits))
  return String(s)
}

export function gcd(a, b) {
  a = Math.abs(Math.trunc(a))
  b = Math.abs(Math.trunc(b))
  while (b) {
    const t = b
    b = a % b
    a = t
  }
  return a || 1
}

export function simplifyFraction(num, den) {
  if (den < 0) {
    num = -num
    den = -den
  }
  const g = gcd(num, den)
  return { num: num / g, den: den / g }
}

export function lcm(a, b) {
  return Math.abs(a * b) / gcd(a, b)
}
