// Creates the Express app and connects all the APIs.

import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { errorHandler, notFound } from "./errors.js";
import { analyticsRouter } from "./routes/analytics.js";
import { assistantRouter } from "./routes/assistant.js";
import { authRouter } from "./routes/auth.js";
import { moderationRouter } from "./routes/moderation.js";
import { protectionRouter } from "./routes/protection.js";

export const app = express();

// Allow the React frontend (a different port) to call this API from the browser.
app.use(cors({ origin: config.frontendUrl }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/moderation", moderationRouter);
app.use("/api/protection", protectionRouter);
app.use("/api/assistant", assistantRouter);

app.use(notFound);
app.use(errorHandler);
