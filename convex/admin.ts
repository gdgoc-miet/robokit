import {getAuthUserId} from '@convex-dev/auth/server';
import {v} from 'convex/values';

import {mutation, MutationCtx, query, QueryCtx} from './_generated/server';

// Helper to check if user is admin
async function isAdmin(ctx: QueryCtx|MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return false;

  const adminRecord = await ctx.db.query('admins')
                          .withIndex('by_user', (q) => q.eq('userId', userId))
                          .first();

  return adminRecord !== null;
}

// Helper to get admin user ID (returns null if not admin)
async function getAdminUserId(ctx: QueryCtx|MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  const adminRecord = await ctx.db.query('admins')
                          .withIndex('by_user', (q) => q.eq('userId', userId))
                          .first();

  return adminRecord ? userId : null;
}

// Set a user as admin (only for initial setup or by existing admins)
export const setAdmin = mutation({
  args: {userId: v.id('users'), isAdmin: v.boolean()},
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error('Not authenticated');

    // Check if current user is admin (or if this is the first admin being set)
    const allAdmins = await ctx.db.query('admins').collect();
    const hasAnyAdmin = allAdmins.length > 0;

    const currentIsAdmin = await isAdmin(ctx);
    if (!currentIsAdmin && hasAnyAdmin) {
      throw new Error('Only admins can set admin status');
    }

    const existing =
        await ctx.db.query('admins')
            .withIndex('by_user', (q) => q.eq('userId', args.userId))
            .first();

    if (args.isAdmin && !existing) {
      // Add admin
      await ctx.db.insert('admins', {userId: args.userId});
    } else if (!args.isAdmin && existing) {
      // Remove admin
      await ctx.db.delete(existing._id);
    }
  },
});

// Check if current user is admin
export const amIAdmin = query({
  args: {},
  handler: async (ctx) => {
    return await isAdmin(ctx);
  },
});

// Create a new question (admin only)
export const createQuestion = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    difficulty:
        v.union(v.literal('easy'), v.literal('medium'), v.literal('hard')),
    initialMap: v.string(),
    goal: v.object({x: v.number(), y: v.number()}),
    hint: v.optional(v.string()),
    solution: v.optional(v.string()),
    isPractice: v.optional(v.boolean()),
    goLiveAt: v.optional(v.number()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error('Only admins can create questions');
    }

    return await ctx.db.insert('questions', args);
  },
});

// Update a question (admin only)
export const updateQuestion = mutation({
  args: {
    id: v.id('questions'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    difficulty: v.optional(
        v.union(v.literal('easy'), v.literal('medium'), v.literal('hard'))),
    initialMap: v.optional(v.string()),
    goal: v.optional(v.object({x: v.number(), y: v.number()})),
    hint: v.optional(v.string()),
    solution: v.optional(v.string()),
    isPractice: v.optional(v.boolean()),
    goLiveAt: v.optional(v.number()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error('Only admins can update questions');
    }

    const {id, ...updates} = args;
    await ctx.db.patch(id, updates);
  },
});

// Delete a question (admin only)
export const deleteQuestion = mutation({
  args: {id: v.id('questions')},
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error('Only admins can delete questions');
    }

    await ctx.db.delete(args.id);
  },
});

// Get all questions (admin view with more details)
export const getAllQuestionsAdmin = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) {
      throw new Error('Only admins can access this');
    }

    return await ctx.db.query('questions').collect();
  },
});

// Get all teams (admin view for filtering)
export const getAllTeamsAdmin = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) {
      throw new Error('Only admins can access this');
    }

    return await ctx.db.query('teams').collect();
  },
});

// Get all teams with member details (admin view)
export const getAllTeamsWithMembers = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) {
      throw new Error('Only admins can access this');
    }

    const teams = await ctx.db.query('teams').collect();
    const users = await ctx.db.query('users').collect();

    return teams.map((team) => {
      const members = team.members.map((memberId) => {
        const user = users.find((u) => u._id === memberId);
        // Use name if available, otherwise use email (or part of email
        // before @)
        const displayName =
            user?.name || (user?.email ? user.email.split('@')[0] : 'Unknown');
        return {
          _id: memberId,
          name: displayName,
          email: user?.email || 'Unknown',
          isLeader: memberId === team.leaderId,
        };
      });

      return {
        ...team,
        members,
        memberCount: members.length,
        leaderName: members.find((m) => m.isLeader)?.name || 'Unknown',
      };
    });
  },
});

