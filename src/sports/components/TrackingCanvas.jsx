import React, { useEffect, useRef } from "react";

const PITCH_W = 100;
const PITCH_H = 60;

function worldToCanvas(x, y, w, h, pad = 16) {
  const usableW = w - pad * 2;
  const usableH = h - pad * 2;
  return {
    cx: pad + (x / PITCH_W) * usableW,
    cy: pad + (y / PITCH_H) * usableH,
  };
}

function drawPitch(ctx, w, h, pad = 16) {
  const x = pad;
  const y = pad;
  const pw = w - pad * 2;
  const ph = h - pad * 2;

  const turf = ctx.createLinearGradient(0, y, 0, y + ph);
  turf.addColorStop(0, "#166534");
  turf.addColorStop(0.5, "#14532d");
  turf.addColorStop(1, "#052e16");
  ctx.fillStyle = turf;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)";
    ctx.fillRect(x + (pw / 12) * i, y, pw / 12, ph);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.78)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, pw, ph);

  ctx.beginPath();
  ctx.moveTo(x + pw / 2, y);
  ctx.lineTo(x + pw / 2, y + ph);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x + pw / 2, y + ph / 2, ph * 0.14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + pw / 2, y + ph / 2, 3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fill();

  const boxW = pw * 0.16;
  const boxH = ph * 0.52;
  const sixW = pw * 0.06;
  const sixH = ph * 0.28;
  ctx.strokeRect(x, y + (ph - boxH) / 2, boxW, boxH);
  ctx.strokeRect(x + pw - boxW, y + (ph - boxH) / 2, boxW, boxH);
  ctx.strokeRect(x, y + (ph - sixH) / 2, sixW, sixH);
  ctx.strokeRect(x + pw - sixW, y + (ph - sixH) / 2, sixW, sixH);

  ctx.beginPath();
  ctx.arc(x + pw * 0.11, y + ph / 2, 2.5, 0, Math.PI * 2);
  ctx.arc(x + pw * 0.89, y + ph / 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawHeatmap(ctx, heatmap, w, h, pad = 16) {
  if (!heatmap?.grid?.length) return;
  const { grid, max, cols, rows } = heatmap;
  const cellW = (w - pad * 2) / cols;
  const cellH = (h - pad * 2) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = grid[r][c] / max;
      if (v < 0.05) continue;
      ctx.fillStyle = `rgba(163, 230, 53, ${v * 0.45})`;
      ctx.fillRect(pad + c * cellW, pad + r * cellH, cellW + 0.5, cellH + 0.5);
    }
  }
}

function drawPose(ctx, track, cx, cy, scale) {
  const p = track.pose;
  if (!p) return;
  const map = (pt) => ({ x: cx + pt.x * scale, y: cy + pt.y * scale });
  const joints = [
    [p.head, p.shoulder],
    [p.shoulder, p.hip],
    [p.shoulder, p.leftHand],
    [p.shoulder, p.rightHand],
    [p.hip, p.leftKnee],
    [p.hip, p.rightKnee],
    [p.leftKnee, p.leftFoot],
    [p.rightKnee, p.rightFoot],
  ];
  ctx.strokeStyle = track.team === "home" ? "rgba(56,189,248,0.85)" : "rgba(251,113,133,0.85)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  for (const [a, b] of joints) {
    const A = map(a);
    const B = map(b);
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.stroke();
  }
  const head = map(p.head);
  ctx.beginPath();
  ctx.arc(head.x, head.y, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fill();
}

