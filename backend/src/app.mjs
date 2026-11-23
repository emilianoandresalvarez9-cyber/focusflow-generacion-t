import http from "node:http";
import { TaskController, sendJson } from "./controllers/taskController.mjs";
import { TaskService } from "./services/taskService.mjs";
import { SystemClock } from "./utils/clock.mjs";

export function createFocusFlowApp({
  repository,
  clock = new SystemClock(),
  frontendUrl = "http://localhost:5173",
  adminToken = process.env.ADMIN_TOKEN || ""
}) {
  const taskService = new TaskService(repository, clock);
  const taskController = new TaskController(taskService, adminToken);

  return http.createServer(async (req, res) => {
    // Configuracion de CORS basada en FRONTEND_URL (regla del Modulo 4)
    const requestOrigin = req.headers.origin;
    if (requestOrigin && (requestOrigin === frontendUrl || frontendUrl === "*")) {
      res.setHeader("Access-Control-Allow-Origin", requestOrigin);
      res.setHeader("Vary", "Origin");
    } else if (!requestOrigin) {
      res.setHeader("Access-Control-Allow-Origin", frontendUrl);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || "/", "http://localhost");
    const pathname = url.pathname;
    const method = req.method || "GET";

    // Health check
    if (method === "GET" && pathname === "/api/health") {
      return sendJson(res, 200, {
        status: "ok",
        fechaLocal: clock.todayLocalDate(),
        zonaHoraria: clock.timeZone
      });
    }

    // Ruta protegida de administracion (demuestra 401 vs 403)
    if (method === "GET" && pathname === "/api/admin/metrics") {
      return taskController.adminMetrics(req, res);
    }

    // Importante: /api/tasks/summary se evalua SIEMPRE antes que /api/tasks/:id
    if (method === "GET" && pathname === "/api/tasks/summary") {
      return taskController.summary(req, res);
    }

    if (method === "GET" && pathname === "/api/tasks") {
      return taskController.list(req, res, url);
    }

    if (method === "POST" && pathname === "/api/tasks") {
      return taskController.create(req, res);
    }

    const taskIdMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
    if (taskIdMatch) {
      const id = decodeURIComponent(taskIdMatch[1]);
      if (method === "GET") return taskController.getById(req, res, id);
      if (method === "PATCH") return taskController.update(req, res, id);
      if (method === "DELETE") return taskController.remove(req, res, id);
    }

    return sendJson(res, 404, { error: "Ruta no encontrada." });
  });
}
