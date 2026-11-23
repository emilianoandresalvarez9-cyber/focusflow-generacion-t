import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFocusFlowApp } from "./app.mjs";
import { SqliteTaskRepository } from "./repositories/sqliteTaskRepository.mjs";
import { SystemClock, DEFAULT_TIMEZONE } from "./utils/clock.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3001);
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
const timeZone = process.env.APP_TIMEZONE || DEFAULT_TIMEZONE;
const dbPath = path.resolve(__dirname, "../data/focusflow.sqlite");

const repository = new SqliteTaskRepository(dbPath);
const clock = new SystemClock(timeZone);
const server = createFocusFlowApp({
  repository,
  clock,
  frontendUrl,
  adminToken: process.env.ADMIN_TOKEN || "dev-admin-token"
});

server.listen(port, () => {
  console.log(`FocusFlow Backend escuchando en http://localhost:${port}`);
  console.log(`CORS habilitado para FRONTEND_URL=${frontendUrl}`);
});
