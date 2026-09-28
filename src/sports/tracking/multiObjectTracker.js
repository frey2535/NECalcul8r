import { createKalmanFilter, kalmanPredict, kalmanUpdate, predictFuture } from "./kalman.js";

/**
 * Greedy nearest-neighbor multi-object association (Hungarian-lite for real-time).
 * Optimized for broadcast / sideline camera player tracking demos.
 */
const GATE_DISTANCE = 18; // yards on a 100x60 normalized pitch
const MAX_COAST_FRAMES = 18;

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function createTracker({ pitchWidth = 100, pitchHeight = 60 } = {}) {
  return {
    pitchWidth,
    pitchHeight,
    nextId: 1,
    tracks: new Map(),
    frame: 0,
  };
}

function makeTrack(id, detection, frame) {
  const filter = createKalmanFilter(detection.x, detection.y);
  return {
    id,
    jersey: detection.jersey ?? id,
    team: detection.team ?? "home",
    name: detection.name ?? `Player ${detection.jersey ?? id}`,
    filter,
    history: [{ x: detection.x, y: detection.y, frame, t: frame / 30 }],
    coast: 0,
    hits: 1,
    confirmed: false,
    lastDetection: detection,
    metrics: {
      distance: 0,
      maxSpeed: 0,
      sprintCount: 0,
      inSprint: false,
      touches: 0,
    },
  };
}

function associate(tracks, detections) {
  const trackList = [...tracks.values()];
  const usedTracks = new Set();
  const usedDetections = new Set();
  const pairs = [];

  const candidates = [];
  for (const track of trackList) {
    const pred = { x: track.filter.x[0], y: track.filter.x[1] };
    for (let i = 0; i < detections.length; i++) {
      const d = detections[i];
      const teamPenalty = d.team && track.team && d.team !== track.team ? 8 : 0;
      const jerseyBonus =
        d.jersey != null && track.jersey != null && d.jersey === track.jersey ? -4 : 0;
      const cost = dist(pred, d) + teamPenalty + jerseyBonus;
      if (cost < GATE_DISTANCE) candidates.push({ track, index: i, cost });
    }
  }
  candidates.sort((a, b) => a.cost - b.cost);

  for (const c of candidates) {
    if (usedTracks.has(c.track.id) || usedDetections.has(c.index)) continue;
    usedTracks.add(c.track.id);
    usedDetections.add(c.index);
    pairs.push({ track: c.track, detection: detections[c.index] });
  }

  const unmatchedTracks = trackList.filter((t) => !usedTracks.has(t.id));
  const unmatchedDetections = detections.filter((_, i) => !usedDetections.has(i));
  return { pairs, unmatchedTracks, unmatchedDetections };
}

function updateMetrics(track, prev, next, dt) {
  const dx = next.x - prev.x;
  const dy = next.y - prev.y;
  const step = Math.hypot(dx, dy);
  // Ignore teleport jumps from re-ID / gate association
  if (step > 4.5) {
    track.speed = track.prevSpeed || 0;
    track.speedMph = (track.speed || 0) * 2.04545;
    track.acceleration = 0;
    return;
  }
  track.metrics.distance += step;
  const speed = dt > 0 ? step / dt : 0; // yards/sec
  const speedMph = Math.min(22.5, speed * 2.04545); // hard cap ~world-class sprint
  track.speed = speed;
  track.speedMph = speedMph;
  track.acceleration = dt > 0 ? (speed - (track.prevSpeed || 0)) / dt : 0;
  track.prevSpeed = speed;
  if (speedMph > track.metrics.maxSpeed) track.metrics.maxSpeed = speedMph;
  if (speedMph >= 14) {
    if (!track.metrics.inSprint) {
      track.metrics.sprintCount += 1;
      track.metrics.inSprint = true;
    }
  } else if (speedMph < 11) {
    track.metrics.inSprint = false;
  }
}

/**
 * Advance tracker one frame with noisy detections from CV / broadcast.
 */
export function trackerStep(tracker, detections, dt = 1 / 30) {
  tracker.frame += 1;
  const frame = tracker.frame;

  for (const track of tracker.tracks.values()) {
    kalmanPredict(track.filter, dt);
  }

  const { pairs, unmatchedTracks, unmatchedDetections } = associate(
    tracker.tracks,
    detections
  );

  for (const { track, detection } of pairs) {
    const prev = { x: track.filter.x[0], y: track.filter.x[1] };
    const state = kalmanUpdate(track.filter, detection.x, detection.y);
    updateMetrics(track, prev, state, dt);
    track.coast = 0;
    track.hits += 1;
    if (track.hits >= 3) track.confirmed = true;
    track.jersey = detection.jersey ?? track.jersey;
    track.team = detection.team ?? track.team;
    track.name = detection.name ?? track.name;
    track.lastDetection = detection;
    track.history.push({ x: state.x, y: state.y, frame, t: frame / 30, speedMph: track.speedMph });
    if (track.history.length > 240) track.history.shift();
  }

  for (const track of unmatchedTracks) {
    track.coast += 1;
    const state = {
      x: track.filter.x[0],
      y: track.filter.x[1],
      vx: track.filter.x[2],
      vy: track.filter.x[3],
    };
    track.history.push({
      x: state.x,
      y: state.y,
      frame,
      t: frame / 30,
      coasted: true,
      speedMph: track.speedMph || 0,
    });
    if (track.history.length > 240) track.history.shift();
    if (track.coast > MAX_COAST_FRAMES) tracker.tracks.delete(track.id);
  }

  for (const detection of unmatchedDetections) {
    const id = tracker.nextId++;
    tracker.tracks.set(id, makeTrack(id, detection, frame));
  }

  return snapshotTracks(tracker);
}

