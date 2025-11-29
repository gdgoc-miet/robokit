"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  Edit,
  Check,
  X,
} from "lucide-react";

export default function TeamsPage() {
  const [teamName, setTeamName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const myTeam = useQuery(api.teams.getMyTeam);
  const currentUser = useQuery(api.teams.getCurrentUser);
  const teamSubmissions = useQuery(
    api.questions.getTeamSubmissionsWithFeedback,
  );
  const createTeam = useMutation(api.teams.createTeam);
  const joinTeam = useMutation(api.teams.joinTeam);
  const disbandTeam = useMutation(api.teams.disbandTeam);
  const leaveTeam = useMutation(api.teams.leaveTeam);
  const renameTeam = useMutation(api.teams.renameTeam);
  const router = useRouter();

  const handleRenameTeam = async () => {
    if (!newTeamName.trim()) return;
    try {
      await renameTeam({ name: newTeamName });
      setIsEditingName(false);
      setNewTeamName("");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to rename team");
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) return;
    const result = await createTeam({ name: teamName });
    alert(`Team created! Join code: ${result.code}`);
    setTeamName("");
  };

  const handleJoinTeam = async () => {
    if (!joinCode.trim()) return;
    try {
      await joinTeam({ code: joinCode.toUpperCase() });
      alert("Successfully joined team!");
      setJoinCode("");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to join team");
    }
  };

  const handleDisbandTeam = async () => {
    if (
      !confirm(
        "Are you sure you want to disband this team? This action cannot be undone.",
      )
    )
      return;
    try {
      await disbandTeam({});
      alert("Team disbanded successfully");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to disband team");
    }
  };

  const handleLeaveTeam = async () => {
    if (!confirm("Are you sure you want to leave this team?")) return;
    try {
      await leaveTeam({});
      alert("Left team successfully");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to leave team");
    }
  };

  if (myTeam === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border p-4 flex justify-between items-center">
        <Button variant="outline" onClick={() => router.push("/")}>
          ← Back to Dashboard
        </Button>
        <ThemeToggle />
      </header>

      <main className="p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-foreground">
          Team Management
        </h1>

        {myTeam ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  {isEditingName ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="New team name"
                        className="max-w-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameTeam();
                          if (e.key === "Escape") {
                            setIsEditingName(false);
                            setNewTeamName("");
                          }
                        }}
                      />
                      <Button size="sm" onClick={handleRenameTeam}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsEditingName(false);
                          setNewTeamName("");
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span>Your Team: {myTeam.name}</span>
                      {currentUser && myTeam.leaderId === currentUser && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setNewTeamName(myTeam.name);
                            setIsEditingName(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="font-semibold mb-2 text-foreground">
                      Join Code:
                    </p>
                    <code className="bg-muted px-3 py-2 rounded text-lg font-mono text-foreground">
                      {myTeam.code}
                    </code>
                  </div>
                  <div>
                    <p className="font-semibold mb-2 text-foreground">
                      Members ({myTeam.members.length}/3):
                    </p>
                    <ul className="list-disc list-inside text-foreground">
                      {myTeam.members.map((member: any) => (
                        <li key={member._id}>
                          {member.email}{" "}
                          {member._id === myTeam.leaderId && (
                            <span className="text-primary">(Leader)</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      onClick={handleLeaveTeam}
                      className="flex-1"
                    >
                      Leave Team
                    </Button>
                    {currentUser && myTeam.leaderId === currentUser && (
                      <Button
                        variant="destructive"
                        onClick={handleDisbandTeam}
                        className="flex-1"
                      >
                        Disband Team
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submission Feedback Section */}
            {teamSubmissions && teamSubmissions.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Submission Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {teamSubmissions
                      .filter(
                        (s) =>
                          s.adminComment ||
                          s.reviewStatus === "invalid" ||
                          s.reviewStatus === "approved",
                      )
                      .map((submission) => (
                        <div
                          key={submission._id}
                          className={`p-4 rounded-lg border ${
                            submission.reviewStatus === "invalid"
                              ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                              : submission.reviewStatus === "approved"
                                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                : "bg-muted border-border"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {submission.reviewStatus === "invalid" ? (
                              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                            ) : submission.reviewStatus === "approved" ? (
                              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                            ) : (
                              <Clock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-foreground">
                                  {submission.questionTitle}
                                </span>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded ${
                                    submission.questionDifficulty === "easy"
                                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                      : submission.questionDifficulty ===
                                          "medium"
                                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  }`}
                                >
                                  {submission.questionDifficulty?.toUpperCase()}
                                </span>
                                {submission.reviewStatus === "invalid" && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                    Invalid
                                  </span>
                                )}
                                {submission.reviewStatus === "approved" && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    Approved
                                  </span>
                                )}
                              </div>
                              {submission.adminComment && (
                                <p className="text-sm text-muted-foreground">
                                  <strong>Admin:</strong>{" "}
                                  {submission.adminComment}
                                </p>
                              )}
                              {submission.reviewedAt && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(
                                    submission.reviewedAt,
                                  ).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    {teamSubmissions.filter(
                      (s) =>
                        s.adminComment ||
                        s.reviewStatus === "invalid" ||
                        s.reviewStatus === "approved",
                    ).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No feedback yet. Complete challenges to receive admin
                        reviews!
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Create a Team</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    placeholder="Team name"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                  />
                  <Button onClick={handleCreateTeam} className="w-full">
                    Create Team
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Join a Team</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    placeholder="Enter join code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  />
                  <Button onClick={handleJoinTeam} className="w-full">
                    Join Team
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
