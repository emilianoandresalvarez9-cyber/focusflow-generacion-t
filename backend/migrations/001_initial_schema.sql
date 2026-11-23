-- Migracion 001: Esquema inicial de FocusFlow
-- Compatible con SQLite local y PostgreSQL (Neon en produccion)

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL CHECK (length(trim(titulo)) >= 3 AND length(trim(titulo)) <= 100),
  descripcion TEXT NOT NULL DEFAULT '',
  categoria TEXT NOT NULL CHECK (categoria IN ('tp', 'clase', 'proyecto', 'lectura')),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_progreso', 'completada')),
  bloques_estimados INTEGER NOT NULL CHECK (bloques_estimados >= 1 AND bloques_estimados <= 20),
  fecha_limite TEXT NOT NULL DEFAULT '',
  fecha_creacion TEXT NOT NULL,
  favorito INTEGER NOT NULL DEFAULT 0 CHECK (favorito IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_tasks_estado ON tasks(estado);
CREATE INDEX IF NOT EXISTS idx_tasks_categoria ON tasks(categoria);
CREATE INDEX IF NOT EXISTS idx_tasks_fecha_creacion ON tasks(fecha_creacion DESC);
