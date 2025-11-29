"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Trash2,
  Edit,
  Save,
  Check,
  X,
  MessageSquare,
  Eye,
  Play,
  Square,
  Clock,
  Settings,
  Users,
  Crown,
} from "lucide-react";
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
              You don&apos;t have permission to access the admin panel.
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
            <TabsTrigger value="competition">Competition</TabsTrigger>
            <TabsTrigger value="create">
              {editingQuestion ? "Edit Level" : "Create Level"}
            </TabsTrigger>
            <TabsTrigger value="manage">Manage Levels</TabsTrigger>
            <TabsTrigger value="submissions">Review Submissions</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
          </TabsList>

          <TabsContent value="competition">
            <CompetitionManager />
          </TabsContent>

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

          <TabsContent value="submissions">
            <SubmissionReviewer />
          </TabsContent>

          <TabsContent value="teams">
            <TeamsManager />
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
  const [isPractice, setIsPractice] = useState(
    existingQuestion?.isPractice || false,
  );
  const [order, setOrder] = useState<number | undefined>(
    existingQuestion?.order,
  );
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
      setIsPractice(existingQuestion.isPractice || false);
      setOrder(existingQuestion.order);
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
        isPractice,
        order,
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
        isPractice,
        order,
      });
      alert("Level created successfully!");

      // Reset form
      setTitle("");
      setDescription("");
      setDifficulty("easy");
      setHint("");
      setSolution("");
      setIsPractice(false);
      setOrder(undefined);
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

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPractice"
                checked={isPractice}
                onChange={(e) => setIsPractice(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="isPractice" className="text-sm font-medium">
                Practice Question
              </label>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Order:</label>
              <Input
                type="number"
                value={order ?? ""}
                onChange={(e) =>
                  setOrder(
                    e.target.value ? parseInt(e.target.value) : undefined,
                  )
                }
                placeholder="Auto"
                className="w-20"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Practice questions are available before the competition starts.
            Competition questions only become available when the competition
            goes live.
          </p>

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
                <div className="shrink-0">
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

// Submission Reviewer Component
function SubmissionReviewer() {
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "approved" | "invalid"
  >("pending");
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [filterQuestion, setFilterQuestion] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<
    "all" | "easy" | "medium" | "hard"
  >("all");
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [comment, setComment] = useState("");
  const [showCodeModal, setShowCodeModal] = useState(false);

  // Search states for filterable dropdowns
  const [teamSearch, setTeamSearch] = useState("");
  const [levelSearch, setLevelSearch] = useState("");
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);

  // Fetch teams and questions for filter dropdowns
  const teams = useQuery(api.admin.getAllTeamsAdmin);
  const questions = useQuery(api.admin.getAllQuestionsAdmin);

  // Filter teams and questions based on search
  const filteredTeams = teams?.filter((team) =>
    team.name.toLowerCase().includes(teamSearch.toLowerCase()),
  );
  const filteredQuestions = questions?.filter((q) =>
    q.title.toLowerCase().includes(levelSearch.toLowerCase()),
  );

  // Get selected team/question names for display
  const selectedTeamName =
    filterTeam !== "all"
      ? teams?.find((t) => t._id === filterTeam)?.name || ""
      : "";
  const selectedQuestionName =
    filterQuestion !== "all"
      ? questions?.find((q) => q._id === filterQuestion)?.title || ""
      : "";

  const submissions = useQuery(api.admin.getAllSubmissions, {
    reviewStatus: filterStatus,
    teamId: filterTeam !== "all" ? (filterTeam as Id<"teams">) : undefined,
    questionId:
      filterQuestion !== "all"
        ? (filterQuestion as Id<"questions">)
        : undefined,
    difficulty: filterDifficulty,
  });
  const reviewSubmission = useMutation(api.admin.reviewSubmission);
  const addComment = useMutation(api.admin.addSubmissionComment);
  const clearReview = useMutation(api.admin.clearSubmissionReview);
  const cleanupOrphaned = useMutation(api.admin.cleanupOrphanedSubmissions);

  const handleCleanup = async () => {
    if (confirm("Delete all submissions for questions that no longer exist?")) {
      const result = await cleanupOrphaned({});
      alert(`Cleaned up ${result.deletedCount} orphaned submissions.`);
    }
  };

  const handleReview = async (
    submissionId: Id<"submissions">,
    status: "approved" | "invalid",
  ) => {
    await reviewSubmission({
      submissionId,
      reviewStatus: status,
      adminComment: comment || undefined,
    });
    setComment("");
    setSelectedSubmission(null);
  };

  const handleAddComment = async (submissionId: Id<"submissions">) => {
    if (!comment.trim()) return;
    await addComment({
      submissionId,
      comment,
    });
    setComment("");
    setSelectedSubmission(null);
  };

  const handleClearReview = async (submissionId: Id<"submissions">) => {
    if (confirm("Reset this submission to pending status?")) {
      await clearReview({ submissionId });
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString();
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Approved
          </span>
        );
      case "invalid":
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            Invalid
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="mt-6 space-y-4">
      {/* Filter controls */}
      <div className="space-y-4 mb-4">
        {/* Status filter buttons */}
        <div className="flex gap-2 flex-wrap justify-between">
          <div className="flex gap-2">
            <Button
              variant={filterStatus === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("all")}
            >
              All
            </Button>
            <Button
              variant={filterStatus === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("pending")}
            >
              Pending
            </Button>
            <Button
              variant={filterStatus === "approved" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("approved")}
            >
              Approved
            </Button>
            <Button
              variant={filterStatus === "invalid" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("invalid")}
            >
              Invalid
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCleanup}
            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Cleanup Orphaned
          </Button>
        </div>

        {/* Additional filters */}
        <div className="flex gap-4 flex-wrap items-end">
          {/* Team filter - searchable */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-muted-foreground">
              Team:
            </label>
            <div className="relative">
              <Input
                placeholder="Search teams..."
                value={filterTeam !== "all" ? selectedTeamName : teamSearch}
                onChange={(e) => {
                  setTeamSearch(e.target.value);
                  if (filterTeam !== "all") {
                    setFilterTeam("all");
                  }
                  setShowTeamDropdown(true);
                }}
                onFocus={() => setShowTeamDropdown(true)}
                onBlur={() => setTimeout(() => setShowTeamDropdown(false), 200)}
                className="w-48"
              />
              {showTeamDropdown && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-background border border-input rounded-md shadow-lg">
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onMouseDown={() => {
                      setFilterTeam("all");
                      setTeamSearch("");
                      setShowTeamDropdown(false);
                    }}
                  >
                    All Teams
                  </button>
                  {filteredTeams?.map((team) => (
                    <button
                      key={team._id}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      onMouseDown={() => {
                        setFilterTeam(team._id);
                        setTeamSearch("");
                        setShowTeamDropdown(false);
                      }}
                    >
                      {team.name}
                    </button>
                  ))}
                  {filteredTeams?.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No teams found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Level filter - searchable */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-muted-foreground">
              Level:
            </label>
            <div className="relative">
              <Input
                placeholder="Search levels..."
                value={
                  filterQuestion !== "all" ? selectedQuestionName : levelSearch
                }
                onChange={(e) => {
                  setLevelSearch(e.target.value);
                  if (filterQuestion !== "all") {
                    setFilterQuestion("all");
                  }
                  setShowLevelDropdown(true);
                }}
                onFocus={() => setShowLevelDropdown(true)}
                onBlur={() =>
                  setTimeout(() => setShowLevelDropdown(false), 200)
                }
                className="w-48"
              />
              {showLevelDropdown && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-background border border-input rounded-md shadow-lg">
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onMouseDown={() => {
                      setFilterQuestion("all");
                      setLevelSearch("");
                      setShowLevelDropdown(false);
                    }}
                  >
                    All Levels
                  </button>
                  {filteredQuestions?.map((q) => (
                    <button
                      key={q._id}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      onMouseDown={() => {
                        setFilterQuestion(q._id);
                        setLevelSearch("");
                        setShowLevelDropdown(false);
                      }}
                    >
                      {q.title}
                    </button>
                  ))}
                  {filteredQuestions?.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No levels found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Difficulty filter */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-muted-foreground">
              Difficulty:
            </label>
            <select
              value={filterDifficulty}
              onChange={(e) =>
                setFilterDifficulty(
                  e.target.value as "all" | "easy" | "medium" | "hard",
                )
              }
              className="h-9 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Clear filters button */}
          {(filterTeam !== "all" ||
            filterQuestion !== "all" ||
            filterDifficulty !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterTeam("all");
                setFilterQuestion("all");
                setFilterDifficulty("all");
              }}
            >
              <X className="w-4 h-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Submissions list */}
      <div className="grid gap-4">
        {submissions?.map((submission) => (
          <Card
            key={submission._id}
            className={
              submission.reviewStatus === "invalid"
                ? "border-red-300 dark:border-red-800"
                : ""
            }
          >
            <CardContent className="p-6">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">
                      {submission.teamName}
                    </h3>
                    {getStatusBadge(submission.reviewStatus)}
                    {submission.completed && (
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        Completed
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Challenge: <strong>{submission.questionTitle}</strong>
                    <span
                      className={`ml-2 text-xs px-2 py-0.5 rounded ${
                        submission.questionDifficulty === "easy"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : submission.questionDifficulty === "medium"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {submission.questionDifficulty?.toUpperCase()}
                    </span>
                  </p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      Score: {submission.score || 0} | Steps:{" "}
                      {submission.steps || "N/A"} | Attempts:{" "}
                      {submission.attempts || 0}
                    </p>
                    <p>Submitted: {formatDate(submission.completedAt)}</p>
                    {submission.reviewedAt && (
                      <p>
                        Reviewed: {formatDate(submission.reviewedAt)} by{" "}
                        {submission.reviewerName || "Admin"}
                      </p>
                    )}
                  </div>

                  {submission.adminComment && (
                    <div className="mt-3 p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium mb-1">Admin Comment:</p>
                      <p className="text-sm text-muted-foreground">
                        {submission.adminComment}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedSubmission(submission);
                      setShowCodeModal(true);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Code
                  </Button>

                  {(!submission.reviewStatus ||
                    submission.reviewStatus === "pending") && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleReview(submission._id, "approved")}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleReview(submission._id, "invalid")}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Mark Invalid
                      </Button>
                    </>
                  )}

                  {submission.reviewStatus &&
                    submission.reviewStatus !== "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleClearReview(submission._id)}
                      >
                        Reset
                      </Button>
                    )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelectedSubmission(
                        selectedSubmission?._id === submission._id
                          ? null
                          : submission,
                      )
                    }
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Comment
                  </Button>
                </div>
              </div>

              {/* Comment input */}
              {selectedSubmission?._id === submission._id && !showCodeModal && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a comment for the team..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={() => handleAddComment(submission._id)}>
                      Send
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedSubmission(null);
                        setComment("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {submissions?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No submissions found with the selected filter.
          </CardContent>
        </Card>
      )}

      {/* Code View Modal */}
      {showCodeModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-auto">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Submission Code - {selectedSubmission.teamName}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCodeModal(false);
                    setSelectedSubmission(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">
                  Challenge: {selectedSubmission.questionTitle}
                </p>
              </div>
              <pre className="p-4 bg-muted rounded-md overflow-x-auto text-sm font-mono whitespace-pre-wrap">
                {selectedSubmission.code}
              </pre>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add review comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      handleReview(selectedSubmission._id, "approved");
                      setShowCodeModal(false);
                    }}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleReview(selectedSubmission._id, "invalid");
                      setShowCodeModal(false);
                    }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Invalid
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Competition Manager Component
function CompetitionManager() {
  const settings = useQuery(api.admin.getCompetitionSettings);
  const updateSettings = useMutation(api.admin.updateCompetitionSettings);
  const goLive = useMutation(api.admin.goLive);
  const endCompetition = useMutation(api.admin.endCompetition);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [allowPractice, setAllowPractice] = useState(true);
  const [scheduledStart, setScheduledStart] = useState("");

  // Update local state when settings load
  useEffect(() => {
    if (settings) {
      setTitle(settings.title || "RoboKit Competition");
      setDescription(settings.description || "");
      setAllowPractice(settings.allowPractice);
      if (settings.competitionStartTime) {
        const date = new Date(settings.competitionStartTime);
        setScheduledStart(date.toISOString().slice(0, 16));
      }
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    await updateSettings({
      title,
      description,
      allowPractice,
      competitionStartTime: scheduledStart
        ? new Date(scheduledStart).getTime()
        : undefined,
    });
    alert("Settings saved!");
  };

  const handleGoLive = async () => {
    if (
      confirm(
        "Start the competition now? All competition questions will become available.",
      )
    ) {
      await goLive({});
    }
  };

  const handleEndCompetition = async () => {
    if (
      confirm(
        "End the competition? Teams will no longer be able to submit answers.",
      )
    ) {
      await endCompetition({});
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Not set";
    return new Date(timestamp).toLocaleString();
  };

  if (!settings) {
    return (
      <div className="mt-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Status Card */}
      <Card className={settings.isLive ? "border-green-500 border-2" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {settings.isLive ? (
                <>
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-600 dark:text-green-400">
                    Competition is LIVE
                  </span>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-yellow-600 dark:text-yellow-400">
                    Competition Not Started
                  </span>
                </>
              )}
            </div>
            <div className="flex gap-2">
              {!settings.isLive ? (
                <Button
                  onClick={handleGoLive}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Go Live Now
                </Button>
              ) : (
                <Button onClick={handleEndCompetition} variant="destructive">
                  <Square className="w-4 h-4 mr-2" />
                  End Competition
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Started:</p>
              <p className="font-medium">
                {formatDate(settings.competitionStartTime)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Ended:</p>
              <p className="font-medium">
                {formatDate(settings.competitionEndTime)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Practice Mode:</p>
              <p className="font-medium">
                {settings.allowPractice ? "Enabled" : "Disabled"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Competition Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Competition Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="RoboKit Competition"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-20 p-2 rounded-md border border-input bg-background"
              placeholder="Welcome message for participants..."
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Scheduled Start Time (optional)
            </label>
            <Input
              type="datetime-local"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              This is for display purposes. Use &quot;Go Live Now&quot; to
              actually start the competition.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allowPractice"
              checked={allowPractice}
              onChange={(e) => setAllowPractice(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="allowPractice" className="text-sm font-medium">
              Allow Practice Questions
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            When enabled, practice questions are available even before the
            competition starts.
          </p>

          <Button onClick={handleSaveSettings}>
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Practice Questions:</strong> Mark questions as
            &quot;Practice&quot; in the level editor. These are available when
            practice mode is enabled, even before the competition starts.
          </p>
          <p>
            <strong>Competition Questions:</strong> Regular questions (not
            marked as practice) only become available when you click &quot;Go
            Live Now&quot;.
          </p>
          <p>
            <strong>Order:</strong> Set the order field on questions to control
            their display order. Lower numbers appear first.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Teams Manager Component
function TeamsManager() {
  const teams = useQuery(api.admin.getAllTeamsWithMembers);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTeams = teams?.filter(
    (team) =>
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.members.some(
        (m) =>
          m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.email?.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
  );

  if (!teams) {
    return (
      <div className="mt-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Header with stats */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            All Teams ({teams.length})
          </h2>
          <span className="text-sm text-muted-foreground">
            {teams.reduce((acc, t) => acc + t.memberCount, 0)} total members
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <Input
          placeholder="Search teams or members..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        {searchTerm && (
          <Button variant="ghost" size="sm" onClick={() => setSearchTerm("")}>
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Teams grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTeams?.map((team) => (
          <Card key={team._id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="truncate">{team.name}</span>
                <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                  {team.code}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Members ({team.memberCount}/3):
                </p>
                <ul className="space-y-2">
                  {team.members.map((member) => (
                    <li
                      key={member._id}
                      className="flex items-start gap-2 text-sm"
                    >
                      {member.isLeader && (
                        <Crown className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                      )}
                      {!member.isLeader && <span className="w-4" />}
                      <div className="flex flex-col min-w-0">
                        <span
                          className={`truncate ${member.isLeader ? "font-medium" : ""}`}
                        >
                          {member.name}
                          {member.isLeader && (
                            <span className="text-xs text-muted-foreground ml-1">
                              (Leader)
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {member.email}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTeams?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {searchTerm
              ? "No teams match your search."
              : "No teams created yet."}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
