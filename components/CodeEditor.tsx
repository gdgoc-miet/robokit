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
      onMount={(editor, monaco) => {
        // Compiler options
        monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
          target: monaco.languages.typescript.ScriptTarget.ES2015,
          allowNonTsExtensions: true,
          checkJs: true,
          allowJs: true,
        });

        // Add the robot API definitions
        const libUri = "ts:filename/robot.d.ts";
        monaco.languages.typescript.javascriptDefaults.addExtraLib(
          `
          /** Move forward (default: 1 step) */
          declare function move(steps?: number): void;
          
          /** Turn "left" or "right" */
          declare function turn(dir: "left" | "right"): void;
          
          /** Check if "front", "left", or "right" is empty */
          declare function is_empty(dir?: "front" | "left" | "right"): boolean;
          
          /** Check if goal is at "here", "front", "left", "right" */
          declare function is_goal(dir?: "here" | "front" | "left" | "right"): boolean;
          
          /** Returns {x, y} current position */
          declare function get_position(): {x: number, y: number};
          
          /** Returns {x, y} goal position */
          declare function get_goal(): {x: number, y: number};
          
          /** Print message to console */
          declare function log(msg: string): void;
          
          /** Stop execution */
          declare function done(): void;
          
          declare const memory: {
            /** Check if cell was visited ("here", "front", etc) */
            has_visited(dir?: "here" | "front" | "left" | "right"): boolean;
            /** Get visit count for cell */
            visit_count(dir?: "here" | "front" | "left" | "right"): number;
            /** Get all visited cells */
            get_visited_cells(): Array<{x: number, y: number, count: number}>;
          };
          
          /** Define this function to run once at start */
          declare function start(): void;
          
          /** Define this function to run every step */
          declare function update(): void;
          `,
          libUri
        );
      }}
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
