import { nearlyEqual } from '../mathEngine/rng.mjs'
import { GENERATORS, generateProblem } from '../mathEngine/generators.mjs'

/**
 * Accuracy Agent — verifies every generated problem's answer and steps.
 * Rejects any problem that fails verification; generators must be 100% correct.
 */

function parseNumber(input) {
  if (typeof input === 'number') return input
  if (input == null) return NaN
  let s = String(input).trim().replace(/,/g, '')
  s = s.replace(/−/g, '-')
  // fraction a/b
  const frac = s.match(/^(-?\d+)\s*\/\s*(-?\d+)$/)
  if (frac) return Number(frac[1]) / Number(frac[2])
  // √2/2 style
  const sqrtFrac = s.match(/^√\s*(\d+)\s*\/\s*(\d+)$/)
  if (sqrtFrac) return Math.sqrt(Number(sqrtFrac[1])) / Number(sqrtFrac[2])
  const sqrtAlone = s.match(/^√\s*(\d+)$/)
  if (sqrtAlone) return Math.sqrt(Number(sqrtAlone[1]))
  // 1/√3
  const oneOverSqrt = s.match(/^1\s*\/\s*√\s*(\d+)$/)
  if (oneOverSqrt) return 1 / Math.sqrt(Number(oneOverSqrt[1]))
  if (/^√3\/2$/i.test(s) || s === '√3/2') return Math.sqrt(3) / 2
  if (s === '√2/2' || s === '1/√2') return Math.SQRT1_2
  if (s === '√3') return Math.sqrt(3)
  if (s === '1/√3' || s === '√3/3') return 1 / Math.sqrt(3)
  return Number(s)
}

function normalizeExpression(s) {
  return String(s)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/·/g, '')
    .replace(/\*/g, '')
    .replace(/\+\s*c$/i, '+c')
}

function parseDivisionRemainder(input) {
  const s = String(input).trim().replace(/\s+/g, ' ')
  const m = s.match(/^(-?\d+)\s*[rR]\s*(-?\d+)$/)
  if (!m) return null
  return { q: Number(m[1]), r: Number(m[2]) }
}

function parsePair(input) {
  const s = String(input).trim()
  const m = s.match(/^([-\d.]+)\s*,\s*([-\d.]+)$/)
  if (!m) return null
  return [Number(m[1]), Number(m[2])]
}

export function checkAnswer(problem, userAnswer) {
  const type = problem.answerType || 'number'
  const tol = problem.tolerance ?? 1e-6

  if (type === 'number') {
    const expected = typeof problem.answer === 'number' ? problem.answer : parseNumber(problem.answer)
    const got = parseNumber(userAnswer)
    const ok = nearlyEqual(expected, got, tol)
    return { ok, expected: problem.answer, got: userAnswer, detail: ok ? 'Match' : `Expected ${problem.answer}` }
  }

  if (type === 'fraction') {
    const expected = problem.numericAnswer ?? parseNumber(problem.answer)
    const got = parseNumber(userAnswer)
    const ok = nearlyEqual(expected, got, tol)
    return { ok, expected: problem.answer, got: userAnswer, detail: ok ? 'Equivalent value' : `Expected ${problem.answer}` }
  }

  if (type === 'division-remainder') {
    const exp = parseDivisionRemainder(problem.answer)
    const got = parseDivisionRemainder(userAnswer)
    if (!exp || !got) {
      // allow plain quotient if remainder 0
      if (String(problem.answer).includes('R')) {
        return { ok: false, expected: problem.answer, got: userAnswer, detail: 'Use form: quotient R remainder' }
      }
    }
    const ok = exp && got && exp.q === got.q && exp.r === got.r
    return { ok: !!ok, expected: problem.answer, got: userAnswer, detail: ok ? 'Match' : `Expected ${problem.answer}` }
  }

  if (type === 'pair') {
    const exp = parsePair(problem.answer)
    const got = parsePair(userAnswer)
    if (!exp || !got) return { ok: false, expected: problem.answer, got: userAnswer, detail: 'Enter as a,b' }
    const ok = nearlyEqual(exp[0], got[0], tol) && nearlyEqual(exp[1], got[1], tol)
    return { ok, expected: problem.answer, got: userAnswer, detail: ok ? 'Match' : `Expected ${problem.answer}` }
  }

  if (type === 'trig') {
    const expected = problem.numericAnswer ?? parseNumber(problem.answer)
    const got = parseNumber(userAnswer)
    // also accept exact string forms
    const normUser = String(userAnswer).replace(/\s+/g, '')
    const normAns = String(problem.answer).replace(/\s+/g, '')
    const ok = nearlyEqual(expected, got, problem.tolerance ?? 0.01) || normUser === normAns
    return { ok, expected: problem.answer, got: userAnswer, detail: ok ? 'Match' : `Expected ${problem.answer}` }
  }

  if (type === 'expression') {
    const ok = normalizeExpression(userAnswer) === normalizeExpression(problem.answer)
    return { ok, expected: problem.answer, got: userAnswer, detail: ok ? 'Match' : `Expected ${problem.answer}` }
  }

  const ok = String(userAnswer).trim() === String(problem.answer).trim()
  return { ok, expected: problem.answer, got: userAnswer, detail: ok ? 'Match' : `Expected ${problem.answer}` }
}

