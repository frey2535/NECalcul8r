import { NavLink, Outlet } from 'react-router-dom'
import { useAppState } from '../hooks/useAppState'
import { rankForRating } from '../lib/arena/ranks'

const links = [
  { to: '/', label: 'Lobby', end: true },
  { to: '/arena', label: 'Ranked' },
  { to: '/train', label: 'Quests' },
  { to: '/progress', label: 'Career' },
  { to: '/parent', label: 'Coach' },
]

export default function Layout() {
  const { state, activeChild, activeProgress, setActiveChild } = useAppState()
  const rank = rankForRating(state.arena?.rating || 0)

  return (
    <div className="app-shell game-shell">
      <header className="topbar game-topbar">
        <NavLink to="/" className="brand">
          <span className="brand-mark">A</span>
          <span className="brand-text">
            Axiom <em>Arena</em>
          </span>
        </NavLink>
        <nav className="nav-links">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="player-chip">
          <div className="profile-switch">
            {state.children.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`avatar-btn ${c.id === activeChild?.id ? 'active' : ''}`}
                title={c.name}
                onClick={() => setActiveChild(c.id)}
              >
                {c.avatar}
              </button>
            ))}
          </div>
          <div className="player-chip-meta">
            <strong>{activeChild?.name}</strong>
            <span className="rank-pill" style={{ '--rank': rank.color }}>
              {rank.name} · {state.arena?.rating || 0} RR
            </span>
            <span className="chip-sub">
              Lv {activeProgress?.level ?? 1} · {activeProgress?.xp ?? 0} XP
            </span>
          </div>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <nav className="mobile-nav">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            {l.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
