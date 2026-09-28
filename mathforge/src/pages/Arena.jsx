import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TOPICS } from '../lib/curriculum/catalog'
import { createArenaMatch, startMatch, submitArenaAnswer, tickMatch, rivalScore } from '../lib/arena/match'
import { useAppState } from '../hooks/useAppState'
import ScratchPaper from '../components/ScratchPaper'

export default function Arena() {
  const { updateArena } = useAppState()
  const [topicId, setTopicId] = useState('multiplication')
  const [difficulty, setDifficulty] = useState(1)
  const [match, setMatch] = useState(null)
  const [answer, setAnswer] = useState('')
  const [flash, setFlash] = useState(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!match || match.status !== 'running') return undefined
    const id = setInterval(() => {
      setMatch((m) => (m ? { ...tickMatch(m) } : m))
      setTick((t) => t + 1)
    }, 200)
    return () => clearInterval(id)
  }, [match?.status, match?.id])

  useEffect(() => {
    if (match?.status === 'finished') {
      updateArena((arena) => {
        arena.highScore = Math.max(arena.highScore, match.score)
        arena.bestStreak = Math.max(arena.bestStreak, match.streak)
        if (match.score >= rivalScore(match) || match.correct >= match.rivalTarget) arena.wins++
      })
    }
  }, [match?.status])

  function begin() {
    let m = createArenaMatch({ topicId, difficulty, durationSec: 60 })
    m = startMatch(m)
    setMatch({ ...m })
    setAnswer('')
    setFlash(null)
  }

  function onSubmit(e) {
    e.preventDefault()
    if (!match || match.status !== 'running') return
    const { match: next, result } = submitArenaAnswer({ ...match }, answer)
    setMatch({ ...next })
    setAnswer('')
    setFlash(result?.ok ? 'hit' : 'miss')
    setTimeout(() => setFlash(null), 400)
  }

  const remaining = match?.status === 'running'
    ? Math.max(0, Math.ceil((match.endsAt - Date.now()) / 1000))
    : match?.durationSec || 60

  const youPct = match ? Math.min(100, (match.score / Math.max(match.rivalTarget * 100, 1)) * 100) : 0
  const rivalPct = match ? Math.min(100, (rivalScore(match) / Math.max(match.rivalTarget * 100, 1)) * 100) : 0

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em', marginTop: 0 }}>Arena</h1>
      <p className="muted">60-second rush vs a ghost rival. Fresh problems every time. No calculator.</p>

      {(!match || match.status === 'ready') && (
        <div className="panel" style={{ marginTop: 16, maxWidth: 520 }}>
          <label>
            Topic
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              style={{ display: 'block', width: '100%', margin: '6px 0 14px', padding: 12, borderRadius: 12, border: '2px solid var(--ink)' }}
            >
              {TOPICS.filter((t) => ['addition', 'subtraction', 'multiplication', 'division', 'fractions', 'integers', 'linear-equations', 'exponents', 'percentages'].includes(t.id)).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon} {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Difficulty
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              style={{ display: 'block', width: '100%', margin: '6px 0 14px', padding: 12, borderRadius: 12, border: '2px solid var(--ink)' }}
            >
              <option value={1}>Warmup</option>
              <option value={2}>Solid</option>
              <option value={3}>Spicy</option>
            </select>
          </label>
          <button type="button" className="btn btn-accent" onClick={begin}>
            Fight →
          </button>
        </div>
      )}

      {match && match.status !== 'ready' && (
        <>
          <div className="arena-hud">
            <div className="stat">
              <div className="label">Time</div>
              <div className="value">{remaining}s</div>
            </div>
            <div className="stat">
              <div className="label">Score</div>
              <div className="value">{match.score}</div>
            </div>
            <div className="stat">
              <div className="label">Streak</div>
              <div className="value">{match.streak}</div>
            </div>
            <div className="stat">
              <div className="label">Correct</div>
              <div className="value">{match.correct}</div>
            </div>
          </div>

          <div className="panel" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span>You</span>
              <span>{match.score}</span>
            </div>
            <div className="rival-bar you-bar">
              <span style={{ width: `${youPct}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 10 }}>
              <span>Ghost rival</span>
              <span>{rivalScore(match)}</span>
            </div>
            <div className="rival-bar">
              <span style={{ width: `${rivalPct}%` }} />
            </div>
          </div>

          {match.status === 'running' && match.current && (
            <div className="practice-layout">
              <motion.div
                className="panel"
                animate={flash === 'hit' ? { scale: [1, 1.02, 1] } : flash === 'miss' ? { x: [0, -6, 6, 0] } : {}}
                transition={{ duration: 0.35 }}
              >
                <div className="accuracy-seal">Live verified</div>
                <div className="prompt-box">{match.current.prompt}</div>
                <form onSubmit={onSubmit}>
                  <div className="answer-row">
                    <input
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      autoFocus
                      placeholder="Answer"
                      autoComplete="off"
                    />
                    <button type="submit" className="btn btn-primary">
                      Fire
                    </button>
                  </div>
                </form>
              </motion.div>
              <div className="panel">
                <ScratchPaper height={260} />
              </div>
            </div>
          )}

          {match.status === 'finished' && (
            <div className="panel">
              <h2 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>
                {match.score >= rivalScore(match) ? 'You beat the ghost.' : 'Ghost edged you — rematch?'}
              </h2>
              <p>
                Score {match.score} · {match.correct} correct · {match.wrong} misses
              </p>
              <button type="button" className="btn btn-accent" onClick={begin}>
                Rematch
              </button>
              <button type="button" className="btn btn-ghost" style={{ marginLeft: 8 }} onClick={() => setMatch(null)}>
                Change topic
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
