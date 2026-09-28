/** Realistic soccer match simulation feeding the multi-object tracker. */

const HOME = [
  { jersey: 1, name: "Okoye", role: "GK", baseX: 8, baseY: 30 },
  { jersey: 2, name: "Reyes", role: "RB", baseX: 22, baseY: 48 },
  { jersey: 4, name: "Hart", role: "CB", baseX: 20, baseY: 36 },
  { jersey: 5, name: "Ndlovu", role: "CB", baseX: 20, baseY: 24 },
  { jersey: 3, name: "Park", role: "LB", baseX: 22, baseY: 12 },
  { jersey: 6, name: "Silva", role: "CDM", baseX: 34, baseY: 30 },
  { jersey: 8, name: "Chen", role: "CM", baseX: 42, baseY: 38 },
  { jersey: 10, name: "Amara", role: "CM", baseX: 42, baseY: 22 },
  { jersey: 7, name: "Vogel", role: "RW", baseX: 58, baseY: 48 },
  { jersey: 9, name: "Diaz", role: "ST", baseX: 66, baseY: 30 },
  { jersey: 11, name: "Keita", role: "LW", baseX: 58, baseY: 12 },
];

const AWAY = [
  { jersey: 1, name: "Brooks", role: "GK", baseX: 92, baseY: 30 },
  { jersey: 22, name: "Ito", role: "RB", baseX: 78, baseY: 12 },
  { jersey: 5, name: "Müller", role: "CB", baseX: 80, baseY: 24 },
  { jersey: 4, name: "Adeyemi", role: "CB", baseX: 80, baseY: 36 },
  { jersey: 3, name: "Costa", role: "LB", baseX: 78, baseY: 48 },
  { jersey: 6, name: "Novak", role: "CDM", baseX: 68, baseY: 30 },
  { jersey: 8, name: "Ellis", role: "CM", baseX: 60, baseY: 22 },
  { jersey: 14, name: "Sato", role: "CM", baseX: 60, baseY: 38 },
  { jersey: 7, name: "Blanc", role: "RW", baseX: 48, baseY: 12 },
  { jersey: 9, name: "Torres", role: "ST", baseX: 40, baseY: 30 },
  { jersey: 11, name: "Nwosu", role: "LW", baseX: 48, baseY: 48 },
];

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function noise(scale = 1) {
  return (Math.random() - 0.5) * 2 * scale;
}

export function createMatchSimulation() {
  const players = [
    ...HOME.map((p) => ({
      ...p,
      team: "home",
      x: p.baseX,
      y: p.baseY,
      vx: 0,
      vy: 0,
      energy: 1,
    })),
    ...AWAY.map((p) => ({
      ...p,
      team: "away",
      x: p.baseX,
      y: p.baseY,
      vx: 0,
      vy: 0,
      energy: 1,
    })),
  ];

  return {
    t: 0,
    ball: { x: 50, y: 30, vx: 0, vy: 0, ownerId: null },
    players,
    possession: "home",
    phase: "buildup",
    events: [],
  };
}

function rolePressure(player, ball, possession) {
  const attacking = player.team === possession;
  let tx = player.baseX;
  let ty = player.baseY;

  if (player.role === "GK") {
    tx = player.team === "home" ? 8 : 92;
    ty = clamp(ball.y * 0.3 + 21, 18, 42);
    return { tx, ty, urgency: 0.4 };
  }

  if (attacking) {
    tx = player.baseX + (player.team === "home" ? 10 : -10);
    if (player.role === "ST" || player.role === "RW" || player.role === "LW") {
      tx = ball.x + (player.team === "home" ? 6 : -6);
      ty = player.role === "ST" ? ball.y : player.baseY + (ball.y - 30) * 0.25;
    } else {
      ty = player.baseY + (ball.y - 30) * 0.2;
    }
  } else {
    tx = player.baseX + (player.team === "home" ? -4 : 4);
    ty = player.baseY + (ball.y - 30) * 0.35;
    if (player.role === "CB" || player.role === "CDM") {
      const towardBall = ball.x - player.x;
      tx = player.x + towardBall * 0.15;
    }
  }

  const distBall = Math.hypot(ball.x - player.x, ball.y - player.y);
  if (distBall < 12 && (player.role !== "GK" || distBall < 8)) {
    tx = (tx + ball.x) / 2;
    ty = (ty + ball.y) / 2;
  }

  return { tx: clamp(tx, 3, 97), ty: clamp(ty, 3, 57), urgency: distBall < 10 ? 1.2 : 0.75 };
}

