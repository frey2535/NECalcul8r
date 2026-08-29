import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const severityConfig = {
  critical: { label: "Critical", icon: AlertTriangle, className: "bg-red-100 text-red-700 border-red-200" },
  major: { label: "Major", icon: AlertCircle, className: "bg-amber-100 text-amber-700 border-amber-200" },
  minor: { label: "Minor", icon: Info, className: "bg-blue-100 text-blue-700 border-blue-200" },
};

export default function ViolationTable({ violations }) {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");

  const filtered = violations.filter(v => {
    const matchSearch = !search ||
      v.violation_description?.toLowerCase().includes(search.toLowerCase()) ||
      v.nec_article?.toLowerCase().includes(search.toLowerCase()) ||
      v.sheet_number?.toLowerCase().includes(search.toLowerCase()) ||
      v.room_number?.toLowerCase().includes(search.toLowerCase());
    const matchSeverity = severityFilter === "all" || v.severity === severityFilter;
    return matchSearch && matchSeverity;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search violations, articles, rooms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All Severities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="major">Major</SelectItem>
            <SelectItem value="minor">Minor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {violations.length} violations
      </p>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-24">Severity</TableHead>
                <TableHead className="w-28">NEC Article</TableHead>
                <TableHead>Violation</TableHead>
                <TableHead className="w-24">Sheet #</TableHead>
                <TableHead className="w-24">Room #</TableHead>
                <TableHead className="w-40">Area / Location</TableHead>
                <TableHead className="w-48">Recommendation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v, i) => {
                const sev = severityConfig[v.severity] || severityConfig.minor;
                const SevIcon = sev.icon;
                return (
                  <TableRow key={v.id || i} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <Badge variant="outline" className={cn("gap-1 text-xs", sev.className)}>
                        <SevIcon className="w-3 h-3" />
                        {sev.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-primary">
                      {v.nec_article}
                    </TableCell>
                    <TableCell className="text-sm max-w-xs">
                      {v.violation_description}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{v.sheet_number}</TableCell>
                    <TableCell className="font-mono text-sm">{v.room_number}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>{v.area_description}</div>
                      {v.location_detail && (
                        <div className="text-xs text-muted-foreground/70 mt-0.5">{v.location_detail}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {v.recommendation}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No violations match your filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}