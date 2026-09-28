import test from 'node:test'
import assert from 'node:assert/strict'
import {
  verifyProblem,
  generateVerifiedProblem,
  auditAllGenerators,
  checkAnswer,
} from './agent.mjs'

test('verified problems pass accuracy agent', () => {
  const topics = [
    'addition',
    'subtraction',
    'multiplication',
    'division',
    'fractions',
    'linear-equations',
    'quadratics',
    'derivatives',
    'integrals',
    'limits',
  ]
  for (const t of topics) {
    const p = generateVerifiedProblem(t, 1)
    assert.equal(p.accuracyVerified, true)
    const v = verifyProblem(p)
    assert.equal(v.ok, true, `${t}: ${JSON.stringify(v.issues)}`)
  }
})

test('checkAnswer accepts correct numeric answers', () => {
  const p = generateVerifiedProblem('addition', 1)
  const r = checkAnswer(p, String(p.answer))
  assert.equal(r.ok, true)
  const bad = checkAnswer(p, String(Number(p.answer) + 1))
  assert.equal(bad.ok, false)
})

test('checkAnswer accepts equivalent fractions', () => {
  const p = {
    answer: '1/2',
    answerType: 'fraction',
    numericAnswer: 0.5,
  }
  assert.equal(checkAnswer(p, '1/2').ok, true)
  assert.equal(checkAnswer(p, '2/4').ok, true)
  assert.equal(checkAnswer(p, '0.5').ok, true)
  assert.equal(checkAnswer(p, '1/3').ok, false)
})

test('full generator audit has zero failures', () => {
  const report = auditAllGenerators({ samplesPerTopic: 8, difficulties: [1, 2, 3] })
  assert.equal(report.failed, 0, JSON.stringify(report.issues.slice(0, 10), null, 2))
  assert.ok(report.passed > 100)
})
