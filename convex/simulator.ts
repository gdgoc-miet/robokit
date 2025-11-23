import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const saveState = mutation({
  args: {
    questionId: v.id("questions"),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const teams = await ctx.db.query("teams").collect();
    const team = teams.find((t) => t.members.includes(userId));
    if (!team) {
      // User not in a team yet - silently return without saving
      // This allows users to try the simulator before creating/joining a team
      return;
    }

    const existing = await ctx.db
      .query("teamState")
      .withIndex("by_team_question", (q) => 
        q.eq("teamId", team._id).eq("questionId", args.questionId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        code: args.code,
        lastModified: Date.now(),
        lastModifierId: userId,
      });
    } else {
      await ctx.db.insert("teamState", {
        teamId: team._id,
        questionId: args.questionId,
        code: args.code,
        lastModified: Date.now(),
        lastModifierId: userId,
      });
    }
  },
});

export const getState = query({
  args: { questionId: v.id("questions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const teams = await ctx.db.query("teams").collect();
    const team = teams.find((t) => t.members.includes(userId));
    if (!team) return null;

    return await ctx.db
      .query("teamState")
      .withIndex("by_team_question", (q) => 
        q.eq("teamId", team._id).eq("questionId", args.questionId)
      )
      .first();
  },
});
