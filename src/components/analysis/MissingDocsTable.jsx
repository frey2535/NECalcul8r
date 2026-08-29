import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";

const severityConfig = {
  critical: "bg-red-100 text-red-700 border-red-200",
  major: "bg-amber-100 text-amber-700 border-amber-200",
  minor: "bg-blue-100 text-blue-700 border-blue-200",
};

export default function MissingDocsTable({ documents }) {
  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileWarning className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No missing documents detected</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-24">Severity</TableHead>
              <TableHead>Missing Document</TableHead>
              <TableHead className="w-28">NEC Reference</TableHead>
              <TableHead>Reason Required</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc, i) => (
              <TableRow key={i} className="hover:bg-muted/30 transition-colors">
                <TableCell>
                  <Badge variant="outline" className={cn("text-xs", severityConfig[doc.severity])}>
                    {doc.severity}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium text-sm">{doc.document_name}</TableCell>
                <TableCell className="font-mono text-xs font-semibold text-primary">
                  {doc.nec_article}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{doc.reason_required}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}