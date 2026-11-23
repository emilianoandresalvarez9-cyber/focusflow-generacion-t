import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { SqliteTaskRepository } from "../src/repositories/sqliteTaskRepository.mjs";
import { TaskService, ValidationError, NotFoundError } from "../src/services/taskService.mjs";
import { FakeClock } from "../src/utils/clock.mjs";

describe("TaskService — Tests Unitarios (Reglas de Negocio y Reloj Inyectable)", () => {
  test("Caso correcto: crea tareas y calcula el resumen sumando solo pendientes/en_progreso (bloques * 25)", async () => {
    const repo = new SqliteTaskRepository(":memory:");
    const clock = new FakeClock("2026-11-23T15:00:00Z"); // 12:00 Argentina
    const service = new TaskService(repo, clock);

    await service.createTask({
      titulo: "Entregar proyecto final",
      descripcion: "Unificar frontend, backend y tests",
      categoria: "proyecto",
      bloquesEstimados: 4,
      fechaLimite: "2026-12-31",
      favorito: true
    });
    await service.createTask({
      titulo: "Repasar clase de CORS",
      categoria: "clase",
      estado: "en_progreso",
      bloquesEstimados: 2,
      favorito: false
    });
    await service.createTask({
      titulo: "Aprobar evaluacion modulo 4",
      categoria: "tp",
      estado: "completada",
      bloquesEstimados: 3,
      favorito: true
    });

    const summary = await service.getStudySummary();
    assert.equal(summary.totalTareas, 3);
    assert.equal(summary.tareasPendientes, 2);
    assert.equal(summary.tareasCompletadas, 1);
    assert.equal(summary.minutosEstimadosPendientes, (4 + 2) * 25);
    assert.equal(summary.favoritosPendientes, 1);
    repo.close();
  });

  test("Caso invalido: rechaza titulos cortos, categorias invalidas y bloques fuera de 1..20", async () => {
    const repo = new SqliteTaskRepository(":memory:");
    const service = new TaskService(repo, new FakeClock("2026-11-23T15:00:00Z"));

    await assert.rejects(
      () => service.createTask({ titulo: "ab", categoria: "tp", bloquesEstimados: 2 }),
      ValidationError
    );
    await assert.rejects(
      () => service.createTask({ titulo: "Tarea valida", categoria: "otra", bloquesEstimados: 2 }),
      ValidationError
    );
    await assert.rejects(
      () => service.createTask({ titulo: "Tarea con cero", categoria: "tp", bloquesEstimados: 0 }),
      ValidationError
    );
    await assert.rejects(
      () => service.createTask({ titulo: "Tarea con exceso", categoria: "tp", bloquesEstimados: 21 }),
      ValidationError
    );
    await assert.rejects(
      () => service.createTask({ titulo: "Tarea decimal", categoria: "tp", bloquesEstimados: 2.5 }),
      ValidationError
    );
    await assert.rejects(() => service.getTaskById("id-inexistente"), NotFoundError);
    repo.close();
  });

  test("Caso limite: lista vacia y fronteras exactas permitidas (1 bloque y 20 bloques)", async () => {
    const repo = new SqliteTaskRepository(":memory:");
    const service = new TaskService(repo, new FakeClock("2026-11-23T15:00:00Z"));

    const emptySummary = await service.getStudySummary();
    assert.equal(emptySummary.tareasPendientes, 0);
    assert.equal(emptySummary.minutosEstimadosPendientes, 0);

    await service.createTask({ titulo: "Tarea minima", categoria: "lectura", bloquesEstimados: 1 });
    await service.createTask({ titulo: "Tarea maxima", categoria: "proyecto", bloquesEstimados: 20 });

    const borderSummary = await service.getStudySummary();
    assert.equal(borderSummary.tareasPendientes, 2);
    assert.equal(borderSummary.minutosEstimadosPendientes, (1 + 20) * 25);
    repo.close();
  });

  test("Zona horaria Argentina (UTC-3) y FakeClock: 22:00 en Argentina sigue siendo el mismo dia aunque en UTC ya sea manana", async () => {
    const repo = new SqliteTaskRepository(":memory:");
    // 2026-11-24T01:00:00Z es Martes 24/11 01:00 en UTC, pero Lunes 23/11 22:00 en Argentina!
    const clock = new FakeClock("2026-11-24T01:00:00Z", "America/Argentina/Buenos_Aires");
    const service = new TaskService(repo, clock);

    const task = await service.createTask({
      titulo: "Entregar antes de medianoche AR",
      categoria: "tp",
      bloquesEstimados: 2,
      fechaLimite: "2026-11-23"
    });

    // Aun son las 22:00 del 23/11 en Argentina -> NO debe figurar vencida
    assert.equal(task.estaVencida, false);

    // Adelantamos 3 horas con el FakeClock (ahora es 24/11 01:00 en Argentina) -> SI debe vencer
    clock.advanceHours(3);
    const afterMidnight = await service.getTaskById(task.id);
    assert.equal(afterMidnight.estaVencida, true);

    const summary = await service.getStudySummary();
    assert.equal(summary.tareasVencidas, 1);
    repo.close();
  });
});
