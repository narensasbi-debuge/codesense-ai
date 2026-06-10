"use client";

import { useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { ClipboardCopy, Check, FileText, Code2, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalyzeResult } from "@/lib/schemas";

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type TabKey = "documentation" | "refactored_code" | "unit_tests";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "documentation", label: "Documentation", icon: FileText },
  { key: "refactored_code", label: "Refactored Code", icon: Code2 },
  { key: "unit_tests", label: "Unit Tests", icon: FlaskConical },
];

/** Map each tab to a Monaco language for syntax highlighting */
const TAB_LANGUAGE: Record<TabKey, string> = {
  documentation: "markdown",
  refactored_code: "typescript",
  unit_tests: "typescript",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ResultsViewerProps {
  result: AnalyzeResult;
  language?: string;
}

export default function ResultsViewer({ result, language }: ResultsViewerProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("documentation");
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(result[activeTab]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text in a temporary textarea
      const textarea = document.createElement("textarea");
      textarea.value = result[activeTab];
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [activeTab, result]);

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg">
      {/* Tab bar */}
      <div className="flex items-center border-b border-zinc-700">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "border-b-2 border-blue-500 text-blue-400"
                  : "text-zinc-400 hover:text-zinc-200",
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="mr-3 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <ClipboardCopy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Tab content */}
      <div className="min-h-[300px]">
        {activeTab === "documentation" ? (
          <div className="p-6 text-sm leading-relaxed text-zinc-300">
            <pre className="whitespace-pre-wrap font-sans">{result.documentation}</pre>
          </div>
        ) : (
          <Editor
            height="300px"
            language={language ?? TAB_LANGUAGE[activeTab]}
            value={result[activeTab]}
            theme="vs-dark"
            options={{
              readOnly: true,
              domReadOnly: true,
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "var(--font-geist-mono), monospace",
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              padding: { top: 16, bottom: 16 },
              wordWrap: "on",
              automaticLayout: true,
              renderLineHighlight: "none",
              overviewRulerBorder: false,
              scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              },
            }}
          />
        )}
      </div>
    </div>
  );
}