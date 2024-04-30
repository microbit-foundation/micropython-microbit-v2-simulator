export type Stage = "local" | "REVIEW" | "STAGING" | "PRODUCTION";

export const stage = (process.env.STAGE || "local") as Stage;
