import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  // Separate table for admin users
  admins: defineTable({
    userId: v.id("users"),
  }).index("by_user", ["userId"]),
  numbers: defineTable({
    value: v.number(),
  }),
  teams: defineTable({
    name: v.string(),
    code: v.string(), // Join code
    members: v.array(v.id("users")),
    leaderId: v.id("users"),
  }).index("by_code", ["code"]),
  questions: defineTable({
    title: v.string(),
    description: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    initialMap: v.string(), // JSON string representing the grid
    goal: v.object({ x: v.number(), y: v.number() }),
    hint: v.optional(v.string()), // Hint for kids
    solution: v.optional(v.string()), // Sample solution for reference
  }),
  submissions: defineTable({
    teamId: v.id("teams"),
    questionId: v.id("questions"),
    code: v.string(),
    completed: v.boolean(),
    score: v.optional(v.number()),
    steps: v.optional(v.number()), // Number of steps taken
    attempts: v.optional(v.number()), // Number of attempts
    completedAt: v.optional(v.number()), // Timestamp
  })
    .index("by_team_question", ["teamId", "questionId"])
    .index("by_team", ["teamId"])
    .index("by_question", ["questionId"]),
  // We'll store the current working code for a team here, or in submissions if we want per-question state
  teamState: defineTable({
    teamId: v.id("teams"),
    questionId: v.id("questions"),
    code: v.string(),
    lastModified: v.number(),
    lastModifierId: v.id("users"),
  }).index("by_team_question", ["teamId", "questionId"]),
  // Presence tracking for collaborative editing
  presence: defineTable({
    userId: v.id("users"),
    teamId: v.id("teams"),
    questionId: v.optional(v.id("questions")),
    lastSeen: v.number(),
    currentPage: v.string(), // e.g., "simulator", "leaderboard"
  })
    .index("by_user", ["userId"])
    .index("by_team", ["teamId"])
    .index("by_team_question", ["teamId", "questionId"]),
});
