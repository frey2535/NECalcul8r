import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { AlertTriangle, Calendar, ChevronRight, FileWarning, FolderOpen, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import PullToRefreshIndicator from "@/components/ui/PullToRefreshIndicator";

export default function History() {
  const queryClient = useQueryClient();
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState("");

  const { data: analyses, isLoading, refetch } = useQuery({
    queryKey: ["analyses"],
    queryFn: () => base44.entities.Analysis.list("-created_date", 50),
    initialData: [],
  });

  // Optimistic delete
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Analysis.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["analyses"] });
      const previous = queryClient.getQueryData(["analyses"]);
      queryClient.setQueryData(["analyses"], (old) => (old || []).filter((a) => a.id !== id));
      return { previous };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(["analyses"], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["analyses"] }),
  });

  const { pullDistance, isRefreshing, containerRef } = usePullToRefresh(refetch);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  const completedAnalyses = analyses.filter(a => a.status === "completed");

  return (
    <div ref={containerRef}>
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto space-y-6"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Analysis History</h1>
          <Badge variant="secondary" className="text-xs">
            {completedAnalyses.length} reports
          </Badge>
        </div>

        {completedAnalyses.length === 0 ? (
          <Card className="p-12 text-center">
            <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold text-lg">No analyses yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Upload your first electrical blueprint to get started
            </p>
            <Link to="/">
              <Button>Start New Analysis</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {completedAnalyses.map((a) => (
              <Link key={a.id} to={`/results?id=${a.id}`}>
                <Card className="p-4 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{a.project_name}</h3>
                        <Badge variant="outline" className="text-[10px] flex-shrink-0">
                          NEC {a.nec_year}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(a.created_date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {a.total_violations || 0} violations
                        </span>
                        <span className="flex items-center gap-1">
                          <FileWarning className="w-3 h-3" />
                          {a.total_missing_docs || 0} missing docs
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setConfirmDeleteId(a.id);
                          setConfirmDeleteName(a.project_name);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Analysis?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <strong>"{confirmDeleteName}"</strong> and all its violation data. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  deleteMutation.mutate(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </div>
  );
}