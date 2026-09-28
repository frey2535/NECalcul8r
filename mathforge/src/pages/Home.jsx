import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAppState } from '../hooks/useAppState'
import { LEVELS } from '../lib/curriculum/catalog'

export default function Home() {
  const { activeChild, activeProgress } = useAppState()

  return (
    <>
      <section className="hero">
        <motion.div
          className="hero-kicker"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <span className="live-dot" /> No calculator · Real scratch paper · Parent watch
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
        >
          <span>Axiom</span> Arena
        </motion.h1>
        <motion.p
          className="lead"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          Math training that feels like a game — elementary through calculus. International
          shortcuts explained. Every answer Accuracy-Agent verified.
        </motion.p>
        <motion.div
          className="cta-row"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.28 }}
        >
          <Link className="btn btn-primary" to="/train">
            Start training →
          </Link>
          <Link className="btn btn-accent" to="/arena">
            Enter the Arena
          </Link>
          <Link className="btn btn-secondary" to="/parent">
            Parent HQ
          </Link>
        </motion.div>
        <div className="stat-row" style={{ marginTop: 28, maxWidth: 520 }}>
          <div className="stat">
            <div className="label">{activeChild?.name || 'You'}</div>
            <div className="value">Lv {activeProgress?.level ?? 1}</div>
          </div>
          <div className="stat">
            <div className="label">XP</div>
            <div className="value">{activeProgress?.xp ?? 0}</div>
          </div>
          <div className="stat">
            <div className="label">Streak</div>
            <div className="value">{activeProgress?.streak ?? 0}d</div>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Pick your battlefield</h2>
        <p className="sub">From number bonds to integrals. Lessons open with worked examples — then you grind.</p>
        <div className="level-rail">
          {LEVELS.map((l) => (
            <Link key={l.id} to={`/train?level=${l.id}`} className="level-chip" style={{ borderColor: l.color }}>
              <span className="name">{l.name}</span>
              <span className="blurb">{l.blurb}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Built different</h2>
        <p className="sub">Not another worksheet app. Competitive, visual, and honest about how math works worldwide.</p>
        <div className="topic-grid">
          <div className="panel">
            <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Scratch paper</h3>
            <p className="muted">Long multiplication & division on a real writing surface. Calculators are banned.</p>
          </div>
          <div className="panel">
            <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Global methods</h3>
            <p className="muted">Lattice, Vedic, Japanese lines, Singapore bars, Egyptian doubling — with why they work.</p>
          </div>
          <div className="panel">
            <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Parent watch</h3>
            <p className="muted">Live session feed + proficiency map so you know where to coach.</p>
          </div>
          <div className="panel">
            <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Accuracy Agent</h3>
            <p className="muted">Every generated problem is step-checked before it reaches your kid.</p>
          </div>
        </div>
      </section>
    </>
  )
}
