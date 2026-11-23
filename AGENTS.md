# AGENTS.md

## Project
**FocusFlow** — Aplicación Full-Stack para gestión de tareas y sesiones de estudio (Proyecto Final Integrador — Generación T Stage 2, Alumno: Emiliano Álvarez).
- **Especificación fuente de verdad:** `docs/spec.md`
- **Backend:** Node.js (ESM), arquitectura en capas (`Controller` -> `Service` -> `Repository`), base de datos SQLite local (`node:sqlite`) con migración SQL lista para PostgreSQL/Neon (`backend/migrations/001_initial_schema.sql`).
- **Frontend:** Interfaz web moderna conectada a la API REST mediante `frontend/src/services/taskApi.js`.

## Commands
- `npm test` — Ejecutar toda la suite de tests unitarios y de integración del backend (`node --test`).
- `npm run dev:backend` — Iniciar el servidor backend en `http://localhost:3001`.
- `npm run dev:frontend` — Iniciar el servidor estático del frontend en `http://localhost:5173`.
- `npm run verify` — Correr todos los tests automatizados y validar la configuración del proyecto.

## Code style
- Nombres claros y descriptivos en español para el dominio (`bloquesEstimados`, `fechaLimite`, `estaVencida`) y términos estándar de arquitectura en inglés (`Controller`, `Service`, `Repository`).
- Prohibido usar números mágicos: extraer constantes explícitas (`MINUTOS_POR_BLOQUE = 25`, `MIN_BLOQUES = 1`, `MAX_BLOQUES = 20`, `DEFAULT_PAGE_LIMIT = 50`, `MAX_PAGE_LIMIT = 100`).
- Respetar estrictamente la separación de responsabilidades:
  - El `Controller` solo maneja HTTP (leer parámetros, invocar al `Service`, devolver status codes).
  - El `Service` concentra reglas de negocio, validaciones y cálculos con el reloj inyectado.
  - El `Repository` solo ejecuta consultas SQL parametrizadas.
- Nunca silenciar errores con `catch {}` vacíos ni exponer stacktraces internos al cliente.

## Agent behavior

### Nivel 1 — Autónomo (puede hacer solo)
- Leer `docs/spec.md`, `AGENTS.md`, migraciones, código fuente y tests.
- Ejecutar `npm test` para verificar cambios.
- Proponer planes de cambio paso a paso antes de modificar múltiples archivos.

### Nivel 2 — Con confirmación humana (Human-in-the-loop)
- Modificar el contrato de API o agregar nuevas rutas HTTP.
- Cambiar el esquema SQL en `backend/migrations/`.
- Refactorizar múltiples módulos a la vez.

### Nivel 3 — Nunca solo (prohibido sin permiso explícito)
- Instalar o eliminar dependencias externas.
- Borrar o desactivar tests existentes para forzar que pase una compilación.
- Crear o commitear archivos `.env`, credenciales reales o tokens en el código.
- Implementar reglas de negocio que contradigan o no existan en `docs/spec.md` (si falta una regla en la spec, detenerse y consultar primero).
