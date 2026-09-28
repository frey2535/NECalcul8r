import { useEffect, useState } from 'react'
import { getTopic } from '../lib/curriculum/catalog'
import { useAppState } from '../hooks/useAppState'
import { loadWatchSnapshot } from '../lib/progress/store'

const AVATARS = ['🦊', '🐼', '🐸', '🐯', '🦄', '🐲', '🐧', '🐺']

export default function Parent() {
  const { state, addChild, proficiency } = useAppState()
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('🐼')
  const [watchCode, setWatchCode] = useState(state.familyCode || '')
  const [remote, setRemote] = useState(null)
  const [pinVisible, setPinVisible] = useState(false)

  // Live updates from BroadcastChannel + polling local watch snapshot
  useEffect(() => {
    const code = (watchCode || state.familyCode || '').toUpperCase()
    if (!code) return undefined

    const refresh = () => setRemote(loadWatchSnapshot(code))
    refresh()
    const poll = setInterval(refresh, 1500)

    let bc
    try {
      bc = new BroadcastChannel('axiom_arena_watch')
      bc.onmessage = (ev) => {
        if (ev.data?.familyCode === code) setRemote(ev.data)
      }
    } catch {
      /* ignore */
    }

    return () => {
      clearInterval(poll)
      bc?.close()
    }
  }, [watchCode, state.familyCode, state.live, state.progress])

  function onAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    addChild(name.trim(), avatar)
    setName('')
  }

  const kids = remote?.children || state.children.map((c) => ({
    id: c.id,
    name: c.name,
    avatar: c.avatar,
    xp: state.progress[c.id]?.xp ?? 0,
    streak: state.progress[c.id]?.streak ?? 0,
    topics: proficiency(c.id).topics,
    live: state.live[c.id] || null,
    recentHistory: state.progress[c.id]?.history?.slice(0, 8) || [],
  }))

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em', marginTop: 0 }}>
        Coach <em style={{ color: 'var(--lime-dim)', fontStyle: 'normal' }}>View</em>
      </h1>
      <p className="muted">
        Live spectate your players, scout weak weapons, manage the roster. Open with the family code while they
        grind or queue Ranked — feed updates across tabs via BroadcastChannel + local sync.
      </p>

      <div className="panel" style={{ margin: '16px 0' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Family code</h3>
        <div className="family-code">{state.familyCode}</div>
        <p className="muted" style={{ marginTop: 10 }}>
          Parent PIN:{' '}
          <button type="button" className="btn btn-ghost" style={{ padding: '4px 10px' }} onClick={() => setPinVisible((v) => !v)}>
            {pinVisible ? state.parentPin : '••••'}
          </button>
        </p>
        <label className="muted">
          Watch another family code
          <input
            value={watchCode}
            onChange={(e) => setWatchCode(e.target.value.toUpperCase())}
            style={{ display: 'block', marginTop: 6, padding: 12, borderRadius: 12, border: '2px solid var(--ink)', width: 'min(280px, 100%)', fontFamily: 'var(--font-mono)' }}
          />
        </label>
        {remote && (
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            Last sync: {new Date(remote.updatedAt).toLocaleTimeString()}
          </p>
        )}
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Add a player</h3>
        <form onSubmit={onAdd} className="answer-row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <select value={avatar} onChange={(e) => setAvatar(e.target.value)} style={{ padding: 12, borderRadius: 12, border: '2px solid var(--ink)' }}>
            {AVATARS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary">
            Add
          </button>
        </form>
      </div>

      <div className="parent-grid">
        {kids.map((kid) => {
          const topics = kid.topics || {}
          const needs = Object.entries(topics).filter(([, t]) => t.status === 'needs-work')
          const pro = Object.entries(topics).filter(([, t]) => t.status === 'proficient')
          return (
            <div key={kid.id} className="panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>
                  {kid.avatar} {kid.name}
                </h3>
                {kid.live && (
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                    <span className="live-dot" /> Live
                  </span>
                )}
              </div>
              <p className="muted">
                {kid.xp} XP · {kid.streak}d streak
              </p>
              {kid.live && (
                <div className="step" style={{ marginBottom: 10 }}>
                  <h4>
                    Now: {kid.live.topicName} · {kid.live.status}
                  </h4>
                  <p>{kid.live.prompt}</p>
                  {kid.live.userAnswer != null && (
                    <p className="why">
                      Answered {kid.live.userAnswer}
                      {kid.live.expected != null ? ` (expected ${kid.live.expected})` : ''}
                    </p>
                  )}
                </div>
              )}
              <p style={{ fontWeight: 700, marginBottom: 4 }}>Weak points</p>
              {needs.length === 0 ? (
                <p className="muted">None flagged</p>
              ) : (
                <ul style={{ marginTop: 0 }}>
                  {needs.map(([id, t]) => (
                    <li key={id}>
                      {getTopic(id)?.name || id} — {Math.round(t.accuracy * 100)}%
                    </li>
                  ))}
                </ul>
              )}
              <p style={{ fontWeight: 700, marginBottom: 4 }}>Mastered</p>
              {pro.length === 0 ? (
                <p className="muted">Still climbing</p>
              ) : (
                <ul style={{ marginTop: 0 }}>
                  {pro.map(([id, t]) => (
                    <li key={id}>
                      {getTopic(id)?.name || id} — {Math.round(t.accuracy * 100)}%
                    </li>
                  ))}
                </ul>
              )}
              <p style={{ fontWeight: 700 }}>Recent hits</p>
              <div className="steps">
                {(kid.recentHistory || []).slice(0, 5).map((h, i) => (
                  <div key={i} className="step">
                    <h4>
                      {h.correct ? '✓' : '✗'} {getTopic(h.topicId)?.name}
                    </h4>
                    <p>{h.prompt}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
