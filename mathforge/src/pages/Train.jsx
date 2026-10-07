import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LEVELS, TOPICS, topicsForLevel } from '../lib/curriculum/catalog'
import { useAppState } from '../hooks/useAppState'

const STATUS_LABEL = {
  unseen: 'locked tech',
  learning: 'grinding',
  'needs-work': 'weak point',
  proficient: 'mastered',
}

export default function Train() {
  const [params, setParams] = useSearchParams()
  const level = params.get('level') || 'elementary'
  const navigate = useNavigate()
  const { proficiency } = useAppState()
  const report = proficiency()
  const list = useMemo(() => topicsForLevel(level), [level])

  function statusFor(topicId) {
    return report.topics[topicId]?.status || 'unseen'
  }

  return (
    <div>
      <div className="no-calc-banner">NO CALC · Quest board · Take tech into Ranked</div>
      <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em', marginTop: 0 }}>
        Quest <em style={{ color: 'var(--lime-dim)', fontStyle: 'normal' }}>Board</em>
      </h1>
      <p className="muted">
        Clear the tutorial, then grind missions. Mastered weapons deal more damage in Ranked.
      </p>

      <div className="level-rail" style={{ margin: '20px 0' }}>
        {LEVELS.map((l) => (
          <button
            key={l.id}
            type="button"
            className={`level-chip weapon-chip ${level === l.id ? 'active' : ''}`}
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
            <button key={t.id} type="button" className="topic-tile quest-tile" onClick={() => navigate(`/lesson/${t.id}`)}>
              <div className="icon">{t.icon}</div>
              <h3>{t.name}</h3>
              <p>{t.scratch ? 'Scratch paper loadout' : 'Speed + accuracy grind'}</p>
              <span className={`status-pill ${st}`}>{STATUS_LABEL[st] || st}</span>
            </button>
          )
        })}
      </div>

      <p style={{ marginTop: 24 }}>
        <Link className="btn btn-fight" to="/arena" style={{ display: 'inline-flex' }}>
          Jump to Ranked →
        </Link>
      </p>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        {TOPICS.length} weapon classes · {LEVELS.length} racks
      </p>
    </div>
  )
}