// Get all submissions for admin review
export const getAllSubmissions = query({
  args: {
    reviewStatus: v.optional(v.union(
        v.literal('pending'), v.literal('approved'), v.literal('invalid'),
        v.literal('all'))),
    teamId: v.optional(v.id('teams')),
    questionId: v.optional(v.id('questions')),
    difficulty: v.optional(v.union(
        v.literal('easy'), v.literal('medium'), v.literal('hard'),
        v.literal('all'))),
  },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error('Only admins can access this');
    }

    const submissions = await ctx.db.query('submissions').collect();
    const teams = await ctx.db.query('teams').collect();
    const questions = await ctx.db.query('questions').collect();
    const users = await ctx.db.query('users').collect();

    // Create maps for quick lookups
    const questionMap = new Map(questions.map(q => [q._id, q]));
    const teamMap = new Map(teams.map(t => [t._id, t]));

    // Create a set of valid question IDs
    const questionIds = new Set(questions.map(q => q._id));

    // Filter out submissions for questions that no longer exist
    let filteredSubmissions =
        submissions.filter(s => questionIds.has(s.questionId));

    // Filter by review status if specified
    if (args.reviewStatus && args.reviewStatus !== 'all') {
      if (args.reviewStatus === 'pending') {
        // Pending includes undefined reviewStatus
        filteredSubmissions = filteredSubmissions.filter(
            s => !s.reviewStatus || s.reviewStatus === 'pending');
      } else {
        filteredSubmissions = filteredSubmissions.filter(
            s => s.reviewStatus === args.reviewStatus);
      }
    }

    // Filter by team if specified
    if (args.teamId) {
      filteredSubmissions =
          filteredSubmissions.filter(s => s.teamId === args.teamId);
    }

    // Filter by question if specified
    if (args.questionId) {
      filteredSubmissions =
          filteredSubmissions.filter(s => s.questionId === args.questionId);
    }

    // Filter by difficulty if specified
    if (args.difficulty && args.difficulty !== 'all') {
      filteredSubmissions = filteredSubmissions.filter(s => {
        const question = questionMap.get(s.questionId);
        return question?.difficulty === args.difficulty;
      });
    }

    // Enrich submissions with team and question info
    return filteredSubmissions.map(submission => {
      const team = teamMap.get(submission.teamId);
      const question = questionMap.get(submission.questionId);
      const reviewer = submission.reviewedBy ?
          users.find(u => u._id === submission.reviewedBy) :
          null;

      return {
        ...submission,
        teamName: team?.name || 'Unknown Team',
        questionTitle: question?.title || 'Unknown Question',
        questionDifficulty: question?.difficulty,
        reviewerName: reviewer?.name || reviewer?.email || null,
      };
    });
  },
});

// Review a submission (admin only)
export const reviewSubmission = mutation({
  args: {
    submissionId: v.id('submissions'),
    reviewStatus: v.union(v.literal('approved'), v.literal('invalid')),
    adminComment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const adminUserId = await getAdminUserId(ctx);
    if (!adminUserId) {
      throw new Error('Only admins can review submissions');
    }

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    await ctx.db.patch(args.submissionId, {
      reviewStatus: args.reviewStatus,
      adminComment: args.adminComment || undefined,
      reviewedAt: Date.now(),
      reviewedBy: adminUserId,
    });

    // If marked as invalid, we could optionally reset the score
    if (args.reviewStatus === 'invalid') {
      await ctx.db.patch(args.submissionId, {
        score: 0,
      });
    }
  },
});

// Add or update admin comment on a submission
export const addSubmissionComment = mutation({
  args: {
    submissionId: v.id('submissions'),
    comment: v.string(),
  },
  handler: async (ctx, args) => {
    const adminUserId = await getAdminUserId(ctx);
    if (!adminUserId) {
      throw new Error('Only admins can comment on submissions');
    }

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    await ctx.db.patch(args.submissionId, {
      adminComment: args.comment,
      reviewedAt: Date.now(),
      reviewedBy: adminUserId,
    });
  },
});

// Clear review status (reset to pending)
export const clearSubmissionReview = mutation({
  args: {
    submissionId: v.id('submissions'),
  },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error('Only admins can clear submission reviews');
    }

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    await ctx.db.patch(args.submissionId, {
      reviewStatus: 'pending',
      adminComment: undefined,
      reviewedAt: undefined,
      reviewedBy: undefined,
    });
  },
});

// Delete orphaned submissions (submissions for questions that no longer exist)
export const cleanupOrphanedSubmissions = mutation({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) {
      throw new Error('Only admins can cleanup submissions');
    }

    const submissions = await ctx.db.query('submissions').collect();
    const questions = await ctx.db.query('questions').collect();
    const questionIds = new Set(questions.map(q => q._id));

    let deletedCount = 0;
    for (const submission of submissions) {
      if (!questionIds.has(submission.questionId)) {
        await ctx.db.delete(submission._id);
        deletedCount++;
      }
    }

    return {deletedCount};
  },
});

// ============ Competition Settings ============

// Get competition settings
export const getCompetitionSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query('competitionSettings').first();
    return settings || {
      isLive: false,
      allowPractice: true,
      competitionStartTime: undefined,
      competitionEndTime: undefined,
      title: 'RoboKit Competition',
      description: 'Welcome to the competition!',
    };
  },
});

// Update competition settings (admin only)
export const updateCompetitionSettings = mutation({
  args: {
    isLive: v.optional(v.boolean()),
    competitionStartTime: v.optional(v.number()),
    competitionEndTime: v.optional(v.number()),
    allowPractice: v.optional(v.boolean()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error('Only admins can update competition settings');
    }

    const existing = await ctx.db.query('competitionSettings').first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert('competitionSettings', {
        isLive: args.isLive ?? false,
        allowPractice: args.allowPractice ?? true,
        competitionStartTime: args.competitionStartTime,
        competitionEndTime: args.competitionEndTime,
        title: args.title,
        description: args.description,
      });
    }
  },
});

// Go live immediately (admin only)
export const goLive = mutation({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) {
      throw new Error('Only admins can start the competition');
    }

    const existing = await ctx.db.query('competitionSettings').first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isLive: true,
        competitionStartTime: Date.now(),
      });
    } else {
      await ctx.db.insert('competitionSettings', {
        isLive: true,
        allowPractice: true,
        competitionStartTime: Date.now(),
      });
    }
  },
});

// End competition (admin only)
export const endCompetition = mutation({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) {
      throw new Error('Only admins can end the competition');
    }

    const existing = await ctx.db.query('competitionSettings').first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isLive: false,
        competitionEndTime: Date.now(),
      });
    }
  },
});
