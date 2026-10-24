// Deletes all data and recreates the demo data. Run with: npm run reset-db

import { createTables, dropTables } from "./db.js";
import { DEMO_PASSWORD, seed } from "./seed.js";

dropTables();
createTables();
seed();
console.log(`Database reset. Every demo account uses the password ${DEMO_PASSWORD}`);
