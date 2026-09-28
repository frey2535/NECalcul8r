import { Link } from 'react-router-dom'
import { getTopic } from '../lib/curriculum/catalog'
import { useAppState } from '../hooks/useAppState'

export default function ProgressPage() {
  const { activeChild, activeProgress, proficiency, state } = useAppState()
  const report = proficiency()

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em', marginTop: 0 }}>
        {activeChild?.avatar} {activeChild?.name}'s stats
      </h1>
      <div className="stat-row" style={{ margin: '16px 0' }}>
        <div className="stat">
          <div className="label">Level</div>
          <div className="value">{activeProgress?.level ?? 1}</div>
        </div>
        <div className="stat">
          <div className="label">XP</div>
          <div className="value">{activeProgress?.xp ?? 0}</div>
        </div>
        <div className="stat">
          <div className="label">Streak</div>
          <div className="value">{activeProgress?.streak ?? 0}d</div>
        </div>
        <div className="stat">
          <div className="label">Best streak</div>
          <div className="value">{activeProgress?.bestStreak ?? 0}</div>
        </div>
      </div>

      {(activeProgress?.badges || []).length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>Badges</h2>
          <div className="badge-list">
            {activeProgress.badges.map((b) => (
              <span key={b} className="badge">
                {b}
              </span>
            ))}
          </div>
        </div>
      )}

      <section className="section">
        <h2>Needs more study</h2>
        <p className="sub">Accuracy under 60% with at least 3 attempts — coach here first.</p>
        <div className="topic-grid">
          {report.needsWork.length === 0 && <p className="muted">Nothing flagged yet. Keep practicing.</p>}
          {report.needsWork.map((t) => {
            const topic = getTopic(t.id)
            return (
              <Link key={t.id} to={`/lesson/${t.id}`} className="topic-tile" style={{ display: 'block' }}>
                <div className="icon">{topic?.icon}</div>
                <h3>{topic?.name || t.id}</h3>
                <p>{Math.round(t.accuracy * 100)}% · {t.attempted} attempts</p>
                <span className="status-pill needs-work">needs work</span>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="section">
        <h2>Proficient</h2>
        <p className="sub">≥85% accuracy with 5+ attempts. Flex these in Arena.</p>
        <div className="topic-grid">
          {report.proficient.length === 0 && <p className="muted">Earn proficiency by nailing problems consistently.</p>}
          {report.proficient.map((t) => {
            const topic = getTopic(t.id)
            return (
              <Link key={t.id} to={`/practice/${t.id}`} className="topic-tile" style={{ display: 'block' }}>
                <div className="icon">{topic?.icon}</div>
                <h3>{topic?.name || t.id}</h3>
                <p>{Math.round(t.accuracy * 100)}% · {t.attempted} attempts</p>
                <span className="status-pill proficient">proficient</span>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="section">
        <h2>Still learning</h2>
        <div className="topic-grid">
          {report.learning.map((t) => {
            const topic = getTopic(t.id)
            return (
              <Link key={t.id} to={`/practice/${t.id}`} className="topic-tile" style={{ display: 'block' }}>
                <div className="icon">{topic?.icon}</div>
                <h3>{topic?.name || t.id}</h3>
                <p>{Math.round(t.accuracy * 100)}% · {t.attempted} attempts</p>
                <span className="status-pill learning">learning</span>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="section">
        <h2>Recent attempts</h2>
        <div className="steps">
          {(activeProgress?.history || []).slice(0, 15).map((h, i) => (
            <div key={i} className="step">
              <h4>
                {h.correct ? '✓' : '✗'} {getTopic(h.topicId)?.name || h.topicId} · +{h.xpGain} XP
              </h4>
              <p>{h.prompt}</p>
            </div>
          ))}
          {(activeProgress?.history || []).length === 0 && <p className="muted">No attempts yet.</p>}
        </div>
      </section>

      <p className="muted" style={{ fontSize: '0.85rem' }}>
        Arena high score (family): {state.arena?.highScore ?? 0} · Wins: {state.arena?.wins ?? 0}
      </p>
    </div>
  )
}
