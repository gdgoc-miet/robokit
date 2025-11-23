"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

export default function TeamsPage() {
  const [teamName, setTeamName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const myTeam = useQuery(api.teams.getMyTeam);
  const currentUser = useQuery(api.teams.getCurrentUser);
  const createTeam = useMutation(api.teams.createTeam);
  const joinTeam = useMutation(api.teams.joinTeam);
  const disbandTeam = useMutation(api.teams.disbandTeam);
  const leaveTeam = useMutation(api.teams.leaveTeam);
  const router = useRouter();

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
          <Card>
            <CardHeader>
              <CardTitle>Your Team: {myTeam.name}</CardTitle>
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
