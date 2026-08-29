import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowLeft, Zap, ChevronRight } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import CalculatorPanel from "@/components/calculator/CalculatorPanel";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import PullToRefreshIndicator from "@/components/ui/PullToRefreshIndicator";

export const NEC_CATEGORIES = [
  { id: "voltage_drop", label: "Voltage Drop", article: "NEC 210.19 / 215.2", description: "Branch circuit & feeder voltage drop", color: "blue", emoji: "⚡" },
  { id: "conductor_ampacity", label: "Conductor Ampacity", article: "NEC 310.15", description: "Wire size, temp correction & bundling", color: "green", emoji: "🔌" },
  { id: "box_fill", label: "Box Fill", article: "NEC 314.16", description: "Electrical box fill volume calculation", color: "purple", emoji: "📦" },
  { id: "dwelling_standard", label: "Dwelling Load (Standard)", article: "NEC 220.40", description: "Single-family service — standard method", color: "orange", emoji: "🏠" },
  { id: "dwelling_optional", label: "Dwelling Load (Optional)", article: "NEC 220.82", description: "Single-family service — optional method", color: "orange", emoji: "🏡" },
  { id: "commercial_load", label: "Commercial Load", article: "NEC 220.40", description: "Lighting & receptacle demand for commercial", color: "red", emoji: "🏢" },
  { id: "motor_full_load", label: "Motor Branch Circuit", article: "NEC 430.6 / 430.22", description: "Motor conductor, protection & overload sizing", color: "teal", emoji: "⚙️" },
  { id: "motor_feeder", label: "Motor Feeder / Service", article: "NEC 430.24 / 430.62", description: "Feeder & service for multiple motors", color: "teal", emoji: "🔧" },
  { id: "conduit_fill", label: "Conduit Fill", article: "NEC Ch. 9 Table 1", description: "Max wire fill % for conduit types", color: "indigo", emoji: "🔵" },
  { id: "transformer_sizing", label: "Transformer Sizing", article: "NEC 450.3", description: "kVA, conductor & OCPD sizing", color: "yellow", emoji: "🔋" },
  { id: "overcurrent_protection", label: "Overcurrent Protection", article: "NEC 240.4 / 240.6", description: "Breaker/fuse sizing for conductors", color: "red", emoji: "🛡️" },
  { id: "service_sizing", label: "Service Entrance", article: "NEC 230.42", description: "Service conductor & equipment sizing", color: "slate", emoji: "🏗️" },
  { id: "generator_sizing", label: "Generator / Standby", article: "NEC 702 / 445", description: "Generator sizing and transfer switch", color: "green", emoji: "🔦" },
  { id: "egc_sizing", label: "Equipment Grounding", article: "NEC 250.122", description: "EGC sizing based on OCPD rating", color: "amber", emoji: "🌍" },
  { id: "grounding_electrode", label: "Grounding Electrode", article: "NEC 250.66", description: "GEC sizing from service conductor", color: "amber", emoji: "⛏️" },
  { id: "main_bonding_jumper", label: "Main Bonding Jumper", article: "NEC 250.28(D)", description: "MBJ sizing at service entrance", color: "amber", emoji: "🔗" },
  { id: "system_bonding_jumper", label: "System Bonding Jumper", article: "NEC 250.30(A)(1)", description: "SBJ sizing for separately derived systems", color: "amber", emoji: "⚡" },
  { id: "gec_for_sds", label: "GEC for Separately Derived System", article: "NEC 250.30(A)(4)", description: "GEC sizing based on SDS secondary conductors", color: "amber", emoji: "🌱" },
  { id: "bonding_jumper_parallel", label: "Bonding Jumper — Parallel Runs", article: "NEC 250.102(C)", description: "BJ sizing for conductors in parallel raceways", color: "amber", emoji: "🔀" },
  { id: "supplemental_grounding_electrode", label: "Supplemental Grounding Electrode", article: "NEC 250.53(A)(2)", description: "Ground rod resistance check — 25Ω rule", color: "amber", emoji: "📍" },
  { id: "multifamily_standard", label: "Multifamily Standard", article: "NEC 220.40", description: "Standard method for apartment buildings (3+ units)", color: "orange", emoji: "🏘️" },
  { id: "multifamily_load", label: "Multifamily Optional", article: "NEC 220.84", description: "Optional method for apartment buildings (3+ units)", color: "orange", emoji: "🏚️" },
  { id: "farm_load", label: "Farm Load Calculation", article: "NEC 220.102", description: "Demand factors for farm buildings & dwelling", color: "green", emoji: "🌾" },
  { id: "fixed_electric_heat", label: "Fixed Electric Space Heating", article: "NEC 220.51", description: "100% load — no demand factor permitted", color: "red", emoji: "🔆" },
  { id: "kitchen_equipment_demand", label: "Kitchen Equipment Demand", article: "NEC 220.56", description: "Commercial cooking equipment demand factors", color: "orange", emoji: "🍳" },
  { id: "demand_factor", label: "Demand Factor", article: "NEC 220.42 / 220.44", description: "Lighting & receptacle demand factors", color: "blue", emoji: "📊" },
  { id: "continuous_load", label: "Continuous Load & OCPD", article: "NEC 210.20 / 215.3", description: "125% rule for continuous loads", color: "red", emoji: "♾️" },
  { id: "hvac_load", label: "HVAC / A/C Load", article: "NEC 440.32 / 440.33", description: "A/C & refrigeration circuit sizing", color: "cyan", emoji: "❄️" },
  { id: "welding_receptacle", label: "Welder / Arc Welder", article: "NEC 630.11", description: "Arc welder conductor and OCPD sizing", color: "gray", emoji: "🔥" },
  { id: "lighting_load", label: "Lighting Load", article: "NEC 220.12", description: "General lighting by occupancy type", color: "yellow", emoji: "💡" },
  { id: "multiwire_branch", label: "Multiwire Branch Circuit", article: "NEC 210.4", description: "Shared neutral load & balance check", color: "purple", emoji: "〰️" },
  { id: "receptacle_load", label: "Receptacle Load", article: "NEC 220.14", description: "Commercial receptacle load calculation", color: "blue", emoji: "🔌" },
  { id: "short_circuit", label: "Short-Circuit / Fault Current", article: "NEC 110.9 / 110.10", description: "Available fault current at transformer secondary", color: "red", emoji: "⚠️" },
  { id: "power_factor", label: "Power Factor Correction", article: "IEEE / NEC 460", description: "Capacitor sizing to correct power factor", color: "green", emoji: "📐" },
  { id: "three_phase_power", label: "Three-Phase Power", article: "NEC General", description: "3-phase kW, kVA, current & power factor", color: "indigo", emoji: "🔺" },
  { id: "single_phase_power", label: "Single-Phase Power", article: "NEC General", description: "1-phase kW, kVA, current & power factor", color: "indigo", emoji: "🔹" },
  { id: "pool_spa", label: "Pool / Spa", article: "NEC 680", description: "Bonding conductor & GFCI requirements", color: "cyan", emoji: "🏊" },
  { id: "solar_pv", label: "Solar PV System", article: "NEC 690", description: "PV conductor, combiner & inverter sizing", color: "yellow", emoji: "☀️" },
  { id: "ev_charging", label: "EV Charging / EVSE", article: "NEC 625", description: "EV supply equipment circuit sizing", color: "green", emoji: "🚗" },
  { id: "data_center", label: "Critical / Data Center", article: "NEC 645 / 708", description: "IT equipment and UPS load calculation", color: "slate", emoji: "🖥️" },
  { id: "rv_park_load", label: "RV Park / Campsite Load", article: "NEC Table 551.73(A)", description: "Campground service & feeder load calculation", color: "green", emoji: "🚐" },
  { id: "marina_shore_power", label: "Marina Shore Power", article: "NEC 555.12", description: "Marina shore power demand & service sizing", color: "cyan", emoji: "⚓" },
  { id: "pull_box_sizing", label: "Pull Box Sizing", article: "NEC 314.28", description: "Straight, angle & U pull box dimensions", color: "purple", emoji: "📐" },
  { id: "neutral_load", label: "Neutral Load", article: "NEC 220.61", description: "Feeder & service neutral load with permitted reductions", color: "orange", emoji: "⚖️" },
];

