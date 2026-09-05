import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Zap, Search, ChevronRight, Calculator, BookOpen, ShieldCheck,
  Check, ArrowRight, Calendar, Layers, X, Eye, GraduationCap,
  ClipboardCheck, FlaskConical, HardHat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NEC_CATEGORIES } from "@/pages/NECCalculator";
import { bgMap } from "@/components/landing/MockPrimitives";
import {
  VoltageDropPreview, DwellingLoadPreview, EGCSizingPreview, RVParkPreview,
} from "@/components/landing/CalcPreview";
import {
  CommercialLoadPreview, ServiceSizingPreview, TransformerSizingPreview,
  ConduitFillPreview, BoxFillPreview, SolarPVPreview, GeneratorPreview,
  MotorCircuitPreview, GECPreview, OvercurrentProtectionPreview,
  ShortCircuitPreview, EVChargingPreview, MarinaPreview,
  DemandFactorPreview, PowerFactorPreview, MultiWirePreview,
} from "@/components/landing/CalcPreviews2";
import {
  NECTablesPreview, CalculationTracePreview, NECYearSelectorPreview,
} from "@/components/landing/FeaturePreviews";
import { PROFESSIONS, ProfessionCard } from "@/components/landing/ProfessionCards";

const TABS = [
  { key: "calculators", path: "/", label: "Calculators", icon: Calculator },
  { key: "tables", path: "/nec-tables", label: "NEC Tables", icon: BookOpen },
];

const HERO_FEATURES = [
  "Step-by-step math",
  "Formula breakdowns",
  "Embedded NEC tables",
  "NEC references",
  "Calculation Trace",
  "Transparent results",
  "Multi-year NEC support",
];

const WHY_CARDS = [
  {
    icon: Calculator,
    title: "STEP-BY-STEP CALCULATIONS",
    desc: "Every calculation shows the formula, numbers substituted, intermediate math, and final answer.",
    preview: <VoltageDropPreview />,
  },
  {
    icon: BookOpen,
    title: "EMBEDDED NEC TABLES",
    desc: "Quickly reference NEC tables without leaving the application.",
    preview: <NECTablesPreview />,
  },
  {
    icon: Eye,
    title: "CALCULATION TRACE",
    desc: "Know exactly where every answer comes from — article references, source editions, and verification status.",
    preview: <CalculationTracePreview />,
  },
  {
    icon: Calendar,
    title: "MULTIPLE NEC EDITIONS",
    desc: "Switch between supported NEC editions to compare code requirements and calculations.",
    preview: <NECYearSelectorPreview />,
  },
];

