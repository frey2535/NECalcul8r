import React, { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Circle, Minus, MoveRight, PenLine, Square, Type, Undo2 } from "lucide-react";
import { VECTR_SESSIONS } from "../data/sessions";
import "../styles/vectr.css";

const TOOLS = [
  { id: "select", label: "Select", icon: MoveRight },
  { id: "pen", label: "Pen", icon: PenLine },
  { id: "line", label: "Arrow", icon: Minus },
  { id: "box", label: "Box", icon: Square },
  { id: "circle", label: "Circle", icon: Circle },
  { id: "text", label: "Tag", icon: Type },
];

export default function FilmRoomPage() {
  const session = VECTR_SESSIONS[0];
  const canvasRef = useRef(null);
  const [tool, setTool] = useState("pen");
  const [strokes, setStrokes] = useState([]);
  const [draft, setDraft] = useState(null);
  const [scrub, setScrub] = useState(38);
  const [isolated, setIsolated] = useState(null);

  const athletes = useMemo(
    () => [
      { id: "h9", jersey: 9, name: "Diaz", team: "home" },
      { id: "h10", jersey: 10, name: "Amara", team: "home" },
      { id: "h7", jersey: 7, name: "Vogel", team: "home" },
      { id: "a9", jersey: 9, name: "Torres", team: "away" },
      { id: "a6", jersey: 6, name: "Novak", team: "away" },
    ],
    []
  );

  const pointerPos = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
  };

  const onPointerDown = (event) => {
    if (tool === "select") return;
    const p = pointerPos(event);
    setDraft({ tool, color: "#a3e635", points: [p], start: p });
  };

  const onPointerMove = (event) => {
    if (!draft) return;
    const p = pointerPos(event);
    if (draft.tool === "pen") {
      setDraft({ ...draft, points: [...draft.points, p] });
    } else {
      setDraft({ ...draft, end: p });
    }
  };

  const onPointerUp = () => {
    if (!draft) return;
    setStrokes((s) => [...s, draft]);
    setDraft(null);
  };

  return (
    <div className="vectr-root flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--vectr-line)] px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Link to="/sports/studio" className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> Studio
          </Link>
          <div>
            <div className="vectr-display text-xl text-[var(--vectr-signal)]">Film room</div>
            <div className="text-xs text-white/55">{session.title}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStrokes((s) => s.slice(0, -1))}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--vectr-line)] px-2.5 py-1.5 text-xs text-white/70"
          >
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </button>
          <button
            type="button"
            onClick={() => setStrokes([])}
            className="rounded-md border border-[var(--vectr-line)] px-2.5 py-1.5 text-xs text-white/70"
          >
            Clear
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-[var(--vectr-line)] px-4 py-2 md:px-6">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const active = tool === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTool(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${
                active ? "bg-[var(--vectr-signal)] text-black" : "border border-[var(--vectr-line)] text-white/70"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid flex-1 lg:grid-cols-[1fr_260px]">
        <div className="relative min-h-[55vh] border-b border-[var(--vectr-line)] lg:border-b-0 lg:border-r">
          <div
            ref={canvasRef}
            className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(163,230,53,0.12),transparent_45%),linear-gradient(160deg,#052e16,#0a1f14_55%,#020805)]"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            <PitchGhost scrub={scrub} isolated={isolated} athletes={athletes} />
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {[...strokes, draft].filter(Boolean).map((stroke, i) => (
                <Stroke key={i} stroke={stroke} />
              ))}
            </svg>
            <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-[var(--vectr-line)] bg-black/50 px-3 py-2 text-xs">
              <div className="text-white/45">Frame intel</div>
              <div className="vectr-mono text-[var(--vectr-signal)]">t={scrub.toFixed(0)}% · 4-cam sync</div>
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4 p-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Scrub</div>
            <input
              type="range"
              min={0}
              max={100}
              value={scrub}
              onChange={(e) => setScrub(Number(e.target.value))}
              className="mt-2 w-full accent-[var(--vectr-signal)]"
            />
          </div>
          <div>
            <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-white/40">Isolate athlete</div>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setIsolated(null)}
                className={`rounded-md px-2.5 py-1.5 text-left text-xs ${isolated == null ? "bg-[var(--vectr-signal)] text-black" : "bg-black/30 text-white/70"}`}
              >
                Full squad
              </button>
              {athletes.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setIsolated(a.id)}
                  className={`rounded-md px-2.5 py-1.5 text-left text-xs ${
                    isolated === a.id ? "bg-[var(--vectr-signal)] text-black" : "bg-black/30 text-white/70"
                  }`}
                >
                  #{a.jersey} {a.name}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--vectr-line)] bg-black/25 p-3 text-xs leading-relaxed text-white/60">
            Draw pressing traps, isolate runners, and keep VECTR tracks burned into the teachable
            moment — the film room coaches actually finish sessions in.
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stroke({ stroke }) {
  const color = stroke.color || "#a3e635";
  if (stroke.tool === "pen" && stroke.points?.length) {
    const d = stroke.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    return <path d={d} fill="none" stroke={color} strokeWidth="0.6" strokeLinecap="round" />;
  }
  if (!stroke.start || !stroke.end) return null;
  if (stroke.tool === "line") {
    return (
      <line
        x1={stroke.start.x}
        y1={stroke.start.y}
        x2={stroke.end.x}
        y2={stroke.end.y}
        stroke={color}
        strokeWidth="0.55"
        markerEnd="url(#arrow)"
      />
    );
  }
  if (stroke.tool === "box") {
    const x = Math.min(stroke.start.x, stroke.end.x);
    const y = Math.min(stroke.start.y, stroke.end.y);
    const w = Math.abs(stroke.end.x - stroke.start.x);
    const h = Math.abs(stroke.end.y - stroke.start.y);
    return <rect x={x} y={y} width={w} height={h} fill="none" stroke={color} strokeWidth="0.5" />;
  }
  if (stroke.tool === "circle") {
    const r = Math.hypot(stroke.end.x - stroke.start.x, stroke.end.y - stroke.start.y);
    return <circle cx={stroke.start.x} cy={stroke.start.y} r={r} fill="none" stroke={color} strokeWidth="0.5" />;
  }
  if (stroke.tool === "text") {
    return (
      <text x={stroke.start.x} y={stroke.start.y} fill={color} fontSize="3" fontFamily="IBM Plex Mono, monospace">
        PRESS
      </text>
    );
  }
  return null;
}

function PitchGhost({ scrub, isolated, athletes }) {
  return (
    <div className="absolute inset-[8%] rounded-sm border border-white/25">
      <div className="absolute inset-y-0 left-1/2 w-px bg-white/30" />
      <div className="absolute left-1/2 top-1/2 h-[28%] w-[18%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30" />
      {athletes.map((a, i) => {
        const dim = isolated && isolated !== a.id;
        const x = 18 + ((i * 13 + scrub * 0.2) % 64);
        const y = 18 + ((i * 17 + scrub * 0.15) % 62);
        return (
          <div
            key={a.id}
            className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-bold text-black transition"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              background: a.team === "home" ? "#38bdf8" : "#fb7185",
              opacity: dim ? 0.18 : 1,
              boxShadow: isolated === a.id ? "0 0 0 2px #a3e635" : "none",
            }}
          >
            {a.jersey}
          </div>
        );
      })}
    </div>
  );
}
