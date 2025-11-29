import {authTables} from '@convex-dev/auth/server';
import {defineSchema, defineTable} from 'convex/server';
import {v} from 'convex/values';

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  // Separate table for admin users
  admins: defineTable({
            userId: v.id('users'),
          }).index('by_user', ['userId']),
  numbers: defineTable({
    value: v.number(),
  }),
  teams: defineTable({
           name: v.string(),
           code: v.string(),  // Join code
           members: v.array(v.id('users')),
           leaderId: v.id('users'),
         }).index('by_code', ['code']),
  questions: defineTable({
    title: v.string(),
    description: v.string(),
    difficulty:
        v.union(v.literal('easy'), v.literal('medium'), v.literal('hard')),
    initialMap: v.string(),  // JSON string representing the grid
    goal: v.object({x: v.number(), y: v.number()}),
    hint: v.optional(v.string()),      // Hint for kids
    solution: v.optional(v.string()),  // Sample solution for reference
    // Question scheduling
    isPractice: v.optional(
        v.boolean()),  // If true, available before competition starts
    goLiveAt: v.optional(
        v.number()),  // Timestamp when this question becomes available (null =
                      // available immediately when competition is live)
    order: v.optional(v.number()),  // Display order
  }),
  submissions:
      defineTable({
        teamId: v.id('teams'),
        questionId: v.id('questions'),
        code: v.string(),
        completed: v.boolean(),
        score: v.optional(v.number()),
        steps: v.optional(v.number()),        // Number of steps taken
        attempts: v.optional(v.number()),     // Number of attempts
        completedAt: v.optional(v.number()),  // Timestamp
        // Admin review fields
        reviewStatus: v.optional(v.union(
            v.literal('pending'), v.literal('approved'), v.literal('invalid'))),
        adminComment: v.optional(v.string()),
        reviewedAt: v.optional(v.number()),
        reviewedBy: v.optional(v.id('users')),
      })
          .index('by_team_question', ['teamId', 'questionId'])
          .index('by_team', ['teamId'])
          .index('by_question', ['questionId'])
          .index('by_review_status', ['reviewStatus']),
  // We'll store the current working code for a team here, or in submissions if
  // we want per-question state
  teamState: defineTable({
               teamId: v.id('teams'),
               questionId: v.id('questions'),
               code: v.string(),
               lastModified: v.number(),
               lastModifierId: v.id('users'),
             }).index('by_team_question', ['teamId', 'questionId']),
  // Presence tracking for collaborative editing
  presence: defineTable({
              userId: v.id('users'),
              teamId: v.id('teams'),
              questionId: v.optional(v.id('questions')),
              lastSeen: v.number(),
              currentPage: v.string(),  // e.g., "simulator", "leaderboard"
            })
                .index('by_user', ['userId'])
                .index('by_team', ['teamId'])
                .index('by_team_question', ['teamId', 'questionId']),
  // Competition settings (singleton - only one record)
  competitionSettings: defineTable({
    isLive: v.boolean(),  // Whether the competition is currently live
    competitionStartTime: v.optional(v.number()),  // Scheduled start time
    competitionEndTime: v.optional(v.number()),    // Scheduled end time
    allowPractice: v.boolean(),     // Whether practice questions are available
    title: v.optional(v.string()),  // Competition title
    description: v.optional(v.string()),  // Competition description
  }),
});
