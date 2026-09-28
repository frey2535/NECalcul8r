import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LEVELS, TOPICS, topicsForLevel } from '../lib/curriculum/catalog'
import { useAppState } from '../hooks/useAppState'

export default function Train() {
  const [params, setParams] = useSearchParams()
  const level = params.get('level') || 'elementary'
  const navigate = useNavigate()
  const { proficiency } = useAppState()
  const report = proficiency()

  const list = useMemo(() => topicsForLevel(level), [level])

  function statusFor(topicId) {
    const t = report.topics[topicId]
    return t?.status || 'unseen'
  }

  return (
    <div>
      <div className="no-calc-banner">🚫 Calculator-free zone · Work it out</div>
      <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em', marginTop: 0 }}>Train</h1>
      <p className="muted">Each lesson starts with a detailed worked example. Then the engine generates fresh problems forever.</p>

      <div className="level-rail" style={{ margin: '20px 0' }}>
        {LEVELS.map((l) => (
          <button
            key={l.id}
            type="button"
            className={`level-chip ${level === l.id ? 'active' : ''}`}
            onClick={() => setParams({ level: l.id })}
          >
            <span className="name">{l.name}</span>
            <span className="blurb">{l.blurb}</span>
          </button>
        ))}
      </div>

      <div className="topic-grid">
        {list.map((t) => {
          const st = statusFor(t.id)
          return (
            <button
              key={t.id}
              type="button"
              className="topic-tile"
              onClick={() => navigate(`/lesson/${t.id}`)}
            >
              <div className="icon">{t.icon}</div>
              <h3>{t.name}</h3>
              <p>{t.scratch ? 'Scratch paper recommended' : 'Guided practice'}</p>
              <span className={`status-pill ${st}`}>{st.replace('-', ' ')}</span>
            </button>
          )
        })}
      </div>

      {list.length === 0 && (
        <p>No topics in this band yet.</p>
      )}

      <p style={{ marginTop: 24 }}>
        <Link to="/progress">See where you need to study →</Link>
      </p>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        {TOPICS.length} topics loaded across {LEVELS.length} levels.
      </p>
    </div>
  )
}
