import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  addChild,
  ensureFamily,
  loadState,
  recordAttempt,
  saveState,
  setLiveSession,
  getProficiencyReport,
  applyMatchResult,
} from '../lib/progress/store'

const AppStateContext = createContext(null)

export function AppStateProvider({ children }) {
  const [state, setState] = useState(() => {
    const s = ensureFamily(loadState())
    if (s.children.length === 0) {
      addChild(s, 'Player 1', '🦊')
    }
    saveState(s)
    return s
  })

  useEffect(() => {
    saveState(state)
  }, [state])

  const activeChild = useMemo(
    () => state.children.find((c) => c.id === state.activeChildId) || state.children[0],
    [state],
  )

  const activeProgress = state.progress[activeChild?.id] || null

  const update = useCallback((fn) => {
    setState((prev) => {
      const next = structuredClone(prev)
      fn(next)
      return next
    })
  }, [])

  const api = useMemo(
    () => ({
      state,
      activeChild,
      activeProgress,
      setActiveChild(id) {
        update((s) => {
          s.activeChildId = id
        })
      },
      addChild(name, avatar) {
        let id
        update((s) => {
          id = addChild(s, name, avatar)
        })
        return id
      },
      recordAttempt(payload) {
        let result
        update((s) => {
          result = recordAttempt(s, s.activeChildId, payload)
        })
        return result
      },
      setLive(live) {
        update((s) => setLiveSession(s, s.activeChildId, live))
      },
      clearLive() {
        update((s) => setLiveSession(s, s.activeChildId, null))
      },
      proficiency(childId) {
        return getProficiencyReport(state, childId || state.activeChildId)
      },
      updateArena(fn) {
        update((s) => {
          if (!s.arena) s.arena = { highScore: 0, wins: 0, losses: 0, bestStreak: 0, rating: 0, matchHistory: [] }
          fn(s.arena)
        })
      },
      applyMatch(match) {
        update((s) => applyMatchResult(s, match))
      },
    }),
    [state, activeChild, activeProgress, update],
  )

  return <AppStateContext.Provider value={api}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState outside provider')
  return ctx
}
