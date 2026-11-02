"use client";

import React, { useState } from "react";
import { Printer, Download, FileText, Check } from "lucide-react";

interface ArticlePdfExportProps {
  articleTitle: string;
}

export function ArticlePdfExport({ articleTitle }: ArticlePdfExportProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    // Give state a moment to settle, then open system print dialog
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 150);
  };

  return (
    <button
      onClick={handlePrint}
      disabled={isPrinting}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono bg-zinc-900/80 dark:bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 shadow-sm backdrop-blur transition-all duration-200 hover:scale-105 active:scale-95 group"
      title="Export or Print as Technical Whitepaper PDF"
    >
      <Printer className="w-3.5 h-3.5 text-sky-400 group-hover:text-sky-300 transition-colors" />
      <span className="font-medium">Export PDF</span>
    </button>
  );
}

