"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeEditor } from "@/components/CodeEditor";
import { Simulator } from "@/components/Simulator";
import { PresenceIndicator } from "@/components/PresenceIndicator";
import { useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { Lightbulb, BookOpen, Users, Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const DEFAULT_CODE = `// Robot API:
// move() - move forward one step
// turn_left() - turn 90° left
// turn_right() - turn 90° right
// is_front_empty() - returns true if can move forward
// is_left_empty() - returns true if left is empty
// is_right_empty() - returns true if right is empty
// is_goal() - returns true if at goal
// get_position() - returns {x, y} current position
// get_goal() - returns {x, y} goal position
// log(msg) - print message to console
// done() - stop execution

// Memory API:
// memory.has_visited(x, y) - check if cell was visited
// memory.visit_count(x, y) - get visit count for cell
// memory.get_visited_cells() - get all visited cells

// Define start() - runs once at the beginning
function start() {
  log("Starting robot...");
}

// Define update() - runs every step until done() is called
function update() {
  if (is_front_empty()) {
    move();
  } else {
    turn_right();
  }
  
  if (is_goal()) {
    log("Goal reached!");
    done();
  }
}
`;

export default function SimulatorPage() {
  const router = useRouter();
  const questions = useQuery(api.questions.listQuestions);
  const myTeam = useQuery(api.teams.getMyTeam);
  const [selectedQuestionId, setSelectedQuestionId] =
    useState<Id<"questions"> | null>(null);
  const selectedQuestion = questions?.find((q) => q._id === selectedQuestionId);
  const teamState = useQuery(
    api.simulator.getState,
    selectedQuestionId ? { questionId: selectedQuestionId } : "skip",
  );
  const saveState = useMutation(api.simulator.saveState);
  const submitAnswer = useMutation(api.questions.submitAnswer);
  const seedQuestions = useMutation(api.questions.seedQuestions);
  const updatePresence = useMutation(api.presence.updatePresence);

  const [code, setCode] = useState(DEFAULT_CODE);
  const [lastSaved, setLastSaved] = useState<number>(Date.now());
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  // Update presence every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      void updatePresence({
        questionId: selectedQuestionId || undefined,
        currentPage: "simulator",
      });
    }, 30000);

    // Update immediately on mount
    void updatePresence({
      questionId: selectedQuestionId || undefined,
      currentPage: "simulator",
    });

    return () => clearInterval(interval);
  }, [updatePresence, selectedQuestionId]);

  useEffect(() => {
    if (questions && questions.length === 0) {
      void seedQuestions();
    }
  }, [questions, seedQuestions]);

  useEffect(() => {
    if (questions && questions.length > 0 && !selectedQuestionId) {
      setSelectedQuestionId(questions[0]._id);
    }
  }, [questions, selectedQuestionId]);

  useEffect(() => {
    if (teamState) {
      setCode(teamState.code);
    } else if (selectedQuestionId) {
      setCode(DEFAULT_CODE);
    }
    setShowHint(false);
    setShowSolution(false);
  }, [teamState, selectedQuestionId]);

  // Auto-save every 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedQuestionId && code !== teamState?.code) {
        void saveState({ questionId: selectedQuestionId, code });
        setLastSaved(Date.now());
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [code, selectedQuestionId, saveState, teamState?.code]);

  const handleComplete = async (completed: boolean, steps: number) => {
    if (!selectedQuestionId) return;
    await submitAnswer({
      questionId: selectedQuestionId,
      code,
      completed,
      steps,
    });
    if (completed) {
      // Don't use alert, the confetti is enough
      console.log("Challenge completed!");
    }
  };

  const loadHint = () => {
    setShowHint(!showHint);
  };

  const loadSolution = () => {
    if (selectedQuestion?.solution) {
      if (
        confirm(
          "This will replace your current code with the solution. Continue?",
        )
      ) {
        setCode(selectedQuestion.solution);
        setShowSolution(false);
      }
    }
  };

  if (!questions || !selectedQuestion) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading questions...</p>
        </div>
      </div>
    );
  }

  const map = JSON.parse(selectedQuestion.initialMap);

  // Group questions by difficulty
  const easyQuestions = questions.filter((q) => q.difficulty === "easy");
  const mediumQuestions = questions.filter((q) => q.difficulty === "medium");
  const hardQuestions = questions.filter((q) => q.difficulty === "hard");

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border p-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Select Challenge</SheetTitle>
                <SheetDescription>
                  Choose a challenge to practice your pathfinding skills
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Easy Challenges */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-[#34a853]/10 text-[#34a853] text-xs">
                      EASY
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {easyQuestions.map((q) => (
                      <Button
                        key={q._id}
                        variant={
                          q._id === selectedQuestionId ? "default" : "outline"
                        }
                        onClick={() => setSelectedQuestionId(q._id)}
                        className="w-full justify-start"
                      >
                        {q.title}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Medium Challenges */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-[#fbbc04]/10 text-[#fbbc04] text-xs">
                      MEDIUM
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {mediumQuestions.map((q) => (
                      <Button
                        key={q._id}
                        variant={
                          q._id === selectedQuestionId ? "default" : "outline"
                        }
                        onClick={() => setSelectedQuestionId(q._id)}
                        className="w-full justify-start"
                      >
                        {q.title}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Hard Challenges */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-[#ea4335]/10 text-[#ea4335] text-xs">
                      HARD
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {hardQuestions.map((q) => (
                      <Button
                        key={q._id}
                        variant={
                          q._id === selectedQuestionId ? "default" : "outline"
                        }
                        onClick={() => setSelectedQuestionId(q._id)}
                        className="w-full justify-start"
                      >
                        {q.title}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Button variant="outline" onClick={() => router.push("/")}>
            ← Dashboard
          </Button>
          <PresenceIndicator questionId={selectedQuestionId || undefined} />
        </div>
        <ThemeToggle />
      </header>

      <main className="p-8">
        <div className="max-w-7xl mx-auto">
          <Card className="mb-6 bg-card border shadow-md">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📚</span>
                  <span>{selectedQuestion.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-normal px-3 py-1 rounded-full ${
                      selectedQuestion.difficulty === "easy"
                        ? "bg-[#34a853]/10 text-[#34a853]"
                        : selectedQuestion.difficulty === "medium"
                          ? "bg-[#fbbc04]/10 text-[#fbbc04]"
                          : "bg-[#ea4335]/10 text-[#ea4335]"
                    }`}
                  >
                    {selectedQuestion.difficulty.toUpperCase()}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground mb-4">
                {selectedQuestion.description}
              </p>

              <div className="flex gap-2">
                {selectedQuestion.hint && (
                  <Button variant="outline" size="sm" onClick={loadHint}>
                    <Lightbulb className="w-4 h-4 mr-2" />
                    {showHint ? "Hide Hint" : "Show Hint"}
                  </Button>
                )}
                {selectedQuestion.solution && (
                  <Button variant="outline" size="sm" onClick={loadSolution}>
                    <BookOpen className="w-4 h-4 mr-2" />
                    Load Solution
                  </Button>
                )}
              </div>

              <AnimatePresence>
                {showHint && selectedQuestion.hint && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 rounded"
                  >
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>💡 Hint:</strong> {selectedQuestion.hint}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {!myTeam && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-primary/5 border-l-4 border-primary p-4 rounded mb-6"
            >
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-foreground font-medium mb-1">
                    You're not in a team yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You can try the simulator, but your progress won't be saved.{" "}
                    <button
                      onClick={() => router.push("/teams")}
                      className="underline font-medium text-primary hover:text-destructive"
                    >
                      Create or join a team
                    </button>{" "}
                    to save your progress and compete on the leaderboard!
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Code Editor</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Auto-saved {Math.floor((Date.now() - lastSaved) / 1000)}s
                    ago
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CodeEditor value={code} onChange={setCode} height="500px" />
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Simulation</CardTitle>
              </CardHeader>
              <CardContent>
                <Simulator
                  map={map}
                  goal={selectedQuestion.goal}
                  code={code}
                  onComplete={handleComplete}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
