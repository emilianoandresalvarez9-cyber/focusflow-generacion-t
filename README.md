# FocusFlow — Proyecto Final Integrador (Generación T Stage 2)

**Alumno:** Emiliano Álvarez  
**Curso:** Generación T — Stage 2 (Desarrollo AI-First)

**FocusFlow** es una aplicación web Full-Stack construida de punta a punta aplicando toda la metodología aprendida en los 4 módulos del Stage 2:
- **Módulo 1 (IA-First):** Context Engineering, `AGENTS.md`, niveles de autonomía y automatización responsable.
- **Módulo 2 (Programación con IA Inicial):** Spec-Driven Development (`docs/spec.md`), refactoring sin números mágicos, tests unitarios (caso correcto, inválido y límite) y modelado relacional de datos.
- **Módulo 3 (Programación con IA Avanzado):** Arquitectura backend en capas (`Controller -> Service -> Repository`), consultas SQL parametrizadas con paginación, contrato API REST y equipo de subagentes (`.cursor/agents/revisor.md`, `arquitecto.md`, `tester.md`).
- **Módulo 4 (Proyectos Reales):** Reloj inyectable para zona horaria de Argentina (`UTC-3`) con `FakeClock`, permisos HTTP (`401` vs `403`), CORS mediante `FRONTEND_URL`, migraciones SQL y seguridad en Git (`.env.example` incluido, `.env` excluido en `.gitignore`).

## Estructura del Repositorio

```text
focusflow/
├── docs/spec.md                      # Especificación fuente de verdad (SDD)
├── AGENTS.md                         # Reglas persistentes y niveles de autonomía para agentes IA
├── .cursor/agents/                   # Equipo de 3 subagentes especializados
│   ├── arquitecto.md
│   ├── tester.md
│   └── revisor.md                    # Subagente revisor readonly: true
├── .env.example                      # Plantilla segura de variables de entorno
├── .gitignore                        # Excluye .env, node_modules/, dist/ y archivos *.sqlite
├── backend/
│   ├── migrations/001_initial_schema.sql
│   ├── src/
│   │   ├── app.mjs                   # Router HTTP y CORS
│   │   ├── server.mjs                # Punto de entrada del servidor
│   │   ├── controllers/taskController.mjs
│   │   ├── services/taskService.mjs
│   │   ├── repositories/sqliteTaskRepository.mjs
│   │   └── utils/clock.mjs           # SystemClock (Argentina UTC-3) y FakeClock
│   └── tests/
│       ├── taskService.test.mjs      # Tests unitarios + casos límite + FakeClock
│       └── api.integration.test.mjs  # Tests de integración HTTP (CRUD, SQLi, 401/403)
└── frontend/
    ├── index.html
    ├── styles.css
    ├── server.mjs
    └── src/
        ├── app.js                    # Estados Loading, Error, Empty y Success
        └── services/taskApi.js       # Cliente HTTP desacoplado
```

## Cómo ejecutarlo localmente

Requisitos: **Node.js 22 o superior** (usa `node:sqlite` y `node:test` nativos, sin dependencias pesadas).

1. Copiá `.env.example` como `.env` y configurá tus variables locales si lo deseás.
2. Corré toda la suite de tests automatizados:
   ```bash
   npm test
   ```
3. Levantá el backend (`http://localhost:3001`):
   ```bash
   npm run dev:backend
   ```
4. En otra terminal, levantá el frontend (`http://localhost:5173`):
   ```bash
   npm run dev:frontend
   ```

## Despliegue en Producción (Arquitectura Módulo 4)
- **Frontend (Netlify):** carpeta `frontend/`, configurando `VITE_API_URL` apuntando al backend.
- **Backend (Render):** comando `npm run dev:backend`, configurando `DATABASE_URL`, `FRONTEND_URL` y `ADMIN_TOKEN` en variables de entorno.
- **Base de datos (Neon PostgreSQL):** aplicando `backend/migrations/001_initial_schema.sql`.
