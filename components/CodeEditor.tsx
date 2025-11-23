"use client";

import { Editor } from "@monaco-editor/react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
}

export function CodeEditor({
  value,
  onChange,
  height = "400px",
}: CodeEditorProps) {
  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="w-full bg-muted rounded-lg flex items-center justify-center"
        style={{ height }}
      >
        <p className="text-muted-foreground">Loading editor...</p>
      </div>
    );
  }

  const editorTheme = (resolvedTheme || theme) === "dark" ? "vs-dark" : "light";

  return (
    <Editor
      height={height}
      defaultLanguage="javascript"
      value={value}
      onChange={(v) => onChange(v || "")}
      theme={editorTheme}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
      }}
    />
  );
}
