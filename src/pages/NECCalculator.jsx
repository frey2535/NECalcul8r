import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowLeft, Zap, ChevronRight, Lock, ShoppingCart } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import CalculatorPanel from "@/components/calculator/CalculatorPanel";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import PullToRefreshIndicator from "@/components/ui/PullToRefreshIndicator";
import { useAuth } from "@/lib/AuthContext";
import { getCalculatorAccess } from "@/lib/pricing";
import { CATEGORY_GROUPS, NEC_CATEGORIES } from "@/data/calculatorCatalog";

export { NEC_CATEGORIES };

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

export default function NECCalculator() {
  const { calcId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState("all");
  const { pullDistance, isRefreshing, containerRef } = usePullToRefresh(() => Promise.resolve());

  const selectedCat = calcId ? NEC_CATEGORIES.find(c => c.id === calcId) : null;
  const calculatorAccess = useMemo(() => getCalculatorAccess(NEC_CATEGORIES, user), [user]);

  const matchesActiveFilters = (c) =>
    (activeGroup === "all" || c.color === activeGroup) &&
    (c.label.toLowerCase().includes(search.toLowerCase()) ||
    c.article.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase()));

  const visibleTierSections = calculatorAccess.tierSections
    .map((section) => ({
      ...section,
      categories: section.categories.filter(matchesActiveFilters),
    }))
    .filter((section) => section.categories.length > 0);
  const filteredCount = visibleTierSections.reduce((total, section) => total + section.categories.length, 0);

  const handleSelect = (id) => {
    if (!calculatorAccess.isAllowed(id)) {
      navigate("/purchase");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigate(`/calculator/${id}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    navigate("/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Calculator detail view
  if (selectedCat) {
    const selectedLocked = !calculatorAccess.isAllowed(selectedCat.id);
    const selectedTier = calculatorAccess.tierSections.find((section) =>
      section.categories.some((category) => category.id === selectedCat.id)
    );
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

          {selectedLocked ? (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-xl text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
                <Lock className="w-7 h-7 text-amber-600" />
              </div>
              <h1 className="mt-4 text-2xl font-extrabold text-foreground">{selectedCat.label} requires an upgrade</h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
                Your current plan is {calculatorAccess.entitlement.label}, which includes {calculatorAccess.includedCount} of {calculatorAccess.totalCount} calculators.
                Upgrade to {selectedTier?.label || "a higher tier"} to unlock this calculator and any higher-tier tools.
              </p>
              <button
                type="button"
                onClick={() => navigate("/purchase")}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-3 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                View purchase options
              </button>
            </div>
          ) : (
            <CalculatorPanel category={selectedCat} />
          )}
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
            <p className="text-sm text-blue-100 mt-1">
              {calculatorAccess.isFullAccess
                ? `${NEC_CATEGORIES.length} calculators · Tap to start`
                : `${calculatorAccess.includedCount} of ${NEC_CATEGORIES.length} calculators included · Upgrade anytime`}
            </p>
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

        {filteredCount === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No calculations found</div>
        )}

        {/* Tiered calculator groups */}
        <div className="space-y-5">
          {visibleTierSections.map((section, sectionIndex) => {
            const sectionLocked = section.categories.every((cat) => !calculatorAccess.isAllowed(cat.id));
            return (
              <section key={section.planKey} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-black text-foreground">{section.label}</h2>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        {section.categories.length} calculator{section.categories.length === 1 ? "" : "s"}
                      </span>
                      {sectionLocked && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-black">
                          <Lock className="w-3 h-3" />
                          Upgrade tier
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {section.categories.map((cat, i) => {
                    const locked = !calculatorAccess.isAllowed(cat.id);
                    return (
                      <motion.button
                        key={cat.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: sectionIndex * 0.04 + i * 0.015, duration: 0.2 }}
                        onClick={() => handleSelect(cat.id)}
                        className={cn(
                          "group relative text-left w-full rounded-2xl border border-border p-4 pl-5 bg-white shadow-md",
                          "hover:shadow-xl hover:shadow-blue-100/60 hover:-translate-y-1 hover:border-blue-200 active:scale-[0.98] transition-all duration-300 ease-out",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                          "border-l-4",
                          locked && "opacity-75",
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
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-foreground leading-snug">{cat.label}</p>
                              {locked && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-black">
                                  <Lock className="w-3 h-3" />
                                  Upgrade
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{cat.description}</p>
                            <span className={cn(
                              "inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm",
                              bgMap[cat.color]
                            )}>
                              {cat.article}
                            </span>
                          </div>
                          {locked ? (
                            <Lock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 mt-0.5 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all duration-300" />
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground pb-2">
          {calculatorAccess.isFullAccess
            ? `${NEC_CATEGORIES.length} calculations available`
            : `${calculatorAccess.includedCount} calculations included in ${calculatorAccess.entitlement.label}`}
        </p>
      </motion.div>
      </div>
    </AnimatePresence>
  );
}