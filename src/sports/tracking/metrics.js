/** Aggregate per-player and team KPIs from live tracks. */

export function rankPlayers(tracks, { by = "distance" } = {}) {
  const scored = tracks.map((t) => ({
    id: t.id,
    name: t.name,
    jersey: t.jersey,
    team: t.team,
    distance: Math.round((t.metrics?.distance || 0) * 10) / 10,
    maxSpeed: Math.round((t.metrics?.maxSpeed || 0) * 10) / 10,
    sprints: t.metrics?.sprintCount || 0,
    speedMph: Math.round((t.speedMph || 0) * 10) / 10,
  }));

  scored.sort((a, b) => (b[by] || 0) - (a[by] || 0));
  return scored;
}

export function teamTotals(tracks) {
  const teams = { home: emptyTeam(), away: emptyTeam() };
  for (const t of tracks) {
    const bucket = teams[t.team] || teams.home;
    bucket.players += 1;
    bucket.distance += t.metrics?.distance || 0;
    bucket.sprints += t.metrics?.sprintCount || 0;
    bucket.maxSpeed = Math.max(bucket.maxSpeed, t.metrics?.maxSpeed || 0);
    bucket.avgSpeed += t.speedMph || 0;
  }
  for (const key of Object.keys(teams)) {
    const b = teams[key];
    b.distance = Math.round(b.distance * 10) / 10;
    b.maxSpeed = Math.round(b.maxSpeed * 10) / 10;
    b.avgSpeed = b.players ? Math.round((b.avgSpeed / b.players) * 10) / 10 : 0;
  }
  return teams;
}

function emptyTeam() {
  return { players: 0, distance: 0, sprints: 0, maxSpeed: 0, avgSpeed: 0 };
}

export function formatClock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