const FEATURED_CALCS = [
  { id: "voltage_drop", label: "Voltage Drop", article: "NEC 210.19 / 215.2", emoji: "⚡", color: "blue", preview: <VoltageDropPreview /> },
  { id: "dwelling_standard", label: "Dwelling Load", article: "NEC 220.82", emoji: "🏠", color: "orange", preview: <DwellingLoadPreview /> },
  { id: "commercial_load", label: "Commercial Load", article: "NEC 220.12 / 220.42", emoji: "🏢", color: "red", preview: <CommercialLoadPreview /> },
  { id: "service_sizing", label: "Service Sizing", article: "NEC 230.42", emoji: "🏗️", color: "slate", preview: <ServiceSizingPreview /> },
  { id: "transformer_sizing", label: "Transformer Sizing", article: "NEC 450.3", emoji: "🔋", color: "yellow", preview: <TransformerSizingPreview /> },
  { id: "conduit_fill", label: "Conduit Fill", article: "NEC Ch.9 Table 1", emoji: "🔵", color: "indigo", preview: <ConduitFillPreview /> },
  { id: "box_fill", label: "Box Fill", article: "NEC 314.16", emoji: "📦", color: "purple", preview: <BoxFillPreview /> },
  { id: "solar_pv", label: "Solar PV", article: "NEC 690 / 705", emoji: "☀️", color: "yellow", preview: <SolarPVPreview /> },
  { id: "generator_sizing", label: "Generator", article: "NEC 702 / 445", emoji: "🔦", color: "green", preview: <GeneratorPreview /> },
  { id: "motor_full_load", label: "Motor Circuits", article: "NEC 430.6 / 430.22", emoji: "⚙️", color: "teal", preview: <MotorCircuitPreview /> },
  { id: "grounding_electrode", label: "Grounding", article: "NEC 250.66", emoji: "⛏️", color: "amber", preview: <GECPreview /> },
  { id: "overcurrent_protection", label: "Overcurrent Protection", article: "NEC 240.4 / 240.6", emoji: "🛡️", color: "red", preview: <OvercurrentProtectionPreview /> },
  { id: "short_circuit", label: "Short Circuit", article: "NEC 110.9 / 110.10", emoji: "⚠️", color: "red", preview: <ShortCircuitPreview /> },
  { id: "ev_charging", label: "EV Charging", article: "NEC 625", emoji: "🚗", color: "green", preview: <EVChargingPreview /> },
  { id: "rv_park_load", label: "RV Park", article: "NEC Table 551.73(A)", emoji: "🚐", color: "green", preview: <RVParkPreview /> },
  { id: "marina_shore_power", label: "Marina Shore Power", article: "NEC 555.12", emoji: "⚓", color: "cyan", preview: <MarinaPreview /> },
  { id: "demand_factor", label: "Demand Factors", article: "NEC 220.42 / 220.44", emoji: "📊", color: "blue", preview: <DemandFactorPreview /> },
  { id: "power_factor", label: "Power Factor", article: "IEEE / NEC 460", emoji: "📐", color: "green", preview: <PowerFactorPreview /> },
  { id: "multiwire_branch", label: "Multi-Wire Branch", article: "NEC 210.4", emoji: "〰️", color: "purple", preview: <MultiWirePreview /> },
];

const TYPICAL_CONS = [
  "Final answer only",
  "Hidden formulas",
  "Separate code book required",
  "No calculation trace",
  "Limited learning value",
];

const NECALC8R_PROS = [
  "Formula shown",
  "Every calculation step",
  "Embedded NEC tables",
  "NEC references",
  "Calculation Trace",
  "Multi-year NEC support",
  "Transparent calculations",
  "Built for learning and professional use",
];

const TRUST_ITEMS = [
  { icon: Calculator, text: "Transparent step-by-step calculations" },
  { icon: BookOpen, text: "Embedded NEC reference tables" },
  { icon: Layers, text: "Centralized NEC data" },
  { icon: Eye, text: "Calculation Trace" },
  { icon: Calendar, text: "Multi-year NEC support" },
  { icon: FlaskConical, text: "Automated regression testing" },
  { icon: ClipboardCheck, text: "Tested using a dedicated Testing Agent" },
  { icon: HardHat, text: "Built by an Electrical Contractor" },
];

const LEARNING_USES = [
  "Learning", "Teaching", "Training", "Troubleshooting",
  "Plan Review", "Estimating", "Engineering", "Field Verification", "Inspection",
];

