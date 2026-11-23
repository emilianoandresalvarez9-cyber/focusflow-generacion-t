import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createFocusFlowApp } from "../src/app.mjs";
import { SqliteTaskRepository } from "../src/repositories/sqliteTaskRepository.mjs";
import { FakeClock } from "../src/utils/clock.mjs";

async function startTestServer() {
  const repo = new SqliteTaskRepository(":memory:");
  const clock = new FakeClock("2026-11-23T15:00:00Z");
  const server = createFocusFlowApp({
    repository: repo,
    clock,
    frontendUrl: "http://localhost:5173",
    adminToken: "super-admin-secret"
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    close: async () => {
      await new Promise((resolve) => server.close(resolve));
      repo.close();
    }
  };
}

describe("API REST FocusFlow — Tests de Integracion HTTP", () => {
  test("Flujo CRUD completo + /api/tasks/summary antes que /:id + consultas parametrizadas", async () => {
    const { baseUrl, close } = await startTestServer();
    try {
      // 1. POST valido (201) — incluso con intento de SQL injection en el titulo, queda guardado como texto literal seguro
      const maliciousTitle = "Estudiar SQL'); DROP TABLE tasks; --";
      const createRes = await fetch(`${baseUrl}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: maliciousTitle,
          descripcion: "Probar queries parametrizadas",
          categoria: "tp",
          bloquesEstimados: 3,
          fechaLimite: "2026-12-31",
          favorito: true
        })
      });
      assert.equal(createRes.status, 201);
      const created = await createRes.json();
      assert.equal(created.titulo, maliciousTitle);

      // 2. GET /api/tasks/summary (200)
      const summaryRes = await fetch(`${baseUrl}/api/tasks/summary`);
      assert.equal(summaryRes.status, 200);
      const summary = await summaryRes.json();
      assert.equal(summary.tareasPendientes, 1);
      assert.equal(summary.minutosEstimadosPendientes, 75);

      // 3. PATCH /api/tasks/:id (200) -> pasar a completada
      const patchRes = await fetch(`${baseUrl}/api/tasks/${created.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "completada" })
      });
      assert.equal(patchRes.status, 200);
      const updated = await patchRes.json();
      assert.equal(updated.estado, "completada");

      // 4. DELETE /api/tasks/:id (204) y luego GET -> 404
      const delRes = await fetch(`${baseUrl}/api/tasks/${created.id}`, { method: "DELETE" });
      assert.equal(delRes.status, 204);

      const notFoundRes = await fetch(`${baseUrl}/api/tasks/${created.id}`);
      assert.equal(notFoundRes.status, 404);
    } finally {
      await close();
    }
  });

  test("Validacion de errores HTTP (400) y permisos administrativos (401 vs 403 vs 200)", async () => {
    const { baseUrl, close } = await startTestServer();
    try {
      // Payload invalido -> 400
      const badRes = await fetch(`${baseUrl}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: "", categoria: "tp", bloquesEstimados: 0 })
      });
      assert.equal(badRes.status, 400);

      // Sin token -> 401 Unauthorized
      const noTokenRes = await fetch(`${baseUrl}/api/admin/metrics`);
      assert.equal(noTokenRes.status, 401);

      // Token de usuario comun (no admin) -> 403 Forbidden
      const userTokenRes = await fetch(`${baseUrl}/api/admin/metrics`, {
        headers: { Authorization: "Bearer usuario-comun-token" }
      });
      assert.equal(userTokenRes.status, 403);

      // Token admin valido -> 200 OK
      const adminRes = await fetch(`${baseUrl}/api/admin/metrics`, {
        headers: { Authorization: "Bearer super-admin-secret" }
      });
      assert.equal(adminRes.status, 200);
      const body = await adminRes.json();
      assert.equal(body.role, "admin");
    } finally {
      await close();
    }
  });
});