const gradientMap = {
  blue: "from-blue-500/20 to-blue-600/20",
  green: "from-emerald-500/20 to-green-600/20",
  purple: "from-purple-500/20 to-violet-600/20",
  orange: "from-orange-400/20 to-orange-500/20",
  red: "from-red-500/20 to-rose-600/20",
  teal: "from-teal-500/20 to-cyan-600/20",
  indigo: "from-indigo-500/20 to-indigo-600/20",
  yellow: "from-amber-400/20 to-yellow-500/20",
  slate: "from-slate-500/20 to-slate-600/20",
  amber: "from-amber-500/20 to-orange-500/20",
  cyan: "from-cyan-500/20 to-sky-600/20",
  gray: "from-gray-500/20 to-slate-600/20",
};

const bgMap = {
  blue: "bg-blue-50 border-blue-100",
  green: "bg-emerald-50 border-emerald-100",
  purple: "bg-purple-50 border-purple-100",
  orange: "bg-orange-50 border-orange-100",
  red: "bg-red-50 border-red-100",
  teal: "bg-teal-50 border-teal-100",
  indigo: "bg-indigo-50 border-indigo-100",
  yellow: "bg-amber-50 border-amber-100",
  slate: "bg-slate-50 border-slate-100",
  amber: "bg-amber-50 border-amber-100",
  cyan: "bg-cyan-50 border-cyan-100",
  gray: "bg-gray-50 border-gray-100",
};

