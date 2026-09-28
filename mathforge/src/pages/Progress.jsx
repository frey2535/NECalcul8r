import { Link } from 'react-router-dom'
import { getTopic } from '../lib/curriculum/catalog'
import { useAppState } from '../hooks/useAppState'
import { rankForRating } from '../lib/arena/ranks'

export default function ProgressPage() {
  const { activeChild, activeProgress, proficiency, state } = useAppState()
  const report = proficiency()
  const rank = rankForRating(state.arena?.rating || 0)

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em', marginTop: 0 }}>
        {activeChild?.avatar} Career
      </h1>
      <p className="muted">Ladder, weapons, and weak points — scouting report for your next match.</p>
      <div className="stat-row" style={{ margin: '16px 0' }}>
        <div className="stat">
          <div className="label">Rank</div>
          <div className="value" style={{ color: rank.color, fontSize: '1.25rem' }}>
            {rank.name}
          </div>
        </div>
        <div className="stat">
          <div className="label">RR</div>
          <div className="value">{state.arena?.rating || 0}</div>
        </div>
        <div className="stat">
          <div className="label">Record</div>
          <div className="value">
            {state.arena?.wins || 0}-{state.arena?.losses || 0}
          </div>
        </div>
        <div className="stat">
          <div className="label">Best combo</div>
          <div className="value">{state.arena?.bestStreak || 0}x</div>
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
        <h2>Weak points</h2>
        <p className="sub">Under 60% — rivals will punish these. Grind the quest, then requeue.</p>
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
        <h2>Mastered weapons</h2>
        <p className="sub">≥85% with 5+ hits. Bring these into Ranked.</p>
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

      {(state.arena?.matchHistory || []).length > 0 && (
        <section className="section">
          <h2>Match history</h2>
          <div className="steps">
            {state.arena.matchHistory.slice(0, 8).map((m, i) => (
              <div key={i} className="step">
                <h4>
                  {m.result === 'win' ? 'W' : m.result === 'loss' ? 'L' : 'D'} vs {m.rival} ·{' '}
                  {m.ratingChange >= 0 ? '+' : ''}
                  {m.ratingChange} RR
                </h4>
                <p>
                  {getTopic(m.topicId)?.name} · score {m.score}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="muted" style={{ fontSize: '0.85rem' }}>
        High score {state.arena?.highScore ?? 0} · Level {activeProgress?.level ?? 1} · {activeProgress?.xp ?? 0} XP
      </p>
      <p style={{ marginTop: 12 }}>
        <Link className="btn btn-fight" to="/arena" style={{ display: 'inline-flex' }}>
          Queue Ranked
        </Link>
      </p>
    </div>
  )
}
