import React from "react";

export default function PlayerDossier({ track }) {
  if (!track) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-white/45">
        Select an athlete on the pitch to open their live dossier.
      </div>
    );
  }

  const m = track.metrics || {};

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">Live dossier</div>
        <div className="vectr-display mt-1 text-3xl text-white">
          <span
            className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm text-black"
            style={{ background: track.team === "home" ? "var(--vectr-home)" : "var(--vectr-away)" }}
          >
            {track.jersey}
          </span>
          {track.name}
        </div>
        <div className="mt-1 text-xs text-white/50">
          Track ID {track.id} · {track.team === "home" ? "North Harbor" : "Cascadia"} ·{" "}
          {track.coast > 0 ? "coasting / occluded" : "optical lock"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Metric label="Speed" value={`${(track.speedMph || 0).toFixed(1)} mph`} hot={track.speedMph >= 14} />
        <Metric label="Accel" value={`${(track.acceleration || 0).toFixed(1)} yd/s²`} />
        <Metric label="Distance" value={`${(m.distance || 0).toFixed(1)} yd`} />
        <Metric label="Max speed" value={`${(m.maxSpeed || 0).toFixed(1)} mph`} />
        <Metric label="Sprints" value={String(m.sprintCount || 0)} />
        <Metric label="Heading" value={`${Math.round(((track.pose?.heading || 0) * 180) / Math.PI)}°`} />
      </div>

      <div>
        <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-white/40">Velocity sparkline</div>
        <Sparkline history={track.history} />
      </div>

      <div className="rounded-lg border border-[var(--vectr-line)] bg-black/25 p-3 text-xs leading-relaxed text-white/65">
        VECTR fuses optical detections with a constant-velocity Kalman prior, jersey-aware
        re-association, and kinematic pose synthesis — so identity survives screens, huddles, and
        broadcast cutaways better than single-camera chalk marks.
      </div>
    </div>
  );
}

function Metric({ label, value, hot }) {
  return (
    <div className="rounded-lg border border-[var(--vectr-line)] bg-black/30 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">{label}</div>
      <div className={`vectr-mono mt-1 text-sm ${hot ? "text-[var(--vectr-signal)]" : "text-white"}`}>
        {value}
      </div>
    </div>
  );
}

function Sparkline({ history = [] }) {
  const speeds = history.map((h) => h.speedMph || 0);
  const max = Math.max(18, ...speeds, 1);
  const w = 240;
  const h = 56;
  if (speeds.length < 2) {
    return <div className="h-14 rounded bg-black/20" />;
  }
  const points = speeds
    .map((s, i) => {
      const x = (i / (speeds.length - 1)) * w;
      const y = h - (s / max) * (h - 6) - 3;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full rounded bg-black/30">
      <polyline fill="none" stroke="rgba(163,230,53,0.85)" strokeWidth="2" points={points} />
      <line x1="0" y1={h - (14 / max) * (h - 6) - 3} x2={w} y2={h - (14 / max) * (h - 6) - 3} stroke="rgba(251,113,133,0.35)" strokeDasharray="4 4" />
    </svg>
  );
}
