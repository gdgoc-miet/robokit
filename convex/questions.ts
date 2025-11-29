import {getAuthUserId} from '@convex-dev/auth/server';
import {v} from 'convex/values';

import {mutation, query} from './_generated/server';

// Helper to check if a question is available based on competition settings
function isQuestionAvailable(
    question: {isPractice?: boolean; goLiveAt?: number},
    settings: {isLive: boolean; allowPractice: boolean}|null,
    now: number): boolean {
  // If no settings, allow all questions (for backwards compatibility)
  if (!settings) return true;

  // Practice questions are available when practice is allowed
  if (question.isPractice) {
    return settings.allowPractice;
  }

  // Competition questions are only available when live
  if (!settings.isLive) return false;

  // Check if the question has a specific go-live time
  if (question.goLiveAt && question.goLiveAt > now) {
    return false;
  }

  return true;
}

export const listQuestions = query({
  args: {},
  handler: async (ctx) => {
    const allQuestions = await ctx.db.query('questions').collect();
    const settings = await ctx.db.query('competitionSettings').first();
    const now = Date.now();

    // Filter questions based on availability
    const availableQuestions =
        allQuestions.filter(q => isQuestionAvailable(q, settings, now));

    // Sort by order if specified, then by difficulty
    return availableQuestions.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;

      const difficultyOrder = {easy: 0, medium: 1, hard: 2};
      return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
    });
  },
});

// Get competition settings (public)
export const getCompetitionStatus = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query('competitionSettings').first();
    const now = Date.now();

    if (!settings) {
      return {
        isLive: false,
        allowPractice: true,
        title: 'RoboKit Competition',
        description: 'Welcome to the competition!',
        startsIn: null,
        endsIn: null,
      };
    }

    return {
      isLive: settings.isLive,
      allowPractice: settings.allowPractice,
      title: settings.title || 'RoboKit Competition',
      description: settings.description || 'Welcome to the competition!',
      competitionStartTime: settings.competitionStartTime,
      competitionEndTime: settings.competitionEndTime,
      startsIn: settings.competitionStartTime && !settings.isLive ?
          Math.max(0, settings.competitionStartTime - now) :
          null,
      endsIn: settings.competitionEndTime && settings.isLive ?
          Math.max(0, settings.competitionEndTime - now) :
          null,
    };
  },
});

export const getQuestion = query({
  args: {id: v.id('questions')},
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.id);
    if (!question) return null;

    const settings = await ctx.db.query('competitionSettings').first();
    const now = Date.now();

    // Check if this question is available
    if (!isQuestionAvailable(question, settings, now)) {
      return null;  // Don't expose questions that aren't available yet
    }

    return question;
  },
});

export const submitAnswer = mutation({
  args: {
    questionId: v.id('questions'),
    code: v.string(),
    completed: v.boolean(),
    steps: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    // Check if question is available
    const question = await ctx.db.get(args.questionId);
    if (!question) throw new Error('Question not found');

    const settings = await ctx.db.query('competitionSettings').first();
    const now = Date.now();

    if (!isQuestionAvailable(question, settings, now)) {
      throw new Error('This question is not available yet');
    }

    // Find user's team
    const teams = await ctx.db.query('teams').collect();
    const team = teams.find((t) => t.members.includes(userId));
    if (!team) {
      // User not in a team - they can still use the simulator but won't save
      // progress This is intentional to allow users to try before creating a
      // team
      console.log('User not in a team - submission not saved');
      return;
    }

    // Check if already completed
    const existing =
        await ctx.db.query('submissions')
            .withIndex(
                'by_team_question',
                (q) =>
                    q.eq('teamId', team._id).eq('questionId', args.questionId))
            .first();

    if (existing) {
      // Increment attempts
      const newAttempts = (existing.attempts || 0) + 1;

      await ctx.db.patch(existing._id, {
        code: args.code,
        completed: args.completed || existing.completed,  // Don't un-complete
        // Keep the best (minimum) steps for completed challenges
        steps: args.completed && args.steps ?
            Math.min(args.steps, existing.steps || 999) :
            existing.steps,
        attempts: newAttempts,
        completedAt: args.completed && !existing.completed ?
            Date.now() :
            existing.completedAt,
      });
    } else {
      await ctx.db.insert('submissions', {
        teamId: team._id,
        questionId: args.questionId,
        code: args.code,
        completed: args.completed,
        steps: args.steps,
        attempts: 1,
        completedAt: args.completed ? Date.now() : undefined,
      });
    }
  },
});

