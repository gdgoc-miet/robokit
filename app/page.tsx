"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Code, Trophy, CheckCircle, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/Logo";

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

  if (myTeam === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

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
          <Card className="bg-card border shadow-md">
            <CardHeader className="bg-gradient-to-r from-[#4285f4] to-[#34a853] text-white rounded-t-lg">
              <CardTitle className="text-white">
                Your Team&apos;s Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-[#4285f4]">
                    {teamProgress.completedChallenges}
                  </div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-[#ea4335]">
                    {teamProgress.totalScore}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Score
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-[#fbbc04]">
                    {teamProgress.totalAttempts}
                  </div>
                  <div className="text-sm text-muted-foreground">Attempts</div>
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
          <Card
            className="cursor-pointer hover:shadow-lg transition-all duration-300 bg-card border shadow-md"
            onClick={() => router.push("/teams")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-6 h-6 text-[#4285f4]" />
                <span className="text-foreground">Teams</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myTeam ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Team: {myTeam.name}
                  </p>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-[#34a853]" />
                    <span className="text-xs text-muted-foreground">
                      {myTeam.members.length}/3 members
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Create or join a team
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card
            className="cursor-pointer hover:shadow-lg transition-all duration-300 bg-card border shadow-md"
            onClick={() => router.push("/simulator")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-6 h-6 text-[#ea4335]" />
                <span className="text-foreground">Simulator</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Practice pathfinding algorithms
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card
            className="cursor-pointer hover:shadow-lg transition-all duration-300 bg-card border shadow-md"
            onClick={() => router.push("/leaderboard")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-[#fbbc04]" />
                <span className="text-foreground">Leaderboard</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View team rankings
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
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
