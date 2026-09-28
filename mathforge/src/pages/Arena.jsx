import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TOPICS } from '../lib/curriculum/catalog'
import {
  createArenaMatch,
  enterVs,
  startCountdown,
  tickCountdown,
  submitArenaAnswer,
  tickMatch,
  rivalScore,
} from '../lib/arena/match'
import { comboLabel, rankForRating } from '../lib/arena/ranks'
import { useAppState } from '../hooks/useAppState'
import ScratchPaper from '../components/ScratchPaper'

const ARENA_TOPICS = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'fractions',
  'integers',
  'linear-equations',
  'exponents',
  'percentages',
]

export default function Arena() {
  const { activeChild, state, applyMatch } = useAppState()
  const [topicId, setTopicId] = useState('multiplication')
  const [difficulty, setDifficulty] = useState(2)
  const [match, setMatch] = useState(null)
  const [answer, setAnswer] = useState('')
  const [flash, setFlash] = useState(null)
  const [comboText, setComboText] = useState(null)
  const [, setTick] = useState(0)
  const appliedRef = useRef(null)
  const rating = state.arena?.rating || 0
  const rank = rankForRating(rating)

  useEffect(() => {
    if (!match) return undefined
    if (match.status === 'countdown') {
      const id = setInterval(() => {
        setMatch((m) => (m ? { ...tickCountdown({ ...m }) } : m))
      }, 700)
      return () => clearInterval(id)
    }
    if (match.status === 'running') {
      const id = setInterval(() => {
        setMatch((m) => (m ? { ...tickMatch({ ...m }) } : m))
        setTick((t) => t + 1)
      }, 200)
      return () => clearInterval(id)
    }
    return undefined
  }, [match?.status, match?.id])

  useEffect(() => {
    if (match?.status === 'finished' && appliedRef.current !== match.id) {
      appliedRef.current = match.id
      applyMatch(match)
    }
  }, [match?.status, match?.id])

  function queueUp() {
    const m = createArenaMatch({
      topicId,
      difficulty,
      durationSec: 75,
      playerName: activeChild?.name || 'You',
      playerAvatar: activeChild?.avatar || '🦊',
    })
    setMatch({ ...enterVs(m) })
    setAnswer('')
    setFlash(null)
    setComboText(null)
  }

  function goFight() {
    setMatch((m) => (m ? { ...startCountdown({ ...m }) } : m))
  }

  function onSubmit(e) {
    e.preventDefault()
    if (!match || match.status !== 'running') return
    const { match: next, result } = submitArenaAnswer({ ...match }, answer)
    setMatch({ ...next })
    setAnswer('')
    setFlash(result?.ok ? 'hit' : 'miss')
    if (result?.ok) {
      const label = comboLabel(next.streak)
      if (label) {
        setComboText(label)
        setTimeout(() => setComboText(null), 900)
      }
    }
    setTimeout(() => setFlash(null), 350)
  }

  const remaining =
    match?.status === 'running' ? Math.max(0, Math.ceil((match.endsAt - Date.now()) / 1000)) : match?.durationSec || 75

  const topic = TOPICS.find((t) => t.id === topicId)

  return (
    <div className={`arena-screen ${match?.status === 'running' ? 'in-fight' : ''}`}>
      {(!match || match.status === 'lobby') && (
        <div className="ranked-lobby">
          <div className="ranked-head">
            <div>
              <div className="lobby-kicker">
                <span className="live-dot" /> RANKED QUEUE
              </div>
              <h1>
                Find a <em>rival</em>
              </h1>
              <p className="lead">HP race. Combos multiply damage. Misses hurt. RR moves every match.</p>
            </div>
            <div className="player-card compact">
              <div className="player-card-avatar">{activeChild?.avatar}</div>
              <div>
                <div className="player-card-name">{activeChild?.name}</div>
                <div className="rank-pill" style={{ '--rank': rank.color }}>
                  {rank.name} · {rating} RR
                </div>
                <div className="muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
                  {state.arena?.wins || 0}W · {state.arena?.losses || 0}L
                </div>
              </div>
            </div>
          </div>

          <div className="loadout-panel">
            <h3>Loadout</h3>
            <label>
              Weapon class
              <select value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                {TOPICS.filter((t) => ARENA_TOPICS.includes(t.id)).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.icon} {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Intensity
              <select value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))}>
                <option value={1}>Rookie lane</option>
                <option value={2}>Competitive</option>
                <option value={3}>Tryhard</option>
              </select>
            </label>
            <button type="button" className="btn btn-fight" onClick={queueUp}>
              <span className="btn-fight-pulse" />
              FIND MATCH
            </button>
            <p className="muted" style={{ marginBottom: 0 }}>
              Rules: no calculator · scratch paper allowed · Accuracy Agent sealed problems
            </p>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {match?.status === 'vs' && (
          <motion.div
            key="vs"
            className="vs-screen"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="vs-fighter">
              <div className="vs-avatar">{match.playerAvatar}</div>
              <div className="vs-name">{match.playerName}</div>
              <div className="rank-pill" style={{ '--rank': rank.color }}>
                {rank.name}
              </div>
            </div>
            <div className="vs-center">
              <div className="vs-badge">VS</div>
              <div className="vs-meta">
                {topic?.icon} {topic?.name} · {difficulty === 3 ? 'Tryhard' : difficulty === 2 ? 'Competitive' : 'Rookie'}
              </div>
              <p className="vs-taunt">“{match.rival.taunt}”</p>
              <button type="button" className="btn btn-fight" onClick={goFight}>
                FIGHT
              </button>
            </div>
            <div className="vs-fighter rival">
              <div className="vs-avatar">{match.rival.avatar}</div>
              <div className="vs-name">{match.rival.name}</div>
              <div className="rank-pill" style={{ '--rank': '#e76f51' }}>
                Rival
              </div>
            </div>
          </motion.div>
        )}

        {match?.status === 'countdown' && (
          <motion.div
            key="cd"
            className="countdown-screen"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="countdown-num">{match.countdown > 0 ? match.countdown : 'GO'}</div>
            <p>Lock in.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {match?.status === 'running' && (
        <>
          <div className="fight-hud">
            <div className="hp-block">
              <div className="hp-head">
                <span>
                  {match.playerAvatar} {match.playerName}
                </span>
                <strong>{match.playerHp}</strong>
              </div>
              <div className="hp-bar you">
                <span style={{ width: `${match.playerHp}%` }} />
              </div>
            </div>
            <div className="fight-clock">
              <div className="label">TIME</div>
              <div className={`value ${remaining <= 10 ? 'urgent' : ''}`}>{remaining}</div>
              <div className="combo-mini">{match.streak > 0 ? `${match.streak}x COMBO` : '—'}</div>
            </div>
            <div className="hp-block">
              <div className="hp-head">
                <span>
                  {match.rival.avatar} {match.rival.name}
                </span>
                <strong>{match.rivalHp}</strong>
              </div>
              <div className="hp-bar rival">
                <span style={{ width: `${match.rivalHp}%` }} />
              </div>
            </div>
          </div>

          <div className="score-strip">
            <span>YOU {match.score}</span>
            <span className="muted">ghost pace {rivalScore(match)}</span>
            <span>
              HITS {match.correct} · MISS {match.wrong}
            </span>
          </div>

          {match.current && (
            <div className="practice-layout fight-layout">
              <motion.div
                className={`panel fight-panel ${flash || ''}`}
                animate={flash === 'hit' ? { scale: [1, 1.03, 1] } : flash === 'miss' ? { x: [0, -8, 8, -4, 0] } : {}}
                transition={{ duration: 0.3 }}
              >
                <div className="accuracy-seal">Sealed problem</div>
                <div className="prompt-box">{match.current.prompt}</div>
                <form onSubmit={onSubmit}>
                  <div className="answer-row">
                    <input
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      autoFocus
                      placeholder="Strike"
                      autoComplete="off"
                    />
                    <button type="submit" className="btn btn-accent">
                      HIT
                    </button>
                  </div>
                </form>
              </motion.div>
              <div className="panel">
                <ScratchPaper height={240} />
              </div>
            </div>
          )}

          <AnimatePresence>
            {comboText && (
              <motion.div
                className="combo-banner"
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30 }}
              >
                {comboText}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {match?.status === 'finished' && (
        <motion.div className={`result-screen ${match.result}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="result-kicker">{match.result === 'win' ? 'VICTORY' : match.result === 'loss' ? 'DEFEAT' : 'DRAW'}</div>
          <h2>
            {match.result === 'win' ? 'You dropped them.' : match.result === 'loss' ? 'They edged you.' : 'Even fight.'}
          </h2>
          <div className="result-rr">
            {match.ratingChange >= 0 ? '+' : ''}
            {match.ratingChange} RR
          </div>
          <div className="stat-row" style={{ margin: '18px 0' }}>
            <div className="stat">
              <div className="label">Score</div>
              <div className="value">{match.score}</div>
            </div>
            <div className="stat">
              <div className="label">Max combo</div>
              <div className="value">{match.maxStreak}x</div>
            </div>
            <div className="stat">
              <div className="label">HP left</div>
              <div className="value">{match.playerHp}</div>
            </div>
            <div className="stat">
              <div className="label">Rival HP</div>
              <div className="value">{match.rivalHp}</div>
            </div>
          </div>
          <div className="cta-row">
            <button type="button" className="btn btn-fight" onClick={queueUp}>
              Rematch
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setMatch(null)}>
              Change loadout
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
