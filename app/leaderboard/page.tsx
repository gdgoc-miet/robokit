"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Trophy, Medal, Award } from "lucide-react";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LeaderboardPage() {
  const router = useRouter();
  const leaderboard = useQuery(api.questions.getLeaderboard);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border p-4 flex justify-between items-center">
        <Button variant="outline" onClick={() => router.push("/")}>
          ← Back to Dashboard
        </Button>
        <ThemeToggle />
      </header>

      <main className="p-8 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <motion.h1
            className="text-4xl font-bold mb-2 flex items-center justify-center gap-3 text-foreground"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <Trophy className="w-10 h-10 text-yellow-500 dark:text-yellow-400" />
            Leaderboard
          </motion.h1>
          <p className="text-muted-foreground">Top performing teams</p>
        </div>

        {!leaderboard ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading leaderboard...</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-muted-foreground text-center">
                No teams have completed challenges yet. Be the first!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Podium for top 3 */}
            {leaderboard.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 mb-8">
                {/* 2nd place */}
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col items-center"
                >
                  <div className="bg-gradient-to-br from-[#ea4335] to-[#ea4335]/80 dark:from-[#f28b82] dark:to-[#f28b82]/80 rounded-lg p-6 w-full text-center shadow-md">
                    <Medal className="w-12 h-12 mx-auto mb-2 text-white/90" />
                    <div className="text-3xl font-bold text-white">2nd</div>
                    <div className="text-sm mt-2 font-semibold text-white">
                      {leaderboard[1].teamName}
                    </div>
                    <div className="text-2xl font-bold mt-2 text-white">
                      {leaderboard[1].totalSteps} tiles
                    </div>
                    <div className="text-xs text-white/90">
                      {leaderboard[1].completedChallenges} challenges
                    </div>
                  </div>
                </motion.div>

                {/* 1st place */}
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="flex flex-col items-center -mt-4"
                >
                  <div className="bg-gradient-to-br from-[#4285f4] to-[#4285f4]/80 dark:from-[#8ab4f8] dark:to-[#8ab4f8]/80 rounded-lg p-8 w-full text-center shadow-xl border-4 border-[#4285f4] dark:border-[#8ab4f8]">
                    <Trophy className="w-16 h-16 mx-auto mb-2 text-yellow-400" />
                    <div className="text-4xl font-bold text-white">1st</div>
                    <div className="text-sm mt-2 font-bold text-white">
                      {leaderboard[0].teamName}
                    </div>
                    <div className="text-3xl font-bold mt-2 text-white">
                      {leaderboard[0].totalSteps} tiles
                    </div>
                    <div className="text-xs text-white/90">
                      {leaderboard[0].completedChallenges} challenges
                    </div>
                  </div>
                </motion.div>

                {/* 3rd place */}
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col items-center"
                >
                  <div className="bg-gradient-to-br from-[#fbbc04] to-[#fbbc04]/80 dark:from-[#fdd663] dark:to-[#fdd663]/80 rounded-lg p-6 w-full text-center shadow-md">
                    <Award className="w-12 h-12 mx-auto mb-2 text-white/90" />
                    <div className="text-3xl font-bold text-white">3rd</div>
                    <div className="text-sm mt-2 font-semibold text-white">
                      {leaderboard[2].teamName}
                    </div>
                    <div className="text-2xl font-bold mt-2 text-white">
                      {leaderboard[2].totalSteps} tiles
                    </div>
                    <div className="text-xs text-white/90">
                      {leaderboard[2].completedChallenges} challenges
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Rest of the teams */}
            <Card>
              <CardHeader>
                <CardTitle>All Teams</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaderboard.map((team, index) => (
                    <motion.div
                      key={team.teamId}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        index === 0
                          ? "bg-[#4285f4]/5 dark:bg-[#4285f4]/10 border-2 border-[#4285f4]"
                          : index === 1
                            ? "bg-[#ea4335]/5 dark:bg-[#ea4335]/10 border-2 border-[#ea4335]"
                            : index === 2
                              ? "bg-[#fbbc04]/5 dark:bg-[#fbbc04]/10 border-2 border-[#fbbc04]"
                              : "bg-muted border border-border"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                            index === 0
                              ? "bg-[#4285f4] dark:bg-[#8ab4f8] text-white"
                              : index === 1
                                ? "bg-[#ea4335] dark:bg-[#f28b82] text-white"
                                : index === 2
                                  ? "bg-[#fbbc04] dark:bg-[#fdd663] text-white"
                                  : "bg-[#34a853] dark:bg-[#81c995] text-white"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">
                            {team.teamName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {team.completedChallenges} challenge
                            {team.completedChallenges !== 1 ? "s" : ""}{" "}
                            completed
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-foreground">
                          {team.totalSteps}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          total tiles
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Ranking explanation */}
            <Card>
              <CardHeader>
                <CardTitle>How Ranking Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-foreground">
                <p>
                  <strong>Per Level:</strong> Teams are ranked by the number of
                  tiles moved to complete each level.
                </p>
                <p>
                  <strong>1st Place:</strong> Team with the fewest tiles moved
                  on each level gets rank 1 for that level.
                </p>
                <p>
                  <strong>Overall Ranking:</strong> Sum of ranks across all
                  completed levels determines final position.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  💡 Tip: Fewer tiles = better rank! Optimize your solutions to
                  climb the leaderboard.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
