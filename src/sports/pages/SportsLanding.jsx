import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Play, Radar } from "lucide-react";
import { VECTR_CAPABILITIES, VECTR_SESSIONS } from "../data/sessions";
import "../styles/vectr.css";

export default function SportsLanding() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 120);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="vectr-root">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;600&family=Manrope:wght@400;500;600;700;800&display=swap"
      />

      <nav className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-5 md:px-10">
        <div className="vectr-display text-2xl tracking-[0.12em] text-[var(--vectr-signal)]">VECTR</div>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/sports/roster" className="hidden text-white/70 hover:text-white sm:inline">
            Roster
          </Link>
          <Link to="/sports/film" className="hidden text-white/70 hover:text-white sm:inline">
            Film
          </Link>
          <Link
            to="/sports/studio"
            className="rounded-md bg-[var(--vectr-signal)] px-3.5 py-2 text-xs font-bold uppercase tracking-wide text-black"
          >
            Open studio
          </Link>
        </div>
      </nav>

      {/* Hero — one composition: brand, headline, support, CTA, full-bleed field visual */}
      <section className="relative min-h-[100svh] overflow-hidden">
        <HeroField tick={tick} />
        <div className="relative z-10 flex min-h-[100svh] flex-col justify-end px-5 pb-16 pt-28 md:px-10 md:pb-20">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl"
          >
            <h1 className="vectr-display text-[clamp(4.5rem,16vw,9.5rem)] leading-[0.82] text-white">
              VECTR
            </h1>
            <p className="mt-4 max-w-xl text-lg font-medium text-[var(--vectr-signal-hot)] md:text-xl">
              The most advanced player tracking on the market — optical lock, pose, and prediction in every frame.
            </p>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/65 md:text-base">
              Built to retire guesswork film. VECTR reads the whole pitch, keeps identity through chaos, and hands coaches teachable truth.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/sports/studio"
                className="inline-flex items-center gap-2 rounded-md bg-[var(--vectr-signal)] px-5 py-3 text-sm font-bold text-black"
              >
                <Play className="h-4 w-4" />
                Launch live tracking
              </Link>
              <Link
                to="/sports/film"
                className="inline-flex items-center gap-2 rounded-md border border-white/25 px-5 py-3 text-sm font-semibold text-white hover:border-[var(--vectr-signal)]"
              >
                Enter film room
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="border-t border-[var(--vectr-line)] px-5 py-20 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-5xl"
        >
          <h2 className="vectr-display text-4xl text-white md:text-5xl">Tracking that outruns chalk and hope</h2>
          <p className="mt-3 max-w-2xl text-white/60">
            Hudl-class film workflows, Second Spectrum-grade tracking ambition — shipped as a coaching surface you can open in one click.
          </p>
          <div className="mt-12 grid gap-10 md:grid-cols-2">
            {VECTR_CAPABILITIES.map((cap, i) => (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="border-t border-[var(--vectr-line)] pt-5"
              >
                <div className="vectr-mono text-xs text-[var(--vectr-signal)]">0{i + 1}</div>
                <h3 className="mt-2 text-xl font-semibold text-white">{cap.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{cap.body}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="border-t border-[var(--vectr-line)] px-5 py-20 md:px-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="vectr-display text-4xl text-white md:text-5xl">Session library</h2>
              <p className="mt-2 text-white/55">Multi-cam captures ready for studio replay.</p>
            </div>
            <Link to="/sports/roster" className="text-sm font-semibold text-[var(--vectr-signal)]">
              View rosters →
            </Link>
          </div>
          <ul className="mt-10 divide-y divide-[var(--vectr-line)] border-y border-[var(--vectr-line)]">
            {VECTR_SESSIONS.map((session) => (
              <li key={session.id} className="flex flex-col gap-2 py-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-semibold text-white">{session.title}</div>
                  <div className="mt-1 text-xs text-white/45">
                    {session.competition} · {session.date} · {session.venue}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-white/55">
                  <span className="vectr-mono">{session.duration}</span>
                  <span>{session.cameras} cams</span>
                  <span>{session.trackingMode}</span>
                  <Link
                    to="/sports/studio"
                    className="font-semibold text-[var(--vectr-signal)] hover:underline"
                  >
                    Track
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-[var(--vectr-line)] px-5 py-24 md:px-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_40%,rgba(163,230,53,0.15),transparent_40%)]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <Radar className="mx-auto h-8 w-8 text-[var(--vectr-signal)]" />
          <h2 className="vectr-display mt-4 text-5xl text-white md:text-6xl">Replace the tape. Keep the edge.</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/60">
            VECTR is the sports intelligence layer for teams that refuse to coach from memory. Open the studio and lock every athlete now.
          </p>
          <Link
            to="/sports/studio"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-[var(--vectr-signal)] px-6 py-3 text-sm font-bold text-black"
          >
            Start tracking
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-6 text-xs text-white/35">
            NEC tools remain at{" "}
            <Link to="/landing" className="underline hover:text-white/60">
              /landing
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

function HeroField({ tick }) {
  const players = [
    { x: 18, y: 30, team: "home" },
    { x: 28, y: 18, team: "home" },
    { x: 28, y: 42, team: "home" },
    { x: 40, y: 30, team: "home" },
    { x: 52, y: 22, team: "home" },
    { x: 52, y: 38, team: "home" },
    { x: 62, y: 30, team: "away" },
    { x: 72, y: 18, team: "away" },
    { x: 72, y: 42, team: "away" },
    { x: 82, y: 30, team: "away" },
  ].map((p, i) => ({
    ...p,
    x: p.x + Math.sin((tick + i * 7) * 0.08) * 1.8,
    y: p.y + Math.cos((tick + i * 5) * 0.07) * 1.4,
  }));

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,8,5,0.2)_0%,rgba(2,8,5,0.55)_55%,rgba(2,8,5,0.92)_100%)]" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 56" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="turf" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#166534" />
            <stop offset="100%" stopColor="#052e16" />
          </linearGradient>
        </defs>
        <rect width="100" height="56" fill="url(#turf)" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <rect
            key={i}
            x={i * 12.5}
            y="0"
            width="12.5"
            height="56"
            fill={i % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.05)"}
          />
        ))}
        <rect x="4" y="4" width="92" height="48" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.35" />
        <line x1="50" y1="4" x2="50" y2="52" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
        <circle cx="50" cy="28" r="7" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
        {players.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y * 0.9}
              r="1.1"
              fill={p.team === "home" ? "#38bdf8" : "#fb7185"}
              opacity="0.95"
            />
            <circle
              cx={p.x}
              cy={p.y * 0.9}
              r="2.2"
              fill="none"
              stroke="#a3e635"
              strokeWidth="0.2"
              opacity={0.35 + (Math.sin(tick * 0.2 + i) + 1) * 0.2}
            />
          </g>
        ))}
        <circle
          cx={50 + Math.sin(tick * 0.11) * 8}
          cy={28 + Math.cos(tick * 0.09) * 5}
          r="0.7"
          fill="#f8fafc"
        />
      </svg>
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[var(--vectr-signal)]/10 to-transparent"
        animate={{ opacity: [0.35, 0.7, 0.35] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
