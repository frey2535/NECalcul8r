import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { flattenSnapshot, lastProjectStorageKey, sanitizeSnapshot, summarizeOutputs } from "@/lib/calcSnapshot";
import { useCalcRestore } from "@/context/CalcRestoreContext";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function SaveCalculationDialog({
  open,
  onOpenChange,
  category,
  necYear,
  inputValues,
  outputValues,
}) {
  const { user } = useAuth();
  const restore = useCalcRestore();
  const queryClient = useQueryClient();
  const [projectName, setProjectName] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-updated_date", 200),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const last = typeof window !== "undefined"
      ? window.localStorage.getItem(lastProjectStorageKey(user?.id))
      : "";
    setProjectName(restore?.projectName || last || projects[0]?.name || "");
    setTitle(restore?.title || "");
  }, [open, projects, user?.id, restore?.projectName, restore?.title]);

  const handleSave = async (event) => {
    event.preventDefault();
    const name = projectName.trim();
    if (!name) {
      toast({ title: "Project name required", description: "Name this job so you can find it later.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const existing = projects.find((p) => p.name.toLowerCase() === name.toLowerCase());
      const project = existing || await base44.entities.Project.create({ name });
      const outputs = sanitizeSnapshot(outputValues);
      const payload = {
        project_id: project.id,
        project_name: project.name,
        calculator_id: category.id,
        calculator_label: category.label,
        calculator_article: category.article,
        nec_year: necYear,
        title: title.trim() || category.label,
        inputs: sanitizeSnapshot(inputValues),
        outputs,
        summary: summarizeOutputs(outputs, category.label),
      };
      if (restore?.id) {
        await base44.entities.SavedCalculation.update(restore.id, payload);
      } else {
        await base44.entities.SavedCalculation.create(payload);
      }
      if (existing) {
        await base44.entities.Project.update(project.id, { name: project.name });
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(lastProjectStorageKey(user?.id), project.name);
      }
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.invalidateQueries({ queryKey: ["saved-calculations"] });
      toast({
        title: restore?.id ? "Updated" : "Saved",
        description: `${payload.title} · ${project.name}`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Could not save",
        description: error?.message || "Try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const preview = flattenSnapshot(sanitizeSnapshot(outputValues)).slice(0, 4);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle>Save to a project</DialogTitle>
            <DialogDescription>
              Only you can see this. Teammates cannot open your saved calculations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                list="saved-project-names"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Smith residence, Building 4, ..."
                autoFocus
              />
              <datalist id="saved-project-names">
                {projects.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="calc-title">Calculation name (optional)</Label>
              <Input
                id="calc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={category.label}
              />
            </div>
            {preview.length > 0 && (
              <p className="text-xs text-muted-foreground">
                NEC {necYear} · {preview.map((row) => `${row.label} ${row.value}`).join(" · ")}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="gap-1.5">
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : restore?.id ? "Update save" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
