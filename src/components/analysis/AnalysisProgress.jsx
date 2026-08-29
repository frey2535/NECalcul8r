import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, StopCircle, AlertTriangle, AlertCircle, Info, FileWarning } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

function LiveFindingsTicker({ violations, missingDocs }) {
  const critical = violations.filter(v => v.severity === "critical").length;
  const major = violations.filter(v => v.severity === "major").length;
  const minor = violations.filter(v => v.severity === "minor").length;

  const stats = [
    { label: "Critical", value: critical, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50 border-red-200" },
    { label: "Major", value: major, icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50 border-amber-200" },
    { label: "Minor", value: minor, icon: Info, color: "text-blue-500", bg: "bg-blue-50 border-blue-200" },
    { label: "Missing Docs", value: missingDocs.length, icon: FileWarning, color: "text-primary", bg: "bg-primary/5 border-primary/20" },
  ];

  const lastFew = violations.slice(-3).reverse();

  return (
    <div className="w-full space-y-4">
      {/* Live stat counters */}
      <div className="grid grid-cols-4 gap-2">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <motion.div
            key={label}
            className={`rounded-xl border p-3 text-center ${bg}`}
            animate={{ scale: value > 0 ? [1, 1.06, 1] : 1 }}
            transition={{ duration: 0.3 }}
          >
            <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
            <div className={`text-xl font-bold ${color}`}>{value}</div>
            <div className="text-[10px] text-muted-foreground leading-tight">{label}</div>
          </motion.div>
        ))}
      </div>

      {/* Live feed of last findings */}
      {lastFew.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-3 py-2 border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Latest Findings
          </div>
          <div className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {lastFew.map((v, i) => (
                <motion.div
                  key={`${v.nec_article}-${v.violation_description?.slice(0, 20)}-${i}`}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-3 py-2 flex items-start gap-2"
                >
                  <span className={`mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase flex-shrink-0 ${
                    v.severity === "critical" ? "bg-red-100 text-red-700" :
                    v.severity === "major" ? "bg-amber-100 text-amber-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {v.severity}
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs font-mono font-semibold text-primary mr-1">{v.nec_article}</span>
                    <span className="text-xs text-muted-foreground line-clamp-1">{v.violation_description}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {violations.length === 0 && (
        <div className="text-xs text-center text-muted-foreground py-2">
          Findings will appear here as pages are analyzed...
        </div>
      )}
    </div>
  );
}

export default function AnalysisProgress({ label, progress, chunksTotal, chunksDone, violations = [], missingDocs = [], onStop, stopped }) {
  const pagesTotal = chunksTotal;
  const pagesDone = chunksDone;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto space-y-6 py-10"
    >
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="relative mx-auto w-16 h-16">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="relative w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Zap className="w-7 h-7 text-primary" />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold">Analyzing Blueprints</h2>
          <p className="text-sm text-muted-foreground mt-1 min-h-[18px]">{label}</p>
        </div>
      </div>

      {/* Progress bar + page counter */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{pagesTotal > 0 ? `${pagesDone} / ${pagesTotal} pages` : "Preparing..."}</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-2.5 rounded-full" />
      </div>

      {/* Live findings */}
      <LiveFindingsTicker violations={violations} missingDocs={missingDocs} />

      {/* Stop button */}
      <div className="text-center">
        {!stopped ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10"
            onClick={onStop}
          >
            <StopCircle className="w-4 h-4" />
            Stop Analysis
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Stopping after current pages finish...</p>
        )}
      </div>
    </motion.div>
  );
}