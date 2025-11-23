import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Update presence heartbeat
export const updatePresence = mutation({
  args: {
    questionId: v.optional(v.id("questions")),
    currentPage: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Find user's team
    const teams = await ctx.db.query("teams").collect();
    const team = teams.find((t) => t.members.includes(userId));
    if (!team) return; // Not in a team yet

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const presenceData = {
      userId,
      teamId: team._id,
      questionId: args.questionId,
      lastSeen: Date.now(),
      currentPage: args.currentPage,
    };

    if (existing) {
      await ctx.db.patch(existing._id, presenceData);
    } else {
      await ctx.db.insert("presence", presenceData);
    }
  },
});

// Get online team members
export const getOnlineTeamMembers = query({
  args: {
    questionId: v.optional(v.id("questions")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Find user's team
    const teams = await ctx.db.query("teams").collect();
    const myTeam = teams.find((t) => t.members.includes(userId));
    if (!myTeam) return [];

    // Get presence records for team, filter by question if provided
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    
    let presenceRecords = await ctx.db
      .query("presence")
      .withIndex("by_team", (q) => q.eq("teamId", myTeam._id))
      .collect();

    // Filter by question if provided
    if (args.questionId) {
      presenceRecords = presenceRecords.filter(
        (p) => p.questionId === args.questionId
      );
    }

    // Only include recent presence (within last 5 minutes)
    presenceRecords = presenceRecords.filter((p) => p.lastSeen > fiveMinutesAgo);

    // Get user details
    const onlineMembers = await Promise.all(
      presenceRecords.map(async (p) => {
        const user = await ctx.db.get(p.userId);
        return {
          userId: p.userId,
          name: user?.name || user?.email || "Anonymous",
          email: user?.email,
          currentPage: p.currentPage,
          lastSeen: p.lastSeen,
          isMe: p.userId === userId,
        };
      })
    );

    return onlineMembers;
  },
});

// Cleanup stale presence records (can be called periodically)
export const cleanupPresence = mutation({
  args: {},
  handler: async (ctx) => {
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    const staleRecords = await ctx.db.query("presence").collect();
    
    for (const record of staleRecords) {
      if (record.lastSeen < tenMinutesAgo) {
        await ctx.db.delete(record._id);
      }
    }
  },
});
