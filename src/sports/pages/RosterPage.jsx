import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getRoster } from "../tracking/simulate";
import "../styles/vectr.css";

export default function RosterPage() {
  const roster = getRoster();

  return (
    <div className="vectr-root min-h-screen">
      <header className="flex items-center justify-between border-b border-[var(--vectr-line)] px-4 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <Link to="/sports" className="text-xs text-white/60 hover:text-white">
            <ArrowLeft className="inline h-3.5 w-3.5" /> VECTR
          </Link>
          <h1 className="vectr-display text-3xl text-[var(--vectr-signal)]">Roster intelligence</h1>
        </div>
        <Link
          to="/sports/studio"
          className="rounded-md bg-[var(--vectr-signal)] px-3 py-1.5 text-xs font-bold text-black"
        >
          Launch studio
        </Link>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-2 md:px-8">
        <TeamColumn title="North Harbor FC" accent="var(--vectr-home)" players={roster.home} />
        <TeamColumn title="Cascadia United" accent="var(--vectr-away)" players={roster.away} />
      </div>
    </div>
  );
}

function TeamColumn({ title, accent, players }) {
  return (
    <section>
      <h2 className="vectr-display text-2xl" style={{ color: accent }}>
        {title}
      </h2>
      <ul className="mt-4 space-y-2">
        {players.map((p) => (
          <li
            key={`${p.team}-${p.jersey}`}
            className="flex items-center justify-between rounded-lg border border-[var(--vectr-line)] bg-black/25 px-3 py-2.5"
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-black"
                style={{ background: accent }}
              >
                {p.jersey}
              </span>
              <div>
                <div className="font-semibold text-white">{p.name}</div>
                <div className="text-xs text-white/45">{p.role}</div>
              </div>
            </div>
            <div className="text-right text-[11px] text-white/50">
              <div className="vectr-mono text-[var(--vectr-signal-hot)]">optical ID ready</div>
              <div>base {p.baseX},{p.baseY}</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