/**
 * Physics step for the simulated match. Returns noisy CV detections.
 */
export function simulateStep(sim, dt = 1 / 30) {
  sim.t += dt;
  const ball = sim.ball;

  // Occasional possession switch / through ball
  if (Math.random() < 0.008) {
    sim.possession = sim.possession === "home" ? "away" : "home";
    sim.phase = Math.random() > 0.5 ? "transition" : "buildup";
  }
  if (Math.random() < 0.012) {
    const attackers = sim.players.filter((p) => p.team === sim.possession && p.role !== "GK");
    const target = attackers[Math.floor(Math.random() * attackers.length)];
    if (target) {
      ball.vx = (target.x - ball.x) * 1.4 + noise(2);
      ball.vy = (target.y - ball.y) * 1.4 + noise(2);
      ball.ownerId = null;
      sim.events.push({ t: sim.t, type: "pass", to: target.name });
      if (sim.events.length > 20) sim.events.shift();
    }
  }

  for (const player of sim.players) {
    const { tx, ty, urgency } = rolePressure(player, ball, sim.possession);
    const ax = (tx - player.x) * 2.8 * urgency;
    const ay = (ty - player.y) * 2.8 * urgency;
    player.vx = clamp(player.vx * 0.86 + ax * dt + noise(0.4), -9, 9);
    player.vy = clamp(player.vy * 0.86 + ay * dt + noise(0.4), -9, 9);

    // Sprint bursts near ball
    const distBall = Math.hypot(ball.x - player.x, ball.y - player.y);
    if (distBall < 8 && Math.random() < 0.04) {
      const ang = Math.atan2(ball.y - player.y, ball.x - player.x);
      player.vx += Math.cos(ang) * 2.5;
      player.vy += Math.sin(ang) * 2.5;
    }

    player.x = clamp(player.x + player.vx * dt, 2, 98);
    player.y = clamp(player.y + player.vy * dt, 2, 58);
  }

  // Ball control / free motion
  if (ball.ownerId == null) {
    let closest = null;
    let best = Infinity;
    for (const p of sim.players) {
      const d = Math.hypot(p.x - ball.x, p.y - ball.y);
      if (d < best) {
        best = d;
        closest = p;
      }
    }
    if (closest && best < 1.8) {
      ball.ownerId = `${closest.team}-${closest.jersey}`;
      sim.possession = closest.team;
      closest.metricsTouches = (closest.metricsTouches || 0) + 1;
    }
  }

  if (ball.ownerId) {
    const owner = sim.players.find((p) => `${p.team}-${p.jersey}` === ball.ownerId);
    if (owner) {
      ball.x = owner.x + owner.vx * 0.08;
      ball.y = owner.y + owner.vy * 0.08;
      ball.vx = owner.vx;
      ball.vy = owner.vy;
      if (Math.random() < 0.03) ball.ownerId = null;
    } else {
      ball.ownerId = null;
    }
  } else {
    ball.vx *= 0.985;
    ball.vy *= 0.985;
    ball.x = clamp(ball.x + ball.vx * dt, 1, 99);
    ball.y = clamp(ball.y + ball.vy * dt, 1, 59);
  }

  // Noisy detections (simulates CV measurement noise + occasional miss)
  const detections = [];
  for (const p of sim.players) {
    if (Math.random() < 0.03) continue; // dropout
    detections.push({
      x: p.x + noise(0.55),
      y: p.y + noise(0.55),
      jersey: p.jersey,
      team: p.team,
      name: p.name,
      role: p.role,
      confidence: 0.82 + Math.random() * 0.17,
    });
  }

  return {
    detections,
    ball: { ...ball },
    possession: sim.possession,
    phase: sim.phase,
    t: sim.t,
    events: sim.events.slice(-5),
  };
}

export function getRoster() {
  return {
    home: HOME.map((p) => ({ ...p, team: "home", teamName: "North Harbor FC" })),
    away: AWAY.map((p) => ({ ...p, team: "away", teamName: "Cascadia United" })),
  };
}
