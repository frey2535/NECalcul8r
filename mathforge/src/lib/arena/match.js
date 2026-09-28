import { generateVerifiedProblem } from '../accuracyAgent/agent.mjs'
import { checkAnswer } from '../accuracyAgent/agent.mjs'

/**
 * Arena mode: timed rush — as many correct as possible.
 * Ghost rival score scales with difficulty.
 */

export function createArenaMatch({ topicId, difficulty = 1, durationSec = 60 }) {
  return {
    id: `arena_${Date.now()}`,
    topicId,
    difficulty,
    durationSec,
    startedAt: null,
    endsAt: null,
    score: 0,
    streak: 0,
    correct: 0,
    wrong: 0,
    rivalTarget: 8 + difficulty * 4,
    problems: [],
    current: null,
    status: 'ready', // ready | running | finished
  }
}

export function startMatch(match) {
  match.startedAt = Date.now()
  match.endsAt = match.startedAt + match.durationSec * 1000
  match.status = 'running'
  match.current = generateVerifiedProblem(match.topicId, match.difficulty)
  return match
}

export function submitArenaAnswer(match, userAnswer) {
  if (match.status !== 'running') return { match, result: null }
  if (Date.now() > match.endsAt) {
    match.status = 'finished'
    return { match, result: null }
  }
  const result = checkAnswer(match.current, userAnswer)
  match.problems.push({ ...match.current, userAnswer, correct: result.ok })
  if (result.ok) {
    match.correct++
    match.streak++
    match.score += 100 + match.streak * 15
  } else {
    match.wrong++
    match.streak = 0
  }
  match.current = generateVerifiedProblem(match.topicId, match.difficulty)
  return { match, result }
}

export function tickMatch(match) {
  if (match.status === 'running' && Date.now() >= match.endsAt) {
    match.status = 'finished'
  }
  return match
}

export function rivalScore(match) {
  if (!match.startedAt) return 0
  const elapsed = Math.min(match.durationSec, (Date.now() - match.startedAt) / 1000)
  const pace = match.rivalTarget / match.durationSec
  return Math.floor(elapsed * pace * 100)
}
