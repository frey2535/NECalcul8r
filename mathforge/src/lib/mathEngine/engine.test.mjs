import test from 'node:test'
import assert from 'node:assert/strict'
import { generateProblem, generateUniqueSet, GENERATORS } from './generators.mjs'
import { createRng } from './rng.mjs'

test('rng is deterministic for same seed', () => {
  const a = createRng(12345)
  const b = createRng(12345)
  const seqA = [a.int(1, 100), a.int(1, 100), a.pick([1, 2, 3])]
  const seqB = [b.int(1, 100), b.int(1, 100), b.pick([1, 2, 3])]
  assert.deepEqual(seqA, seqB)
})

test('all generators produce a prompt and answer', () => {
  for (const topicId of Object.keys(GENERATORS)) {
    const p = generateProblem(topicId, 1, 42 + topicId.length)
    assert.ok(p.prompt, topicId)
    assert.ok(p.answer !== undefined && p.answer !== null && p.answer !== '', topicId)
    assert.ok(Array.isArray(p.steps) && p.steps.length > 0, topicId)
  }
})

test('unique set avoids duplicate prompt+answer pairs', () => {
  const set = generateUniqueSet('multiplication', 1, 15)
  assert.equal(set.length, 15)
  const keys = new Set(set.map((p) => `${p.prompt}::${p.answer}`))
  assert.equal(keys.size, 15)
})

test('multiplication answer matches operands', () => {
  for (let i = 0; i < 30; i++) {
    const p = generateProblem('multiplication', 2)
    assert.equal(p.answer, p.operands[0] * p.operands[1])
  }
})
