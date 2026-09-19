export const qualifyingActivityTypes = [
  "vision_updated",
  "goal_created",
  "goal_updated",
  "habit_recorded",
  "daily_action_created",
  "daily_action_updated",
  "daily_action_completed",
] as const;

export type QualifyingActivityType = (typeof qualifyingActivityTypes)[number];

export const PARTICIPATION_CAMPAIGN = "consistency-30-v1" as const;
export const PARTICIPATION_REQUIRED_DAYS = 30;
export const PARTICIPATION_TRIAL_DAYS = 30;
