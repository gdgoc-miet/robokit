"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Code, Trophy, Settings, User } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/Logo";
import { StatsCard } from "@/components/StatsCard";

export default function Home() {
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated === false) {
      router.push("/signin");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b border-border p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <motion.div
            className="flex items-center gap-2"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <Logo size={32} />
            <div>
              <h1 className="font-bold text-2xl text-foreground">RobKit</h1>
              <p className="text-xs text-muted-foreground leading-tight">
                GDGoC MIET
                <br />
                Google Developers Club on Campus
              </p>
            </div>
          </motion.div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/account")}
            title="Account Settings"
          >
            <User className="w-4 h-4" />
          </Button>
          <SignOutButton />
        </div>
      </header>
      <main className="p-8 flex flex-col gap-8">
        <DashboardContent />
      </main>
    </div>
  );
}

function SignOutButton() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  return (
    <Button
      variant="outline"
      onClick={() =>
        void signOut().then(() => {
          router.push("/signin");
        })
      }
    >
      Sign out
    </Button>
  );
}

function DashboardContent() {
  const router = useRouter();
  const myTeam = useQuery(api.teams.getMyTeam);
  const teamProgress = useQuery(api.questions.getTeamProgress);
  const isAdmin = useQuery(api.admin.amIAdmin);
  const allQuestions = useQuery(api.questions.listQuestions);
  const leaderboard = useQuery(api.questions.getLeaderboard);

  if (
    myTeam === undefined ||
    allQuestions === undefined ||
    leaderboard === undefined
  ) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate stats
  const totalQuestions = allQuestions.length;
  const completedCount = teamProgress?.completedChallenges || 0;

  // Find next challenge
  const completedIds = new Set(teamProgress?.completedQuestionIds || []);
  const nextQuestion = allQuestions.find((q) => !completedIds.has(q._id));

  // Calculate rank
  const myTeamRank = leaderboard.findIndex((t) => t.teamId === myTeam?._id) + 1;
  const rankDisplay = myTeam ? (myTeamRank > 0 ? `#${myTeamRank}` : "-") : "-";

  // Top score
  const topScore = leaderboard.length > 0 ? leaderboard[0].totalScore : 0;

  return (
    <div className="max-w-4xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-4xl font-bold mb-2 text-foreground">
          Welcome Back!
        </h2>
        <p className="text-muted-foreground mb-8">
          {myTeam
            ? `Team: ${myTeam.name}`
            : "Create or join a team to get started"}
        </p>
      </motion.div>

      {teamProgress && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <Card className="bg-card border shadow-md overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#4285f4] via-[#ea4335] to-[#34a853]" />
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold text-foreground">
                Your Team&apos;s Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-8 pt-4">
                <div className="flex flex-col items-center p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 transition-colors">
                  <span className="text-4xl font-extrabold text-[#4285f4] mb-1">
                    {teamProgress.completedChallenges}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Completed
                  </span>
                </div>
                <div className="flex flex-col items-center p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 transition-colors">
                  <span className="text-4xl font-extrabold text-[#ea4335] mb-1">
                    {teamProgress.totalScore}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Score
                  </span>
                </div>
                <div className="flex flex-col items-center p-4 rounded-xl bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-100 dark:border-yellow-900/50 transition-colors">
                  <span className="text-4xl font-extrabold text-[#fbbc04] mb-1">
                    {teamProgress.totalAttempts}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Attempts
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <StatsCard
            title="Team Rank"
            value={rankDisplay}
            description={myTeam ? "Current position" : "Join a team"}
            icon={Users}
            color="text-[#4285f4]"
            onClick={() => router.push("/teams")}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <StatsCard
            title="Challenges"
            value={`${completedCount} / ${totalQuestions}`}
            description={
              nextQuestion ? `Next: ${nextQuestion.title}` : "All completed!"
            }
            icon={Code}
            color="text-[#ea4335]"
            onClick={() => router.push("/simulator")}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <StatsCard
            title="Top Score"
            value={topScore}
            description="Highest team score"
            icon={Trophy}
            color="text-[#fbbc04]"
            onClick={() => router.push("/leaderboard")}
          />
        </motion.div>

        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="md:col-span-3"
          >
            <Card
              className="cursor-pointer hover:shadow-lg transition-all duration-300 bg-card border shadow-md border-[#34a853]"
              onClick={() => router.push("/admin")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-6 h-6 text-[#34a853]" />
                  <span className="text-foreground">Admin Panel</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Create and manage levels
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
