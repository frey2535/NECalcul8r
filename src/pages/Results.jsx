import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, AlertTriangle, FileWarning, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import SummaryCards from "@/components/analysis/SummaryCards";
import ViolationTable from "@/components/analysis/ViolationTable";
import MissingDocsTable from "@/components/analysis/MissingDocsTable";
import ExportButtons from "@/components/analysis/ExportButtons";

export default function Results() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");

  const { data: analysis, isLoading } = useQuery({
    queryKey: ["analysis", id],
    queryFn: async () => {
      const list = await base44.entities.Analysis.filter({ id });
      return list[0];
    },
    enabled: !!id,
  });

  if (isLoading || !analysis) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-5 gap-3">
          {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const violations = analysis.violations || [];
  const missingDocs = analysis.missing_documents || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{analysis.project_name}</h1>
            <p className="text-sm text-muted-foreground">
              NEC {analysis.nec_year} Analysis · {new Date(analysis.created_date).toLocaleDateString()}
            </p>
          </div>
        </div>
        <ExportButtons analysis={analysis} />
      </div>

      {/* Summary */}
      <SummaryCards analysis={analysis} />

      {/* Summary text */}
      {analysis.summary && (
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm mb-1">Analysis Summary</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{analysis.summary}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="violations">
        <TabsList>
          <TabsTrigger value="violations" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Violations ({violations.length})
          </TabsTrigger>
          <TabsTrigger value="missing" className="gap-2">
            <FileWarning className="w-4 h-4" />
            Missing Docs ({missingDocs.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="violations" className="mt-4">
          <ViolationTable violations={violations} />
        </TabsContent>
        <TabsContent value="missing" className="mt-4">
          <MissingDocsTable documents={missingDocs} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}