import React, { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  FileDown,
  FolderOpen,
  Loader2,
  Pencil,
  Printer,
  Trash2,
  Calculator,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import CalculatorPanel from "@/components/calculator/CalculatorPanel";
import { NEC_CATEGORIES } from "@/pages/NECCalculator";
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
import { useAuth } from "@/lib/AuthContext";
import { getResolvedEntitlement } from "@/lib/pricing";
import { flattenSnapshot } from "@/lib/calcSnapshot";

const MAX_PDF_PAGE_HEIGHT_PX = 14000;

function pageOrientation(width, height) {
  return width > height ? "landscape" : "portrait";
}

function canvasSliceToImage(canvas, sourceY, sourceHeight) {
  if (sourceY === 0 && sourceHeight === canvas.height) {
    return canvas.toDataURL("image/png");
  }

  const slice = document.createElement("canvas");
  slice.width = canvas.width;
  slice.height = sourceHeight;
  const context = slice.getContext("2d");
  if (!context) throw new Error("Unable to prepare PDF image slice.");
  context.drawImage(
    canvas,
    0,
    sourceY,
    canvas.width,
    sourceHeight,
    0,
    0,
    canvas.width,
    sourceHeight
  );
  return slice.toDataURL("image/png");
}

function syncFormControlValues(sourceRoot, clonedRoot) {
  const sourceFields = sourceRoot.querySelectorAll("input, textarea, select");
  const clonedFields = clonedRoot.querySelectorAll("input, textarea, select");

  sourceFields.forEach((field, index) => {
    const clonedField = clonedFields[index];
    if (!clonedField) return;

    if ("value" in field && "value" in clonedField) {
      clonedField.value = field.value;
      clonedField.setAttribute("value", field.value);
    }
    if (field.tagName === "TEXTAREA") {
      clonedField.textContent = field.value;
    }
    if (field.tagName === "SELECT") {
      Array.from(clonedField.options || []).forEach((option) => {
        option.selected = option.value === field.value;
      });
    }
  });
}

function ReportRows({ title, rows, emptyLabel }) {
  return (
    <section className="break-inside-avoid">
      <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wide mb-2">{title}</h3>
      {rows.length ? (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm border-collapse">
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.label}-${index}`} className="border-b border-border last:border-0">
                  <th className="w-1/2 text-left align-top bg-muted/40 px-3 py-2 font-semibold text-foreground break-words">
                    {row.label}
                  </th>
                  <td className="align-top px-3 py-2 text-foreground break-words">
                    {row.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </section>
  );
}

function SavedCalculationReport({ calc }) {
  const inputRows = flattenSnapshot(calc.inputs);
  const resultRows = flattenSnapshot(calc.outputs);
  const updatedAt = calc.updated_date || calc.created_date || new Date().toISOString();
  const generatedAt = new Date().toLocaleString();

  return (
    <article className="saved-calculation-report bg-white text-slate-950 p-6 sm:p-8 rounded-2xl border border-border space-y-5">
      <header className="border-b border-slate-200 pb-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">NECalcul8r report</p>
        <h1 className="mt-2 text-2xl font-black leading-tight">{calc.title || calc.calculator_label || "Saved Calculation"}</h1>
        <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <p><span className="font-semibold">Calculator:</span> {calc.calculator_label || "N/A"}</p>
          <p><span className="font-semibold">NEC year:</span> {calc.nec_year || "N/A"}</p>
          <p><span className="font-semibold">Project:</span> {calc.project_name || "N/A"}</p>
          <p><span className="font-semibold">Article:</span> {calc.calculator_article || "NEC"}</p>
          <p><span className="font-semibold">Last updated:</span> {new Date(updatedAt).toLocaleString()}</p>
          <p><span className="font-semibold">Generated:</span> {generatedAt}</p>
        </div>
        {calc.summary && (
          <p className="mt-3 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2 text-sm font-semibold text-blue-900">
            Summary: {calc.summary}
          </p>
        )}
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <ReportRows title="Inputs" rows={inputRows} emptyLabel="No stored inputs were found for this saved calculation." />
        <ReportRows title="Results" rows={resultRows} emptyLabel="No stored results were found for this saved calculation." />
      </div>
    </article>
  );
}

export default function Projects() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const entitlement = getResolvedEntitlement(user);
  const [expanded, setExpanded] = useState({});
  const [renameProject, setRenameProject] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeCalc, setActiveCalc] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const printRef = useRef(null);

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

  const activeCategory = useMemo(() => {
    if (!activeCalc?.calculator_id) return null;
    const existing = NEC_CATEGORIES.find((cat) => cat.id === activeCalc.calculator_id);
    if (existing) return existing;
    return {
      id: activeCalc.calculator_id,
      label: activeCalc.calculator_label || activeCalc.title || "Saved Calculation",
      article: activeCalc.calculator_article || "NEC",
      description: "Saved calculation",
      color: "blue",
      emoji: "⚡",
    };
  }, [activeCalc]);

  const savedFileName = (calc) => {
    const raw = `${calc?.project_name || "Project"}_${calc?.title || calc?.calculator_label || "Calculation"}_${calc?.nec_year || "NEC"}`;
    return raw.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "NECalcul8r_saved_calculation";
  };

  const escapeHtml = (value) => String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const handlePrint = () => {
    if (!entitlement.canExportCompleteReports) {
      toast({ title: "Upgrade required", description: "Complete report printing is included with paid plans.", variant: "destructive" });
      return;
    }
    const node = printRef.current;
    if (!node) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "Print blocked", description: "Allow popups to print this saved calculation.", variant: "destructive" });
      return;
    }
    printWindow.opener = null;
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join("\n");
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(activeCalc?.title || activeCalc?.calculator_label || "Saved Calculation")}</title>
          ${styles}
          <style>
            @page { margin: 0.5in; }
            body { margin: 0; background: white; color: #0f172a; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
            .saved-calculation-report { box-shadow: none !important; border-color: #cbd5e1 !important; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { overflow-wrap: anywhere; word-break: break-word; }
            tr, section { break-inside: avoid; page-break-inside: avoid; }
            @media print { .no-print { display: none !important; } }
          </style>
        </head>
        <body>${node.outerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const handlePdf = async () => {
    if (!entitlement.canExportCompleteReports) {
      toast({ title: "Upgrade required", description: "Complete PDF export is included with paid plans.", variant: "destructive" });
      return;
    }
    const node = printRef.current;
    if (!node || !activeCalc) return;
    setExportingPdf(true);
    let captureNode = null;
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      await new Promise((resolve) => window.requestAnimationFrame(resolve));

      const bounds = node.getBoundingClientRect();
      const captureWidth = Math.ceil(Math.max(node.offsetWidth, bounds.width));
      const captureHeight = Math.ceil(Math.max(node.scrollHeight, node.offsetHeight, bounds.height));
      const renderedBackground = window.getComputedStyle(node).backgroundColor;
      const backgroundColor = renderedBackground && renderedBackground !== "rgba(0, 0, 0, 0)"
        ? renderedBackground
        : "#ffffff";
      const scale = Math.max(1, Math.min(2, window.devicePixelRatio || 1.5));

      captureNode = node.cloneNode(true);
      syncFormControlValues(node, captureNode);
      captureNode.style.position = "absolute";
      captureNode.style.left = "0";
      captureNode.style.top = `${window.scrollY}px`;
      captureNode.style.width = `${captureWidth}px`;
      captureNode.style.backgroundColor = backgroundColor;
      captureNode.style.pointerEvents = "none";
      captureNode.style.transform = "none";
      document.body.appendChild(captureNode);
      await new Promise((resolve) => window.requestAnimationFrame(resolve));

      const captureNodeHeight = Math.ceil(Math.max(captureNode.scrollHeight, captureNode.offsetHeight, captureHeight));
      const canvas = await html2canvas(captureNode, {
        backgroundColor,
        foreignObjectRendering: true,
        height: captureNodeHeight,
        imageTimeout: 15000,
        logging: false,
        scale,
        useCORS: true,
        width: captureWidth,
        windowWidth: window.innerWidth,
        windowHeight: captureNodeHeight,
        onclone: (clonedDocument) => {
          const clonedRoot = clonedDocument.querySelector("[data-saved-pdf-root]");
          if (clonedRoot) {
            clonedRoot.style.width = `${captureWidth}px`;
            clonedRoot.style.backgroundColor = backgroundColor;
          }
          const style = clonedDocument.createElement("style");
          style.textContent = `
            [data-saved-pdf-root],
            [data-saved-pdf-root] * {
              font-kerning: normal;
              text-rendering: geometricPrecision;
            }
            [data-saved-pdf-root] input,
            [data-saved-pdf-root] select,
            [data-saved-pdf-root] textarea {
              -webkit-appearance: none;
              appearance: none;
            }
          `;
          clonedDocument.head.appendChild(style);
          clonedDocument.querySelectorAll(".calculator-results").forEach((element) => {
            element.style.maxHeight = "none";
            element.style.overflow = "visible";
          });
        },
      });

      const pageWidth = canvas.width;
      const firstPageHeight = Math.min(canvas.height, MAX_PDF_PAGE_HEIGHT_PX);
      const pdf = new jsPDF({
        compress: true,
        format: [pageWidth, firstPageHeight],
        orientation: pageOrientation(pageWidth, firstPageHeight),
        unit: "pt",
      });

      let sourceY = 0;
      let pageIndex = 0;
      while (sourceY < canvas.height) {
        const remainingCanvasHeight = canvas.height - sourceY;
        const sliceCanvasHeight = Math.min(remainingCanvasHeight, MAX_PDF_PAGE_HEIGHT_PX);
        const pageHeight = sliceCanvasHeight;
        const imageData = canvasSliceToImage(canvas, sourceY, sliceCanvasHeight);

        if (pageIndex > 0) {
          pdf.addPage([pageWidth, pageHeight], pageOrientation(pageWidth, pageHeight));
        }
        pdf.addImage(imageData, "PNG", 0, 0, pageWidth, pageHeight);

        sourceY += sliceCanvasHeight;
        pageIndex += 1;
      }
      pdf.save(`${savedFileName(activeCalc)}.pdf`);
    } catch (error) {
      toast({
        title: "PDF export failed",
        description: error?.message || "Try printing this saved calculation instead.",
        variant: "destructive",
      });
    } finally {
      if (captureNode) captureNode.remove();
      setExportingPdf(false);
    }
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
        <DialogContent className="sm:max-w-6xl max-h-[92vh] overflow-y-auto">
          {activeCalc && activeCategory && (
            <>
              <div className="bg-background p-1 sm:p-2 space-y-3">
                <DialogHeader>
                  <DialogTitle className="sr-only">{activeCalc.title || activeCalc.calculator_label}</DialogTitle>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 text-left">
                      <h2 className="text-lg font-semibold leading-none tracking-tight">
                        {activeCalc.title || activeCalc.calculator_label}
                      </h2>
                      <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-2 mt-1">
                        <span>{activeCalc.project_name}</span>
                        <Badge variant="outline">NEC {activeCalc.nec_year}</Badge>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(activeCalc.updated_date || activeCalc.created_date).toLocaleDateString()}
                        </span>
                      </p>
                    </div>
                    <div className="no-print flex flex-wrap gap-2" data-html2canvas-ignore="true">
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
                        <Printer className="w-4 h-4" />
                        Print
                      </Button>
                      <Button size="sm" className="gap-1.5" onClick={handlePdf} disabled={exportingPdf}>
                        {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                        Download PDF
                      </Button>
                    </div>
                  </div>
                </DialogHeader>
                <div ref={printRef} data-saved-pdf-root className="saved-calculation-print">
                  <SavedCalculationReport calc={activeCalc} />
                </div>
                <div className="no-print rounded-2xl border border-border/60 bg-muted/30 p-2" data-html2canvas-ignore="true">
                  <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Interactive saved calculator view
                  </p>
                  <CalculatorPanel
                    category={activeCategory}
                    savedCalculation={activeCalc}
                    necYearOverride={activeCalc.nec_year}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setDeleteTarget({ type: "calc", id: activeCalc.id, name: activeCalc.title || activeCalc.calculator_label })}
                >
                  Delete
                </Button>
                <div className="no-print flex gap-2">
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