export default function Landing() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const handleGetStarted = () => navigate("/register");
  const handleSignIn = () => navigate("/login");
  const handleExplore = () => {
    const el = document.getElementById("calculators");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ─── Header (matches AppLayout exactly) ─── */}
      <header
        className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl shadow-sm"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link to="/landing" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-md shadow-blue-200">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight leading-none text-foreground">NECalcul8r</h1>
                <p className="text-[9px] font-semibold text-muted-foreground tracking-widest uppercase">Electrical Tools</p>
              </div>
            </Link>

            <div className="flex items-center gap-1">
              <nav className="hidden sm:flex items-center gap-1">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button key={tab.key} onClick={handleGetStarted}>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                        <Icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </div>
                    </button>
                  );
                })}
              </nav>

              <div className="hidden sm:flex items-center gap-1.5 ml-2 mr-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">NEC 2023</span>
              </div>

              <Button size="sm" onClick={handleSignIn} className="ml-1 h-8 bg-blue-600 hover:bg-blue-700">
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 w-full">

        {/* ═══ HERO SECTION ═══ */}
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left: Headline + copy */}
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-widest">Professional Electrical Platform</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight text-foreground tracking-tight">
                Professional Electrical Calculations for the Entire Electrical Industry
              </h1>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl">
                NECalcul8r is a professional electrical calculation and reference platform that helps engineers, electricians, inspectors, instructors, estimators, project managers, students, and apprentices perform, understand, and verify electrical calculations with confidence.
              </p>

              {/* Feature bullets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                {HERO_FEATURES.map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-emerald-600" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">{f}</span>
                  </div>
                ))}
              </div>

              {/* Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  onClick={handleGetStarted}
                  className="bg-blue-600 hover:bg-blue-700 h-11 px-6 text-sm font-bold"
                >
                  Start Calculating
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
                <Button
                  onClick={handleExplore}
                  variant="outline"
                  className="h-11 px-6 text-sm font-bold"
                >
                  View Calculators
                </Button>
              </div>
            </div>

            {/* Right: Voltage Drop screenshot */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-blue-100 to-violet-100 rounded-3xl blur-2xl opacity-60" />
              <div className="relative rounded-2xl border border-border bg-white shadow-xl shadow-blue-100 p-4 sm:p-5 overflow-hidden">
                <VoltageDropPreview />
              </div>
            </div>
          </div>
        </section>

        {/* ═══ WHY NECALCUL8R ═══ */}
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-10 sm:py-16">
          <div className="text-center mb-8">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Why NECalcul8r</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Built for Compliance, Not Just Math</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {WHY_CARDS.map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.25 }}
                  className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wide leading-tight">{card.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{card.desc}</p>
                  </div>
                  <div className="border-t border-border bg-muted/20 p-4 sm:p-5 max-h-[400px] overflow-hidden">
                    {card.preview}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ═══ WHO USES NECALCUL8R ═══ */}
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-10 sm:py-16">
          <div className="text-center mb-8">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Who Uses NECalcul8r</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Built for the Entire Industry</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl mx-auto">From apprentices to engineers — NECalcul8r serves every role in the electrical trade.</p>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {PROFESSIONS.map((p, i) => (
              <ProfessionCard key={p.label} profession={p} index={i} />
            ))}
          </div>
        </section>

        {/* ═══ FEATURED CALCULATORS ═══ */}
        <section id="calculators" className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-10 sm:py-16">
          <div className="text-center mb-8">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Featured Calculators</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">{FEATURED_CALCS.length} Calculators with Real Screenshots</h2>
            <p className="text-sm text-muted-foreground mt-2">Every calculator shows its full interface — inputs, results, formulas, and NEC references.</p>
          </div>

          {/* Search */}
          <div className="relative mb-6 max-w-md mx-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              className="pl-10 h-11 w-full rounded-xl border border-border/60 bg-white shadow-sm text-sm"
              placeholder="Search calculators..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURED_CALCS
              .filter(c => !search || c.label.toLowerCase().includes(search.toLowerCase()) || c.article.toLowerCase().includes(search.toLowerCase()))
              .map((calc, i) => (
                <motion.div
                  key={calc.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}
                  className="group rounded-2xl border border-border bg-white shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
                >
                  {/* Card header */}
                  <div className="flex items-center gap-3 p-4 border-b border-border">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0",
                      bgMap[calc.color]
                    )}>
                      {calc.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground leading-tight">{calc.label}</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{calc.article}</p>
                    </div>
                  </div>
                  {/* Screenshot */}
                  <div className="bg-muted/20 p-4 max-h-[380px] overflow-hidden">
                    {calc.preview}
                  </div>
                  {/* Footer */}
                  <div className="p-3 border-t border-border">
                    <button
                      onClick={handleGetStarted}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      Try this calculator
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
          </div>

          <div className="text-center mt-8">
            <Button
              onClick={handleGetStarted}
              variant="outline"
              className="h-11 px-6 text-sm font-bold"
            >
              View All {NEC_CATEGORIES.length} Calculators
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </section>

        {/* ═══ WHY PROFESSIONALS CHOOSE ═══ */}
        <section className="bg-muted/30 border-y border-border">
          <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-10 sm:py-16">
            <div className="text-center mb-8">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Why Professionals Choose NECalcul8r</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Not Just Another Calculator</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Typical Calculator */}
              <div className="rounded-2xl border border-border bg-white shadow-sm p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-extrabold text-muted-foreground">Typical Calculator</h3>
                </div>
                <div className="space-y-3">
                  {TYPICAL_CONS.map(item => (
                    <div key={item} className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                        <X className="w-3 h-3 text-red-500" />
                      </div>
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* NECalcul8r */}
              <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-violet-50 shadow-md p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-md shadow-blue-200">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-base font-extrabold text-foreground">NECalcul8r</h3>
                </div>
                <div className="space-y-2.5">
                  {NECALC8R_PROS.map(item => (
                    <div key={item} className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-emerald-600" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ WHY TRUST NECALCUL8R ═══ */}
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-10 sm:py-16">
          <div className="rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 sm:p-10 text-white shadow-2xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                <span className="text-[11px] font-bold text-blue-200 uppercase tracking-widest">Why Trust NECalcul8r</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold">Built with Transparency and Testing</h2>
              <p className="text-sm text-slate-300 mt-2 max-w-2xl mx-auto">Every aspect of NECalcul8r is designed for verifiable, traceable results.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {TRUST_ITEMS.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.text}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05, duration: 0.2 }}
                    className="rounded-2xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mb-3 shadow-lg shadow-blue-900/50">
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs font-semibold text-slate-100 leading-snug">{item.text}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══ BUILT FOR LEARNING ═══ */}
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-10 sm:py-16">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-100 mb-4">
                <GraduationCap className="w-3.5 h-3.5 text-violet-600" />
                <span className="text-[11px] font-bold text-violet-700 uppercase tracking-widest">Built for Learning</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-4">Understand WHY, Not Just WHAT</h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6">
                NECalcul8r is built for the entire electrical industry — from apprentices learning the trade to engineers designing complex systems. The emphasis is on understanding <strong className="text-foreground">why</strong> an answer is correct, not just what the answer is. Every formula, every step, and every NEC reference is visible and traceable.
              </p>

              <div className="flex flex-wrap gap-2">
                {LEARNING_USES.map(use => (
                  <span key={use} className="px-3 py-1.5 rounded-lg bg-muted text-xs font-bold text-foreground border border-border">
                    {use}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-white shadow-xl shadow-blue-100 p-4 sm:p-5">
              <EGCSizingPreview />
            </div>
          </div>
        </section>

        {/* ═══ CALL TO ACTION ═══ */}
        <section className="relative overflow-hidden">
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-violet-700 px-3 sm:px-6 lg:px-8 py-12 sm:py-20">
            <div className="max-w-4xl mx-auto text-center text-white">
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute bottom-0 left-8 w-20 h-20 bg-violet-400/20 rounded-full blur-xl" />

              <div className="relative">
                <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Start Calculating with Confidence</h2>
                <p className="text-sm sm:text-base text-blue-100 max-w-2xl mx-auto mb-8 leading-relaxed">
                  Whether you're designing electrical systems, reviewing plans, estimating projects, teaching apprentices, inspecting installations, or working in the field, NECalcul8r provides professional calculations with transparent formulas and traceable results.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    onClick={handleGetStarted}
                    className="bg-white text-blue-700 hover:bg-blue-50 h-12 px-8 text-sm font-bold"
                  >
                    Start Free Trial
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button
                    onClick={handleGetStarted}
                    variant="outline"
                    className="bg-white/10 text-white border-white/30 hover:bg-white/20 hover:text-white h-12 px-8 text-sm font-bold"
                  >
                    Request Demo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-md shadow-blue-200">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">NECalcul8r</p>
                <p className="text-[9px] text-muted-foreground font-semibold tracking-widest uppercase">Electrical Tools</p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              NEC 2017 · 2020 · 2023 · 2026 · {NEC_CATEGORIES.length} calculators
            </p>
          </div>
        </div>
      </footer>

      {/* ─── Mobile Bottom Nav (matches AppLayout) ─── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border/60 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-around py-1.5 px-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.key} onClick={handleGetStarted} className="flex-1 min-h-12">
                <div className="flex flex-col items-center gap-1 py-1.5 rounded-xl mx-1 transition-all text-muted-foreground">
                  <div className="w-10 h-6 rounded-full flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-semibold">{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}