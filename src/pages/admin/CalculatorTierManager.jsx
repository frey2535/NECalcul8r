import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCw, RotateCcw, Save, Search, SlidersHorizontal } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { NEC_CATEGORIES } from "@/data/calculatorCatalog";
import { useAuth } from "@/lib/AuthContext";
import {
  CALCULATOR_TIER_SETTINGS_ENTITY,
  CALCULATOR_TIER_SETTINGS_KEY,
  compactCalculatorTierGroups,
  getCalculatorTierGroupConfig,
  buildCalculatorTierSections,
} from "@/lib/calculatorTierGroups";
import { useCalculatorTierSettings } from "@/hooks/useCalculatorTierSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const SECTION_ACCENTS = [
  "border-l-emerald-500",
  "border-l-blue-500",
  "border-l-violet-500",
  "border-l-amber-500",
  "border-l-slate-500",
];

function groupsEqual(a, b) {
  return JSON.stringify(compactCalculatorTierGroups(a)) === JSON.stringify(compactCalculatorTierGroups(b));
}

function tierCapacity(groups, targetIndex) {
  const target = groups[targetIndex];
  if (!target || target.maxCumulativeCount == null) return Number.POSITIVE_INFINITY;
  const previousCount = groups
    .slice(0, targetIndex)
    .reduce((total, group) => total + group.calculatorIds.length, 0);
  return Math.max(0, target.maxCumulativeCount - previousCount);
}

function savePayload(groups, user) {
  const sections = buildCalculatorTierSections(NEC_CATEGORIES, groups);
  return {
    settings_key: CALCULATOR_TIER_SETTINGS_KEY,
    groups: compactCalculatorTierGroups(sections),
    updated_by: user?.email || user?.full_name || "platform_admin",
  };
}

export default function CalculatorTierManager() {
  const { user } = useAuth();
  const { record, calculatorTierGroups, isLoading, error, reload } = useCalculatorTierSettings();
  const [draftGroups, setDraftGroups] = useState(() => getCalculatorTierGroupConfig());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading) setDraftGroups(calculatorTierGroups);
  }, [calculatorTierGroups, isLoading]);

  const tierSections = useMemo(
    () => buildCalculatorTierSections(NEC_CATEGORIES, draftGroups),
    [draftGroups]
  );

  const filteredSections = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return tierSections;
    return tierSections
      .map((section) => ({
        ...section,
        categories: section.categories.filter((category) =>
          category.label.toLowerCase().includes(needle)
          || category.id.toLowerCase().includes(needle)
          || category.article.toLowerCase().includes(needle)
          || category.description.toLowerCase().includes(needle)
        ),
      }))
      .filter((section) => section.categories.length > 0);
  }, [search, tierSections]);

  const isDirty = !groupsEqual(draftGroups, calculatorTierGroups);

  const moveCalculator = (calculatorId, nextPlanKey) => {
    setDraftGroups((currentGroups) => {
      const nextGroups = currentGroups.map((group) => ({
        ...group,
        calculatorIds: group.calculatorIds.filter((id) => id !== calculatorId),
      }));
      const targetIndex = nextGroups.findIndex((group) => group.planKey === nextPlanKey);
      if (targetIndex === -1) return currentGroups;

      const capacity = tierCapacity(nextGroups, targetIndex);
      if (nextGroups[targetIndex].calculatorIds.length >= capacity) {
        toast({
          title: "Tier is full",
          description: `${nextGroups[targetIndex].label} cannot include more calculators without moving one out first.`,
          variant: "destructive",
        });
        return currentGroups;
      }

      nextGroups[targetIndex] = {
        ...nextGroups[targetIndex],
        calculatorIds: [...nextGroups[targetIndex].calculatorIds, calculatorId],
      };
      return nextGroups;
    });
  };

  const resetDefaults = () => {
    setDraftGroups(getCalculatorTierGroupConfig([]));
  };

  const saveSettings = async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      const payload = savePayload(draftGroups, user);
      if (record?.id) {
        await base44.entities[CALCULATOR_TIER_SETTINGS_ENTITY].update(record.id, payload);
      } else {
        await base44.entities[CALCULATOR_TIER_SETTINGS_ENTITY].create(payload);
      }
      await reload();
      toast({
        title: "Calculator tiers saved",
        description: "The main calculator page will use this tier layout for all users.",
      });
    } catch (saveError) {
      toast({
        title: "Could not save calculator tiers",
        description: saveError?.message || "Try again or check Supabase permissions.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
                <SlidersHorizontal className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Platform admin</p>
                <h1 className="text-2xl font-black text-foreground">Calculator Tier Manager</h1>
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
              Move calculators into the Free, 6-15, 16-25, 26-35, or 36+ groups.
              Paid tiers are cumulative, so a 16-25 subscriber receives the Free group,
              the 6-15 group, and the 16-25 group.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={reload} disabled={isLoading || saving}>
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              Reload
            </Button>
            <Button variant="outline" className="gap-2" onClick={resetDefaults} disabled={saving}>
              <RotateCcw className="w-4 h-4" />
              Reset defaults
            </Button>
            <Button className="gap-2" onClick={saveSettings} disabled={!isDirty || saving}>
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save tiers"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              Saved settings could not be loaded, so defaults are shown. {error.message}
            </p>
          </div>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-10 h-11 rounded-xl border-border/60 bg-white dark:bg-card shadow-sm text-sm"
          placeholder="Search calculators to move..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {filteredSections.map((section, sectionIndex) => {
          const capacity = tierCapacity(draftGroups, section.index);
          const capacityLabel = Number.isFinite(capacity)
            ? `${section.categories.length}/${capacity} in this group`
            : `${section.categories.length} in this group`;
          return (
            <section
              key={section.planKey}
              className={cn("rounded-2xl border border-border bg-card p-3 shadow-sm border-l-4", SECTION_ACCENTS[sectionIndex])}
            >
              <div className="mb-3">
                <h2 className="text-sm font-black text-foreground">{section.label}</h2>
                <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{capacityLabel}</p>
                <p className="mt-1 text-[11px] text-muted-foreground leading-snug">{section.description}</p>
              </div>

              <div className="space-y-2">
                {section.categories.map((category) => (
                  <div key={category.id} className="rounded-xl border border-border/70 bg-background p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-lg leading-none">{category.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-foreground leading-snug">{category.label}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{category.article}</p>
                      </div>
                    </div>
                    <label className="mt-2 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Move to tier
                    </label>
                    <select
                      className="mt-1 h-8 w-full rounded-lg border border-border bg-background px-2 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-blue-500"
                      value={section.planKey}
                      onChange={(event) => moveCalculator(category.id, event.target.value)}
                    >
                      {draftGroups.map((group) => (
                        <option key={group.planKey} value={group.planKey}>
                          {group.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                {section.categories.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    No calculators in this group.
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
