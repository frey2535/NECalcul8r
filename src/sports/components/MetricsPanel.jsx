import React from "react";
import { formatClock, rankPlayers, teamTotals } from "../tracking/metrics";

export default function MetricsPanel({ tracks, clock, formation, possession, phase, events = [] }) {
  const leaders = rankPlayers(tracks, { by: "distance" }).slice(0, 6);
  const speedLeaders = rankPlayers(tracks, { by: "maxSpeed" }).slice(0, 3);
  const teams = teamTotals(tracks);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Match clock" value={formatClock(clock)} />
        <Stat label="Phase" value={phase || "—"} mono />
        <Stat label="Possession" value={possession === "home" ? "Harbor" : "Cascadia"} />
        <Stat label="Formation" value={formation?.label || "—"} mono />
      </div>

      <section>
        <h3 className="vectr-display mb-2 text-lg text-[var(--vectr-signal)]">Team load</h3>
        <div className="grid grid-cols-2 gap-2">
          <TeamCard name="Harbor" data={teams.home} accent="var(--vectr-home)" />
          <TeamCard name="Cascadia" data={teams.away} accent="var(--vectr-away)" />
        </div>
      </section>

      <section>
        <h3 className="vectr-display mb-2 text-lg text-[var(--vectr-signal)]">Distance leaders</h3>
        <ul className="space-y-1.5">
          {leaders.map((p, i) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-md border border-[var(--vectr-line)] bg-black/25 px-2.5 py-1.5"
            >
              <span className="flex items-center gap-2">
                <span className="vectr-mono text-xs text-white/40">{i + 1}</span>
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-black"
                  style={{ background: p.team === "home" ? "var(--vectr-home)" : "var(--vectr-away)" }}
                >
                  {p.jersey}
                </span>
                <span>{p.name}</span>
              </span>
              <span className="vectr-mono text-xs text-[var(--vectr-signal-hot)]">{p.distance} yd</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="vectr-display mb-2 text-lg text-[var(--vectr-signal)]">Top speed</h3>
        <ul className="space-y-1.5">
          {speedLeaders.map((p) => (
            <li key={p.id} className="flex justify-between rounded-md bg-black/20 px-2.5 py-1.5">
              <span>
                #{p.jersey} {p.name}
              </span>
              <span className="vectr-mono text-[var(--vectr-signal)]">{p.maxSpeed} mph</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="vectr-display mb-2 text-lg text-[var(--vectr-signal)]">Tracking events</h3>
        <ul className="space-y-1">
          {events.length === 0 && <li className="text-white/40">Listening for passes & transitions…</li>}
          {events.map((e, i) => (
            <li key={`${e.t}-${i}`} className="vectr-mono text-xs text-white/70">
              {formatClock(e.t)} · {e.type}
              {e.to ? ` → ${e.to}` : ""}
            </li>
          ))}
        </ul>
        {formation?.compactness != null && (
          <p className="mt-3 text-xs text-white/50">
            Shape compactness: <span className="vectr-mono text-[var(--vectr-signal-hot)]">{formation.compactness} yd</span>
          </p>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, mono }) {
  return (
    <div className="rounded-lg border border-[var(--vectr-line)] bg-black/30 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">{label}</div>
      <div className={`mt-1 text-base ${mono ? "vectr-mono text-[var(--vectr-signal)]" : "font-semibold"}`}>
        {value}
      </div>
    </div>
  );
}

function TeamCard({ name, data, accent }) {
  return (
    <div className="rounded-lg border border-[var(--vectr-line)] bg-black/25 p-3">
      <div className="text-xs font-semibold" style={{ color: accent }}>
        {name}
      </div>
      <div className="mt-2 space-y-1 text-[11px] text-white/70">
        <div className="flex justify-between">
          <span>Distance</span>
          <span className="vectr-mono">{data.distance} yd</span>
        </div>
        <div className="flex justify-between">
          <span>Sprints</span>
          <span className="vectr-mono">{data.sprints}</span>
        </div>
        <div className="flex justify-between">
          <span>Max</span>
          <span className="vectr-mono">{data.maxSpeed} mph</span>
        </div>
      </div>
    </div>
  );
}
