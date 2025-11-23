import {getAuthUserId} from '@convex-dev/auth/server';
import {v} from 'convex/values';

import {mutation, query} from './_generated/server';

export const createTeam = mutation({
  args: {name: v.string()},
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const teamId = await ctx.db.insert('teams', {
      name: args.name,
      code,
      members: [userId],
      leaderId: userId,
    });

    return {teamId, code};
  },
});

export const joinTeam = mutation({
  args: {code: v.string()},
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const team = await ctx.db.query('teams')
                     .withIndex('by_code', (q) => q.eq('code', args.code))
                     .first();

    if (!team) throw new Error('Team not found');

    if (team.members.includes(userId)) {
      return team._id;
    }

    if (team.members.length >= 3) {
      throw new Error('Team is full');
    }

    await ctx.db.patch(team._id, {
      members: [...team.members, userId],
    });

    return team._id;
  },
});

export const disbandTeam = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const teams = await ctx.db.query('teams').collect();
    const myTeam = teams.find((t) => t.members.includes(userId));

    if (!myTeam) throw new Error('You are not in a team');

    // Only the team leader can disband the team
    if (myTeam.leaderId !== userId) {
      throw new Error('Only the team leader can disband the team');
    }

    await ctx.db.delete(myTeam._id);
  },
});

export const leaveTeam = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const teams = await ctx.db.query('teams').collect();
    const myTeam = teams.find((t) => t.members.includes(userId));

    if (!myTeam) throw new Error('You are not in a team');

    // If you're the leader and there are other members, transfer leadership
    if (myTeam.leaderId === userId && myTeam.members.length > 1) {
      const newLeader = myTeam.members.find((id) => id !== userId);
      await ctx.db.patch(myTeam._id, {
        members: myTeam.members.filter((id) => id !== userId),
        leaderId: newLeader,
      });
    } else if (myTeam.members.length === 1) {
      // If you're the only member, delete the team
      await ctx.db.delete(myTeam._id);
    } else {
      // Just remove yourself from the team
      await ctx.db.patch(myTeam._id, {
        members: myTeam.members.filter((id) => id !== userId),
      });
    }
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return userId;
  },
});

export const getMyTeam = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // This is inefficient if we have many teams, but for a small class it's
    // fine. Ideally we'd store teamId on the user or have a secondary index.
    // For now, let's just scan since we don't have a direct link on user yet.
    // Actually, let's just fetch all teams and filter in memory for this MVP or
    // add an index if needed. Better: We can't easily query "contains in array"
    // efficiently without an index on the array field which Convex supports.
    // But `members` is an array of IDs. Convex supports filtering by array
    // inclusion? No, standard indexes don't support array contains directly in
    // the same way. Let's just do a full table scan for now, assuming < 100
    // teams.

    const teams = await ctx.db.query('teams').collect();
    const myTeam = teams.find((t) => t.members.includes(userId));

    if (!myTeam) return null;

    const members =
        await Promise.all(myTeam.members.map((id) => ctx.db.get(id)));

    return {
      ...myTeam,
      members:
          members.map(m => ({_id: m?._id, name: m?.name, email: m?.email})),
    };
  },
});
