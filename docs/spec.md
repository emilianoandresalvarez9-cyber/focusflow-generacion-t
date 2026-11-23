# SPEC — FocusFlow (Gestor de Tareas y Sesiones de Estudio AI-First)

**Autor:** Emiliano Álvarez  
**Curso:** Generación T — Stage 2 (Proyecto Final Integrador)

---

## 1. Objetivo
Construir **FocusFlow**, una aplicación web Full-Stack que permita a estudiantes de tecnología organizar sus trabajos prácticos, clases y lecturas pendientes, calcular automáticamente los minutos estimados de estudio (en bloques Pomodoro de 25 minutos) y controlar vencimientos según el horario local de Argentina (`America/Argentina/Buenos_Aires`, `UTC-3`).

## 2. Usuario Objetivo
Estudiantes de programación y cursos intensivos de tecnología que necesitan planificar su semana de entregas desde una interfaz clara, conectada a un backend real con persistencia en base de datos.

## 3. Modelo de Datos (`Task`)

| Campo | Tipo | Obligatorio | Reglas de negocio |
| :--- | :--- | :--- | :--- |
| `id` | `string` (UUID) | Sí | Generado por el backend. |
| `titulo` | `string` | Sí | Entre 3 y 100 caracteres (sin contar espacios extremos). |
| `descripcion` | `string` | No | Hasta 500 caracteres. |
| `categoria` | `enum` | Sí | Valores válidos: `tp`, `clase`, `proyecto`, `lectura`. |
| `estado` | `enum` | Sí | Valores válidos: `pendiente`, `en_progreso`, `completada` (por defecto `pendiente`). |
| `bloquesEstimados` | `integer` | Sí | Número entero entre `1` y `20` (cada bloque equivale a `25` minutos). |
| `fechaLimite` | `string` | No | Formato `YYYY-MM-DD` (opcional si es una tarea de repaso sin fecha fija). |
| `fechaCreacion` | `string` | Sí | Timestamp ISO-8601 generado por el reloj inyectado del servidor. |
| `favorito` | `boolean` | Sí | Por defecto `false`. |

## 4. Reglas de Negocio
1. **Cálculo de tiempo estimado:** Cada bloque equivale exactamente a `25` minutos. El resumen de minutos pendientes (`minutosEstimadosPendientes`) suma únicamente tareas cuyo estado sea `pendiente` o `en_progreso`.
2. **Cálculo de tareas vencidas (Zona horaria del club/usuario):** Una tarea se considera vencida (`estaVencida: true`) solo si tiene `fechaLimite`, su estado no es `completada`, y la fecha actual en zona horaria `America/Argentina/Buenos_Aires` es estrictamente mayor a `fechaLimite`. Para testear esto sin esperar días reales, el `TaskService` recibe un **reloj inyectable (`clock`)**.
3. **Validación en la frontera y en el servicio:** Tanto los controladores HTTP como la capa `TaskService` validan las reglas del negocio para garantizar integridad aunque el servicio sea invocado por otro endpoint, script o test.
4. **Paginación por defecto:** `GET /api/tasks` nunca trae registros ilimitados; acepta `limit` (por defecto `50`, máximo `100`) y `offset` (por defecto `0`).
5. **Control de permisos (`401` vs `403`):** La ruta `GET /api/admin/metrics` exige autenticación (`Bearer token`). Sin token responde `401 Unauthorized`; con token válido de usuario común responde `403 Forbidden`; solo un token de administrador recibe `200 OK`.

## 5. Contrato de API REST

| Método | Ruta | Descripción | Respuestas |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Estado del servidor y reloj actual | `200 OK` |
| `GET` | `/api/tasks` | Lista tareas con filtros (`categoria`, `estado`, `favorito`, `q`, `limit`, `offset`) | `200 OK` |
| `GET` | `/api/tasks/summary` | Resumen de pendientes, completadas, vencidas y minutos estimados | `200 OK` |
| `GET` | `/api/tasks/:id` | Detalle de una tarea por ID | `200 OK`, `404 Not Found` |
| `POST` | `/api/tasks` | Crea una nueva tarea validada | `201 Created`, `400 Bad Request` |
| `PATCH` | `/api/tasks/:id` | Actualiza parcialmente una tarea | `200 OK`, `400 Bad Request`, `404 Not Found` |
| `DELETE` | `/api/tasks/:id` | Elimina una tarea por ID | `204 No Content`, `404 Not Found` |
| `GET` | `/api/admin/metrics` | Métricas administrativas protegidas por rol | `200 OK`, `401`, `403` |

## 6. Requisitos del Frontend
- El frontend es un cliente puro de la API (no duplica cálculos definitivos de negocio ni usa `INITIAL_TICKETS` hardcodeados).
- Debe representar explícitamente los 4 estados de interfaz: **Loading**, **Error** (con botón de reintento), **Empty** y **Success**.

## 7. Restricciones Técnicas y de Seguridad
- Prohibido subir `.env`, credenciales, `node_modules/` o `dist/` al repositorio.
- Todas las consultas SQL deben ser **parametrizadas** (nunca concatenar strings del usuario en SQL).
- Arquitectura estricta en capas: `Controller` → `Service` → `Repository`.
- Ningún cambio entra directo al código sin actualizar primero `docs/spec.md`.
