import { generateVerifiedProblem } from '../accuracyAgent/agent.mjs'
import { checkAnswer } from '../accuracyAgent/agent.mjs'
import { pickRival, ratingDelta } from './ranks.js'

/**
 * Ranked Arena match — HP race vs a named rival.
 * Correct answers deal damage; misses cost your HP.
 */

export function createArenaMatch({ topicId, difficulty = 1, durationSec = 75, playerName = 'You', playerAvatar = '🦊' }) {
  const rival = pickRival(Date.now() ^ topicId.length * 997)
  return {
    id: `arena_${Date.now()}`,
    topicId,
    difficulty,
    durationSec,
    startedAt: null,
    endsAt: null,
    score: 0,
    streak: 0,
    maxStreak: 0,
    correct: 0,
    wrong: 0,
    playerHp: 100,
    rivalHp: 100,
    rivalTarget: 9 + difficulty * 5,
    problems: [],
    current: null,
    status: 'lobby', // lobby | vs | countdown | running | finished
    countdown: 3,
    playerName,
    playerAvatar,
    rival,
    lastHit: null, // 'player' | 'rival' | null
    result: null, // 'win' | 'loss' | 'draw'
    ratingChange: 0,
  }
}

export function enterVs(match) {
  match.status = 'vs'
  return match
}

export function startCountdown(match) {
  match.status = 'countdown'
  match.countdown = 3
  return match
}

export function tickCountdown(match) {
  if (match.status !== 'countdown') return match
  match.countdown -= 1
  if (match.countdown <= 0) {
    match.startedAt = Date.now()
    match.endsAt = match.startedAt + match.durationSec * 1000
    match.status = 'running'
    match.current = generateVerifiedProblem(match.topicId, match.difficulty)
  }
  return match
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
    return { match: finishMatch(match), result: null }
  }
  const result = checkAnswer(match.current, userAnswer)
  match.problems.push({ ...match.current, userAnswer, correct: result.ok })
  if (result.ok) {
    match.correct++
    match.streak++
    match.maxStreak = Math.max(match.maxStreak, match.streak)
    const dmg = Math.min(28, 10 + match.streak * 3 + match.difficulty * 2)
    match.rivalHp = Math.max(0, match.rivalHp - dmg)
    match.score += 100 + match.streak * 20
    match.lastHit = 'player'
  } else {
    match.wrong++
    match.streak = 0
    const recoil = 8 + match.difficulty * 2
    match.playerHp = Math.max(0, match.playerHp - recoil)
    match.lastHit = 'rival'
  }
  if (match.rivalHp <= 0 || match.playerHp <= 0) {
    return { match: finishMatch(match), result }
  }
  match.current = generateVerifiedProblem(match.topicId, match.difficulty)
  return { match, result }
}

export function tickMatch(match) {
  if (match.status === 'running' && Date.now() >= match.endsAt) {
    return finishMatch(match)
  }
  // rival passive pressure — drains a little if player stalls
  if (match.status === 'running' && match.startedAt) {
    const rivalPace = (match.rivalTarget / match.durationSec) * 0.35
    // soft pressure already represented in rivalScore for UI; HP race is answer-driven
  }
  return match
}

export function finishMatch(match) {
  if (match.status === 'finished') return match
  match.status = 'finished'
  const rs = rivalScore(match)
  if (match.rivalHp <= 0 && match.playerHp > 0) match.result = 'win'
  else if (match.playerHp <= 0 && match.rivalHp > 0) match.result = 'loss'
  else if (match.score > rs) match.result = 'win'
  else if (match.score < rs) match.result = 'loss'
  else match.result = 'draw'
  match.ratingChange = match.result === 'draw'
    ? 2
    : ratingDelta(match.result === 'win', match.score - rs, match.maxStreak)
  return match
}

export function rivalScore(match) {
  if (!match.startedAt) return 0
  const elapsed = Math.min(
    match.durationSec,
    ((match.status === 'finished' ? (match.endsAt || Date.now()) : Date.now()) - match.startedAt) / 1000,
  )
  const pace = match.rivalTarget / match.durationSec
  return Math.floor(elapsed * pace * 100)
}
