/** Competitive ranking + rival roster */

export const RANKS = [
  { id: 'rookie', name: 'Rookie', min: 0, color: '#8a9a8e' },
  { id: 'bronze', name: 'Bronze', min: 200, color: '#cd7f32' },
  { id: 'silver', name: 'Silver', min: 500, color: '#9aa4b2' },
  { id: 'gold', name: 'Gold', min: 900, color: '#d4a017' },
  { id: 'platinum', name: 'Platinum', min: 1400, color: '#5ecfcf' },
  { id: 'diamond', name: 'Diamond', min: 2000, color: '#6ec6ff' },
  { id: 'axiom', name: 'Axiom Elite', min: 2800, color: '#c8f542' },
]

export function rankForRating(rating = 0) {
  let current = RANKS[0]
  for (const r of RANKS) {
    if (rating >= r.min) current = r
  }
  return current
}

export function nextRank(rating = 0) {
  const cur = rankForRating(rating)
  const idx = RANKS.findIndex((r) => r.id === cur.id)
  return RANKS[idx + 1] || null
}

export const RIVALS = [
  { name: 'ZERO_DIV', avatar: '🤖', taunt: 'Hope you brought scratch paper.' },
  { name: 'PrimeRage', avatar: '🔥', taunt: 'I eat fractions for breakfast.' },
  { name: 'NyxCalc', avatar: '🌙', taunt: 'No calc. No mercy.' },
  { name: 'LatticeKid', avatar: '⚡', taunt: 'Your standard algorithm is slow.' },
  { name: 'VedicVoid', avatar: '🌀', taunt: 'Crosswise. Vertically. Gone.' },
  { name: 'RootCause', avatar: '🗡️', taunt: 'Simplify… or get simplified.' },
  { name: 'SigmaFox', avatar: '🦊', taunt: 'Streaks win seasons.' },
  { name: 'QuadKill', avatar: '💥', taunt: 'x² never scared me.' },
]

export function pickRival(seed = Date.now()) {
  return RIVALS[Math.abs(seed) % RIVALS.length]
}

export function comboLabel(streak) {
  if (streak >= 10) return 'AXIOM BREAK'
  if (streak >= 7) return 'UNSTOPPABLE'
  if (streak >= 5) return 'DOMINATING'
  if (streak >= 3) return 'COMBO x' + streak
  if (streak === 2) return 'DOUBLE HIT'
  return null
}

export function ratingDelta(won, scoreDiff, streak) {
  if (won) return 18 + Math.min(22, Math.floor(scoreDiff / 80)) + Math.min(10, streak)
  return -(12 + Math.min(16, Math.floor(Math.abs(scoreDiff) / 100)))
}
