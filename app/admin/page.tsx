"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Edit, Save } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Id } from "@/convex/_generated/dataModel";

type CellType = " " | "W";

export default function AdminPage() {
  const router = useRouter();
  const isAdmin = useQuery(api.admin.amIAdmin);
  const questions = useQuery(api.admin.getAllQuestionsAdmin);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("create");

  if (isAdmin === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access the admin panel.
            </p>
            <Button onClick={() => router.push("/")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" onClick={() => router.push("/")}>
            ← Dashboard
          </Button>
        </div>
      </header>

      <main className="p-8">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="max-w-7xl mx-auto"
        >
          <TabsList>
            <TabsTrigger value="create">
              {editingQuestion ? "Edit Level" : "Create Level"}
            </TabsTrigger>
            <TabsTrigger value="manage">Manage Levels</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <LevelEditor
              existingQuestion={editingQuestion}
              onSave={() => {
                setEditingQuestion(null);
                setActiveTab("manage");
              }}
              onCancel={() => {
                setEditingQuestion(null);
              }}
            />
          </TabsContent>

          <TabsContent value="manage">
            <LevelManager
              questions={questions || []}
              onEdit={(question) => {
                setEditingQuestion(question);
                setActiveTab("create");
              }}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

type Tool = "wall" | "empty" | "start" | "goal";

interface LevelEditorProps {
  existingQuestion?: any;
  onSave?: () => void;
  onCancel?: () => void;
}

function LevelEditor({ existingQuestion, onSave, onCancel }: LevelEditorProps) {
  const [gridSize, setGridSize] = useState({ rows: 8, cols: 10 });
  const [title, setTitle] = useState(existingQuestion?.title || "");
  const [description, setDescription] = useState(
    existingQuestion?.description || "",
  );
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    existingQuestion?.difficulty || "easy",
  );
  const [hint, setHint] = useState(existingQuestion?.hint || "");
  const [solution, setSolution] = useState(existingQuestion?.solution || "");
  const [goal, setGoal] = useState<{ x: number; y: number }>(
    existingQuestion?.goal || { x: 9, y: 7 },
  );
  const [selectedTool, setSelectedTool] = useState<Tool>("wall");
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [grid, setGrid] = useState<number[][]>(() => {
    if (existingQuestion?.initialMap) {
      try {
        const parsed = JSON.parse(existingQuestion.initialMap);
        // Find start position
        for (let y = 0; y < parsed.length; y++) {
          for (let x = 0; x < parsed[y].length; x++) {
            if (parsed[y][x] === 2) {
              setStartPos({ x, y });
            }
          }
        }
        return parsed;
      } catch {
        return Array(8)
          .fill(null)
          .map(() => Array(10).fill(0));
      }
    }
    const newGrid = Array(8)
      .fill(null)
      .map(() => Array(10).fill(0));
    newGrid[0][0] = 2; // Set start position
    return newGrid;
  });

  const createQuestion = useMutation(api.admin.createQuestion);
  const updateQuestion = useMutation(api.admin.updateQuestion);

  // Update form when existingQuestion changes
  useEffect(() => {
    if (existingQuestion) {
      setTitle(existingQuestion.title || "");
      setDescription(existingQuestion.description || "");
      setDifficulty(existingQuestion.difficulty || "easy");
      setHint(existingQuestion.hint || "");
      setSolution(existingQuestion.solution || "");
      setGoal(existingQuestion.goal || { x: 9, y: 7 });

      try {
        const parsed = JSON.parse(existingQuestion.initialMap);
        setGrid(parsed);
        setGridSize({ rows: parsed.length, cols: parsed[0]?.length || 10 });

        // Find start position
        for (let y = 0; y < parsed.length; y++) {
          for (let x = 0; x < parsed[y].length; x++) {
            if (parsed[y][x] === 2) {
              setStartPos({ x, y });
            }
          }
        }
      } catch {
        // Keep default grid
      }
    }
  }, [existingQuestion]);

  const applyTool = (row: number, col: number, newGrid: number[][]) => {
    switch (selectedTool) {
      case "wall":
        if (newGrid[row][col] !== 2) {
          newGrid[row][col] = 1;
        }
        break;
      case "empty":
        if (newGrid[row][col] !== 2) {
          newGrid[row][col] = 0;
        }
        break;
      case "start":
        // Remove old start position
        for (let y = 0; y < newGrid.length; y++) {
          for (let x = 0; x < newGrid[y].length; x++) {
            if (newGrid[y][x] === 2) newGrid[y][x] = 0;
          }
        }
        newGrid[row][col] = 2;
        setStartPos({ x: col, y: row });
        break;
      case "goal":
        setGoal({ x: col, y: row });
        break;
    }
  };

  const handleCellInteraction = (row: number, col: number) => {
    const newGrid = grid.map((r) => [...r]);
    applyTool(row, col, newGrid);
    setGrid(newGrid);
  };

  const handleMouseDown = (row: number, col: number) => {
    setIsDragging(true);
    handleCellInteraction(row, col);
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (isDragging) {
      handleCellInteraction(row, col);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const clearGrid = () => {
    if (confirm("Clear the entire grid?")) {
      const newGrid = Array(gridSize.rows)
        .fill(null)
        .map(() => Array(gridSize.cols).fill(0));
      newGrid[0][0] = 2;
      setGrid(newGrid);
      setStartPos({ x: 0, y: 0 });
      setGoal({ x: gridSize.cols - 1, y: gridSize.rows - 1 });
    }
  };

  const fillWalls = () => {
    const newGrid = grid.map((row) => row.map((cell) => (cell === 2 ? 2 : 1)));
    setGrid(newGrid);
  };

  const resizeGrid = (rows: number, cols: number) => {
    // Enforce min/max constraints
    const clampedRows = Math.max(2, Math.min(15, rows));
    const clampedCols = Math.max(2, Math.min(15, cols));

    const newGrid = Array(clampedRows)
      .fill(null)
      .map((_, y) =>
        Array(clampedCols)
          .fill(null)
          .map((_, x) => (grid[y]?.[x] !== undefined ? grid[y][x] : 0)),
      );

    // Ensure start position exists
    let hasStart = false;
    for (let y = 0; y < newGrid.length; y++) {
      for (let x = 0; x < newGrid[y].length; x++) {
        if (newGrid[y][x] === 2) hasStart = true;
      }
    }
    if (!hasStart) {
      newGrid[0][0] = 2;
      setStartPos({ x: 0, y: 0 });
    }

    setGrid(newGrid);
    setGridSize({ rows: clampedRows, cols: clampedCols });
  };

  const handleSave = async () => {
    if (!title || !description) {
      alert("Please fill in title and description");
      return;
    }

    if (existingQuestion) {
      // Update existing question
      await updateQuestion({
        id: existingQuestion._id,
        title,
        description,
        difficulty,
        initialMap: JSON.stringify(grid),
        goal,
        hint: hint || undefined,
        solution: solution || undefined,
      });
      alert("Level updated successfully!");
      onSave?.();
    } else {
      // Create new question
      await createQuestion({
        title,
        description,
        difficulty,
        initialMap: JSON.stringify(grid),
        goal,
        hint: hint || undefined,
        solution: solution || undefined,
      });
      alert("Level created successfully!");

      // Reset form
      setTitle("");
      setDescription("");
      setDifficulty("easy");
      setHint("");
      setSolution("");
      setGoal({ x: 9, y: 7 });
      setStartPos({ x: 0, y: 0 });
      const newGrid = Array(8)
        .fill(null)
        .map(() => Array(10).fill(0));
      newGrid[0][0] = 2;
      setGrid(newGrid);
    }
  };

  const handleCancel = () => {
    if (existingQuestion && confirm("Discard changes?")) {
      onCancel?.();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Map Editor */}
      <Card>
        <CardHeader>
          <CardTitle>Map Editor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground">
                  Tool:
                </span>
                <Button
                  variant={selectedTool === "wall" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTool("wall")}
                >
                  🧱 Wall
                </Button>
                <Button
                  variant={selectedTool === "empty" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTool("empty")}
                >
                  ⬜ Empty
                </Button>
                <Button
                  variant={selectedTool === "start" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTool("start")}
                >
                  → Start
                </Button>
                <Button
                  variant={selectedTool === "goal" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTool("goal")}
                >
                  🎯 Goal
                </Button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground">
                  Actions:
                </span>
                <Button variant="outline" size="sm" onClick={clearGrid}>
                  Clear All
                </Button>
                <Button variant="outline" size="sm" onClick={fillWalls}>
                  Fill Walls
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  Size:
                </span>
                <Input
                  type="number"
                  min="2"
                  max="15"
                  value={gridSize.rows}
                  onChange={(e) =>
                    resizeGrid(parseInt(e.target.value) || 8, gridSize.cols)
                  }
                  className="w-16"
                />
                <span className="text-sm text-muted-foreground">×</span>
                <Input
                  type="number"
                  min="2"
                  max="15"
                  value={gridSize.cols}
                  onChange={(e) =>
                    resizeGrid(gridSize.rows, parseInt(e.target.value) || 10)
                  }
                  className="w-16"
                />
              </div>
            </div>

            {/* Grid */}
            <div
              className="inline-block bg-card border-2 border-border rounded-lg overflow-hidden select-none"
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {grid.map((row, rowIndex) => (
                <div key={rowIndex} className="flex">
                  {row.map((cell, colIndex) => {
                    const isGoal = goal.x === colIndex && goal.y === rowIndex;
                    const isStart = cell === 2;
                    const isWall = cell === 1;

                    return (
                      <button
                        key={`${rowIndex}-${colIndex}`}
                        className={`w-12 h-12 border border-border flex items-center justify-center text-xl transition-colors ${
                          isWall
                            ? "bg-gray-700 dark:bg-gray-900 hover:bg-gray-600 dark:hover:bg-gray-800"
                            : isGoal
                              ? "bg-green-400 dark:bg-green-500 hover:bg-green-300 dark:hover:bg-green-400"
                              : isStart
                                ? "bg-yellow-400 dark:bg-yellow-500 hover:bg-yellow-300 dark:hover:bg-yellow-400"
                                : "bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                        }`}
                        onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                        onMouseEnter={() =>
                          handleMouseEnter(rowIndex, colIndex)
                        }
                        onDragStart={(e) => e.preventDefault()}
                      >
                        {isStart && "→"}
                        {isGoal && "🎯"}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="text-xs text-muted-foreground">
              <p>💡 Click or drag on cells to place the selected tool</p>
              <p>
                Start: ({startPos.x}, {startPos.y}) | Goal: ({goal.x}, {goal.y})
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question Details Form */}
      <Card>
        <CardHeader>
          <CardTitle>Level Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Simple Navigation"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-[100px] p-2 rounded-md border border-input bg-background"
              placeholder="Describe what the student needs to do..."
            />
          </div>

          <div>
            <label className="text-sm font-medium">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="w-full p-2 rounded-md border border-input bg-background"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Hint (optional)</label>
            <Input
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="Give students a hint..."
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Solution Code (optional)
            </label>
            <textarea
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              className="w-full min-h-[100px] p-2 rounded-md border border-input bg-background font-mono text-sm"
              placeholder="move();\nturn_right();\nmove();"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              {existingQuestion ? "Update Level" : "Create Level"}
            </Button>
            {existingQuestion && (
              <Button
                onClick={handleCancel}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface LevelManagerProps {
  questions: any[];
  onEdit: (question: any) => void;
}

function LevelManager({ questions, onEdit }: LevelManagerProps) {
  const deleteQuestion = useMutation(api.admin.deleteQuestion);

  const handleDelete = async (id: Id<"questions">) => {
    if (confirm("Are you sure you want to delete this level?")) {
      await deleteQuestion({ id });
    }
  };

  const renderMapPreview = (
    mapString: string,
    goal: { x: number; y: number },
  ) => {
    try {
      const map = JSON.parse(mapString);
      return (
        <div className="inline-block bg-card border border-border rounded overflow-hidden">
          {map.map((row: any[], rowIndex: number) => (
            <div key={rowIndex} className="flex">
              {row.map((cell: any, colIndex: number) => {
                const isGoal = goal.x === colIndex && goal.y === rowIndex;
                const isStart = cell === 2;
                const isWall = cell === 1 || cell === "W";
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`w-6 h-6 flex items-center justify-center text-xs ${
                      isWall
                        ? "bg-gray-700 dark:bg-gray-900"
                        : isGoal
                          ? "bg-green-400 dark:bg-green-500"
                          : isStart
                            ? "bg-yellow-400 dark:bg-yellow-500"
                            : "bg-white dark:bg-gray-700"
                    }`}
                  >
                    {isStart && "→"}
                    {isGoal && "🎯"}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      );
    } catch {
      return <div className="text-xs text-muted-foreground">Invalid map</div>;
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="grid gap-4">
        {questions.map((question) => (
          <Card key={question._id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start gap-6">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{question.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {question.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        question.difficulty === "easy"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : question.difficulty === "medium"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {question.difficulty.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Map Preview */}
                <div className="flex-shrink-0">
                  <div className="text-xs text-muted-foreground mb-1">
                    Preview:
                  </div>
                  {renderMapPreview(question.initialMap, question.goal)}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(question)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(question._id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {questions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No levels created yet. Create your first level!
          </CardContent>
        </Card>
      )}
    </div>
  );
}
