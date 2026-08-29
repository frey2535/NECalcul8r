import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle, Upload, X, Loader2 } from "lucide-react";

const APP_VERSION = "1.0.0";

export default function ReportDiscrepancy({ calculatorId, calculatorName, necYear, inputs, outputs, open, onOpenChange }) {
  const [form, setForm] = useState({
    article_ref: "", current_result: "", expected_result: "", explanation: "", contact_email: "",
  });
  const [errors, setErrors] = useState({});
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [timestamp, setTimestamp] = useState("");

  useEffect(() => {
    if (open) setTimestamp(new Date().toLocaleString());
  }, [open]);

  // Format a scalar value for the read-only summary; nested objects/arrays are skipped
  const fmt = (val) => {
    if (typeof val === "boolean") return val ? "Yes" : "No";
    if (typeof val === "number") return Number.isFinite(val) ? String(Math.round(val * 10000) / 10000) : String(val);
    if (val == null || val === "") return "—";
    if (typeof val === "object") return null;
    return String(val);
  };
  const scalarEntries = (obj) =>
    Object.entries(obj || {})
      .map(([k, v]) => [k, fmt(v)])
      .filter(([, v]) => v !== null);

  const inputEntries = scalarEntries(inputs);
  const outputEntries = scalarEntries(outputs);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selected]);
  };
  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    const newErrors = {};
    if (!form.article_ref.trim()) newErrors.article_ref = "Required";
    if (!form.current_result.trim()) newErrors.current_result = "Required";
    if (!form.expected_result.trim()) newErrors.expected_result = "Required";
    if (!form.explanation.trim()) newErrors.explanation = "Required";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setSubmitting(true);
    try {
      // Upload files first
      const fileUrls = [];
      for (const f of files) {
        const upload = await base44.integrations.Core.UploadFile({ file: f });
        if (upload?.file_url) fileUrls.push(upload.file_url);
      }
      await base44.entities.DiscrepancyReport.create({
        calculator_id: calculatorId,
        calculator_name: calculatorName,
        nec_year: necYear,
        article_ref: form.article_ref.trim(),
        current_result: form.current_result.trim(),
        expected_result: form.expected_result.trim(),
        explanation: form.explanation.trim(),
        inputs: inputs ? JSON.stringify(inputs) : null,
        outputs: outputs ? JSON.stringify(outputs) : null,
        app_version: APP_VERSION,
        file_urls: fileUrls,
        contact_email: form.contact_email.trim() || null,
      });
      setDone(true);
    } catch (e) { /* fail silently — form stays open */ }
    setSubmitting(false);
  };

  const reset = () => {
    setForm({ article_ref: "", current_result: "", expected_result: "", explanation: "", contact_email: "" });
    setFiles([]);
    setDone(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); else onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {done ? (
          <div className="space-y-4 text-center py-6">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-emerald-600" />
            </div>
            <DialogTitle>Report Submitted</DialogTitle>
            <DialogDescription className="text-sm">
              Thank you. Your report has been recorded and will be reviewed. You will not be notified unless you provided a contact email.
            </DialogDescription>
            <Button onClick={reset} variant="outline" className="mt-2">Close</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Report Discrepancy
              </DialogTitle>
              <DialogDescription className="text-xs">
                <strong>{calculatorName}</strong> — NEC {necYear}. Your report will be reviewed by an administrator.
              </DialogDescription>
            </DialogHeader>

            {/* Auto-captured calculation summary (read-only) */}
            <div className="rounded-xl bg-muted/50 border border-border/60 p-3 space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <div><span className="text-muted-foreground font-semibold">Calculator:</span> <span className="font-medium">{calculatorName}</span></div>
                <div><span className="text-muted-foreground font-semibold">NEC Year:</span> <span className="font-medium">{necYear}</span></div>
                <div><span className="text-muted-foreground font-semibold">App Version:</span> <span className="font-medium">{APP_VERSION}</span></div>
                <div><span className="text-muted-foreground font-semibold">Timestamp:</span> <span className="font-medium">{timestamp || "—"}</span></div>
              </div>
              {inputEntries.length > 0 && (
                <div>
                  <p className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Input Values</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                    {inputEntries.map(([k, v]) => (
                      <div key={k} className="truncate"><span className="text-muted-foreground">{k}:</span> <span className="font-medium">{v}</span></div>
                    ))}
                  </div>
                </div>
              )}
              {outputEntries.length > 0 && (
                <div>
                  <p className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Calculated Outputs</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                    {outputEntries.map(([k, v]) => (
                      <div key={k} className="truncate"><span className="text-muted-foreground">{k}:</span> <span className="font-medium">{v}</span></div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 py-2">
              <div>
                <label className="text-xs font-semibold">NEC Article / Table *</label>
                <Input value={form.article_ref} onChange={set("article_ref")} placeholder="e.g. 220.12, Table 250.122" className={`h-9 text-sm mt-1 ${errors.article_ref ? "border-destructive" : ""}`} />
                {errors.article_ref && <p className="text-[11px] text-destructive mt-0.5">{errors.article_ref}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold">Current App Result *</label>
                <Input value={form.current_result} onChange={set("current_result")} placeholder="What did the calculator show?" className={`h-9 text-sm mt-1 ${errors.current_result ? "border-destructive" : ""}`} />
                {errors.current_result && <p className="text-[11px] text-destructive mt-0.5">{errors.current_result}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold">Expected Result *</label>
                <Input value={form.expected_result} onChange={set("expected_result")} placeholder="What should it be?" className={`h-9 text-sm mt-1 ${errors.expected_result ? "border-destructive" : ""}`} />
                {errors.expected_result && <p className="text-[11px] text-destructive mt-0.5">{errors.expected_result}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold">Explanation *</label>
                <Textarea value={form.explanation} onChange={set("explanation")} placeholder="Explain why you believe this is incorrect. Reference NEC text or other sources." className={`text-sm mt-1 min-h-[80px] ${errors.explanation ? "border-destructive" : ""}`} />
                {errors.explanation && <p className="text-[11px] text-destructive mt-0.5">{errors.explanation}</p>}
              </div>

              {/* File upload */}
              <div>
                <label className="text-xs font-semibold">Screenshot / Photo (optional)</label>
                <div className="mt-1">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border cursor-pointer hover:bg-muted/30 transition-colors text-xs text-muted-foreground">
                    <Upload className="w-4 h-4" />
                    <span>Attach files</span>
                    <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                  {files.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {files.map((f, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1">
                          <span className="truncate">{f.name}</span>
                          <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold">Contact Email (optional)</label>
                <Input type="email" value={form.contact_email} onChange={set("contact_email")} placeholder="For follow-up" className="h-9 text-sm mt-1" />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={reset}>Cancel</Button>
              <Button size="sm" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Submitting…</> : "Submit Report"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}