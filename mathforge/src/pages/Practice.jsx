import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ScratchPaper from '../components/ScratchPaper'
import { getTopic } from '../lib/curriculum/catalog'
import { generateVerifiedProblem, checkAnswer } from '../lib/accuracyAgent/agent.mjs'
import { useAppState } from '../hooks/useAppState'

export default function Practice() {
  const { topicId } = useParams()
  const topic = getTopic(topicId)
  const { recordAttempt, setLive, clearLive, activeChild } = useAppState()
  const [difficulty, setDifficulty] = useState(topic?.difficultyDefault || 1)
  const [problem, setProblem] = useState(null)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [showSteps, setShowSteps] = useState(false)
  const [xpToast, setXpToast] = useState(null)
  const [error, setError] = useState(null)
  const startedAt = useRef(Date.now())
  const seen = useRef(new Set())

  const nextProblem = useCallback(() => {
    if (!topic) return
    try {
      setError(null)
      let p
      for (let i = 0; i < 12; i++) {
        p = generateVerifiedProblem(topic.id, difficulty)
        const key = `${p.prompt}::${p.answer}`
        if (!seen.current.has(key)) {
          seen.current.add(key)
          break
        }
      }
      setProblem(p)
      setAnswer('')
      setFeedback(null)
      setShowSteps(false)
      startedAt.current = Date.now()
      setLive({
        topicId: topic.id,
        topicName: topic.name,
        prompt: p.prompt,
        difficulty,
        childName: activeChild?.name,
        status: 'solving',
      })
    } catch (e) {
      setError(String(e.message || e))
    }
  }, [topic, difficulty, setLive, activeChild])

  useEffect(() => {
    nextProblem()
    return () => clearLive()
  }, [nextProblem, clearLive])

  if (!topic) {
    return (
      <div>
        <p>Unknown topic.</p>
        <Link to="/train">Back</Link>
      </div>
    )
  }

  function submit(e) {
    e?.preventDefault()
    if (!problem || feedback) return
    const result = checkAnswer(problem, answer)
    const timeMs = Date.now() - startedAt.current
    const { xpGain } = recordAttempt({
      topicId: topic.id,
      correct: result.ok,
      timeMs,
      problemId: problem.id,
      prompt: problem.prompt,
    })
    setFeedback(result)
    setXpToast(result.ok ? `HIT · +${xpGain} XP` : `MISS · +${xpGain} XP`)
    setTimeout(() => setXpToast(null), 1400)
    setLive({
      topicId: topic.id,
      topicName: topic.name,
      prompt: problem.prompt,
      difficulty,
      childName: activeChild?.name,
      status: result.ok ? 'correct' : 'incorrect',
      userAnswer: answer,
      expected: problem.answer,
    })
    if (!result.ok) setShowSteps(true)
  }

  return (
    <div>
      <div className="no-calc-banner">NO CALC · Mission grind · Sealed by Accuracy Agent</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <p className="muted" style={{ margin: 0 }}>
            <Link to={`/lesson/${topic.id}`}>Briefing</Link> / Mission
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', margin: '4px 0 0', letterSpacing: '-0.03em' }}>
            {topic.icon} {topic.name}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label className="muted" htmlFor="diff">
            Intensity
          </label>
          <select
            id="diff"
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            style={{ padding: '8px 12px', borderRadius: 10, border: '2px solid var(--ink)', background: 'var(--paper)' }}
          >
            <option value={1}>1 · Rookie</option>
            <option value={2}>2 · Competitive</option>
            <option value={3}>3 · Tryhard</option>
          </select>
        </div>
      </div>

      {error && <div className="feedback bad">{error}</div>}

      <div className="practice-layout" style={{ marginTop: 16 }}>
        <div className="panel">
          {problem && (
            <>
              <div className="accuracy-seal">Sealed target</div>
              <div className="prompt-box">{problem.prompt}</div>
              <div className="methods-row">
                {(problem.methods || []).map((m) => (
                  <span key={m} className="method-tag">
                    {m}
                  </span>
                ))}
              </div>
              <form onSubmit={submit}>
                <div className="answer-row">
                  <input
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Strike"
                    autoFocus
                    autoComplete="off"
                    inputMode="decimal"
                  />
                  <button type="submit" className="btn btn-accent" disabled={!!feedback}>
                    HIT
                  </button>
                </div>
              </form>
              <AnimatePresence>
                {feedback && (
                  <motion.div
                    className={`feedback ${feedback.ok ? 'ok' : 'bad'}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {feedback.ok
                      ? 'HIT — clean.'
                      : `MISS. Answer was ${feedback.expected}. Replay the tech, then requeue.`}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="cta-row" style={{ marginTop: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowSteps((s) => !s)}>
                  {showSteps ? 'Hide tech' : 'Show tech / steps'}
                </button>
                <button type="button" className="btn btn-primary" onClick={nextProblem}>
                  Next target
                </button>
              </div>
              {showSteps && problem.steps && (
                <div className="steps" style={{ marginTop: 16 }}>
                  {problem.steps.map((s, i) => (
                    <div key={i} className="step">
                      <h4>
                        {i + 1}. {s.title}
                      </h4>
                      <p>{s.detail}</p>
                      {s.why && <p className="why">Why: {s.why}</p>}
                    </div>
                  ))}
                </div>
              )}
              {problem.hints && !feedback?.ok && (
                <details style={{ marginTop: 14 }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Hints</summary>
                  <ul>
                    {problem.hints.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>
        <div className="panel">
          <ScratchPaper />
        </div>
      </div>

      {xpToast && <div className="toast-xp">{xpToast}</div>}
    </div>
  )
}
