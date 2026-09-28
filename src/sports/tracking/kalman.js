/**
 * Constant-velocity Kalman filter for 2D player position tracking.
 * State: [x, y, vx, vy]
 */
export function createKalmanFilter(x = 0, y = 0, processNoise = 8, measurementNoise = 12) {
  const q = processNoise;
  const r = measurementNoise;
  return {
    x: [x, y, 0, 0],
    P: [
      [100, 0, 0, 0],
      [0, 100, 0, 0],
      [0, 0, 250, 0],
      [0, 0, 0, 250],
    ],
    q,
    r,
  };
}

function matMul(a, b) {
  const rows = a.length;
  const cols = b[0].length;
  const n = b.length;
  const out = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) sum += a[i][k] * b[k][j];
      out[i][j] = sum;
    }
  }
  return out;
}

function matAdd(a, b) {
  return a.map((row, i) => row.map((v, j) => v + b[i][j]));
}

function matSub(a, b) {
  return a.map((row, i) => row.map((v, j) => v - b[i][j]));
}

function transpose(a) {
  return a[0].map((_, j) => a.map((row) => row[j]));
}

function invert2x2(m) {
  const [[a, b], [c, d]] = m;
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-9) {
    return [
      [1, 0],
      [0, 1],
    ];
  }
  const inv = 1 / det;
  return [
    [d * inv, -b * inv],
    [-c * inv, a * inv],
  ];
}

export function kalmanPredict(filter, dt = 1 / 30) {
  const F = [
    [1, 0, dt, 0],
    [0, 1, 0, dt],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
  const Q = [
    [filter.q * dt, 0, 0, 0],
    [0, filter.q * dt, 0, 0],
    [0, 0, filter.q, 0],
    [0, 0, 0, filter.q],
  ];

  const xCol = filter.x.map((v) => [v]);
  const Fx = matMul(F, xCol).map((row) => row[0]);
  const FP = matMul(F, filter.P);
  const FPFt = matMul(FP, transpose(F));
  filter.x = Fx;
  filter.P = matAdd(FPFt, Q);
  return { x: filter.x[0], y: filter.x[1], vx: filter.x[2], vy: filter.x[3] };
}

export function kalmanUpdate(filter, zx, zy) {
  const H = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
  ];
  const R = [
    [filter.r, 0],
    [0, filter.r],
  ];
  const z = [[zx], [zy]];
  const xCol = filter.x.map((v) => [v]);
  const Hx = matMul(H, xCol);
  const y = matSub(z, Hx);
  const HP = matMul(H, filter.P);
  const S = matAdd(matMul(HP, transpose(H)), R);
  const PHt = matMul(filter.P, transpose(H));
  const K = matMul(PHt, invert2x2(S));
  const Ky = matMul(K, y).map((row) => row[0]);
  filter.x = filter.x.map((v, i) => v + Ky[i]);

  const I = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
  const KH = matMul(K, H);
  filter.P = matMul(matSub(I, KH), filter.P);

  return { x: filter.x[0], y: filter.x[1], vx: filter.x[2], vy: filter.x[3] };
}

export function predictFuture(filter, seconds = 1, steps = 12) {
  const points = [];
  let x = filter.x[0];
  let y = filter.x[1];
  const vx = filter.x[2];
  const vy = filter.x[3];
  const dt = seconds / steps;
  for (let i = 1; i <= steps; i++) {
    x += vx * dt;
    y += vy * dt;
    points.push({ x, y, t: i * dt });
  }
  return points;
}
