import { nanoid } from 'nanoid'

const STORAGE_KEY = 'axiom_arena_v1'
const WATCH_PREFIX = 'axiom_watch_'

const defaultState = () => ({
  version: 1,
  familyCode: null,
  parentPin: null,
  activeChildId: null,
  children: [],
  // childId -> progress
  progress: {},
  // live sessions for parent watch
  live: {},
  arena: {
    highScore: 0,
    wins: 0,
    bestStreak: 0,
  },
})

function emptyChildProgress() {
  return {
    xp: 0,
    level: 1,
    streak: 0,
    bestStreak: 0,
    lastPracticeDate: null,
    // topicId -> { attempted, correct, incorrect, avgTimeMs, recent: bool[] }
    topics: {},
    history: [], // recent attempts
    badges: [],
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    return { ...defaultState(), ...JSON.parse(raw) }
  } catch {
    return defaultState()
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  // Mirror live snapshot for parent remote watch by family code
  if (state.familyCode) {
    const watchPayload = {
      familyCode: state.familyCode,
      updatedAt: Date.now(),
      children: state.children.map((c) => ({
        id: c.id,
        name: c.name,
        avatar: c.avatar,
        xp: state.progress[c.id]?.xp ?? 0,
        streak: state.progress[c.id]?.streak ?? 0,
        topics: summarizeTopics(state.progress[c.id]),
        live: state.live[c.id] || null,
        recentHistory: (state.progress[c.id]?.history || []).slice(0, 12),
      })),
    }
    localStorage.setItem(WATCH_PREFIX + state.familyCode, JSON.stringify(watchPayload))
    // Broadcast to other tabs
    try {
      const bc = new BroadcastChannel('axiom_arena_watch')
      bc.postMessage(watchPayload)
      bc.close()
    } catch {
      /* ignore */
    }
  }
}

function summarizeTopics(prog) {
  if (!prog?.topics) return {}
  const out = {}
  for (const [id, t] of Object.entries(prog.topics)) {
    const attempted = t.attempted || 0
    const correct = t.correct || 0
    const accuracy = attempted ? correct / attempted : 0
    let status = 'unseen'
    if (attempted >= 5 && accuracy >= 0.85) status = 'proficient'
    else if (attempted >= 3 && accuracy < 0.6) status = 'needs-work'
    else if (attempted > 0) status = 'learning'
    out[id] = { attempted, correct, accuracy, status, avgTimeMs: t.avgTimeMs || 0 }
  }
  return out
}

export function ensureFamily(state) {
  if (!state.familyCode) {
    state.familyCode = nanoid(8).toUpperCase()
    state.parentPin = String(1000 + Math.floor(Math.random() * 9000))
  }
  return state
}

export function addChild(state, name, avatar = '🦊') {
  const id = nanoid(10)
  state.children.push({ id, name, avatar, createdAt: Date.now() })
  state.progress[id] = emptyChildProgress()
  if (!state.activeChildId) state.activeChildId = id
  return id
}

export function recordAttempt(state, childId, { topicId, correct, timeMs, problemId, prompt }) {
  const prog = state.progress[childId] || emptyChildProgress()
  state.progress[childId] = prog
  if (!prog.topics[topicId]) {
    prog.topics[topicId] = { attempted: 0, correct: 0, incorrect: 0, avgTimeMs: 0, recent: [] }
  }
  const t = prog.topics[topicId]
  t.attempted++
  if (correct) t.correct++
  else t.incorrect++
  t.avgTimeMs = Math.round((t.avgTimeMs * (t.attempted - 1) + timeMs) / t.attempted)
  t.recent = [...(t.recent || []).slice(-19), correct]

  const xpGain = correct ? 15 + Math.min(20, Math.floor(5000 / Math.max(timeMs, 800))) : 2
  prog.xp += xpGain
  prog.level = 1 + Math.floor(prog.xp / 100)

  const today = new Date().toISOString().slice(0, 10)
  if (prog.lastPracticeDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    if (prog.lastPracticeDate === yesterday) prog.streak++
    else prog.streak = 1
    prog.lastPracticeDate = today
  }
  prog.bestStreak = Math.max(prog.bestStreak, prog.streak)

  prog.history.unshift({
    at: Date.now(),
    topicId,
    correct,
    timeMs,
    problemId,
    prompt,
    xpGain,
  })
  prog.history = prog.history.slice(0, 100)

  // badges
  if (prog.streak >= 7 && !prog.badges.includes('week-warrior')) prog.badges.push('week-warrior')
  if (prog.xp >= 500 && !prog.badges.includes('xp-500')) prog.badges.push('xp-500')
  if (t.correct >= 20 && !prog.badges.includes(`master-${topicId}`)) prog.badges.push(`master-${topicId}`)

  return { xpGain, prog }
}

export function setLiveSession(state, childId, live) {
  if (live) state.live[childId] = { ...live, updatedAt: Date.now() }
  else delete state.live[childId]
}

export function loadWatchSnapshot(familyCode) {
  try {
    const raw = localStorage.getItem(WATCH_PREFIX + String(familyCode).toUpperCase())
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function getProficiencyReport(state, childId) {
  const topics = summarizeTopics(state.progress[childId])
  const proficient = []
  const needsWork = []
  const learning = []
  for (const [id, t] of Object.entries(topics)) {
    if (t.status === 'proficient') proficient.push({ id, ...t })
    else if (t.status === 'needs-work') needsWork.push({ id, ...t })
    else if (t.status === 'learning') learning.push({ id, ...t })
  }
  return { proficient, needsWork, learning, topics }
}

export { summarizeTopics, emptyChildProgress }