const accentMap = {
  blue: "border-l-blue-500",
  green: "border-l-emerald-500",
  purple: "border-l-purple-500",
  orange: "border-l-orange-500",
  red: "border-l-red-500",
  teal: "border-l-teal-500",
  indigo: "border-l-indigo-500",
  yellow: "border-l-amber-500",
  slate: "border-l-slate-500",
  amber: "border-l-amber-500",
  cyan: "border-l-cyan-500",
  gray: "border-l-gray-500",
};

// Category groups keyed by the calculator `color` field, with friendly labels.
const CATEGORY_GROUPS = [
  { key: "amber", label: "Grounding & Bonding" },
  { key: "orange", label: "Dwelling & Multi-family" },
  { key: "red", label: "Overcurrent & Protection" },
  { key: "teal", label: "Motors" },
  { key: "blue", label: "General Load" },
  { key: "green", label: "Power & Generation" },
  { key: "purple", label: "Boxes & Circuits" },
  { key: "indigo", label: "Conduit & Power Math" },
  { key: "yellow", label: "Transformers & Lighting" },
  { key: "slate", label: "Service & Critical" },
  { key: "cyan", label: "HVAC & Wet Locations" },
  { key: "gray", label: "Special Equipment" },
];

export default function NECCalculator() {
  const { calcId } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState("all");
  const { pullDistance, isRefreshing, containerRef } = usePullToRefresh(() => Promise.resolve());

  const selectedCat = calcId ? NEC_CATEGORIES.find(c => c.id === calcId) : null;

  const filtered = NEC_CATEGORIES.filter(c =>
    (activeGroup === "all" || c.color === activeGroup) &&
    (c.label.toLowerCase().includes(search.toLowerCase()) ||
    c.article.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelect = (id) => {
    navigate(`/calculator/${id}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    navigate("/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Calculator detail view
  if (selectedCat) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="calculator"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {/* Back button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 mb-4 text-sm font-semibold text-blue-600 hover:text-blue-700 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            All Calculators
          </button>

          <CalculatorPanel category={selectedCat} />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <div ref={containerRef}>
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      <motion.div
        key="list"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="space-y-5"
      >
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-violet-700 p-5 text-white shadow-xl shadow-blue-200">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-8 w-20 h-20 bg-violet-400/20 rounded-full blur-xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-blue-200">NEC Reference</span>
            </div>
            <h1 className="text-2xl font-extrabold leading-tight">Calculation Suite</h1>
            <p className="text-sm text-blue-100 mt-1">{NEC_CATEGORIES.length} calculators · Tap to start</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-10 h-11 rounded-xl border-border/60 bg-white dark:bg-card shadow-sm text-sm"
            placeholder="Search calculations, articles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 nec-scroll">
          <button
            onClick={() => setActiveGroup("all")}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all",
              activeGroup === "all"
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-blue-300"
            )}
          >
            All
          </button>
          {CATEGORY_GROUPS.map((g) => {
            const count = NEC_CATEGORIES.filter(c => c.color === g.key).length;
            if (count === 0) return null;
            const active = activeGroup === g.key;
            return (
              <button
                key={g.key}
                onClick={() => setActiveGroup(g.key)}
                className={cn(
                  "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap",
                  active
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-blue-300"
                )}
              >
                {g.label} <span className="opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No calculations found</div>
        )}

        {/* Category grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((cat, i) => (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.025, duration: 0.2 }}
              onClick={() => handleSelect(cat.id)}
              className={cn(
                "group relative text-left w-full rounded-2xl border border-border p-4 pl-5 bg-white shadow-md",
                "hover:shadow-xl hover:shadow-blue-100/60 hover:-translate-y-1 hover:border-blue-200 active:scale-[0.98] transition-all duration-300 ease-out",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                "border-l-4",
                accentMap[cat.color]
              )}
            >
              <div className="flex items-start gap-3">
                {/* Icon bubble */}
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0",
                  "bg-gradient-to-br shadow-sm ring-1 ring-black/5 group-hover:scale-105 transition-all duration-300",
                  gradientMap[cat.color]
                )}>
                  <span>{cat.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground leading-snug">{cat.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{cat.description}</p>
                  <span className={cn(
                    "inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm",
                    bgMap[cat.color]
                  )}>
                    {cat.article}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 mt-0.5 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all duration-300" />
              </div>
            </motion.button>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground pb-2">{NEC_CATEGORIES.length} calculations available</p>
      </motion.div>
      </div>
    </AnimatePresence>
  );
}