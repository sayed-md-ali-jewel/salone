"use client";

import { Download, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportButtons({ rows }: { rows: Array<Record<string, string | number>> }) {
  function downloadCsv() {
    const headers = Object.keys(rows[0] || { report: "No data" });
    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? "")).join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "salon-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="h-4 w-4" />
        Print
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
        <FileText className="h-4 w-4" />
        PDF
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={downloadCsv}>
        <Download className="h-4 w-4" />
        Excel
      </Button>
    </div>
  );
}
