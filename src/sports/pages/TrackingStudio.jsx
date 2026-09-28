import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Crosshair,
  Layers,
  Pause,
  Play,
  Radar,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import TrackingCanvas from "../components/TrackingCanvas";
import MetricsPanel from "../components/MetricsPanel";
import PlayerDossier from "../components/PlayerDossier";
import {
  buildOccupancyHeatmap,
  createTracker,
  detectFormation,
  trackerStep,
} from "../tracking/multiObjectTracker";
import { createMatchSimulation, simulateStep } from "../tracking/simulate";
import "../styles/vectr.css";

const FPS = 30;

export default function TrackingStudio() {
  const [playing, setPlaying] = useState(true);
  const [tracks, setTracks] = useState([]);
  const [ball, setBall] = useState(null);
  const [clock, setClock] = useState(0);
  const [possession, setPossession] = useState("home");
  const [phase, setPhase] = useState("buildup");
  const [events, setEvents] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showTrails, setShowTrails] = useState(true);
  const [showPose, setShowPose] = useState(true);
  const [showPredict, setShowPredict] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const simRef = useRef(null);
  const trackerRef = useRef(null);

  useEffect(() => {
    simRef.current = createMatchSimulation();
    trackerRef.current = createTracker();
  }, []);

  useEffect(() => {
    if (!playing) return undefined;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const dt = 1 / FPS;

    const tick = (now) => {
      acc += (now - last) / 1000;
      last = now;
      while (acc >= dt) {
        const frame = simulateStep(simRef.current, dt);
        const nextTracks = trackerStep(trackerRef.current, frame.detections, dt);
        setTracks(nextTracks);
        setBall(frame.ball);
        setClock(frame.t);
        setPossession(frame.possession);
        setPhase(frame.phase);
        setEvents(frame.events);
        acc -= dt;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const heatmap = useMemo(
    () => (showHeatmap ? buildOccupancyHeatmap(tracks) : null),
    [tracks, showHeatmap]
  );
  const formation = useMemo(() => detectFormation(tracks, "home"), [tracks]);
  const selected = tracks.find((t) => t.id === selectedId) || null;

  return (
    <div className="vectr-root flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--vectr-line)] px-4 py-3 md:px-6">
        <div className="flex items-center gap-4">
          <Link to="/sports" className="vectr-display text-2xl text-[var(--vectr-signal)]">
            VECTR
          </Link>
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">Tracking studio</div>
            <div className="text-sm text-white/80">Harbor Lights · multi-cam optical lock</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LiveBadge playing={playing} />
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--vectr-line)] bg-black/40 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-[var(--vectr-signal)]"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? "Pause" : "Play"}
          </button>
          <Link
            to="/sports/film"
            className="rounded-md bg-[var(--vectr-signal)] px-3 py-1.5 text-xs font-bold text-black"
          >
            Open film room
          </Link>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--vectr-line)] px-4 py-2 md:px-6">
        <Toggle active={showTrails} onClick={() => setShowTrails((v) => !v)} icon={Activity} label="Trails" />
        <Toggle active={showPose} onClick={() => setShowPose((v) => !v)} icon={Sparkles} label="Pose" />
        <Toggle active={showPredict} onClick={() => setShowPredict((v) => !v)} icon={Target} label="Predict" />
        <Toggle active={showHeatmap} onClick={() => setShowHeatmap((v) => !v)} icon={Layers} label="Heat" />
        <div className="ml-auto flex items-center gap-3 text-[11px] text-white/45">
          <span className="inline-flex items-center gap-1">
            <Radar className="h-3.5 w-3.5 text-[var(--vectr-signal)]" />
            {tracks.length} locks
          </span>
          <span className="inline-flex items-center gap-1">
            <Crosshair className="h-3.5 w-3.5 text-[var(--vectr-home)]" />
            Kalman + re-ID
          </span>
          <span className="hidden items-center gap-1 sm:inline-flex">
            <Zap className="h-3.5 w-3.5 text-amber-300" />
            Sprint ≥ 14 mph
          </span>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-0 lg:grid-cols-[1fr_300px_280px]">
        <div className="vectr-scanline relative min-h-[52vh] border-b border-[var(--vectr-line)] lg:min-h-0 lg:border-b-0 lg:border-r">
          <TrackingCanvas
            tracks={tracks}
            ball={ball}
            heatmap={heatmap}
            selectedId={selectedId}
            showTrails={showTrails}
            showPose={showPose}
            showPredict={showPredict}
            showHeatmap={showHeatmap}
            onSelectTrack={setSelectedId}
            className="absolute inset-0"
          />
        </div>
        <div className="border-b border-[var(--vectr-line)] lg:border-b-0 lg:border-r">
          <MetricsPanel
            tracks={tracks}
            clock={clock}
            formation={formation}
            possession={possession}
            phase={phase}
            events={events}
          />
        </div>
        <div>
          <PlayerDossier track={selected} />
        </div>
      </div>
    </div>
  );
}

function LiveBadge({ playing }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-[var(--vectr-line)] bg-black/40 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]">
      <span
        className={`h-2 w-2 rounded-full bg-[var(--vectr-signal)] ${playing ? "vectr-live-dot" : "opacity-40"}`}
      />
      {playing ? "Live track" : "Paused"}
    </span>
  );
}

function Toggle({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
        active
          ? "bg-[var(--vectr-signal)] text-black"
          : "border border-[var(--vectr-line)] bg-black/30 text-white/70 hover:text-white"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
