import React from "react";
import { Card } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, Info, FileWarning, BookOpen } from "lucide-react";

export default function SummaryCards({ analysis }) {
  const violations = analysis.violations || [];
  const critical = violations.filter(v => v.severity === "critical").length;
  const major = violations.filter(v => v.severity === "major").length;
  const minor = violations.filter(v => v.severity === "minor").length;
  const missingDocs = (analysis.missing_documents || []).length;

  const cards = [
    { label: "Total Violations", value: violations.length, icon: BookOpen, color: "text-foreground" },
    { label: "Critical", value: critical, icon: AlertTriangle, color: "text-red-500" },
    { label: "Major", value: major, icon: AlertCircle, color: "text-amber-500" },
    { label: "Minor", value: minor, icon: Info, color: "text-blue-500" },
    { label: "Missing Docs", value: missingDocs, icon: FileWarning, color: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <Card key={label} className="p-4 flex flex-col items-center text-center gap-2">
          <Icon className={`w-5 h-5 ${color}`} />
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </Card>
      ))}
    </div>
  );
}