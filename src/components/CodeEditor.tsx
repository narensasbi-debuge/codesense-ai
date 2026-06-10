"use client";

import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
}

export default function CodeEditor({
  value,
  onChange,
  language,
}: CodeEditorProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg">
      <Editor
        height="400px"
        defaultLanguage={language}
        language={language}
        value={value}
        onChange={(val) => onChange(val ?? "")}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "var(--font-geist-mono), monospace",
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          padding: { top: 16, bottom: 16 },
          wordWrap: "on",
          automaticLayout: true,
          tabSize: 2,
          renderLineHighlight: "gutter",
          overviewRulerBorder: false,
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        }}
      />
    </div>
  );
}