import { NotFoundError, ValidationError } from "../services/taskService.mjs";

const MAX_BODY_BYTES = 100 * 1024; // 100 KB para proteger memoria ante payloads abusivos

export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new ValidationError("El cuerpo de la peticion supera el limite permitido."));
        req.destroy();
        return;
      }
      raw += chunk;
    });

    req.on("end", () => {
      if (raw.trim().length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new ValidationError("JSON malformado en el cuerpo de la peticion."));
      }
    });

    req.on("error", () => {
      reject(new Error("Error leyendo el cuerpo de la peticion."));
    });
  });
}

export function sendJson(res, statusCode, payload) {
  if (statusCode === 204) {
    res.writeHead(204);
    res.end();
    return;
  }
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(body);
}

/**
 * Capa Controller: traduce requests HTTP a llamadas del TaskService y mapea errores a codigos HTTP.
 */
export class TaskController {
  constructor(taskService, adminToken) {
    this.taskService = taskService;
    this.adminToken = adminToken;
  }

  handleError(res, error) {
    if (error instanceof ValidationError) {
      return sendJson(res, 400, { error: error.message });
    }
    if (error instanceof NotFoundError) {
      return sendJson(res, 404, { error: error.message });
    }
    return sendJson(res, 500, { error: "Error interno del servidor." });
  }

  async list(req, res, url) {
    try {
      const filters = {
        categoria: url.searchParams.get("categoria") || undefined,
        estado: url.searchParams.get("estado") || undefined,
        favorito: url.searchParams.get("favorito") || undefined,
        q: url.searchParams.get("q") || undefined,
        limit: url.searchParams.get("limit") ?? undefined,
        offset: url.searchParams.get("offset") ?? undefined
      };
      const result = await this.taskService.listTasks(filters);
      return sendJson(res, 200, result);
    } catch (error) {
      return this.handleError(res, error);
    }
  }

  async summary(_req, res) {
    try {
      const result = await this.taskService.getStudySummary();
      return sendJson(res, 200, result);
    } catch (error) {
      return this.handleError(res, error);
    }
  }

  async getById(_req, res, id) {
    try {
      const task = await this.taskService.getTaskById(id);
      return sendJson(res, 200, task);
    } catch (error) {
      return this.handleError(res, error);
    }
  }

  async create(req, res) {
    try {
      const body = await readJsonBody(req);
      const created = await this.taskService.createTask(body);
      return sendJson(res, 201, created);
    } catch (error) {
      return this.handleError(res, error);
    }
  }

  async update(req, res, id) {
    try {
      const body = await readJsonBody(req);
      const updated = await this.taskService.updateTask(id, body);
      return sendJson(res, 200, updated);
    } catch (error) {
      return this.handleError(res, error);
    }
  }

  async remove(_req, res, id) {
    try {
      await this.taskService.deleteTask(id);
      return sendJson(res, 204);
    } catch (error) {
      return this.handleError(res, error);
    }
  }

  async adminMetrics(req, res) {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return sendJson(res, 401, { error: "Token de autenticacion requerido." });
    }
    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      return sendJson(res, 401, { error: "Token de autenticacion vacio." });
    }
    if (!this.adminToken || token !== this.adminToken) {
      return sendJson(res, 403, { error: "Acceso denegado: se requieren permisos de administrador." });
    }

    try {
      const summary = await this.taskService.getStudySummary();
      return sendJson(res, 200, {
        role: "admin",
        ...summary
      });
    } catch (error) {
      return this.handleError(res, error);
    }
  }
}
