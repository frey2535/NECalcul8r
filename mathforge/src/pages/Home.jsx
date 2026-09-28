import { Link } from 'react-router-dom'
import { useAppState } from '../hooks/useAppState'
import { LEVELS } from '../lib/curriculum/catalog'
import { nextRank, pickRival, rankForRating } from '../lib/arena/ranks'

export default function Home() {
  const { activeChild, activeProgress, state } = useAppState()
  const rating = state.arena?.rating || 0
  const rank = rankForRating(rating)
  const nxt = nextRank(rating)
  const rival = pickRival((activeChild?.name || 'x').length * 31 + new Date().getDate())
  const wins = state.arena?.wins || 0
  const losses = state.arena?.losses || 0
  const wr = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0

  return (
    <div className="lobby">
      <section className="lobby-hero">
        <div className="lobby-kicker">
          <span className="live-dot" /> SEASON 1 · LIVE · NO CALCULATORS
        </div>
        <div className="lobby-title-row">
          <div>
            <h1>
              Axiom
              <br />
              <em>Arena</em>
            </h1>
            <p className="lead">
              Ranked math combat. Outpace rivals. Build combos. Climb from Rookie to Axiom Elite.
            </p>
          </div>
          <div className="player-card">
            <div className="player-card-avatar">{activeChild?.avatar || '🦊'}</div>
            <div>
              <div className="player-card-name">{activeChild?.name || 'Player'}</div>
              <div className="rank-pill lg" style={{ '--rank': rank.color }}>
                {rank.name}
              </div>
              <div className="player-card-rr">{rating} RR</div>
              {nxt && (
                <div className="rank-track">
                  <div className="rank-track-fill" style={{ width: `${Math.min(100, ((rating - rank.min) / Math.max(1, nxt.min - rank.min)) * 100)}%` }} />
                </div>
              )}
              <div className="muted" style={{ fontSize: '0.8rem', marginTop: 6 }}>
                {nxt ? `${nxt.min - rating} RR to ${nxt.name}` : 'Top of the ladder'}
              </div>
            </div>
          </div>
        </div>

        <div className="lobby-actions">
          <Link className="btn btn-fight" to="/arena">
            <span className="btn-fight-pulse" />
            FIND MATCH
          </Link>
          <Link className="btn btn-primary" to="/train">
            Daily Quests
          </Link>
          <Link className="btn btn-secondary" to="/progress">
            Career
          </Link>
        </div>

        <div className="stat-row lobby-stats">
          <div className="stat">
            <div className="label">Win rate</div>
            <div className="value">{wr}%</div>
          </div>
          <div className="stat">
            <div className="label">Record</div>
            <div className="value">
              {wins}-{losses}
            </div>
          </div>
          <div className="stat">
            <div className="label">Best combo</div>
            <div className="value">{state.arena?.bestStreak || 0}x</div>
          </div>
          <div className="stat">
            <div className="label">Login streak</div>
            <div className="value">{activeProgress?.streak ?? 0}d</div>
          </div>
        </div>
      </section>

      <section className="lobby-grid">
        <Link to="/arena" className="mode-tile mode-ranked">
          <div className="mode-tag">MAIN MODE</div>
          <h2>Ranked Duel</h2>
          <p>75s · HP race · named rivals · RR on the line</p>
          <span className="mode-cta">Queue up →</span>
        </Link>
        <Link to="/train" className="mode-tile mode-quests">
          <div className="mode-tag">WARMUP</div>
          <h2>Quest Board</h2>
          <p>Unlock weapons (topics). Learn tech. Then take it into Ranked.</p>
          <span className="mode-cta">Open quests →</span>
        </Link>
        <div className="mode-tile mode-rival">
          <div className="mode-tag">TODAY&apos;S RIVAL</div>
          <div className="rival-preview">
            <span className="rival-avatar">{rival.avatar}</span>
            <div>
              <h2>{rival.name}</h2>
              <p>“{rival.taunt}”</p>
            </div>
          </div>
          <Link className="mode-cta" to="/arena">
            Challenge →
          </Link>
        </div>
      </section>

      <section className="section">
        <h2>Weapon racks</h2>
        <p className="sub">Every quest line is a weapon class. Master it, then bring it into Ranked.</p>
        <div className="level-rail">
          {LEVELS.map((l) => (
            <Link key={l.id} to={`/train?level=${l.id}`} className="level-chip weapon-chip" style={{ borderColor: l.color }}>
              <span className="name">{l.name}</span>
              <span className="blurb">{l.blurb}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
