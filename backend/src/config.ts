// Settings read from environment variables or the backend/.env file.

import "dotenv/config";

export const config = {
  databasePath: process.env.DATABASE_PATH || "newsgenie.db",
  jwtSecret: process.env.JWT_SECRET || "dev-only-secret-change-me-in-backend-env-file",
  jwtExpiresMinutes: Number(process.env.JWT_EXPIRES_MINUTES || 480),

  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",

  port: Number(process.env.PORT || 8000),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
};
