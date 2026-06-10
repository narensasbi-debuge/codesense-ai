"use client";

import { useState, useCallback } from "react";
import { Loader2, AlertCircle, Sparkles } from "lucide-react";
import CodeEditor from "@/components/CodeEditor";
import ResultsViewer from "@/components/ResultsViewer";
import type { AnalyzeResult } from "@/lib/schemas";

// ---------------------------------------------------------------------------
// Supported languages for the language selector
// ---------------------------------------------------------------------------

const LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "java",
  "csharp",
  "go",
  "rust",
  "php",
  "ruby",
  "cpp",
  "c",
  "swift",
  "kotlin",
  "sql",
  "html",
  "css",
] as const;

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function Home() {
  const [code, setCode] = useState<string>(
    `// Paste your code here or type something to analyze…\n\nfunction fibonacci(n: number): number {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n`,
  );
  const [language, setLanguage] = useState<string>("typescript");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    // Guard: empty code
    if (!code.trim()) {
      setError("Please enter some code to analyze.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), language }),
      });

      if (!response.ok) {
        const body: { error?: string } = await response.json();
        throw new Error(
          body.error ?? `Request failed with status ${response.status}`,
        );
      }

      const data: AnalyzeResult = await response.json();
      setResult(data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [code, language]);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <Sparkles className="h-6 w-6 text-blue-500" />
          <h1 className="text-xl font-bold tracking-tight">CodeSense AI</h1>
          <span className="ml-2 rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
            Beta
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-8">
        {/* Controls bar */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Language selector */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="language-select"
              className="text-sm font-medium text-zinc-400"
            >
              Language:
            </label>
            <select
              id="language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1" />

          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Analyze Code
              </>
            )}
          </button>
        </div>

        {/* Editor */}
        <CodeEditor value={code} onChange={setCode} language={language} />

        {/* Loading skeleton */}
        {isLoading && (
          <div className="animate-pulse rounded-lg border border-zinc-700 bg-zinc-900 p-8">
            <div className="mb-4 h-4 w-1/3 rounded bg-zinc-700" />
            <div className="mb-3 h-3 w-full rounded bg-zinc-800" />
            <div className="mb-3 h-3 w-5/6 rounded bg-zinc-800" />
            <div className="mb-3 h-3 w-4/6 rounded bg-zinc-800" />
            <div className="h-3 w-2/3 rounded bg-zinc-800" />
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
            <div>
              <p className="font-medium">Analysis failed</p>
              <p className="mt-1 text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && <ResultsViewer result={result} language={language} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-4 text-center text-xs text-zinc-500">
        CodeSense AI — Powered by AI-driven code analysis
      </footer>
    </div>
  );
}