// Get leaderboard with team rankings based on steps (fewer steps = better)
export const getLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const teams = await ctx.db.query('teams').collect();
    const submissions = await ctx.db.query('submissions').collect();
    const questions = await ctx.db.query('questions').collect();

    // Create a map of valid question IDs to question data
    const questionMap = new Map(questions.map(q => [q._id, q]));

    // For each question, rank teams by steps (fewer steps = better rank)
    // Build: questionId -> [{teamId, steps, rank}]
    const questionRankings:
        Map<string, Array<{teamId: string, steps: number, rank: number}>> =
            new Map();

    for (const question of questions) {
      // Get all completed submissions for this question
      const questionSubmissions = submissions.filter(
          (s) => s.questionId === question._id && s.completed &&
              s.reviewStatus !== 'invalid' && s.steps !== undefined);

      // Sort by steps ascending (fewer steps = better)
      questionSubmissions.sort((a, b) => (a.steps || 999) - (b.steps || 999));

      // Assign ranks (handling ties - same steps = same rank)
      const rankings: Array<{teamId: string, steps: number, rank: number}> = [];
      let currentRank = 1;
      let previousSteps = -1;

      for (let i = 0; i < questionSubmissions.length; i++) {
        const sub = questionSubmissions[i];
        const steps = sub.steps || 999;

        // If different from previous, update rank to current position
        if (steps !== previousSteps) {
          currentRank = i + 1;
        }

        rankings.push({teamId: sub.teamId as string, steps, rank: currentRank});
        previousSteps = steps;
      }

      questionRankings.set(question._id as string, rankings);
    }

    // Calculate each team's total rank score and per-level details
    const teamData = teams.map((team) => {
      const teamSubmissions = submissions.filter(
          (s) => s.teamId === team._id && s.completed &&
              s.reviewStatus !== 'invalid' && questionMap.has(s.questionId));

      // Get rank for each completed question
      let totalRankScore = 0;
      const levelDetails: Array<{
        questionId: string,
        questionTitle: string,
        steps: number,
        rank: number
      }> = [];

      for (const sub of teamSubmissions) {
        const questionRanks = questionRankings.get(sub.questionId as string);
        const teamRank = questionRanks?.find(r => r.teamId === team._id);
        const question = questionMap.get(sub.questionId);

        if (teamRank && question) {
          totalRankScore += teamRank.rank;
          levelDetails.push({
            questionId: sub.questionId as string,
            questionTitle: question.title,
            steps: teamRank.steps,
            rank: teamRank.rank
          });
        }
      }

      const totalSteps =
          teamSubmissions.reduce((sum, s) => sum + (s.steps || 0), 0);

      return {
        teamId: team._id,
        teamName: team.name,
        totalRankScore,  // Lower is better
        totalSteps,
        completedChallenges: teamSubmissions.length,
        levelDetails,
      };
    });

    // Sort by: 1) More completed challenges first, 2) Lower total rank score,
    // 3) Fewer total steps as tiebreaker
    teamData.sort((a, b) => {
      // First by completed challenges (descending)
      if (b.completedChallenges !== a.completedChallenges) {
        return b.completedChallenges - a.completedChallenges;
      }
      // Then by total rank score (ascending - lower is better)
      if (a.totalRankScore !== b.totalRankScore) {
        return a.totalRankScore - b.totalRankScore;
      }
      // Tiebreaker: fewer total steps
      return a.totalSteps - b.totalSteps;
    });

    return teamData;
  },
});

// Get team's progress
export const getTeamProgress = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const teams = await ctx.db.query('teams').collect();
    const team = teams.find((t) => t.members.includes(userId));
    if (!team) return null;

    const submissions =
        await ctx.db.query('submissions')
            .withIndex('by_team', (q) => q.eq('teamId', team._id))
            .collect();

    const questions = await ctx.db.query('questions').collect();
    const questionIds = new Set(questions.map(q => q._id));

    // Only count submissions that are completed, not invalid, and for existing
    // questions
    const completed = submissions.filter(
        (s) => s.completed && s.reviewStatus !== 'invalid' &&
            questionIds.has(s.questionId));
    const totalSteps = completed.reduce((sum, s) => sum + (s.steps || 0), 0);

    return {
      completedChallenges: completed.length,
      completedQuestionIds: completed.map((s) => s.questionId),
      totalSteps,
      totalAttempts: submissions.reduce((sum, s) => sum + (s.attempts || 0), 0),
    };
  },
});

