import {getAuthUserId} from '@convex-dev/auth/server';
import {v} from 'convex/values';

import {mutation, query} from './_generated/server';

// Get current user's profile
export const getCurrentUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      image: user.image,
    };
  },
});

// Update user profile
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const updates: {name?: string} = {};

    if (args.name !== undefined) {
      updates.name = args.name;
    }

    await ctx.db.patch(userId, updates);
    return {success: true};
  },
});
