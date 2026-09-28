import { NavLink, Outlet } from 'react-router-dom'
import { useAppState } from '../hooks/useAppState'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/train', label: 'Train' },
  { to: '/arena', label: 'Arena' },
  { to: '/progress', label: 'Stats' },
  { to: '/parent', label: 'Parent' },
]

export default function Layout() {
  const { state, activeChild, setActiveChild } = useAppState()

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          <span className="brand-mark">A</span>
          Axiom Arena
        </NavLink>
        <nav className="nav-links">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              {l.label}
            </NavLink>
          ))}
        </nav>
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