/**
 * Verify a problem's internal consistency: last step result matches answer,
 * and for numeric types recompute from operands when possible.
 */
export function verifyProblem(problem) {
  const issues = []
  if (!problem || !problem.prompt) issues.push('Missing prompt')
  if (problem.answer === undefined || problem.answer === null || problem.answer === '') {
    issues.push('Missing answer')
  }
  if (!Array.isArray(problem.steps) || problem.steps.length === 0) {
    issues.push('Missing steps')
  } else {
    const last = problem.steps[problem.steps.length - 1]
    if (last.result !== undefined && last.result !== null && last.result !== '') {
      const check = checkAnswer(
        { ...problem, answer: problem.answer, answerType: problem.answerType, numericAnswer: problem.numericAnswer, tolerance: problem.tolerance },
        last.result,
      )
      // For expressions/pairs, string compare via checkAnswer
      if (!check.ok) {
        // allow last.result to be numeric equivalent
        const a = parseNumber(last.result)
        const b = problem.numericAnswer ?? parseNumber(problem.answer)
        if (!(Number.isFinite(a) && Number.isFinite(b) && nearlyEqual(a, b, problem.tolerance ?? 1e-6))) {
          // expressions: normalize
          if (normalizeExpression(last.result) !== normalizeExpression(problem.answer)) {
            issues.push(`Final step result (${last.result}) ≠ answer (${problem.answer})`)
          }
        }
      }
    }
    for (let i = 0; i < problem.steps.length; i++) {
      const s = problem.steps[i]
      if (!s.title || !s.detail) issues.push(`Step ${i + 1} incomplete`)
    }
  }

  // Topic-specific recomputation
  const recomputeIssue = recompute(problem)
  if (recomputeIssue) issues.push(recomputeIssue)

  return {
    ok: issues.length === 0,
    issues,
    problemId: problem?.id,
  }
}

function recompute(problem) {
  const { topicId, operands, answer, answerType } = problem
  if (!operands || operands.length < 2) return null
  const [a, b] = operands
  if (topicId === 'addition' && a + b !== answer) return `Recompute fail: ${a}+${b}≠${answer}`
  if (topicId === 'subtraction' && a - b !== answer) return `Recompute fail: ${a}-${b}≠${answer}`
  if (topicId === 'multiplication' && a * b !== answer) return `Recompute fail: ${a}*${b}≠${answer}`
  if (topicId === 'division' && answerType === 'number' && a / b !== answer) {
    if (!nearlyEqual(a / b, answer)) return `Recompute fail: ${a}/${b}≠${answer}`
  }
  if (topicId === 'division' && answerType === 'division-remainder') {
    const parsed = String(answer).match(/^(\d+)\s*R(\d+)$/)
    if (parsed) {
      const q = Number(parsed[1])
      const r = Number(parsed[2])
      if (b * q + r !== a) return `Recompute fail: ${b}*${q}+${r}≠${a}`
    }
  }
  return null
}

/**
 * Generate a verified problem. Retries until Accuracy Agent passes (hard guarantee).
 */
export function generateVerifiedProblem(topicId, difficulty = 1, maxAttempts = 25) {
  const failures = []
  for (let i = 0; i < maxAttempts; i++) {
    const problem = generateProblem(topicId, difficulty)
    const verdict = verifyProblem(problem)
    if (verdict.ok) {
      return { ...problem, accuracyVerified: true, accuracyAgent: 'pass' }
    }
    failures.push(verdict)
  }
  throw new Error(
    `Accuracy Agent rejected all ${maxAttempts} attempts for ${topicId}: ${JSON.stringify(failures.slice(0, 3))}`,
  )
}

/**
 * Audit all generators with N samples each — CI / startup health check.
 */
export function auditAllGenerators({ samplesPerTopic = 20, difficulties = [1, 2, 3] } = {}) {
  const report = { passed: 0, failed: 0, byTopic: {}, issues: [] }
  for (const topicId of Object.keys(GENERATORS)) {
    report.byTopic[topicId] = { passed: 0, failed: 0 }
    for (const d of difficulties) {
      // skip high difficulty for topics that ignore it harmlessly
      for (let i = 0; i < samplesPerTopic; i++) {
        try {
          const problem = generateProblem(topicId, d)
          const verdict = verifyProblem(problem)
          if (verdict.ok) {
            report.passed++
            report.byTopic[topicId].passed++
          } else {
            report.failed++
            report.byTopic[topicId].failed++
            if (report.issues.length < 50) {
              report.issues.push({ topicId, difficulty: d, issues: verdict.issues, prompt: problem.prompt })
            }
          }
        } catch (e) {
          report.failed++
          report.byTopic[topicId].failed++
          report.issues.push({ topicId, difficulty: d, issues: [String(e.message || e)] })
        }
      }
    }
  }
  report.ok = report.failed === 0
  return report
}

export { parseNumber }
