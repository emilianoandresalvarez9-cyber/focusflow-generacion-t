import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION_PATH = path.resolve(__dirname, "../../migrations/001_initial_schema.sql");

function mapRowToTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    titulo: row.titulo,
    descripcion: row.descripcion,
    categoria: row.categoria,
    estado: row.estado,
    bloquesEstimados: Number(row.bloques_estimados),
    fechaLimite: row.fecha_limite,
    fechaCreacion: row.fecha_creacion,
    favorito: Boolean(row.favorito)
  };
}

/**
 * Capa Repository con SQLite (node:sqlite) usando exclusivamente consultas SQL parametrizadas.
 * Mantiene el mismo contrato asincrono que un repositorio PostgreSQL (Neon) en produccion.
 */
export class SqliteTaskRepository {
  constructor(dbPath = ":memory:") {
    if (dbPath !== ":memory:") {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }
    this.db = new DatabaseSync(dbPath);
    const migrationSql = fs.readFileSync(MIGRATION_PATH, "utf8");
    this.db.exec(migrationSql);
  }

  async findAll({ categoria, estado, favorito, q, limit = 50, offset = 0 } = {}) {
    const conditions = [];
    const params = [];

    if (categoria) {
      conditions.push("categoria = ?");
      params.push(categoria);
    }
    if (estado) {
      conditions.push("estado = ?");
      params.push(estado);
    }
    if (favorito === true) {
      conditions.push("favorito = 1");
    }
    if (q) {
      conditions.push("(lower(titulo) LIKE ? OR lower(descripcion) LIKE ?)");
      const pattern = `%${q.toLowerCase()}%`;
      params.push(pattern, pattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const totalRow = this.db
      .prepare(`SELECT COUNT(*) AS total FROM tasks ${whereClause}`)
      .get(...params);

    const rows = this.db
      .prepare(
        `SELECT id, titulo, descripcion, categoria, estado, bloques_estimados, fecha_limite, fecha_creacion, favorito
         FROM tasks
         ${whereClause}
         ORDER BY favorito DESC, fecha_creacion DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    return {
      items: rows.map(mapRowToTask),
      total: Number(totalRow.total),
      limit,
      offset
    };
  }

  async findAllUnpaginatedForSummary() {
    const rows = this.db
      .prepare(
        `SELECT id, titulo, descripcion, categoria, estado, bloques_estimados, fecha_limite, fecha_creacion, favorito
         FROM tasks`
      )
      .all();
    return rows.map(mapRowToTask);
  }

  async findById(id) {
    const row = this.db
      .prepare(
        `SELECT id, titulo, descripcion, categoria, estado, bloques_estimados, fecha_limite, fecha_creacion, favorito
         FROM tasks
         WHERE id = ?`
      )
      .get(id);
    return mapRowToTask(row);
  }

  async create(task) {
    this.db
      .prepare(
        `INSERT INTO tasks (id, titulo, descripcion, categoria, estado, bloques_estimados, fecha_limite, fecha_creacion, favorito)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        task.id,
        task.titulo,
        task.descripcion,
        task.categoria,
        task.estado,
        task.bloquesEstimados,
        task.fechaLimite,
        task.fechaCreacion,
        task.favorito ? 1 : 0
      );
    return task;
  }

  async update(id, updatedTask) {
    const result = this.db
      .prepare(
        `UPDATE tasks
         SET titulo = ?, descripcion = ?, categoria = ?, estado = ?, bloques_estimados = ?, fecha_limite = ?, favorito = ?
         WHERE id = ?`
      )
      .run(
        updatedTask.titulo,
        updatedTask.descripcion,
        updatedTask.categoria,
        updatedTask.estado,
        updatedTask.bloquesEstimados,
        updatedTask.fechaLimite,
        updatedTask.favorito ? 1 : 0,
        id
      );

    if (result.changes === 0) return null;
    return updatedTask;
  }

  async delete(id) {
    const result = this.db.prepare(`DELETE FROM tasks WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  close() {
    this.db.close();
  }
}
