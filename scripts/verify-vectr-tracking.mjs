/**
 * Headless verification for VECTR multi-object tracking engine.
 * Run: node scripts/verify-vectr-tracking.mjs
 */
import { createKalmanFilter, kalmanPredict, kalmanUpdate } from "../src/sports/tracking/kalman.js";
import {
  buildOccupancyHeatmap,
  createTracker,
  detectFormation,
  trackerStep,
} from "../src/sports/tracking/multiObjectTracker.js";
import { createMatchSimulation, simulateStep } from "../src/sports/tracking/simulate.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Kalman converges toward measurement
{
  const f = createKalmanFilter(0, 0);
  for (let i = 0; i < 30; i++) {
    kalmanPredict(f, 1 / 30);
    kalmanUpdate(f, 50, 25);
  }
  assert(Math.abs(f.x[0] - 50) < 2, `kalman x expected ~50 got ${f.x[0]}`);
  assert(Math.abs(f.x[1] - 25) < 2, `kalman y expected ~25 got ${f.x[1]}`);
}

// Tracker maintains ~22 players across noisy detections
{
  const sim = createMatchSimulation();
  const tracker = createTracker();
  let last = [];
  for (let i = 0; i < 90; i++) {
    const frame = simulateStep(sim, 1 / 30);
    last = trackerStep(tracker, frame.detections, 1 / 30);
  }
  assert(last.length >= 18, `expected >=18 confirmed tracks, got ${last.length}`);
  assert(last.every((t) => Number.isFinite(t.x) && Number.isFinite(t.y)), "tracks must be finite");
  assert(last.some((t) => t.metrics.distance > 0), "expected distance accumulation");
  const heat = buildOccupancyHeatmap(last);
  assert(heat.max >= 1, "heatmap should have occupancy");
  const formation = detectFormation(last, "home");
  assert(typeof formation.label === "string" && formation.label.length > 0, "formation label required");
}

console.log("verify-vectr-tracking: ok");