export function snapshotTracks(tracker) {
  return [...tracker.tracks.values()]
    .filter((t) => t.confirmed || t.hits >= 2)
    .map((track) => {
      const [x, y, vx, vy] = track.filter.x;
      return {
        id: track.id,
        jersey: track.jersey,
        team: track.team,
        name: track.name,
        x,
        y,
        vx,
        vy,
        speedMph: track.speedMph || 0,
        acceleration: track.acceleration || 0,
        coast: track.coast,
        history: track.history.slice(-90),
        prediction: predictFuture(track.filter, 1.2, 10),
        metrics: { ...track.metrics },
        pose: synthesizePose(track),
      };
    });
}

/** Lightweight kinematic pose estimate from velocity heading. */
function synthesizePose(track) {
  const vx = track.filter.x[2];
  const vy = track.filter.x[3];
  const heading = Math.atan2(vy, vx);
  const speed = Math.hypot(vx, vy);
  const stride = Math.min(1, speed / 8);
  const phase = (track.frame || track.history.length) * 0.35;
  const swing = Math.sin(phase) * stride;

  const hip = { x: 0, y: 0 };
  const shoulder = { x: Math.cos(heading) * 0.15, y: Math.sin(heading) * 0.15 };
  const head = {
    x: shoulder.x + Math.cos(heading) * 0.35,
    y: shoulder.y + Math.sin(heading) * 0.35,
  };
  const leftKnee = {
    x: Math.cos(heading + Math.PI / 2) * 0.2 + Math.cos(heading) * swing * 0.5,
    y: Math.sin(heading + Math.PI / 2) * 0.2 + Math.sin(heading) * swing * 0.5,
  };
  const rightKnee = {
    x: Math.cos(heading - Math.PI / 2) * 0.2 - Math.cos(heading) * swing * 0.5,
    y: Math.sin(heading - Math.PI / 2) * 0.2 - Math.sin(heading) * swing * 0.5,
  };
  const leftFoot = {
    x: leftKnee.x + Math.cos(heading) * swing,
    y: leftKnee.y + Math.sin(heading) * swing,
  };
  const rightFoot = {
    x: rightKnee.x - Math.cos(heading) * swing,
    y: rightKnee.y - Math.sin(heading) * swing,
  };
  const leftHand = {
    x: shoulder.x + Math.cos(heading - Math.PI / 2) * 0.4 - Math.cos(heading) * swing * 0.4,
    y: shoulder.y + Math.sin(heading - Math.PI / 2) * 0.4 - Math.sin(heading) * swing * 0.4,
  };
  const rightHand = {
    x: shoulder.x + Math.cos(heading + Math.PI / 2) * 0.4 + Math.cos(heading) * swing * 0.4,
    y: shoulder.y + Math.sin(heading + Math.PI / 2) * 0.4 + Math.sin(heading) * swing * 0.4,
  };

  return { heading, hip, shoulder, head, leftKnee, rightKnee, leftFoot, rightFoot, leftHand, rightHand };
}

export function buildOccupancyHeatmap(tracks, { cols = 40, rows = 24, width = 100, height = 60 } = {}) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
  let max = 0;
  for (const track of tracks) {
    for (const point of track.history || []) {
      const c = Math.min(cols - 1, Math.max(0, Math.floor((point.x / width) * cols)));
      const r = Math.min(rows - 1, Math.max(0, Math.floor((point.y / height) * rows)));
      grid[r][c] += 1;
      if (grid[r][c] > max) max = grid[r][c];
    }
  }
  return { grid, max: max || 1, cols, rows, width, height };
}

export function detectFormation(tracks, team = "home") {
  const players = tracks.filter((t) => t.team === team).sort((a, b) => a.x - b.x);
  if (players.length < 8) return { label: "Incomplete", lines: [] };

  const bands = [[], [], [], []];
  for (const p of players) {
    if (p.x < 22) bands[0].push(p);
    else if (p.x < 42) bands[1].push(p);
    else if (p.x < 62) bands[2].push(p);
    else bands[3].push(p);
  }
  const shape = bands.map((b) => b.length).join("-");
  const known = {
    "1-4-3-3": "4-3-3",
    "1-4-4-2": "4-4-2",
    "1-3-5-2": "3-5-2",
    "1-4-2-4": "4-2-4",
    "1-5-3-2": "5-3-2",
  };
  return {
    label: known[shape] || shape.replace(/^1-/, ""),
    lines: bands.map((b) => b.map((p) => p.jersey)),
    compactness: compactness(players),
  };
}

function compactness(players) {
  if (players.length < 2) return 0;
  const cx = players.reduce((s, p) => s + p.x, 0) / players.length;
  const cy = players.reduce((s, p) => s + p.y, 0) / players.length;
  const avg = players.reduce((s, p) => s + Math.hypot(p.x - cx, p.y - cy), 0) / players.length;
  return Math.round(avg * 10) / 10;
}