// Get team's submissions with admin feedback
export const getTeamSubmissionsWithFeedback = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const teams = await ctx.db.query('teams').collect();
    const team = teams.find((t) => t.members.includes(userId));
    if (!team) return null;

    const submissions =
        await ctx.db.query('submissions')
            .withIndex('by_team', (q) => q.eq('teamId', team._id))
            .collect();

    const questions = await ctx.db.query('questions').collect();
    const questionIds = new Set(questions.map(q => q._id));

    // Filter out submissions for questions that no longer exist and enrich with
    // question info
    return submissions.filter(s => questionIds.has(s.questionId))
        .map(submission => {
          const question = questions.find(q => q._id === submission.questionId);
          return {
            _id: submission._id,
            questionId: submission.questionId,
            questionTitle: question?.title || 'Unknown Question',
            questionDifficulty: question?.difficulty,
            completed: submission.completed,
            score: submission.score,
            steps: submission.steps,
            attempts: submission.attempts,
            completedAt: submission.completedAt,
            reviewStatus: submission.reviewStatus,
            adminComment: submission.adminComment,
            reviewedAt: submission.reviewedAt,
          };
        });
  },
});

// Get submission feedback for a specific question
export const getSubmissionFeedback = query({
  args: {questionId: v.id('questions')},
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const teams = await ctx.db.query('teams').collect();
    const team = teams.find((t) => t.members.includes(userId));
    if (!team) return null;

    const submission =
        await ctx.db.query('submissions')
            .withIndex(
                'by_team_question',
                (q) =>
                    q.eq('teamId', team._id).eq('questionId', args.questionId))
            .first();

    if (!submission) return null;

    return {
      reviewStatus: submission.reviewStatus,
      adminComment: submission.adminComment,
      reviewedAt: submission.reviewedAt,
    };
  },
});

