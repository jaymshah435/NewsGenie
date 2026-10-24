// Starts the API. Run with: npm run dev (restarts on changes) or npm start.

import { app } from "./app.js";
import { config } from "./config.js";
import { seedIfEmpty } from "./seed.js";

seedIfEmpty(); // first start only

app.listen(config.port, () => {
  console.log(`NewsGenie API running on http://localhost:${config.port}`);
  if (!config.anthropicApiKey) console.log("Note: ANTHROPIC_API_KEY is not set, so the AI assistant is disabled.");
});
