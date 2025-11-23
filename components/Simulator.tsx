"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { Play, RotateCcw, SkipForward, Pause } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";

interface SimulatorProps {
  map: number[][];
  goal: { x: number; y: number };
  code: string;
  onComplete: (completed: boolean, steps: number) => void;
}

type Direction = "N" | "E" | "S" | "W";

interface RobotState {
  x: number;
  y: number;
  dir: Direction;
}

interface ExecutionStep {
  type: "move" | "turn" | "log";
  state: RobotState;
  message: string;
}

export function Simulator({ map, goal, code, onComplete }: SimulatorProps) {
  const [robotPos, setRobotPos] = useState({ x: 0, y: 0 });
  const [robotDir, setRobotDir] = useState<Direction>("E");
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentMap, setCurrentMap] = useState(map);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [speed, setSpeed] = useState([300]); // milliseconds per step
  const [path, setPath] = useState<{ x: number; y: number }[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [totalSteps, setTotalSteps] = useState(0);

  const executionRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  useEffect(() => {
    // Find start position (2 in the map)
    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        if (map[y][x] === 2) {
          setRobotPos({ x, y });
          setPath([{ x, y }]);
        }
      }
    }
    setCurrentMap(map);
    setExecutionSteps([]);
    setCurrentStepIndex(-1);
    setLogs([]);
    setPath([]);
  }, [map]);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, msg]);
  };

  const reset = () => {
    executionRef.current.cancelled = true;
    setIsRunning(false);
    setIsPaused(false);
    setLogs([]);
    setRobotDir("E");
    setExecutionSteps([]);
    setCurrentStepIndex(-1);
    setShowConfetti(false);
    setTotalSteps(0);

    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        if (map[y][x] === 2) {
          setRobotPos({ x, y });
          setPath([{ x, y }]);
        }
      }
    }
    setCurrentMap(map);
  };

  const executeStepByStep = async () => {
    executionRef.current.cancelled = false;
    setIsRunning(true);
    setIsPaused(false);
    setLogs([]);
    setExecutionSteps([]);
    setCurrentStepIndex(-1);
    setShowConfetti(false);
    setTotalSteps(0);

    // Find start position
    let startX = 0,
      startY = 0;
    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        if (map[y][x] === 2) {
          startX = x;
          startY = y;
        }
      }
    }

    let pos = { x: startX, y: startY };
    let dir: Direction = "E";
    const mapCopy = map.map((row) => [...row]);
    const steps: ExecutionStep[] = [];
    const pathTrace: { x: number; y: number }[] = [{ x: pos.x, y: pos.y }];
    let stepCount = 0;
    const MAX_STEPS = 1000; // Prevent infinite loops

    const dirMap = { N: 0, E: 1, S: 2, W: 3 };
    const dx = [0, 1, 0, -1];
    const dy = [-1, 0, 1, 0];

    const api = {
      move: () => {
        if (stepCount >= MAX_STEPS) {
          throw new Error("Maximum steps exceeded (1000)");
        }
        const dirIdx = dirMap[dir];
        const newX = pos.x + dx[dirIdx];
        const newY = pos.y + dy[dirIdx];

        if (
          newY >= 0 &&
          newY < mapCopy.length &&
          newX >= 0 &&
          newX < mapCopy[0].length &&
          mapCopy[newY][newX] !== 1
        ) {
          pos = { x: newX, y: newY };
          pathTrace.push({ x: pos.x, y: pos.y });
          stepCount++;
          steps.push({
            type: "move",
            state: { x: pos.x, y: pos.y, dir },
            message: `Moved to (${pos.x}, ${pos.y})`,
          });
          return true;
        } else {
          steps.push({
            type: "log",
            state: { x: pos.x, y: pos.y, dir },
            message: "⚠️ Cannot move - wall or out of bounds",
          });
          return false;
        }
      },
      turn_left: () => {
        if (stepCount >= MAX_STEPS) {
          throw new Error("Maximum steps exceeded (1000)");
        }
        const dirs: Direction[] = ["N", "E", "S", "W"];
        const idx = dirs.indexOf(dir);
        dir = dirs[(idx + 3) % 4];
        stepCount++;
        steps.push({
          type: "turn",
          state: { x: pos.x, y: pos.y, dir },
          message: `Turned left, now facing ${dir}`,
        });
      },
      turn_right: () => {
        if (stepCount >= MAX_STEPS) {
          throw new Error("Maximum steps exceeded (1000)");
        }
        const dirs: Direction[] = ["N", "E", "S", "W"];
        const idx = dirs.indexOf(dir);
        dir = dirs[(idx + 1) % 4];
        stepCount++;
        steps.push({
          type: "turn",
          state: { x: pos.x, y: pos.y, dir },
          message: `Turned right, now facing ${dir}`,
        });
      },
      is_front_empty: () => {
        const dirIdx = dirMap[dir];
        const newX = pos.x + dx[dirIdx];
        const newY = pos.y + dy[dirIdx];
        return (
          newY >= 0 &&
          newY < mapCopy.length &&
          newX >= 0 &&
          newX < mapCopy[0].length &&
          mapCopy[newY][newX] !== 1
        );
      },
      is_goal: () => {
        return pos.x === goal.x && pos.y === goal.y;
      },
      is_left_empty: () => {
        const dirs: Direction[] = ["N", "E", "S", "W"];
        const idx = dirs.indexOf(dir);
        const leftDir = dirs[(idx + 3) % 4];
        const leftDirIdx = dirMap[leftDir];
        const newX = pos.x + dx[leftDirIdx];
        const newY = pos.y + dy[leftDirIdx];
        return (
          newY >= 0 &&
          newY < mapCopy.length &&
          newX >= 0 &&
          newX < mapCopy[0].length &&
          mapCopy[newY][newX] !== 1
        );
      },
      is_right_empty: () => {
        const dirs: Direction[] = ["N", "E", "S", "W"];
        const idx = dirs.indexOf(dir);
        const rightDir = dirs[(idx + 1) % 4];
        const rightDirIdx = dirMap[rightDir];
        const newX = pos.x + dx[rightDirIdx];
        const newY = pos.y + dy[rightDirIdx];
        return (
          newY >= 0 &&
          newY < mapCopy.length &&
          newX >= 0 &&
          newX < mapCopy[0].length &&
          mapCopy[newY][newX] !== 1
        );
      },
      get_position: () => {
        return { x: pos.x, y: pos.y };
      },
      get_goal: () => {
        return { x: goal.x, y: goal.y };
      },
      log: (msg: string) => {
        steps.push({
          type: "log",
          state: { x: pos.x, y: pos.y, dir },
          message: `📝 ${msg}`,
        });
      },
    };

    // Create visited cells map for memory
    const visitedCells = new Map<string, number>();
    visitedCells.set(`${pos.x},${pos.y}`, 1);

    const memory = {
      visit: (x: number, y: number) => {
        const key = `${x},${y}`;
        visitedCells.set(key, (visitedCells.get(key) || 0) + 1);
      },
      has_visited: (x: number, y: number) => {
        return visitedCells.has(`${x},${y}`);
      },
      visit_count: (x: number, y: number) => {
        return visitedCells.get(`${x},${y}`) || 0;
      },
      get_visited_cells: () => {
        const cells: Array<{ x: number; y: number; count: number }> = [];
        visitedCells.forEach((count, key) => {
          const [x, y] = key.split(",").map(Number);
          cells.push({ x, y, count });
        });
        return cells;
      },
    };

    // Auto-track visits on move
    const originalMove = api.move;
    api.move = () => {
      const result = originalMove();
      if (result) {
        memory.visit(pos.x, pos.y);
      }
      return result;
    };

    // Create a context object to share state
    const context = {
      isDone: false,
    };

    const doneFunc = () => {
      context.isDone = true;
    };

    try {
      // Execute user code with start/update pattern
      const userFunc = new Function(
        "move",
        "turn_left",
        "turn_right",
        "is_front_empty",
        "is_left_empty",
        "is_right_empty",
        "is_goal",
        "get_position",
        "get_goal",
        "log",
        "done",
        "memory",
        "context",
        "MAX_STEPS",
        `
        ${code}
        
        // Run start if it exists
        if (typeof start === 'function') {
          start();
        }
        
        // Run update in a loop if it exists
        if (typeof update === 'function') {
          let iterations = 0;
          while (!context.isDone && iterations < MAX_STEPS) {
            update();
            iterations++;
            if (is_goal()) {
              context.isDone = true;
              break;
            }
          }
        }
        `,
      );

      await userFunc(
        api.move,
        api.turn_left,
        api.turn_right,
        api.is_front_empty,
        api.is_left_empty,
        api.is_right_empty,
        api.is_goal,
        api.get_position,
        api.get_goal,
        api.log,
        doneFunc,
        memory,
        context,
        MAX_STEPS,
      );

      // Check if goal reached
      const completed = pos.x === goal.x && pos.y === goal.y;
      if (completed) {
        steps.push({
          type: "log",
          state: { x: pos.x, y: pos.y, dir },
          message: "✅ Goal reached!",
        });
      } else {
        steps.push({
          type: "log",
          state: { x: pos.x, y: pos.y, dir },
          message: "❌ Goal not reached",
        });
      }

      setExecutionSteps(steps);
      setTotalSteps(stepCount);

      // Now play the steps
      for (
        let i = 0;
        i < steps.length && !executionRef.current.cancelled;
        i++
      ) {
        setCurrentStepIndex(i);
        const step = steps[i];
        setRobotPos({ x: step.state.x, y: step.state.y });
        setRobotDir(step.state.dir);
        setPath(pathTrace.slice(0, i + 2));
        addLog(step.message);

        // Wait for the speed delay
        await new Promise((resolve) => setTimeout(resolve, speed[0]));

        // Handle pause
        while (isPaused && !executionRef.current.cancelled) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      if (!executionRef.current.cancelled) {
        onComplete(completed, stepCount);
        if (completed) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 5000);
        }
      }
    } catch (error) {
      addLog(
        `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      onComplete(false, 0);
    }

    setIsRunning(false);
    setIsPaused(false);
  };

  const stepForward = () => {
    if (currentStepIndex < executionSteps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      const step = executionSteps[nextIndex];
      setRobotPos({ x: step.state.x, y: step.state.y });
      setRobotDir(step.state.dir);
      addLog(step.message);
    }
  };

  const getCellColor = (x: number, y: number) => {
    const cell = currentMap[y][x];
    const isOnPath = path.some((p) => p.x === x && p.y === y);

    if (robotPos.x === x && robotPos.y === y)
      return "bg-yellow-400 dark:bg-yellow-500 shadow-lg";
    if (goal.x === x && goal.y === y) return "bg-green-400 dark:bg-green-500";
    if (cell === 1) return "bg-gray-800 dark:bg-gray-900";
    if (isOnPath) return "bg-blue-100 dark:bg-blue-900/30";
    return "bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600";
  };

  const getDirectionIcon = () => {
    switch (robotDir) {
      case "N":
        return "↑";
      case "E":
        return "→";
      case "S":
        return "↓";
      case "W":
        return "←";
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={500}
        />
      )}

      <div className="flex flex-col gap-3">
        <div className="flex gap-2 flex-wrap items-center">
          <Button onClick={executeStepByStep} disabled={isRunning} size="sm">
            <Play className="w-4 h-4 mr-2" />
            Run
          </Button>
          <Button
            onClick={() => setIsPaused(!isPaused)}
            disabled={!isRunning}
            variant="outline"
            size="sm"
          >
            {isPaused ? (
              <Play className="w-4 h-4 mr-2" />
            ) : (
              <Pause className="w-4 h-4 mr-2" />
            )}
            {isPaused ? "Resume" : "Pause"}
          </Button>
          <Button
            onClick={stepForward}
            disabled={isRunning}
            variant="outline"
            size="sm"
          >
            <SkipForward className="w-4 h-4 mr-2" />
            Step
          </Button>
          <Button onClick={reset} variant="outline" size="sm">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-foreground">Speed:</label>
          <Slider
            value={speed}
            onValueChange={setSpeed}
            min={50}
            max={1000}
            step={50}
            className="w-32"
          />
          <span className="text-sm text-muted-foreground">{speed[0]}ms</span>
        </div>

        {totalSteps > 0 && (
          <div className="text-sm text-muted-foreground">
            <strong>Steps taken:</strong> {totalSteps}
          </div>
        )}
      </div>

      <div className="grid gap-0 w-fit mx-auto border-4 border-border rounded-lg overflow-hidden shadow-xl">
        <AnimatePresence>
          {currentMap.map((row, y) => (
            <div key={y} className="flex">
              {row.map((_, x) => (
                <motion.div
                  key={`${x}-${y}`}
                  className={`w-12 h-12 flex items-center justify-center transition-all ${getCellColor(x, y)}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {robotPos.x === x && robotPos.y === y && (
                    <motion.span
                      className="text-3xl font-bold text-foreground"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200 }}
                    >
                      {getDirectionIcon()}
                    </motion.span>
                  )}
                  {goal.x === x &&
                    goal.y === y &&
                    !(robotPos.x === x && robotPos.y === y) && (
                      <span className="text-2xl">🎯</span>
                    )}
                </motion.div>
              ))}
            </div>
          ))}
        </AnimatePresence>
      </div>

      <div className="bg-gray-900 dark:bg-gray-950 text-green-400 dark:text-green-300 p-4 rounded-lg h-48 overflow-y-auto font-mono text-sm border border-border">
        {logs.length === 0 && (
          <div className="text-gray-500 dark:text-gray-400 text-center py-8">
            Click &quot;Run&quot; to execute your code...
          </div>
        )}
        {logs.map((log, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            {log}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