export const seedQuestions = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('questions').collect();
    if (existing.length > 0) return;

    // Easy questions
    await ctx.db.insert('questions', {
      title: 'First Steps',
      description:
          'Move the robot forward to reach the goal (green tile). The robot starts facing east (→).',
      difficulty: 'easy',
      initialMap: JSON.stringify([
        [0, 0, 0, 0, 0],
        [0, 2, 0, 3, 0],
        [0, 0, 0, 0, 0],
      ]),
      goal: {x: 3, y: 1},
      hint: 'Use the move() function in update() to reach the goal!',
      solution: `function start() {
  log("Starting...");
}

function update() {
  if (!is_goal()) {
    move();
  } else {
    done();
  }
}`,
    });

    await ctx.db.insert('questions', {
      title: 'Turn and Move',
      description:
          'The goal is north of your starting position. Turn left, then move forward.',
      difficulty: 'easy',
      initialMap: JSON.stringify([
        [0, 0, 3, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 2, 0, 0],
        [0, 0, 0, 0, 0],
      ]),
      goal: {x: 2, y: 0},
      hint: 'Turn left in start(), then move in update()!',
      solution: `let turned = false;

function start() {
  log("Turning left...");
}

function update() {
  if (!turned) {
    turn_left();
    turned = true;
  } else if (!is_goal()) {
    move();
  } else {
    done();
  }
}`,
    });

    await ctx.db.insert('questions', {
      title: 'Around One Wall',
      description: 'Navigate around a single wall to reach the goal.',
      difficulty: 'easy',
      initialMap: JSON.stringify([
        [0, 0, 0, 0, 0],
        [0, 2, 1, 3, 0],
        [0, 0, 0, 0, 0],
      ]),
      goal: {x: 3, y: 1},
      hint: 'Check if front is empty, otherwise turn!',
      solution: `function update() {
  if (is_goal()) {
    done();
  } else if (is_front_empty()) {
    move();
  } else {
    turn_left();
  }
}`,
    });

    // Medium questions
    await ctx.db.insert('questions', {
      title: 'Maze Runner',
      description: 'Navigate through a simple maze to reach the goal.',
      difficulty: 'medium',
      initialMap: JSON.stringify([
        [0, 0, 0, 0, 0],
        [0, 2, 1, 0, 0],
        [0, 0, 1, 0, 3],
        [0, 0, 0, 0, 0],
      ]),
      goal: {x: 4, y: 2},
      hint: 'Try moving forward when possible, otherwise turn!',
      solution: `function update() {
  if (is_goal()) {
    done();
  } else if (is_front_empty()) {
    move();
  } else {
    turn_right();
  }
}`,
    });

    await ctx.db.insert('questions', {
      title: 'Smart Navigation',
      description:
          'Use is_front_empty() to navigate smartly. Turn right when blocked.',
      difficulty: 'medium',
      initialMap: JSON.stringify([
        [0, 0, 0, 0, 0, 0],
        [0, 2, 0, 1, 3, 0],
        [0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0],
      ]),
      goal: {x: 4, y: 1},
      hint: 'Check if front is empty, move forward, otherwise turn right!',
      solution: `function update() {
  if (is_goal()) {
    done();
  } else if (is_front_empty()) {
    move();
  } else {
    turn_right();
  }
}`,
    });

    await ctx.db.insert('questions', {
      title: 'The Long Path',
      description: 'Navigate a longer path with multiple turns.',
      difficulty: 'medium',
      initialMap: JSON.stringify([
        [0, 0, 0, 0, 0, 0, 0],
        [0, 2, 0, 0, 0, 0, 0],
        [0, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 3],
        [0, 0, 0, 0, 0, 0, 0],
      ]),
      goal: {x: 6, y: 3},
      hint: 'Move forward as much as possible, turn when needed!',
      solution: `function update() {
  if (is_goal()) {
    done();
  } else if (is_front_empty()) {
    move();
  } else {
    turn_left();
  }
}`,
    });

    // Hard questions
    await ctx.db.insert('questions', {
      title: 'Complex Maze',
      description: 'A challenging maze that requires smart pathfinding.',
      difficulty: 'hard',
      initialMap: JSON.stringify([
        [0, 0, 1, 0, 0, 0, 0],
        [0, 2, 1, 0, 1, 1, 0],
        [0, 0, 0, 0, 1, 0, 0],
        [0, 1, 1, 0, 1, 0, 3],
        [0, 0, 0, 0, 0, 0, 0],
      ]),
      goal: {x: 6, y: 3},
      hint: 'Use is_front_empty() and try different turns when blocked!',
      solution: `function update() {
  if (is_goal()) {
    done();
  } else if (is_front_empty()) {
    move();
  } else {
    turn_left();
    if (!is_front_empty()) {
      turn_right();
      turn_right();
    }
  }
}`,
    });

    await ctx.db.insert('questions', {
      title: 'Obstacle Course',
      description: 'Navigate through a complex obstacle course efficiently.',
      difficulty: 'hard',
      initialMap: JSON.stringify([
        [0, 0, 0, 1, 0, 0, 0, 0],
        [0, 2, 0, 1, 0, 1, 1, 0],
        [0, 1, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 1, 0, 1, 0, 3],
        [0, 0, 0, 0, 0, 1, 0, 0],
      ]),
      goal: {x: 7, y: 3},
      hint: 'Wall-following algorithm: Keep the wall on your right side!',
      solution: `function update() {
  if (is_goal()) {
    done();
  } else if (is_front_empty()) {
    move();
  } else {
    turn_right();
  }
}`,
    });

    await ctx.db.insert('questions', {
      title: 'The Ultimate Challenge',
      description:
          'The most difficult maze. Can you solve it with the fewest steps?',
      difficulty: 'hard',
      initialMap: JSON.stringify([
        [0, 0, 1, 0, 0, 0, 1, 0, 0],
        [0, 2, 1, 0, 1, 0, 1, 0, 3],
        [0, 0, 0, 0, 1, 0, 0, 0, 0],
        [0, 1, 1, 0, 1, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
      ]),
      goal: {x: 8, y: 1},
      hint:
          'Combine multiple strategies: check front, try turns, and keep moving toward the goal!',
      solution: `function update() {
  if (is_goal()) {
    done();
  } else if (is_front_empty()) {
    move();
  } else {
    turn_left();
    if (!is_front_empty()) {
      turn_right();
      turn_right();
      if (!is_front_empty()) {
        turn_right();
      }
    }
  }
}`,
    });
  },
});
