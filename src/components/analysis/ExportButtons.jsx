import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";

function exportCSV(analysis) {
  const violations = analysis.violations || [];
  const missingDocs = analysis.missing_documents || [];

  let csv = "Type,Severity,NEC Year,NEC Article,Description,Sheet #,Room #,Area,Location Detail,Recommendation\n";

  violations.forEach(v => {
    csv += [
      "Violation",
      v.severity,
      v.nec_year || analysis.nec_year,
      `"${v.nec_article || ""}"`,
      `"${(v.violation_description || "").replace(/"/g, '""')}"`,
      `"${v.sheet_number || ""}"`,
      `"${v.room_number || ""}"`,
      `"${(v.area_description || "").replace(/"/g, '""')}"`,
      `"${(v.location_detail || "").replace(/"/g, '""')}"`,
      `"${(v.recommendation || "").replace(/"/g, '""')}"`,
    ].join(",") + "\n";
  });

  if (missingDocs.length) {
    csv += "\n\nMissing Documents\nSeverity,Document Name,NEC Article,Reason Required\n";
    missingDocs.forEach(d => {
      csv += [
        d.severity,
        `"${d.document_name || ""}"`,
        `"${d.nec_article || ""}"`,
        `"${(d.reason_required || "").replace(/"/g, '""')}"`,
      ].join(",") + "\n";
    });
  }

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `NEC_Violations_${analysis.project_name || "report"}_${analysis.nec_year || "unknown"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPDF(analysis) {
  const doc = new jsPDF({ orientation: "landscape" });
  const violations = analysis.violations || [];
  const missingDocs = analysis.missing_documents || [];

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("NEC Code Violation Report", 14, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Project: ${analysis.project_name || "N/A"}`, 14, 28);
  doc.text(`NEC Year: ${analysis.nec_year}`, 14, 34);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 40);
  doc.text(`Total Violations: ${violations.length}  |  Missing Documents: ${missingDocs.length}`, 14, 46);

  // Summary
  if (analysis.summary) {
    doc.setFontSize(9);
    const summaryLines = doc.splitTextToSize(analysis.summary, 260);
    doc.text(summaryLines, 14, 54);
  }

  // Violations table
  let y = analysis.summary ? 54 + doc.splitTextToSize(analysis.summary, 260).length * 5 + 8 : 54;

  if (violations.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Violations", 14, y);
    y += 8;

    // Headers
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    const headers = ["Severity", "NEC Article", "Violation", "Sheet #", "Room #", "Area", "Recommendation"];
    const colWidths = [20, 25, 80, 18, 18, 45, 65];
    let x = 14;
    headers.forEach((h, i) => {
      doc.text(h, x, y);
      x += colWidths[i];
    });
    y += 2;
    doc.setDrawColor(200);
    doc.line(14, y, 283, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);

    violations.forEach(v => {
      if (y > 190) {
        doc.addPage();
        y = 20;
      }
      x = 14;
      const rowData = [
        v.severity || "",
        v.nec_article || "",
        v.violation_description || "",
        v.sheet_number || "",
        v.room_number || "",
        v.area_description || "",
        v.recommendation || "",
      ];
      rowData.forEach((text, i) => {
        const lines = doc.splitTextToSize(String(text), colWidths[i] - 2);
        doc.text(lines, x, y);
        x += colWidths[i];
      });
      y += 8;
    });
  }

  // Missing Docs
  if (missingDocs.length > 0) {
    if (y > 170) {
      doc.addPage();
      y = 20;
    }
    y += 6;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Missing Documents", 14, y);
    y += 8;

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    const dHeaders = ["Severity", "Document", "NEC Article", "Reason Required"];
    const dWidths = [25, 60, 30, 155];
    let dx = 14;
    dHeaders.forEach((h, i) => {
      doc.text(h, dx, y);
      dx += dWidths[i];
    });
    y += 2;
    doc.line(14, y, 283, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    missingDocs.forEach(d => {
      if (y > 190) {
        doc.addPage();
        y = 20;
      }
      dx = 14;
      [d.severity, d.document_name, d.nec_article, d.reason_required].forEach((text, i) => {
        const lines = doc.splitTextToSize(String(text || ""), dWidths[i] - 2);
        doc.text(lines, dx, y);
        dx += dWidths[i];
      });
      y += 8;
    });
  }

  doc.save(`NEC_Violations_${analysis.project_name || "report"}_${analysis.nec_year || "unknown"}.pdf`);
}

export default function ExportButtons({ analysis }) {
  const [exportingPdf, setExportingPdf] = useState(false);

  const handlePdf = async () => {
    setExportingPdf(true);
    setTimeout(() => {
      exportPDF(analysis);
      setExportingPdf(false);
    }, 100);
  };

  return (
    <div className="flex gap-3">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => exportCSV(analysis)}
      >
        <FileSpreadsheet className="w-4 h-4" />
        Export CSV
      </Button>
      <Button
        size="sm"
        className="gap-2"
        onClick={handlePdf}
        disabled={exportingPdf}
      >
        {exportingPdf ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileDown className="w-4 h-4" />
        )}
        Export PDF
      </Button>
    </div>
  );
}