function drawTrack(ctx, track, w, h, options) {
  const pad = 16;
  const { showTrails, showPose, showPredict, selectedId } = options;
  const color = track.team === "home" ? "#38bdf8" : "#fb7185";
  const selected = selectedId === track.id;

  if (showTrails && track.history?.length > 1) {
    ctx.beginPath();
    track.history.forEach((pt, i) => {
      const { cx, cy } = worldToCanvas(pt.x, pt.y, w, h, pad);
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.strokeStyle = selected ? "rgba(163,230,53,0.85)" : `${color}99`;
    ctx.lineWidth = selected ? 2.5 : 1.5;
    ctx.stroke();
  }

  if (showPredict && track.prediction?.length) {
    ctx.beginPath();
    const start = worldToCanvas(track.x, track.y, w, h, pad);
    ctx.moveTo(start.cx, start.cy);
    for (const pt of track.prediction) {
      const { cx, cy } = worldToCanvas(pt.x, pt.y, w, h, pad);
      ctx.lineTo(cx, cy);
    }
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(250, 204, 21, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const { cx, cy } = worldToCanvas(track.x, track.y, w, h, pad);
  if (showPose) drawPose(ctx, track, cx, cy, Math.min(w, h) * 0.035);

  ctx.beginPath();
  ctx.arc(cx, cy, selected ? 11 : 8, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  if (selected) {
    ctx.strokeStyle = "#a3e635";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  ctx.fillStyle = "#04110a";
  ctx.font = "bold 10px IBM Plex Mono, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(track.jersey), cx, cy);

  if (track.speedMph >= 14) {
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(163,230,53,0.55)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawBall(ctx, ball, w, h) {
  if (!ball) return;
  const { cx, cy } = worldToCanvas(ball.x, ball.y, w, h, 16);
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#f8fafc";
  ctx.fill();
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 1;
  ctx.stroke();
}

/**
 * High-performance canvas renderer for live optical tracking.
 */
export default function TrackingCanvas({
  tracks = [],
  tracksRef = null,
  ball,
  heatmap,
  selectedId,
  showTrails = true,
  showPose = true,
  showPredict = true,
  showHeatmap = false,
  onSelectTrack,
  className = "",
}) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const frameRef = useRef({
    tracks,
    ball,
    heatmap,
    selectedId,
    showTrails,
    showPose,
    showPredict,
    showHeatmap,
  });

  frameRef.current = {
    tracks: tracksRef?.current || tracks,
    ball,
    heatmap,
    selectedId,
    showTrails,
    showPose,
    showPredict,
    showHeatmap,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return undefined;

    let cssW = 0;
    let cssH = 0;
    let raf = 0;

    const paint = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx || cssW < 1 || cssH < 1) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const frame = frameRef.current;
      const liveTracks = tracksRef?.current || frame.tracks;
      drawPitch(ctx, cssW, cssH);
      if (frame.showHeatmap) drawHeatmap(ctx, frame.heatmap, cssW, cssH);
      for (const track of liveTracks) {
        drawTrack(ctx, track, cssW, cssH, {
          showTrails: frame.showTrails,
          showPose: frame.showPose,
          showPredict: frame.showPredict,
          selectedId: frame.selectedId,
        });
      }
      drawBall(ctx, frame.ball, cssW, cssH);
    };

    const resize = () => {
      const rect = wrapper.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssW = Math.max(320, rect.width);
      cssH = Math.max(200, rect.height);
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      paint();
    };

    const loop = () => {
      paint();
      raf = requestAnimationFrame(loop);
    };

    resize();
    raf = requestAnimationFrame(loop);
    const ro = new ResizeObserver(resize);
    ro.observe(wrapper);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const handlePointer = (event) => {
    if (!onSelectTrack) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * PITCH_W;
    const y = ((event.clientY - rect.top) / rect.height) * PITCH_H;
    let best = null;
    let bestD = 4;
    for (const track of frameRef.current.tracks) {
      const d = Math.hypot(track.x - x, track.y - y);
      if (d < bestD) {
        bestD = d;
        best = track;
      }
    }
    onSelectTrack(best?.id ?? null);
  };

  return (
    <div ref={wrapperRef} className={`relative h-full w-full overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-crosshair"
        onClick={handlePointer}
        role="img"
        aria-label="Live player tracking pitch"
      />
    </div>
  );
}
