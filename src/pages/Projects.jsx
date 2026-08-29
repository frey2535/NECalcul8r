import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Pencil,
  Trash2,
  Calculator,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { flattenSnapshot } from "@/lib/calcSnapshot";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import PullToRefreshIndicator from "@/components/ui/PullToRefreshIndicator";
import { cn } from "@/lib/utils";

export default function Projects() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState({});
  const [renameProject, setRenameProject] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeCalc, setActiveCalc] = useState(null);

  const { data: projects = [], refetch: refetchProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-updated_date", 200),
  });
  const { data: saved = [], refetch: refetchSaved } = useQuery({
    queryKey: ["saved-calculations"],
    queryFn: () => base44.entities.SavedCalculation.list("-updated_date", 500),
  });

  const refetch = async () => {
    await Promise.all([refetchProjects(), refetchSaved()]);
  };
  const { pullDistance, isRefreshing, containerRef } = usePullToRefresh(refetch);

  const grouped = useMemo(() => {
    const byId = new Map(projects.map((p) => [p.id, { project: p, calcs: [] }]));
    const orphans = [];
    for (const calc of saved) {
      const bucket = byId.get(calc.project_id);
      if (bucket) bucket.calcs.push(calc);
      else orphans.push(calc);
    }
    const rows = [...byId.values()].sort(
      (a, b) => new Date(b.project.updated_date) - new Date(a.project.updated_date)
    );
    if (orphans.length) {
      rows.push({
        project: { id: "orphans", name: "Ungrouped", updated_date: orphans[0].updated_date },
        calcs: orphans,
        orphan: true,
      });
    }
    return rows;
  }, [projects, saved]);

  const renameMutation = useMutation({
    mutationFn: ({ id, name }) => base44.entities.Project.update(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["saved-calculations"] });
      setRenameProject(null);
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["saved-calculations"] });
      setDeleteTarget(null);
      toast({ title: "Project deleted" });
    },
  });

  const deleteCalcMutation = useMutation({
    mutationFn: (id) => base44.entities.SavedCalculation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-calculations"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDeleteTarget(null);
      setActiveCalc(null);
      toast({ title: "Calculation deleted" });
    },
  });

  const openCalculator = (calc) => {
    if (!calc.calculator_id) return;
    navigate(`/calculator/${calc.calculator_id}?saved=${encodeURIComponent(calc.id)}`);
  };

  const totalCalcs = saved.length;

  return (
    <div ref={containerRef}>
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5 max-w-3xl mx-auto"
      >
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 via-slate-800 to-blue-900 p-5 text-white shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold">Projects</h1>
              <p className="text-sm text-slate-300">
                {projects.length} project{projects.length !== 1 ? "s" : ""} · {totalCalcs} saved calculation{totalCalcs !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-3">
            Your jobs only. Open a calculator, tap Save, and name it under a project.
          </p>
        </div>

        {grouped.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
            <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="font-semibold text-lg">No saved calculations yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Run a calculator, then save it under a project name like “Smith residence”.
            </p>
            <Button onClick={() => navigate("/")}>Open calculators</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {grouped.map(({ project, calcs, orphan }) => {
              const isOpen = expanded[project.id] !== false;
              return (
                <div key={project.id} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpanded((p) => ({ ...p, [project.id]: !isOpen }))}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{project.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {calcs.length} calculation{calcs.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {!orphan && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setRenameProject(project);
                            setRenameValue(project.name);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDeleteTarget({ type: "project", id: project.id, name: project.name })}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    )}
                  </button>
                  {isOpen && (
                    <div className="border-t border-border/60 divide-y divide-border/50">
                      {calcs.length === 0 ? (
                        <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                          No calculations in this project yet.
                        </p>
                      ) : (
                        calcs.map((calc) => (
                          <button
                            key={calc.id}
                            type="button"
                            onClick={() => setActiveCalc(calc)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
                              <Calculator className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{calc.title || calc.calculator_label}</p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {calc.calculator_label}
                                {calc.summary ? ` · ${calc.summary}` : ""}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-[10px] flex-shrink-0">
                              NEC {calc.nec_year}
                            </Badge>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      <Dialog open={!!renameProject} onOpenChange={(open) => { if (!open) setRenameProject(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
            <DialogDescription>This name is only on your saved jobs.</DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && renameValue.trim() && renameProject) {
                renameMutation.mutate({ id: renameProject.id, name: renameValue.trim() });
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameProject(null)}>Cancel</Button>
            <Button
              disabled={!renameValue.trim() || renameMutation.isPending}
              onClick={() => renameMutation.mutate({ id: renameProject.id, name: renameValue.trim() })}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!activeCalc} onOpenChange={(open) => { if (!open) setActiveCalc(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {activeCalc && (
            <>
              <DialogHeader>
                <DialogTitle>{activeCalc.title || activeCalc.calculator_label}</DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2">
                  <span>{activeCalc.project_name}</span>
                  <Badge variant="outline">NEC {activeCalc.nec_year}</Badge>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(activeCalc.updated_date || activeCalc.created_date).toLocaleDateString()}
                  </span>
                </DialogDescription>
              </DialogHeader>
              <SnapshotBlock title="Results" data={activeCalc.outputs} />
              <SnapshotBlock title="Inputs" data={activeCalc.inputs} />
              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setDeleteTarget({ type: "calc", id: activeCalc.id, name: activeCalc.title || activeCalc.calculator_label })}
                >
                  Delete
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setActiveCalc(null)}>Close</Button>
                  <Button onClick={() => openCalculator(activeCalc)}>Open in calculator</Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === "project" ? "Delete project?" : "Delete calculation?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "project"
                ? `This removes “${deleteTarget?.name}” and every calculation saved under it. This cannot be undone.`
                : `This removes “${deleteTarget?.name}” from your projects. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget?.type === "project") deleteProjectMutation.mutate(deleteTarget.id);
                else deleteCalcMutation.mutate(deleteTarget.id);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SnapshotBlock({ title, data }) {
  const rows = flattenSnapshot(data).slice(0, 24);
  if (rows.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
      <div className="rounded-xl border border-border/60 divide-y divide-border/50 overflow-hidden">
        {rows.map((row, i) => (
          <div key={`${row.label}-${i}`} className="flex items-start justify-between gap-3 px-3 py-2 text-xs">
            <span className={cn("text-muted-foreground min-w-0")}>{row.label}</span>
            <span className="font-semibold tabular-nums text-right flex-shrink-0">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
