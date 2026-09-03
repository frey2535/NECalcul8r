import React, { useState } from "react";
import { motion } from "framer-motion";
import { Search, BookOpen, ChevronDown, ChevronUp, FlaskConical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NEC_TABLES } from "@/lib/necTables";
import NECTableDisplay from "@/components/calculator/NECTableDisplay";
import { cn } from "@/lib/utils";
import { useNECYear } from "@/context/NECYearContext";
import { getNecData } from "@/data/nec";

const GROUPS = [
  { label: "Branch & Feeder Circuits", sub: "Article 210 / 215", prefix: "210", emoji: "🔌" },
  { label: "Load Calculations", sub: "Article 220", prefix: "220", emoji: "📊" },
  { label: "Overcurrent Protection", sub: "Article 240", prefix: "240", emoji: "🛡️" },
  { label: "Grounding & Bonding", sub: "Article 250", prefix: "250", emoji: "⛏️" },
  { label: "Conductors & Ampacity", sub: "Article 310", prefix: "310", emoji: "🔋" },
  { label: "Outlet & Junction Boxes", sub: "Article 314", prefix: "314", emoji: "📦" },
  { label: "Motors", sub: "Article 430", prefix: "430", emoji: "⚙️" },
  { label: "A/C & Refrigeration", sub: "Article 440", prefix: "440", emoji: "❄️" },
  { label: "Conduit Fill & Dimensions", sub: "Chapter 9 Tables 1–9", prefix: "ch9", emoji: "🔵" },
  { label: "Max Conductors per Conduit", sub: "NEC Annex C", prefix: "annex_c", emoji: "📐" },
  { label: "Transformers", sub: "Article 450", prefix: "450", emoji: "🔋" },
  { label: "Electric Welders", sub: "Article 630", prefix: "630", emoji: "🔥" },
  { label: "Recreational Vehicles", sub: "Article 551", prefix: "551", emoji: "🚐" },
  { label: "Marinas & Boatyards", sub: "Article 555", prefix: "555", emoji: "⚓" },
  { label: "General Reference", sub: "IEEE / NEC", prefix: "general", emoji: "📐" },
  { label: "Annex D Examples", sub: "NEC 2017 Annex D — Worked Calculations", prefix: "annex_d", emoji: "📝" },
];

// Resolves a table's rows through the centralized NEC year data when the
// table declares a `dynamicSource` — same object the live calculators use
// (getNecData(year).OCCUPANCY_UNIT_LOADS), so the Tables tab and the
// calculators can never drift apart for Table 220.12.
function resolveDynamicRows(t, year) {
  if (!t.dynamicSource) return t;
  const nec = getNecData(year);
  const source = nec[t.dynamicSource] || {};
  const pending = new Set(t.dynamicPendingKeys || []);
  const rows = Object.keys(source).map(key => {
    const label = t.dynamicLabels?.[key] || key;
    const isPending = pending.has(key) && year !== "2017";
    return [
      isPending ? `${label} (pending verification)` : label,
      `${source[key]}`,
    ];
  });
  return { ...t, rows };
}

function TableRow({ t, year }) {
  const [open, setOpen] = useState(false);
  const resolved = t.dynamicSource ? resolveDynamicRows(t, year) : t;
  return (
    <div className={cn(
      "rounded-xl border transition-all overflow-hidden shadow-sm hover:shadow-md",
      open ? "border-blue-200 shadow-md" : "border-border bg-white hover:border-blue-200"
    )}>
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left gap-3"
      >
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <span className="inline-block mt-0.5 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full flex-shrink-0">
            {resolved.article}
          </span>
          <span className="text-sm font-semibold text-foreground leading-snug">{resolved.title}</span>
          {(t.dynamicSource || t.yearRefs) && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
              <FlaskConical className="w-2.5 h-2.5" /> NEC {year}
            </span>
          )}
        </div>
        <div className="flex-shrink-0 text-muted-foreground">
          {open
            ? <ChevronUp className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4" />
          }
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-border/60 bg-slate-50/50">
          <div className="pt-3">
            <NECTableDisplay headers={resolved.headers} rows={resolved.rows} note={resolved.note} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function NECTables() {
  const [search, setSearch] = useState("");
  const { year } = useNECYear();

  const filtered = search.trim()
    ? NEC_TABLES.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.article.toLowerCase().includes(search.toLowerCase()) ||
        t.rows.some(row => row.some(cell => String(cell).toLowerCase().includes(search.toLowerCase())))
      )
    : null;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-5">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 p-5 text-white shadow-xl shadow-violet-200">
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-purple-200">NEC Reference</span>
        </div>
        <h1 className="text-2xl font-extrabold leading-tight">Code Tables</h1>
        <p className="text-sm text-purple-100 mt-1">{NEC_TABLES.length} tables · Tap any to expand</p>
        <p className="text-xs text-purple-100/80 mt-1">
          Showing NEC {year} — tables that changed by year (e.g. Table 220.12) resolve from the same centralized data the calculators use.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-10 h-11 rounded-xl border-border/60 bg-white shadow-sm text-sm"
          placeholder="Search by article, title, or value..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Results */}
      {filtered ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground px-1">{filtered.length} table{filtered.length !== 1 ? "s" : ""} matching "<strong>{search}</strong>"</p>
          {filtered.length === 0
            ? <p className="text-center text-muted-foreground py-12">No tables found</p>
            : filtered.map(t => <TableRow key={t.id} t={t} year={year} />)
          }
        </div>
      ) : (
        <div className="space-y-6">
          {GROUPS.map(group => {
            const tables = NEC_TABLES.filter(t => t.id.startsWith(group.prefix));
            if (tables.length === 0) return null;
            return (
              <div key={group.prefix} className="space-y-2">
                <div className="flex items-center gap-2.5 px-3 py-2.5 mb-3 rounded-xl bg-muted/40 border border-border/60 shadow-sm">
                  <span className="text-xl">{group.emoji}</span>
                  <div>
                    <h2 className="text-sm font-bold text-foreground leading-none">{group.label}</h2>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{group.sub}</p>
                  </div>
                  <span className="ml-auto text-[10px] font-bold text-muted-foreground bg-background border border-border px-2 py-0.5 rounded-full shadow-sm">
                    {tables.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {tables.map(t => <TableRow key={t.id} t={t} year={year} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}