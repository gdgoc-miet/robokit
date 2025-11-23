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
